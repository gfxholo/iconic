import { Platform } from 'obsidian';
import IconicPlugin, { Category, FileItem, TabItem, STRINGS } from 'src/IconicPlugin';
import IconManager from 'src/managers/IconManager';
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

		// Refresh icons in tab selector dropdown ▼
		const tabListEl = activeDocument.body.find('.mod-root .workspace-tab-header-tab-list > .clickable-icon');
		if (tabListEl) this.setEventListener(tabListEl, 'click', () => {
			const tabs = this.plugin.getTabItems().filter(tab => tab.isRoot);
			this.plugin.menuManager.forSection('tablist', (item, i) => {
				const tab = tabs[i];
				if (!tab) return;
				if (tab.category === 'file') {
					const rule = this.plugin.ruleManager.checkRuling('file', tab.id) ?? tab;
					rule.iconDefault = rule.iconDefault ?? 'lucide-file';
					// @ts-expect-error (Private API)
					this.refreshIcon(rule, item.iconEl);
				} else {
					tab.iconDefault = tab.iconDefault ?? 'lucide-file';
					// @ts-expect-error (Private API)
					this.refreshIcon(tab, item.iconEl);
				}
			});
		});

		this.refreshIcons();
	}

	/**
	 * @override
	 * Refresh all tab icons.
	 */
	refreshIcons(unloading?: boolean): void {
		const tabs = this.plugin.getTabItems(unloading);

		for (const tab of tabs) {
			const tabEl = tab.tabEl;
			const iconEl = tab.iconEl;
			if (!tabEl || !iconEl || tab.id === 'webviewer') continue;

			// Check for an icon ruling
			const rule = tab.category === 'file'
				? this.plugin.ruleManager.checkRuling('file', tab.id, unloading) ?? tab
				: tab;

			if (tab.isRoot && this.plugin.isSettingEnabled('clickableIcons')) {
				if (tab.category === 'file') {
					const file = this.plugin.getFileItem(tab.id);
					this.refreshIcon(rule, iconEl, event => {
						IconPicker.openSingle(this.plugin, file, (newIcon, newColor) => {
							this.plugin.saveFileIcon(file, newIcon, newColor);
							this.plugin.refreshManagers('file');
						});
						event.stopPropagation();
					});
				} else {
					this.refreshIcon(rule, iconEl, event => {
						IconPicker.openSingle(this.plugin, tab, (newIcon, newColor) => {
							this.plugin.saveTabIcon(tab, newIcon, newColor);
							this.plugin.refreshManagers('tab');
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
					const ghostEl = tabEl.doc.body.find(':scope > .drag-ghost > .drag-ghost-icon');
					if (ghostEl) {
						this.refreshIcon({ icon: rule.icon ?? rule.iconDefault, color: rule.color }, ghostEl);
					}
				}
			});

			// Skip menu listener if tab is handled by workspace.on('file-menu')
			if (!this.plugin.settings.showMenuActions || tab.category === 'file' && (tab.isActive || tab.isStacked)) {
				this.stopEventListener(tabEl, 'contextmenu');
			} else {
				this.setEventListener(tabEl, 'contextmenu', () => this.onContextMenu(tab.id, tab.category));
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
				// @ts-expect-error (Private API)
				this.setEventListener(this.app.workspace.leftSplit.activeTabSelectEl, 'change', () => this.refreshIcons());
				// @ts-expect-error (Private API)
				this.setEventListener(this.app.workspace.rightSplit.activeTabSelectEl, 'change', () => this.refreshIcons());

				// @ts-expect-error (Private API)
				if (this.app.workspace.leftSplit.activeTabIconEl === iconEl) {
					// @ts-expect-error (Private API)
					const leftActiveTabEl = this.app.workspace.leftSplit.activeTabHeaderEl;
					if (this.plugin.settings.showMenuActions) {
						this.setEventListener(leftActiveTabEl, 'contextmenu', () => {
							this.onContextMenu(tab.id, tab.category);
						});
					} else {
						this.stopEventListener(leftActiveTabEl, 'contextmenu');
					}
					// @ts-expect-error (Private API)
				} else if (this.app.workspace.rightSplit.activeTabIconEl === iconEl) {
					// @ts-expect-error (Private API)
					const rightActiveTabEl = this.app.workspace.rightSplit.activeTabHeaderEl;
					if (this.plugin.settings.showMenuActions) {
						this.setEventListener(rightActiveTabEl, 'contextmenu', () => {
							this.onContextMenu(tab.id, tab.category);
						});
					} else {
						this.stopEventListener(rightActiveTabEl, 'contextmenu');
					}
				}
			}
		}
	}

	/**
	 * When user context-clicks a tab, add custom items to the menu.
	 */
	private onContextMenu(tabId: string, tabCategory: Category) {
		this.plugin.menuManager.closeAndFlush();

		if (tabCategory === 'file') {
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
				this.plugin.refreshManagers('tab');
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
					this.plugin.refreshManagers('tab');
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
				this.plugin.refreshManagers('file');
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
					this.plugin.refreshManagers('file');
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
						this.plugin.refreshManagers('file');
					}
				}));
			});
		}
	}

	/**
	 * @override
	 */
	unload(): void {
		this.refreshIcons(true);
		super.unload();
	}
}
