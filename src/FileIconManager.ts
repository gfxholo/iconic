import { WorkspaceLeaf } from 'obsidian';
import IconicPlugin, { FileItem, STRINGS } from './IconicPlugin';
import IconManager from './IconManager';
import IconPicker from './IconPicker';

/**
 * Handles icons in the Files pane.
 */
export default class FileIconManager extends IconManager {
	private containerEl: HTMLElement;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('file-menu', (menu, tFile) => {
			this.onContextMenu(tFile.path);
		}));
		this.plugin.registerEvent(this.app.workspace.on('files-menu', (menu, tFiles) => {
			this.onContextMenu(...tFiles.map(file => file.path));
		}));
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => {
			if (activeDocument.contains(this.containerEl)) return;
			this.app.workspace.iterateAllLeaves(leaf => this.manageLeaf(leaf));
		}));
		this.app.workspace.iterateAllLeaves(leaf => this.manageLeaf(leaf));
	}

	/**
	 * Start managing the given leaf if has a matching type.
	 */
	private manageLeaf(leaf: WorkspaceLeaf) {
		if (leaf.getViewState().type !== 'file-explorer') {
			return;
		} else if (this.containerEl) {
			this.stopMutationObserver(this.containerEl);
		}
		this.containerEl = leaf.view.containerEl.find(':scope > .nav-files-container > div');
		if (this.containerEl) this.setMutationObserver(this.containerEl, { subtree: true, childList: true }, mutations => {
			for (const mutation of mutations) {
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
	 * Refresh all file icons.
	 */
	refreshIcons(unloading?: boolean): void {
		const files = this.plugin.getFileItems(unloading);
		const itemEls = this.containerEl?.findAll(':scope > .tree-item');
		if (itemEls) this.refreshChildIcons(files, itemEls);
	}

	/**
	 * Refresh an array of file icons, including any subitems.
	 */
	private refreshChildIcons(files: FileItem[], itemEls: HTMLElement[]): void {
		for (const itemEl of itemEls) {
			itemEl.addClass('iconic-item');

			const selfEl = itemEl.find(':scope > .tree-item-self');
			const file = files.find(file => file.id === selfEl?.dataset.path);
			if (!file) continue;

			if (file.items) {
				if (!itemEl.hasClass('is-collapsed')) {
					const childItemEls = itemEl.findAll(':scope > .tree-item-children > .tree-item');
					if (childItemEls) this.refreshChildIcons(file.items, childItemEls);
				}

				// Refresh when folder expands/collapses
				this.setMutationObserver(itemEl, { attributeFilter: ['class'], attributeOldValue: true }, mutations => {
					for (const mutation of mutations) {
						if (mutation.target instanceof HTMLElement && mutation.target.hasClass('is-collapsed') !== mutation.oldValue?.includes('is-collapsed')) {
							const childItemEls = itemEl.findAll(':scope > .tree-item-children > .tree-item');
							if (file.items && childItemEls) {
								this.refreshChildIcons([file, ...file.items], [itemEl, ...childItemEls]);
							}
						}
					}
				});
			}

			let iconEl = selfEl.find(':scope > .tree-item-icon') ?? selfEl.createDiv({ cls: 'tree-item-icon' });

			if (file.items) {
				// Toggle default icon based on expand/collapse state
				if (file.iconDefault) file.iconDefault = iconEl.hasClass('is-collapsed')
					? 'lucide-folder-closed'
					: 'lucide-folder-open';
				let folderIconEl = selfEl.find(':scope > .iconic-folder-icon:not(.tree-item-icon)');
				if (this.plugin.settings.minimalFolderIcons || !this.plugin.settings.showAllFolderIcons && !file.icon && !file.iconDefault) {
					folderIconEl?.remove();
				} else {
					const arrowColor = file.icon || file.iconDefault ? null : file.color;
					this.refreshIcon({ icon: null, color: arrowColor }, iconEl);
					folderIconEl = folderIconEl ?? selfEl.createDiv({ cls: 'iconic-folder-icon' });
					if (iconEl.nextElementSibling !== folderIconEl) {
						iconEl.insertAdjacentElement('afterend', folderIconEl);
					}
					iconEl = folderIconEl;
				}
			}

			if (iconEl.hasClass('collapse-icon') && !file.icon && !file.iconDefault) {
				this.refreshIcon(file, iconEl); // Skip click listener if icon will be a collapse arrow
			} else if (this.plugin.isSettingEnabled('clickableIcons')) {
				this.refreshIcon(file, iconEl, event => {
					IconPicker.openSingle(this.plugin, file, (newIcon, newColor) => {
						this.plugin.saveFileIcon(file, newIcon, newColor);
						this.refreshIcons();
						this.plugin.tabIconManager?.refreshIcons();
						this.plugin.bookmarkIconManager?.refreshIcons();
					});
					event.stopPropagation();
				});
			} else {
				this.refreshIcon(file, iconEl);
			}

			// Update ghost icon when dragging
			this.setEventListener(selfEl, 'dragstart', () => {
				if (file.icon || file.iconDefault || file.color) {
					const ghostEl = activeDocument.body.find(':scope > .drag-ghost > .drag-ghost-self');
					if (ghostEl) {
						const spanEl = ghostEl.find('span');
						const ghostIcon = (file.category === 'folder' && file.icon === null)
							? 'lucide-folder-open'
							: file.icon || file.iconDefault;
						this.refreshIcon({ icon: ghostIcon, color: file.color }, ghostEl);
						ghostEl.appendChild(spanEl);
					}
				}
			});
		}
	}

	/**
	 * When user context-clicks a file, or opens a file pane menu, add custom items to the menu.
	 */
	private onContextMenu(...fileIds: string[]): void {
		this.plugin.menuManager.close();
		const files: FileItem[] = [];
		for (const fileId of fileIds) {
			files.push(this.plugin.getFileItem(fileId));
		}

		// Change icon(s)
		const changeTitle = files.length === 1
			? STRINGS.menu.changeIcon
			: STRINGS.menu.changeIcons.replace('{#}', files.length.toString());
		this.plugin.menuManager.addItemAfter(['action-primary', 'pane', 'close', 'open'], item => item
			.setTitle(changeTitle)
			.setIcon('lucide-image-plus')
			.setSection('icon')
			.onClick(() => {
				if (files.length === 1) {
					IconPicker.openSingle(this.plugin, files[0], (newIcon, newColor) => {
						this.plugin.saveFileIcon(files[0], newIcon, newColor);
						this.refreshIcons();
						this.plugin.tabIconManager?.refreshIcons();
						this.plugin.bookmarkIconManager?.refreshIcons();
					});
				} else {
					IconPicker.openMulti(this.plugin, files, (newIcon, newColor) => {
						this.plugin.saveFileIcons(files, newIcon, newColor);
						this.refreshIcons();
						this.plugin.tabIconManager?.refreshIcons();
						this.plugin.bookmarkIconManager?.refreshIcons();
					});
				}
			})
		);

		// Remove icon(s) / Reset color(s)
		const anyIcons = files.some(file => file.icon);
		const anyColors = files.some(file => file.color);
		const removalTitle = files.length === 1
			? files[0].icon
				? STRINGS.menu.removeIcon
				: STRINGS.menu.resetColor
			: anyIcons
				? STRINGS.menu.removeIcons.replace('{#}', files.length.toString())
				: STRINGS.menu.resetColors.replace('{#}', files.length.toString())
		const removalIcon = anyIcons ? 'lucide-image-minus' : 'lucide-rotate-ccw';
		if (anyIcons || anyColors) {
			this.plugin.menuManager.addItem(item => item
				.setTitle(removalTitle)
				.setIcon(removalIcon)
				.setSection('icon')
				.onClick(() => {
					if (files.length === 1) {
						this.plugin.saveFileIcon(files[0], null, null);
					} else {
						this.plugin.saveFileIcons(files, null, null);
					}
					this.refreshIcons();
					this.plugin.tabIconManager?.refreshIcons();
					this.plugin.bookmarkIconManager?.refreshIcons();
				})
			);
		}
	}
}
