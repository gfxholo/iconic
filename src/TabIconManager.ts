import { Platform } from 'obsidian';
import IconicPlugin, { FileItem, STRINGS, TabItem } from './IconicPlugin';
import IconManager from './IconManager';
import IconPicker from './IconPicker';

/**
 * Handles icons in workspace tab headers.
 */
export default class TabIconManager extends IconManager {
	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => this.refreshIcons()));
		// @ts-expect-error (Private API)
		if (this.app.plugins?.plugins?.['obsidian-icon-folder']) {
			this.plugin.registerEvent(this.app.workspace.on('active-leaf-change', () => {
				this.refreshIcons();
			}));
		}
		this.refreshIcons();
	}

	/**
	 * Refresh all tab icons.
	 */
	refreshIcons(unloading?: boolean): void {
		const tabs = this.plugin.getTabItems(unloading);

		for (const tab of tabs) {
			const tabEl = tab.tabEl;
			const iconEl = tab.iconEl;
			if (!tabEl || !iconEl) continue;

			if (tab.isRoot) {
				let onClick: (event: MouseEvent) => any;
				if (tab.isFile) {
					const file = this.plugin.getFileItem(tab.id);
					onClick = event => {
						IconPicker.openSingle(this.plugin, file, (newIcon, newColor) => {
							this.plugin.saveFileIcon(file, newIcon, newColor);
							this.refreshIcons();
							this.plugin.fileIconManager?.refreshIcons();
							this.plugin.bookmarkIconManager?.refreshIcons();
						});
						event.stopPropagation();
					};
				} else {
					onClick = event => {
						IconPicker.openSingle(this.plugin, tab, (newIcon, newColor) => {
							this.plugin.saveTabIcon(tab, newIcon, newColor);
							this.refreshIcons();
						});
						event.stopPropagation();
					}
				}
				this.refreshIcon(tab, iconEl, onClick);
			} else {
				this.refreshIcon(tab, iconEl);
			}

			// Set menu listener for tabs not handled by workspace.on('file-menu')
			if (!tab.isFile || !tabEl.hasClass('is-active')) {
				this.setEventListener(tabEl, 'contextmenu', () => this.onContextMenu(tab.id, tab.isFile));
			}

			if (Platform.isMobile) {
				// @ts-expect-error (Private API)
				this.setEventListener(this.app.workspace.leftSplit.activeTabSelectEl, 'change', () => this.refreshIcons());
				// @ts-expect-error (Private API)
				this.setEventListener(this.app.workspace.rightSplit.activeTabSelectEl, 'change', () => this.refreshIcons());

				// @ts-expect-error (Private API)
				if (this.app.workspace.leftSplit.activeTabIconEl === iconEl) {
					// @ts-expect-error (Private API)
					this.setEventListener(this.app.workspace.leftSplit.activeTabHeaderEl, 'contextmenu', () => this.onContextMenu(tab.id, tab.isFile));
					// @ts-expect-error (Private API)
				} else if (this.app.workspace.rightSplit.activeTabIconEl === iconEl) {
					// @ts-expect-error (Private API)
					this.setEventListener(this.app.workspace.rightSplit.activeTabHeaderEl, 'contextmenu', () => this.onContextMenu(tab.id, tab.isFile));
				}
			}
		}
	}

	/**
	 * When user context-clicks a tab, add custom items to the menu.
	 */
	private onContextMenu(tabId: string, isFile: boolean) {
		this.plugin.menuManager.close();

		if (isFile) {
			const file = this.plugin.getFileItem(tabId);
			if (file) this.onFileContextMenu(file)
		} else {
			const tab = this.plugin.getTabItem(tabId);
			if (tab) this.onTabContextMenu(tab);
		}
	}

	/**
	 * Add custom items to a tab menu.
	 */
	private onTabContextMenu(tab: TabItem): void {
		// Change icon
		this.plugin.menuManager.addItemBetween('close', 'pane', item => item
			.setTitle(STRINGS.menu.changeIcon)
			.setIcon('lucide-image-plus')
			.setSection('icon')
			.onClick(() => IconPicker.openSingle(this.plugin, tab, (newIcon, newColor) => {
				this.plugin.saveTabIcon(tab, newIcon, newColor);
				this.refreshIcons();
			}))
		);

		// Remove icon / Reset color
		if (tab.icon || tab.color) {
			this.plugin.menuManager.addItem(item => item
				.setTitle(tab.icon ? STRINGS.menu.removeIcon : STRINGS.menu.resetColor)
				.setIcon(tab.icon ? 'lucide-image-minus' : 'lucide-rotate-ccw')
				.setSection('icon')
				.onClick(() => {
					this.plugin.saveTabIcon(tab, null, null);
					this.refreshIcons();
				})
			);
		}
	}

	/**
	 * Add custom items to a file tab menu.
	 */
	private onFileContextMenu(file: FileItem): void {
		// Change icon
		this.plugin.menuManager.addItemBetween('close', 'pane', item => item
			.setTitle(STRINGS.menu.changeIcon)
			.setIcon('lucide-image-plus')
			.setSection('icon')
			.onClick(() => IconPicker.openSingle(this.plugin, file, (newIcon, newColor) => {
				this.plugin.saveFileIcon(file, newIcon, newColor);
				this.refreshIcons();
				this.plugin.fileIconManager?.refreshIcons();
				this.plugin.bookmarkIconManager?.refreshIcons();
			}))
		);

		// Remove icon / Reset color
		if (file.icon || file.color) {
			this.plugin.menuManager.addItem(item => item
				.setTitle(file.icon ? STRINGS.menu.removeIcon : STRINGS.menu.resetColor)
				.setIcon(file.icon ? 'lucide-image-minus' : 'lucide-rotate-ccw')
				.setSection('icon')
				.onClick(() => {
					this.plugin.saveFileIcon(file, null, null);
					this.refreshIcons();
					this.plugin.fileIconManager?.refreshIcons();
					this.plugin.bookmarkIconManager?.refreshIcons();
				})
			);
		}
	}
}
