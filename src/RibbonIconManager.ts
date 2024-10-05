import { Menu, Platform } from 'obsidian';
import IconicPlugin, { RibbonItem, STRINGS } from './IconicPlugin';
import IconManager from './IconManager';
import IconPicker from './IconPicker';

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
		this.setEventListener(containerEl, 'auxclick', event => event.stopPropagation(), { capture: true });
		this.setMutationObserver(containerEl, { childList: true }, () => this.refreshIcons());

		// Refresh ribbon context menu
		const ribbonEl = activeDocument.body.find(Platform.isDesktop
			? '.side-dock-ribbon.mod-left.workspace-ribbon'
			: '.side-dock-ribbon.mod-left.workspace-drawer-ribbon'
		);
		if (ribbonEl) this.setEventListener(ribbonEl, 'contextmenu', () => {
			const ribbonItems = this.plugin.getRibbonItems();
			this.plugin.menuManager.forSection('order', item => {
				const ribbonItem = ribbonItems[0];
				if (ribbonItem) {
					item.setIcon(ribbonItem.icon);
					// @ts-expect-error (Private API)
					this.refreshIcon(ribbonItem, item.iconEl);
					ribbonItems.shift();
				}
			});
		});

		// Watch for ribbon configuration dialog
		this.setMutationObserver(activeDocument.body, { childList: true }, mutations => {
			for (const mutation of mutations) {
				for (const addedNode of mutation.addedNodes) {
					// Very fragile dialog detection
					if (addedNode instanceof HTMLElement
						&& addedNode.hasClass('modal-container')
						&& addedNode.find('.modal-content > div > .mobile-option-setting-item')
						&& addedNode.find('.modal-content > .modal-button-container')) {
						this.refreshConfigIcons(addedNode);
					}
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
				this.refreshIcon(quickItem, ribbonButtonEl);
			} else {
				this.setEventListener(ribbonButtonEl, 'click', ribbonButtonListener);
			}
			this.setEventListener(ribbonButtonEl, 'contextmenu', ribbonButtonListener);
		} else {
			const ribbonItems = this.plugin.getRibbonItems(unloading);
			for (const ribbonItem of ribbonItems) {
				const iconEl = ribbonItem.iconEl;
				if (!iconEl) continue;
				if (ribbonItem.isHidden) {
					ribbonItem.icon = null;
					ribbonItem.iconDefault = null;
				}
				this.refreshIcon(ribbonItem, iconEl);
				this.setEventListener(iconEl, 'contextmenu', event => this.onContextMenu(ribbonItem.id, event));
			}
		}
	}

	/**
	 * Refresh all icons in the ribbon configuration dialog.
	 */
	private refreshConfigIcons(containerEl: HTMLElement) {
		if (Platform.isPhone) {
			const quickDropdownEl = containerEl.find('.setting-item-control > .dropdown');
			if (quickDropdownEl) this.setEventListener(quickDropdownEl, 'change', () => {
				this.refreshIcons();
				this.refreshConfigIcons(containerEl);
			});
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
		navigator.vibrate(100); // Might not be supported on iOS
		this.plugin.menuManager.close();
		const ribbonItem = this.plugin.getRibbonItem(ribbonItemId);

		// Change icon
		const menu = new Menu();
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

		menu.showAtMouseEvent(event);
	}
}
