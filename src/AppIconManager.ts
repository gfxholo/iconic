import { Menu, Platform } from "obsidian";
import IconicPlugin, { STRINGS } from "./IconicPlugin";
import IconManager from "./IconManager";
import IconPicker from "./IconPicker";

/**
 * Handles icons of system buttons in the window frame and vault switcher.
 */
export default class AppIconManager extends IconManager {
	private helpEl: HTMLElement | null;
	private settingsEl: HTMLElement | null;
	private pinEls: HTMLElement[];
	private sidebarLeftEls: HTMLElement[];
	private sidebarRightEl: HTMLElement | null;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => this.refreshIcons()));
		this.refreshIcons();
	}

	/**
	 * Refresh all app icons.
	 */
	refreshIcons(unloading?: boolean): void {
		// Help
		if (Platform.isDesktop) {
			this.helpEl = this.helpEl
				? this.helpEl
				: fish('.workspace-drawer-vault-actions > .clickable-icon:has(.svg-icon.help)');
			if (this.helpEl) {
				const helpItem = this.plugin.getAppItem('help', unloading);
				this.refreshIcon(helpItem, this.helpEl);
				this.setEventListener(this.helpEl, 'contextmenu', event => this.onContextMenu('help', event));
			}
		}

		// Settings
		if (Platform.isDesktop) {
			this.settingsEl = this.settingsEl
				? this.settingsEl
				: fish('.workspace-drawer-vault-actions > .clickable-icon:has(.svg-icon.lucide-settings)');
		} else {
			this.settingsEl = this.settingsEl
				? this.settingsEl
				: fish('.workspace-drawer-header-icon.mod-settings');
		}
		if (this.settingsEl) {
			const settingsItem = this.plugin.getAppItem('settings', unloading);
			this.refreshIcon(settingsItem, this.settingsEl);
			this.setEventListener(this.settingsEl, 'contextmenu', event => this.onContextMenu('settings', event));	
		}

		// Sidebar pins
		if (Platform.isMobile) {
			this.pinEls = this.pinEls?.length > 0
				? this.pinEls
				: fishAll('.workspace-drawer-header-icon.mod-pin');
			for (const pinEl of this.pinEls) {
				const pinItem = this.plugin.getAppItem('pin', unloading);
				this.refreshIcon(pinItem, pinEl);
				this.setEventListener(pinEl, 'contextmenu', event => this.onContextMenu('pin', event));
			}
		}

		// Left sidebar toggles
		this.sidebarLeftEls = this.sidebarLeftEls?.length > 0
			? this.sidebarLeftEls
			: fishAll('.sidebar-toggle-button.mod-left').concat(fishAll('.view-action.clickable-icon.mod-left-split-toggle'));
		for (const sidebarLeftEl of this.sidebarLeftEls) {
			const item = this.plugin.getAppItem('sidebarLeft', unloading);
			const iconEl = sidebarLeftEl.hasClass('clickable-icon') ? sidebarLeftEl : sidebarLeftEl.find(':scope > .clickable-icon');
			this.refreshIcon(item, iconEl);
			this.setEventListener(sidebarLeftEl, 'contextmenu', event => this.onContextMenu('sidebarLeft', event));
		}

		// Right sidebar toggle
		this.sidebarRightEl = this.sidebarRightEl
			? this.sidebarRightEl
			: fish('.sidebar-toggle-button.mod-right');
		if (this.sidebarRightEl) {
			const item = this.plugin.getAppItem('sidebarRight', unloading);
			const iconEl = this.sidebarRightEl.find(':scope > .clickable-icon');
			this.refreshIcon(item, iconEl);
			this.setEventListener(this.sidebarRightEl, 'contextmenu', event => this.onContextMenu('sidebarRight', event));
		}
	}

	/**
	 * When user context-clicks an app item, open a menu or add custom items to the existing menu.
	 */
	onContextMenu(appItemId: 'help' | 'settings' | 'pin' | 'sidebarLeft' | 'sidebarRight', event: MouseEvent) {
		navigator?.vibrate(100); // Might not be supported on iOS
		
		this.plugin.menuManager.close();
		const appItem = this.plugin.getAppItem(appItemId);
		const menu = appItemId.startsWith('sidebar') && !Platform.isPhone
			? this.plugin.menuManager
			: new Menu();
		if (appItemId.startsWith('sidebar')) menu.addSeparator();

		// Change icon
		menu.addItem(menuItem => menuItem
			.setTitle(STRINGS.menu.changeIcon)
			.setIcon('lucide-image-plus')
			.onClick(() => IconPicker.openSingle(this.plugin, appItem, (newIcon, newColor) => {
				this.plugin.saveAppIcon(appItem, newIcon, newColor);
				this.refreshIcons();
			}))
		);

		// Remove icon / Reset color
		if (appItem.icon || appItem.color) {
			menu.addItem(menuItem => menuItem
				.setTitle(appItem.icon ? STRINGS.menu.removeIcon : STRINGS.menu.resetColor)
				.setIcon(appItem.icon ? 'lucide-image-minus' : 'lucide-rotate-ccw')
				.onClick(() => {
					this.plugin.saveAppIcon(appItem, null, null);
					this.refreshIcons();
				})
			);
		}

		if (menu instanceof Menu) menu.showAtMouseEvent(event);
	}
}
