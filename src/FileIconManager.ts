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
	refreshChildIcons(files: FileItem[], itemEls: HTMLElement[]): void {
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

				// Refresh children when folder expands
				this.setMutationObserver(itemEl, { attributeFilter: ['class'] }, mutations => {
					if (file.items) for (const mutation of mutations) {
						if (mutation.target instanceof HTMLElement && !mutation.target.hasClass('is-collapsed')) {
							const childItemEls = itemEl.findAll(':scope > .tree-item-children > .tree-item');
							if (childItemEls) this.refreshChildIcons(file.items, childItemEls);
						}
					}
				});

				continue;
			}

			let iconEl = selfEl.find(':scope > .tree-item-icon');
			if (!iconEl) iconEl = selfEl.createDiv({ cls: 'tree-item-icon' });
			this.refreshIcon(file, iconEl, event => {
				IconPicker.openSingle(this.plugin, file, (newIcon, newColor) => {
					this.plugin.saveFileIcon(file, newIcon, newColor);
					this.refreshIcons();
					this.plugin.tabIconManager?.refreshIcons();
					this.plugin.bookmarkIconManager?.refreshIcons();
				});
				event.stopPropagation();
			});

			this.setEventListener(itemEl, 'contextmenu', () => this.onContextMenu(file.id));
		}
	}

	/**
	 * When user context-clicks a file, add custom items to the menu.
	 */
	private onContextMenu(clickedFileId: string): void {
		this.plugin.menuManager.close();
		const clickedFile: FileItem = this.plugin.getFileItem(clickedFileId);
		const selectedFiles: FileItem[] = [];
		
		for (const selfEl of this.containerEl?.findAll('.tree-item-self.is-selected') ?? []) {
			if (selfEl.dataset.path) {
				selectedFiles.push(this.plugin.getFileItem(selfEl.dataset.path));
			}
		}

		// If clicked file is not selected, ignore selected items
		if (!selectedFiles.some(selectedFile => selectedFile.id === clickedFile.id)) {
			selectedFiles.length = 0;
		}

		// Change icon(s)
		const changeTitle = selectedFiles.length < 2
			? STRINGS.menu.changeIcon
			: STRINGS.menu.changeIcons.replace('{#}', selectedFiles.length.toString());
		this.plugin.menuManager.addItemBetween('open', 'action', item => item
			.setTitle(changeTitle)
			.setIcon('lucide-image-plus')
			.setSection('icon')
			.onClick(() => {
				if (selectedFiles.length < 2) {
					IconPicker.openSingle(this.plugin, clickedFile, (newIcon, newColor) => {
						this.plugin.saveFileIcon(clickedFile, newIcon, newColor);
						this.refreshIcons();
						this.plugin.tabIconManager?.refreshIcons();
						this.plugin.bookmarkIconManager?.refreshIcons();
					});
				} else {
					IconPicker.openMulti(this.plugin, selectedFiles, (newIcon, newColor) => {
						this.plugin.saveFileIcons(selectedFiles, newIcon, newColor);
						this.refreshIcons();
						this.plugin.tabIconManager?.refreshIcons();
						this.plugin.bookmarkIconManager?.refreshIcons();
					});
				}
			})
		);

		// Remove icon(s) / Reset color(s)
		const anySelectedIcons = selectedFiles.some(file => file.icon);
		const anySelectedColors = selectedFiles.some(file => file.color);
		const removeTitle = selectedFiles.length < 2
			? clickedFile.icon
				? STRINGS.menu.removeIcon
				: STRINGS.menu.resetColor
			: anySelectedIcons
				? STRINGS.menu.removeIcons.replace('{#}', selectedFiles.length.toString())
				: STRINGS.menu.resetColors.replace('{#}', selectedFiles.length.toString())
		const removeIcon = clickedFile.icon || anySelectedIcons ? 'lucide-image-minus' : 'lucide-rotate-ccw';
		if (clickedFile.icon || clickedFile.color || anySelectedIcons || anySelectedColors) {
			this.plugin.menuManager.addItem(item => item
				.setTitle(removeTitle)
				.setIcon(removeIcon)
				.setSection('icon')
				.onClick(() => {
					if (selectedFiles.length < 2) {
						this.plugin.saveFileIcon(clickedFile, null, null);
					} else {
						this.plugin.saveFileIcons(selectedFiles, null, null);
					}
					this.refreshIcons();
					this.plugin.tabIconManager?.refreshIcons();
					this.plugin.bookmarkIconManager?.refreshIcons();
				})
			);
		}
	}
}
