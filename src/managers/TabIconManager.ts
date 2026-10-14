import { Platform } from 'obsidian';
import IconicPlugin, { Category, FileItem, TabItem, STRINGS } from 'src/IconicPlugin.js';
import IconManager from 'src/managers/IconManager.js';
import RuleEditor from 'src/dialogs/RuleEditor.js';
import IconPicker from 'src/dialogs/IconPicker.js';

/**
 * Handles icons in workspace tab headers.
 */
export default class TabIconManager extends IconManager {
	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => this.refreshIcons()));
		this.plugin.registerEvent(this.app.workspace.on('active-leaf-change', () => this.refreshIcons()));

		// Refresh icons in tab selector dropdowns ▼
		const tabListEls = activeDocument.body.findAll('.mod-root .workspace-tab-header-tab-list > .clickable-icon');
		for (const tabListEl of tabListEls) {
			this.setEventListener(tabListEl, 'click', () => {
				const tabsEl = tabListEl.closest('.workspace-tabs');
				const tabs = this.plugin.getTabItems().filter(tab => tabsEl?.contains(tab.tabEl));
				this.plugin.menuManager?.closeAndFlush();
				this.plugin.menuManager?.forSection('tablist', (item, i) => {
					const tab = tabs[i];
					if (!tab) return;
					// @ts-expect-error (Private API)
					const iconEl = item.iconEl;
					if (!(iconEl instanceof HTMLElement)) return;
					const rule = tab.category === 'file'
						? this.plugin.ruleManager?.checkRuling('file', tab.id) ?? tab
						: tab;
					rule.iconDefault = rule.iconDefault ?? 'lucide-file';
					this.refreshIcon(rule, iconEl);
				});
			});
		}

		// Refresh active tab icons when a mobile sidebar changes
		if (Platform.isMobile) {
			// @ts-expect-error (Private API)
			const leftTabsContainerEl: unknown = this.app.workspace.leftSplit.tabsContainerEl;
			if (leftTabsContainerEl instanceof HTMLElement) {
				this.setMutationObserver(leftTabsContainerEl, { childList: true }, () => {
					const activeTabs = this.plugin.getTabItems().filter(tab => tab.isActive);
					for (const activeTab of activeTabs) {
						this.refreshMobileSidebarActiveTab(activeTab, leftTabsContainerEl);
					}
				});
			}
			// @ts-expect-error (Private API)
			const rightTabsContainerEl: unknown = this.app.workspace.rightSplit.tabsContainerEl;
			if (rightTabsContainerEl instanceof HTMLElement) {
				this.setMutationObserver(rightTabsContainerEl, { childList: true }, () => {
					const activeTabs = this.plugin.getTabItems().filter(tab => tab.isActive);
					for (const activeTab of activeTabs) {
						this.refreshMobileSidebarActiveTab(activeTab, rightTabsContainerEl);
					}
				});
			}
		}

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
				? this.plugin.ruleManager?.checkRuling('file', tab.id, unloading) ?? tab
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
					if (addedNode.instanceOf(HTMLElement) && addedNode.hasClass('mod-pinned')) {
						this.refreshIcons();
						return;
					}
				}
				for (const removedNode of mutation.removedNodes) {
					if (removedNode.instanceOf(HTMLElement) && removedNode.hasClass('mod-pinned')) {
						this.refreshIcons();
						return;
					}
				}
			});
		}

		// Update active tabs in mobile sidebars
		if (Platform.isMobile) {
			const activeTabs = tabs.filter(tab => tab.isActive);

			for (const activeTab of activeTabs) {
				// @ts-expect-error (Private API)
				const leftTabsContainerEl: unknown = this.app.workspace.leftSplit.tabsContainerEl;
				if (leftTabsContainerEl instanceof HTMLElement) {
					this.refreshMobileSidebarActiveTab(activeTab, leftTabsContainerEl);
				}
				// @ts-expect-error (Private API)
				const rightTabsContainerEl: unknown = this.app.workspace.rightSplit.tabsContainerEl;
				if (rightTabsContainerEl instanceof HTMLElement) {
					this.refreshMobileSidebarActiveTab(activeTab, rightTabsContainerEl);
				}
			}
		}
	}

	/**
	 * Refresh the two copies of an active tab that appear in a mobile sidebar.
	 */
	private refreshMobileSidebarActiveTab(tab: TabItem, tabsContainerEl: HTMLElement): void {
		// Active tab on the drawer button
		const drawerTabEl = tabsContainerEl.find('.workspace-drawer-tab-options > .workspace-tab-header');
		if (drawerTabEl?.getText() === tab.name) {
			if (this.plugin.settings.showMenuActions) {
				this.setEventListener(drawerTabEl, 'contextmenu', () => this.onContextMenu(tab.id, tab.category));
			} else {
				this.stopEventListener(drawerTabEl, 'contextmenu');
			}
			const drawerIconEl = drawerTabEl.find('.workspace-tab-header-inner > .workspace-tab-header-inner-icon');
			if (drawerIconEl) this.refreshIcon(tab, drawerIconEl);
		}

		// Active tab inside the drawer list
		const listTabEl = tabsContainerEl.find(`.workspace-tab-header[data-type="${tab.id}"]`);
		if (listTabEl) {
			if (this.plugin.settings.showMenuActions) {
				this.setEventListener(listTabEl, 'contextmenu', () => this.onContextMenu(tab.id, tab.category));
			} else {
				this.stopEventListener(listTabEl, 'contextmenu');
			}
			const listIconEl = listTabEl.find('.workspace-tab-header-inner > .workspace-tab-header-inner-icon');
			if (listIconEl) this.refreshIcon(tab, listIconEl);
		}
	}

	/**
	 * When user context-clicks a tab, add custom items to the menu.
	 */
	private onContextMenu(tabId: string, tabCategory: Category) {
		this.plugin.menuManager?.closeAndFlush();

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
		this.plugin.menuManager?.flush();

		// Change icon
		this.plugin.menuManager?.addItemAfter('close', item => item
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
			this.plugin.menuManager?.addItem(item => item
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
		this.plugin.menuManager?.flush();

		// Change icon
		this.plugin.menuManager?.addItemAfter('close', item => item
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
			this.plugin.menuManager?.addItem(item => item
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
		const rule = this.plugin.ruleManager?.checkRuling('file', file.id);
		if (rule) {
			this.plugin.menuManager?.addItem(item => { item
				.setTitle(STRINGS.menu.editRule)
				.setIcon('lucide-image-play')
				.setSection('icon')
				.onClick(() => RuleEditor.open(this.plugin, 'file', rule, newRule => {
					const isRulingChanged = newRule
						? this.plugin.ruleManager?.saveRule('file', newRule)
						: this.plugin.ruleManager?.deleteRule('file', rule.id);
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
