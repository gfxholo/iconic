import { Menu, Platform } from 'obsidian';
import IconicPlugin, { RibbonItem, STRINGS } from 'src/IconicPlugin';
import MenuManager from './MenuManager';
import IconManager from 'src/managers/IconManager';
import IconPicker from 'src/dialogs/IconPicker';

/**
 * Handles icons in the app ribbon.
 */
export default class RibbonIconManager extends IconManager {
	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.refreshIcons();

		// @ts-expect-error (Private API)
		const containerEl: HTMLElement = this.app.workspace.leftRibbon.ribbonItemsEl;

		// Prevent ribbon from eating auxclick events
		this.setEventListener(containerEl, 'auxclick', event => {
			event.stopPropagation();
		}, { capture: true });
		this.setMutationsObserver(containerEl, { childList: true }, () => this.refreshIcons());

		// Refresh ribbon context menu
		const ribbonEl = activeDocument.body.find(Platform.isDesktop
			? '.side-dock-ribbon.mod-left.workspace-ribbon'
			: '.side-dock-ribbon.mod-left.workspace-drawer-ribbon'
		);
		if (ribbonEl) this.setEventListener(ribbonEl, 'contextmenu', () => {
			const ribbonItems = this.plugin.getRibbonItems();
			this.plugin.menuManager.forSection('order', item => {
				const ribbonItem = ribbonItems[0];
				// @ts-expect-error (Private API)
				if (ribbonItem && item.iconEl.childElementCount > 0) { // Ribbon Divider compatibility
					item.setIcon(ribbonItem.icon);
					// @ts-expect-error (Private API)
					this.refreshIcon(ribbonItem, item.iconEl);
					ribbonItems.shift();
				}
			});
		});

		// Watch for ribbon configuration dialog
		this.setMutationObserver(activeDocument.body, { childList: true }, mutation => {
			for (const addedNode of mutation.addedNodes) {
				// Very fragile dialog detection
				if (addedNode instanceof HTMLElement
					&& addedNode.hasClass('modal-container')
					&& addedNode.find('.modal-content > div > .mobile-option-setting-item')
					&& addedNode.find('.modal-content > .modal-button-container')) {
					this.refreshConfigIcons(addedNode);
				}
			}
		});
	}

	/**
	 * Refresh all ribbon icons.
	 */
	refreshIcons(unloading?: boolean): void {
		if (Platform.isPhone) {
			// @ts-expect-error (Private API)
			const ribbonButtonEl = this.app.mobileNavbar.ribbonMenuItemEl;
			if (!ribbonButtonEl) return;

			// @ts-expect-error (Private API)
			const quickItemId = this.app.vault.getConfig('mobileQuickRibbonItem');
			const ribbonButtonListener = () => {
				const ribbonItems = this.plugin.getRibbonItems().filter(item => !item.isHidden);
				this.plugin.menuManager.forSection('', item => {
					const ribbonItem = ribbonItems[0];
					if (ribbonItem) {
						item.setIcon(ribbonItem.icon);
						// @ts-expect-error (Private API)
						this.refreshIcon(ribbonItem, item.iconEl);
						ribbonItems.shift();
					}
				});
			}
			if (quickItemId) {
				const quickItem = this.plugin.getRibbonItem(quickItemId);
				if (this.plugin.settings.uncolorQuick) quickItem.color = null;
				this.refreshIcon(quickItem, ribbonButtonEl);
			} else {
				this.setEventListener(ribbonButtonEl, 'click', ribbonButtonListener);
			}
			this.setEventListener(ribbonButtonEl, 'contextmenu', ribbonButtonListener);
		} else {
			const ribbonItems = this.plugin.getRibbonItems(unloading);
			for (const ribbonItem of ribbonItems) {
				const iconEl = ribbonItem.iconEl;
				if (!iconEl || iconEl.hasClass('ribbon-divider')) { // Ribbon Divider compatibility
					continue;
				}
				if (ribbonItem.isHidden) {
					ribbonItem.icon = null;
					ribbonItem.iconDefault = null;
				}
				this.refreshIcon(ribbonItem, iconEl);

				// Add context menu
				if (this.plugin.settings.showMenuActions) {
					this.setEventListener(iconEl, 'contextmenu', event => {
						this.onContextMenu(ribbonItem.id, event);
					}, { capture: true });
				} else {
					this.stopEventListener(iconEl, 'contextmenu');
				}
			}
		}
	}

	/**
	 * Refresh all icons in the ribbon configuration dialog.
	 */
	private refreshConfigIcons(containerEl: HTMLElement): void {
		if (Platform.isPhone) {
			const quickDropdownEl = containerEl.find('.setting-item-control > .dropdown');
			if (quickDropdownEl) this.setEventListener(quickDropdownEl, 'change', () => {
				this.refreshIcons();
				this.refreshConfigIcons(containerEl);
			});

			// @ts-expect-error (Private API)
			const quickItemId = this.app.vault.getConfig('mobileQuickRibbonItem');
			if (quickItemId) {
				const quickItem = this.plugin.getRibbonItem(quickItemId);
				const quickIconEl = containerEl.find('.setting-item-control > .extra-setting-button');
				this.refreshIcon(quickItem, quickIconEl, () => {
					IconPicker.openSingle(this.plugin, quickItem, (newIcon, newColor) => {
						this.plugin.saveRibbonIcon(quickItem, newIcon, newColor);
						this.refreshConfigIcons(containerEl);
						this.refreshIcons();
					});
				});
			}
		}

		const iconEls = containerEl.findAll('.mobile-option-setting-item-option-icon:not(.mobile-option-setting-drag-icon)');
		if (iconEls.length === 0) return;

		const ribbonItems = this.plugin.getRibbonItems();
		const visibleItems = ribbonItems.filter(item => !item.isHidden);
		const hiddenItems = ribbonItems.filter(item => item.isHidden);
		const visibleEls = containerEl.findAll('.mobile-option-setting-item:has(.mobile-option-setting-item-remove-icon)');
		const hiddenEls = containerEl.findAll('.mobile-option-setting-item:has(.mobile-option-setting-item-add-icon)');

		const configItems = [
			...visibleItems.map((item, i) => [item, visibleEls[i], 'mobile-option-setting-item-remove-icon'] as [RibbonItem, HTMLElement, string]),
			...hiddenItems.map((item, i) => [item, hiddenEls[i], 'mobile-option-setting-item-add-icon'] as [RibbonItem, HTMLElement, string])
		];

		for (const [item, itemEl, buttonClass] of configItems) {
			const iconEl = itemEl.find(':scope > .mobile-option-setting-item-option-icon');
			if (!iconEl || iconEl.childElementCount === 0) { // Ribbon Divider compatibility
				continue;
			}
			const buttonEl = itemEl.find(':scope > .' + buttonClass);
			this.refreshIcon(item, iconEl, event => {
				IconPicker.openSingle(this.plugin, item, (newIcon, newColor) => {
					this.plugin.saveRibbonIcon(item, newIcon, newColor);
					this.refreshIcons();
					this.refreshConfigIcons(containerEl);
				});
				event.stopPropagation();
			});
			this.setEventListener(buttonEl, 'click', () => this.refreshConfigIcons(containerEl));
		}
	}

	/**
	 * When user context-clicks a ribbon command, open a menu.
	 */
	private onContextMenu(ribbonItemId: string, event: MouseEvent): void {
		navigator?.vibrate(100); // Not supported on iOS
		this.plugin.menuManager.closeAndFlush();
		const ribbonItem = this.plugin.getRibbonItem(ribbonItemId);

		// Menu compatibility with Periodic Notes plugin
		let menu: Menu | MenuManager;
		if (ribbonItemId.startsWith('periodic-notes:')) {
			menu = this.plugin.menuManager;
			menu.forSection('', menuItem => menuItem.setSection('open'));
		} else {
			menu = new Menu();
		}

		// Change icon
		menu.addItem(menuItem => menuItem
			.setTitle(STRINGS.menu.changeIcon)
			.setIcon('lucide-image-plus')
			.setSection('icon')
			.onClick(() => IconPicker.openSingle(this.plugin, ribbonItem, (newIcon, newColor) => {
				this.plugin.saveRibbonIcon(ribbonItem, newIcon, newColor);
				this.refreshIcons();
			}))
		);

		// Remove icon / Reset color
		if (ribbonItem.icon || ribbonItem.color) {
			menu.addItem(menuItem => menuItem
				.setTitle(ribbonItem.icon ? STRINGS.menu.removeIcon : STRINGS.menu.resetColor)
				.setIcon(ribbonItem.icon ? 'lucide-image-minus' : 'lucide-rotate-ccw')
				.setSection('icon')
				.onClick(() => {
					this.plugin.saveRibbonIcon(ribbonItem, null, null);
					this.refreshIcons();
				})
			);
		}

		if (menu instanceof Menu) menu.showAtMouseEvent(event);
	}
}
