import { WorkspaceLeaf } from 'obsidian';
import IconicPlugin, { BookmarkItem, STRINGS } from './IconicPlugin';
import IconManager from './IconManager';
import IconPicker from './IconPicker';

/**
 * Handles icons in the Bookmarks pane.
 */
export default class BookmarkIconManager extends IconManager {
	private containerEl: HTMLElement;
	private readonly selectionLookup = new Map<HTMLElement, BookmarkItem>();

	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => {
			if (activeDocument.contains(this.containerEl)) {
				return;
			} else {
				this.app.workspace.iterateAllLeaves(leaf => this.manageLeaf(leaf));
			};
		}));
		// @ts-expect-error (Private API)
		if (this.app.plugins?.plugins?.['obsidian-icon-folder']) {
			this.plugin.registerEvent(this.app.workspace.on('active-leaf-change', () => {
				this.refreshIcons();
			}));
		}
		this.app.workspace.iterateAllLeaves(leaf => this.manageLeaf(leaf));
	}

	/**
	 * Start managing this leaf if has a matching type.
	 */
	private manageLeaf(leaf: WorkspaceLeaf) {
		if (leaf.getViewState().type !== 'bookmarks') {
			return;
		} else if (this.containerEl) {
			this.stopMutationObserver(this.containerEl);
		}
		this.containerEl = leaf.view.containerEl.find(':scope > .view-content > div');
		if (this.containerEl) this.setMutationObserver(this.containerEl, {
			subtree: true,
			childList: true,
			attributeFilter: ['class'],
			attributeOldValue: true
		}, mutations => {
			for (const mutation of mutations) {
				// Refresh when bookmarks are renamed
				if (mutation.attributeName === 'class'
					&& mutation.target instanceof HTMLElement
					&& mutation.oldValue?.includes('is-being-renamed')
					&& !mutation.target.hasClass('is-being-renamed')
				) {
					this.refreshIcons();
					return;
				}
				// Refresh when bookmarks are added or moved
				for (const addedNode of mutation.addedNodes) {
					if (addedNode instanceof HTMLElement && addedNode.hasClass('tree-item')) {
						this.refreshIcons();
						return;
					}
				}
			}
		});
		this.refreshIcons();
	}

	/**
	 * Refresh all bookmark icons.
	 */
	refreshIcons(unloading?: boolean): void {
		const bmarks = this.plugin.getBookmarkItems(unloading);
		const itemEls = this.containerEl?.findAll(':scope > .tree-item');
		if (itemEls) {
			this.selectionLookup.clear();
			this.refreshChildIcons(bmarks, itemEls);
		}
	}

	/**
	 * Refresh an array of bookmark icons, including any subitems.
	 */
	private refreshChildIcons(bmarks: BookmarkItem[], itemEls: HTMLElement[]) {
		for (const itemEl of itemEls) {
			itemEl.addClass('iconic-item');

			const bmark = bmarks[itemEls.indexOf(itemEl)]
			if (!bmark) continue;

			if (bmark.items) {
				if (!itemEl.hasClass('is-collapsed')) {
					const childItemEls = itemEl.findAll(':scope > .tree-item-children > .tree-item');
					if (childItemEls) this.refreshChildIcons(bmark.items, childItemEls);
				}

				// Refresh children when folder expands
				this.setMutationObserver(itemEl, { attributeFilter: ['class'] }, mutations => {
					if (bmark.items) for (const mutation of mutations) {
						if (mutation.target instanceof HTMLElement && !mutation.target.hasClass('is-collapsed')) {
							const childItemEls = itemEl.findAll(':scope > .tree-item-children > .tree-item');
							if (childItemEls) this.refreshChildIcons(bmark.items, childItemEls);
						}
					}
				});
			}

			const iconEl = itemEl.find(':scope > .tree-item-self > .tree-item-icon');
			if (!iconEl) continue;

			if (iconEl.hasClass('collapse-icon') && !bmark.icon) {
				this.refreshIcon(bmark, iconEl); // Skip click listener if icon will be a collapse arrow
			} else if (this.plugin.enabledOnPlatform('clickableIcons')) {
				this.refreshIcon(bmark, iconEl, event => {
					IconPicker.openSingle(this.plugin, bmark, (newIcon, newColor) => {
						this.plugin.saveBookmarkIcon(bmark, newIcon, newColor);
						this.refreshIcons();
						this.plugin.tabIconManager?.refreshIcons();
						this.plugin.fileIconManager?.refreshIcons();
					});
					event.stopPropagation();
				});
			} else {
				this.refreshIcon(bmark, iconEl);
			}

			const selfEl = itemEl.find(':scope > .tree-item-self');
			if (selfEl) {
				this.selectionLookup.set(selfEl, bmark);
				this.setEventListener(selfEl, 'contextmenu', () => this.onContextMenu(bmark.id, bmark.isFile), { capture: true });
			}
		};
	}

	/**
	 * When user context-clicks a bookmark, add custom items to the menu.
	 */
	private async onContextMenu(clickedBmarkId: string, isFile: boolean): Promise<void> {
		this.plugin.menuManager.close();
		const clickedBmark: BookmarkItem = this.plugin.getBookmarkItem(clickedBmarkId, isFile);
		const selectedBmarks: BookmarkItem[] = [];

		for (const [selectableEl, bmark] of this.selectionLookup) {
			if (selectableEl.hasClass('is-selected')) {
				selectedBmarks.push(this.plugin.getBookmarkItem(bmark.id, bmark.isFile));
			}
		}

		// If clicked bookmark is not selected, ignore selected items
		if (!selectedBmarks.some(selectedBmark => selectedBmark.id === clickedBmark.id)) {
			selectedBmarks.length = 0;
		}

		// Change icon(s)
		const changeTitle = selectedBmarks.length < 2
			? STRINGS.menu.changeIcon
			: STRINGS.menu.changeIcons.replace('{#}', selectedBmarks.length.toString());
		this.plugin.menuManager.addItemAfter('open', item => item
			.setTitle(changeTitle)
			.setIcon('lucide-image-plus')
			.setSection('icon')
			.onClick(() => {
				if (selectedBmarks.length < 2) {
					IconPicker.openSingle(this.plugin, clickedBmark, (newIcon, newColor) => {
						this.plugin.saveBookmarkIcon(clickedBmark, newIcon, newColor);
						this.refreshIcons();
						this.plugin.tabIconManager?.refreshIcons();
						this.plugin.fileIconManager?.refreshIcons();
					});
				} else {
					IconPicker.openMulti(this.plugin, selectedBmarks, (newIcon, newColor) => {
						this.plugin.saveBookmarkIcons(selectedBmarks, newIcon, newColor);
						this.refreshIcons();
						this.plugin.tabIconManager?.refreshIcons();
						this.plugin.fileIconManager?.refreshIcons();
					});
				}
			})
		);

		// Remove icon(s) / Reset color(s)
		const anyRemovable = selectedBmarks.some(bmark => bmark.icon || bmark.color);
		const anyIcons = selectedBmarks.some(bmark => bmark.icon);
		const removeTitle = selectedBmarks.length < 2
			? clickedBmark.icon
				? STRINGS.menu.removeIcon
				: STRINGS.menu.resetColor
			: anyIcons
				? STRINGS.menu.removeIcons.replace('{#}', selectedBmarks.length.toString())
				: STRINGS.menu.resetColors.replace('{#}', selectedBmarks.length.toString())
		const removeIcon = clickedBmark.icon || anyIcons ? 'lucide-image-minus' : 'lucide-rotate-ccw';

		if (clickedBmark.icon || clickedBmark.color || anyRemovable) {
			this.plugin.menuManager.addItem(item => item
				.setTitle(removeTitle)
				.setIcon(removeIcon)
				.setSection('icon')
				.onClick(() => {
					if (selectedBmarks.length < 2) {
						this.plugin.saveBookmarkIcon(clickedBmark, null, null);
					} else {
						this.plugin.saveBookmarkIcons(selectedBmarks, null, null);
					}
					this.refreshIcons();
					this.plugin.tabIconManager?.refreshIcons();
					this.plugin.fileIconManager?.refreshIcons();
				})
			);
		}
	}
}
