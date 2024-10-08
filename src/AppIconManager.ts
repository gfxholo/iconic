import { Menu, Platform } from 'obsidian';
import IconicPlugin, { STRINGS, AppItemId } from './IconicPlugin';
import IconManager from './IconManager';
import IconPicker from './IconPicker';
import ColorUtils from './ColorUtils';

const SVG_INFO = { attr: { 'aria-hidden': false, width: 12, height: 12, viewBox: '0 0 12 12' } };
const MINIMIZE_RECT = { attr: { fill: 'currentColor', width: 10, height: 1, x: 1, y: 6 } };
const MAXIMIZE_RECT = { attr: { width: 9, height: 9, x: 1.5, y: 1.5, fill: 'none', stroke: 'currentColor' } };
const UNMAXIMIZE_PATH_1 = { attr: { d: 'M1.5 3.5H8.5V10.5H1.5V3.5Z', stroke: 'currentColor' } };
const UNMAXIMIZE_PATH_2 = { attr: { d: 'M4 2H10V8H9V9H11V1H3V3H4V2Z', fill: 'currentColor' } };
const CLOSE_PATH_1 = { attr: { fill: 'currentColor', 'fill-rule': 'evenodd', d: 'M10.052 10.968 1.03 1.93l.849-.848 9.023 9.037-.849.848Z' } };
const CLOSE_PATH_2 = { attr: { fill: 'currentColor', 'fill-rule': 'evenodd', d: 'M1.023 10.112 10.06 1.09l.848.85-9.037 9.023-.848-.85Z' } };

/**
 * Handles icons of system buttons in the window frame and vault switcher.
 */
export default class AppIconManager extends IconManager {
	private helpEl: HTMLElement | null;
	private settingsEl: HTMLElement | null;
	private pinEls: HTMLElement[] = [];
	private sidebarLeftEls: HTMLElement[] = [];
	private sidebarRightEl: HTMLElement | null;
	private minimizeEl: HTMLElement | null;
	private maximizeEl: HTMLElement | null;
	private closeEl: HTMLElement | null;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => this.refreshIcons()));
		this.refreshIcons();
	}

	/**
	 * Refresh all app icons.
	 * 
	 * Some button elements get replaced by the app when switching workspaces,
	 * so always confirm icons from a previous refresh are still attached to the DOM.
	 */
	refreshIcons(unloading?: boolean): void {
		// Help
		if (Platform.isDesktop) {
			if (!activeDocument.contains(this.helpEl)) {
				this.stopEventListener(this.helpEl, 'contextmenu');
				this.helpEl = fish('.workspace-drawer-vault-actions > .clickable-icon:has(.svg-icon.help)');
			}
			if (this.helpEl) {
				const helpItem = this.plugin.getAppItem('help', unloading);
				this.refreshIcon(helpItem, this.helpEl);
				this.setEventListener(this.helpEl, 'contextmenu', event => this.onContextMenu('help', event));
			}
		}

		// Settings
		if (!activeDocument.contains(this.settingsEl)) {
			this.stopEventListener(this.settingsEl, 'contextmenu');
			this.settingsEl = Platform.isDesktop
				? fish('.workspace-drawer-vault-actions > .clickable-icon:has(.svg-icon.lucide-settings)')
				: fish('.workspace-drawer-header-icon.mod-settings');
		}
		if (this.settingsEl) {
			const settingsItem = this.plugin.getAppItem('settings', unloading);
			this.refreshIcon(settingsItem, this.settingsEl);
			this.setEventListener(this.settingsEl, 'contextmenu', event => this.onContextMenu('settings', event));
		}

		// Sidebar pins
		if (Platform.isMobile) {
			if (this.pinEls.length === 0 || this.pinEls.some(el => !activeDocument.contains(el))) {
				for (const el of this.pinEls) this.stopEventListener(el, 'contextmenu');
				this.pinEls = fishAll('.workspace-drawer-header-icon.mod-pin');
			}
			for (const pinEl of this.pinEls) {
				const pinItem = this.plugin.getAppItem('pin', unloading);
				this.refreshIcon(pinItem, pinEl);
				this.setEventListener(pinEl, 'contextmenu', event => this.onContextMenu('pin', event));
			}
		}

		// Left sidebar toggles
		if (this.sidebarLeftEls.length === 0 || this.sidebarLeftEls.some(el => !activeDocument.contains(el))) {
			for (const el of this.sidebarLeftEls) this.stopEventListener(el, 'contextmenu');
			this.sidebarLeftEls = fishAll('.sidebar-toggle-button.mod-left').concat(fishAll('.view-action.clickable-icon.mod-left-split-toggle'));
		}
		for (const sidebarLeftEl of this.sidebarLeftEls) {
			const iconEl = sidebarLeftEl.hasClass('clickable-icon') ? sidebarLeftEl : sidebarLeftEl.find(':scope > .clickable-icon');
			if (iconEl) {
				const item = this.plugin.getAppItem('sidebarLeft', unloading);
				this.refreshIcon(item, iconEl);
				this.setEventListener(sidebarLeftEl, 'contextmenu', event => this.onContextMenu('sidebarLeft', event));
			}
		}

		// Right sidebar toggle
		if (!activeDocument.contains(this.sidebarRightEl)) {
			this.stopEventListener(this.sidebarRightEl, 'contextmenu');
			this.sidebarRightEl = fish('.sidebar-toggle-button.mod-right');
		}
		if (this.sidebarRightEl) {
			const iconEl = this.sidebarRightEl.find(':scope > .clickable-icon');
			if (iconEl) {
				const item = this.plugin.getAppItem('sidebarRight', unloading);
				this.refreshIcon(item, iconEl);
				this.setEventListener(this.sidebarRightEl, 'contextmenu', event => this.onContextMenu('sidebarRight', event));
			}
		}

		// Buttons below are desktop-only
		if (!Platform.isDesktop) return;

		// Minimize
		if (!activeDocument.contains(this.minimizeEl)) {
			this.stopEventListener(this.minimizeEl, 'contextmenu');
			this.minimizeEl = fish('.titlebar-button.mod-minimize');
		}
		if (this.minimizeEl) {
			const item = this.plugin.getAppItem('minimize', unloading);
			if (item.icon) {
				this.refreshIcon(item, this.minimizeEl);
			} else {
				this.minimizeEl.empty();
				this.minimizeEl.removeClass('iconic-icon');
				const rectEl = this.minimizeEl.createSvg('svg', SVG_INFO).createSvg('rect', MINIMIZE_RECT);
				if (item.color) rectEl.style.fill = ColorUtils.toRgb(item.color);
			}
			this.setEventListener(this.minimizeEl, 'contextmenu', event => this.onContextMenu('minimize', event));
		}

		// Maximize / Restore down
		this.refreshMaximizeIcon(unloading);

		// Close
		if (!activeDocument.contains(this.closeEl)) {
			this.stopEventListener(this.closeEl, 'contextmenu');
			this.closeEl = fish('.titlebar-button.mod-close');
		}
		if (this.closeEl) {
			const item = this.plugin.getAppItem('close', unloading);
			if (item.icon) {
				this.refreshIcon(item, this.closeEl);
			} else {
				this.closeEl.empty();
				this.closeEl.removeClass('iconic-icon');
				const svgEl = this.closeEl.createSvg('svg', SVG_INFO);
				const pathEl1 = svgEl.createSvg('path', CLOSE_PATH_1);
				const pathEl2 = svgEl.createSvg('path', CLOSE_PATH_2);
				if (item.color) {
					pathEl1.style.fill = ColorUtils.toRgb(item.color);
					pathEl2.style.fill = ColorUtils.toRgb(item.color);
				}
			}
			this.setEventListener(this.closeEl, 'contextmenu', event => this.onContextMenu('close', event));
		}
	}

	/**
	 * Refresh maximize icon only. This button can have two states: maximized or unmaximized.
	 */
	private refreshMaximizeIcon(unloading?: boolean) {
		// @ts-expect-error (Electron API)
		const isMaximized = activeWindow.electron.remote.getCurrentWindow().isMaximized() ?? true;

		if (this.maximizeEl) this.stopMutationObserver(this.maximizeEl);
		if (!activeDocument.contains(this.maximizeEl)) {
			this.stopEventListener(this.maximizeEl, 'contextmenu');
			this.maximizeEl = fish('.titlebar-button.mod-maximize');
		}
		if (this.maximizeEl) {
			const item = this.plugin.getAppItem(isMaximized ? 'unmaximize' : 'maximize', unloading);
			if (item.icon) {
				this.refreshIcon(item, this.maximizeEl);
			} else {
				this.maximizeEl.empty();
				this.maximizeEl.removeClass('iconic-icon');
				const svgEl = this.maximizeEl.createSvg('svg', SVG_INFO);
				if (isMaximized) {
					svgEl.style.fill = 'none';
					const pathEl1 = svgEl.createSvg('path', UNMAXIMIZE_PATH_1);
					const pathEl2 = svgEl.createSvg('path', UNMAXIMIZE_PATH_2);
					if (item.color) {
						pathEl1.style.stroke = ColorUtils.toRgb(item.color);
						pathEl2.style.fill = ColorUtils.toRgb(item.color);
					}
				} else {
					const rectEl = svgEl.createSvg('rect', MAXIMIZE_RECT);
					if (item.color) rectEl.style.stroke = ColorUtils.toRgb(item.color);
				}
			}
			this.setEventListener(this.maximizeEl, 'contextmenu', event => {
				this.onContextMenu(isMaximized ? 'unmaximize' : 'maximize', event);
			});
			this.setMutationsObserver(this.maximizeEl, { childList: true }, () => {
				this.refreshMaximizeIcon();
			});
		}
	}

	/**
	 * When user context-clicks an app item, open a menu or add custom items to the existing menu.
	 */
	private onContextMenu(appItemId: AppItemId, event: MouseEvent) {
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
