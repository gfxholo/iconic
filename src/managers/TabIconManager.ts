import { Platform, WorkspaceMobileDrawer } from 'obsidian';
import IconicPlugin, { FileItem, TabItem, STRINGS } from 'src/IconicPlugin';
import IconManager from './IconManager';
import RuleEditor from 'src/dialogs/RuleEditor';
import IconPicker from 'src/dialogs/IconPicker';

/**
 * Handles icons in workspace tab headers.
 */
export default class TabIconManager extends IconManager {
	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => this.refreshIcons()));
		this.plugin.registerEvent(this.app.workspace.on('active-leaf-change', () => this.refreshIcons()));

		// Refresh dropdown tab list
		const tabListEl = activeDocument.body.find('.mod-root .workspace-tab-header-tab-list > .clickable-icon');
		if (tabListEl) this.setEventListener(tabListEl, 'click', () => {
			const tabs = this.plugin.getTabItems().filter(tab => tab.isRoot);
			this.plugin.menuManager.forSection('tablist', (item, i) => {
				const tab = tabs[i];
				if (tab) {
					tab.iconDefault = tab.iconDefault ?? 'lucide-file';
					this.refreshIcon(tab, item.iconEl);
				}
			});
		});

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

			// Check for an icon ruling
			const rule = tab.isFile
				? this.plugin.ruleManager.checkRuling('file', tab.id, unloading) ?? tab
				: tab;

			if (tab.isRoot && this.plugin.isSettingEnabled('clickableIcons')) {
				if (tab.isFile) {
					const file = this.plugin.getFileItem(tab.id);
					this.refreshIcon(rule, iconEl, event => {
						IconPicker.openSingle(this.plugin, file, (newIcon, newColor) => {
							this.plugin.saveFileIcon(file, newIcon, newColor);
							this.refreshIcons();
							this.plugin.fileIconManager?.refreshIcons();
							this.plugin.bookmarkIconManager?.refreshIcons();
						});
						event.stopPropagation();
					});
				} else {
					this.refreshIcon(rule, iconEl, event => {
						IconPicker.openSingle(this.plugin, tab, (newIcon, newColor) => {
							this.plugin.saveTabIcon(tab, newIcon, newColor);
							this.refreshIcons();
						});
						event.stopPropagation();
					});
				}
			} else {
				this.refreshIcon(rule, iconEl);
			}

			// Update ghost icon when dragging
			this.setEventListener(tabEl, 'dragstart', () => {
				if (rule.icon || rule.iconDefault) {
					const ghostEl = activeDocument.body.find(':scope > .drag-ghost > .drag-ghost-icon');
					if (ghostEl) {
						this.refreshIcon({ icon: rule.icon ?? rule.iconDefault, color: rule.color }, ghostEl);
					}
				}
			});

			// Skip menu listener if tab is handled by workspace.on('file-menu')
			if (tab.isFile && (tab.isActive || tab.isStacked)) {
				this.stopEventListener(tabEl, 'contextmenu');
			} else {
				this.setEventListener(tabEl, 'contextmenu', () => this.onContextMenu(tab.id, tab.isFile));
			}

			// Refresh when tab is pinned/unpinned
			const statusEl = tabEl.find(':scope > .workspace-tab-header-inner > .workspace-tab-header-status-container');
			this.setMutationObserver(statusEl, { childList: true }, mutation => {
				for (const addedNode of mutation.addedNodes) {
					if (addedNode instanceof HTMLElement && addedNode.hasClass('mod-pinned')) {
						this.refreshIcons();
						return;
					}
				}
				for (const removedNode of mutation.removedNodes) {
					if (removedNode instanceof HTMLElement && removedNode.hasClass('mod-pinned')) {
						this.refreshIcons();
						return;
					}
				}
			});

			// Update mobile sidebars
			if (Platform.isMobile) {
				const { leftSplit, rightSplit } = this.app.workspace;
				if (leftSplit instanceof WorkspaceMobileDrawer) {
					this.setEventListener(leftSplit.activeTabSelectEl, 'change', () => this.refreshIcons());
					if (leftSplit.activeTabIconEl === iconEl) {
						this.setEventListener(leftSplit.activeTabHeaderEl, 'contextmenu', () => this.onContextMenu(tab.id, tab.isFile));
					}
				}
				if (rightSplit instanceof WorkspaceMobileDrawer) {
					this.setEventListener(rightSplit.activeTabSelectEl, 'change', () => this.refreshIcons());
					if (rightSplit.activeTabIconEl === iconEl) {
						this.setEventListener(rightSplit.activeTabHeaderEl, 'contextmenu', () => this.onContextMenu(tab.id, tab.isFile));
					}
				}
			}
		}
	}

	/**
	 * When user context-clicks a tab, add custom items to the menu.
	 */
	private onContextMenu(tabId: string, isFile: boolean) {
		this.plugin.menuManager.closeAndFlush();

		if (isFile) {
			this.onFileContextMenu(this.plugin.getFileItem(tabId));
		} else {
			const tab = this.plugin.getTabItem(tabId);
			if (tab) this.onTabContextMenu(tab);
		}
	}

	/**
	 * Add custom items to a tab menu.
	 */
	private onTabContextMenu(tab: TabItem): void {
		this.plugin.menuManager.flush();

		// Change icon
		this.plugin.menuManager.addItemAfter('close', item => item
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
		this.plugin.menuManager.flush();

		// Change icon
		this.plugin.menuManager.addItemAfter('close', item => item
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

		// Edit rule
		const rule = this.plugin.ruleManager.checkRuling('file', file.id);
		if (rule) {
			this.plugin.menuManager.addItem(item => { item
				.setTitle(STRINGS.menu.editRule)
				.setIcon('lucide-image-play')
				.setSection('icon')
				.onClick(() => RuleEditor.open(this.plugin, 'file', rule, newRule => {
					const isRulingChanged = newRule
						? this.plugin.ruleManager.saveRule('file', newRule)
						: this.plugin.ruleManager.deleteRule('file', rule.id);
					if (isRulingChanged) {
						this.refreshIcons();
						this.plugin.fileIconManager?.refreshIcons();
						this.plugin.bookmarkIconManager?.refreshIcons();
					}
				}));
			});
		}
	}
}
