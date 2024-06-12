import { Menu } from 'obsidian';
import IconicPlugin, { STRINGS } from './IconicPlugin';
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
		// Prevent app from eating auxclick events
		this.setEventListener(containerEl, 'auxclick', event => event.stopPropagation(), { capture: true });
		this.setMutationObserver(containerEl, { childList: true }, () => this.refreshIcons());
	}

	/**
	 * Refresh all ribbon icons.
	 */
	refreshIcons(unloading?: boolean): void {
		const ribbonItems = this.plugin.getRibbonItems(unloading);
		for (const ribbonItem of ribbonItems) {
			const iconEl = ribbonItem.iconEl;
			if (!iconEl) continue;
			this.refreshIcon(ribbonItem, iconEl);
			this.setEventListener(iconEl, 'contextmenu', event => this.onContextMenu(ribbonItem.id, event));
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
