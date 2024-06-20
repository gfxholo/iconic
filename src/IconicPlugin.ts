import { Command, FileView, Platform, Plugin, WorkspaceLeaf, getIconIds } from 'obsidian';
import IconicSettingTab from './IconicSettingTab';
import AppIconManager from './AppIconManager';
import TabIconManager from './TabIconManager';
import FileIconManager from './FileIconManager';
import BookmarkIconManager from './BookmarkIconManager';
import PropertyIconManager from './PropertyIconManager';
import EditorIconManager from './EditorIconManager';
import RibbonIconManager from './RibbonIconManager';
import MenuManager from './MenuManager';
import EMOJIS from './Emojis';
import STRINGS from './Strings';

export const ICONS = new Map<string, string>();
export { EMOJIS };
export { STRINGS };

const IMAGE_EXTENSIONS = ['.bmp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'];

/**
 * Base interface for all icon objects.
 */
export interface Icon {
	icon: string | null;
	color: string | null;
}
export interface Item extends Icon {
	id: string;
	name: string;
	category: 'app' | 'tab' | 'file' | 'folder' | 'group' | 'property' | 'ribbon';
	iconDefault: string | null;
}
export interface AppItem extends Item {
	// No other properties
}
export interface TabItem extends Item {
	isFile: boolean;
	isRoot: boolean;
	iconEl: HTMLElement | null;
	tabEl: HTMLElement | null;
}
export interface FileItem extends Item {
	items: FileItem[] | null;
}
export interface BookmarkItem extends Item {
	isFile: boolean;
	items: BookmarkItem[] | null;
}
export interface PropertyItem extends Item {
	type: string | null;
}
export interface RibbonItem extends Item {
	iconEl: HTMLElement | null;
}

/**
 * Interface for storing plugin settings and user-selected icons.
 */
interface IconicSettings {
	biggerIcons: string;
	clickableIcons: string;
	showAllFileIcons: boolean,
	showItemName: string;
	biggerSearchResults: string;
	maxSearchResults: number;
	colorPicker1: string;
	colorPicker2: string;
	uncolorHover: boolean,
	uncolorSelect: boolean,
	rememberDeletedItems: boolean;
	appIcons: { [appItemId: string]: { icon?: string, color?: string } };
	tabIcons: { [tabId: string]: { icon?: string, color?: string } };
	fileIcons: { [fileId: string]: { icon?: string, color?: string } };
	groupIcons: { [groupId: string]: { icon?: string, color?: string } };
	propertyIcons: { [propId: string]: { icon?: string, color?: string } };
	ribbonIcons: { [ribbonItemId: string]: { icon?: string, color?: string } };
}

const DEFAULT_SETTINGS: IconicSettings = {
	biggerIcons: 'mobile',
	clickableIcons: 'desktop',
	showAllFileIcons: false,
	showItemName: 'desktop',
	biggerSearchResults: 'mobile',
	maxSearchResults: 50,
	colorPicker1: 'list',
	colorPicker2: 'rgb',
	uncolorHover: false,
	uncolorSelect: false,
	rememberDeletedItems: false,
	appIcons: {},
	tabIcons: {},
	fileIcons: {},
	groupIcons: {},
	propertyIcons: {},
	ribbonIcons: {},
}

/**
 * Loads, unloads, and manages storage for the plugin.
 */
export default class IconicPlugin extends Plugin {
	settings: IconicSettings;
	menuManager: MenuManager;
	appIconManager: AppIconManager;
	tabIconManager: TabIconManager;
	fileIconManager: FileIconManager;
	bookmarkIconManager: BookmarkIconManager;
	propertyIconManager: PropertyIconManager;
	editorIconManager: EditorIconManager;
	ribbonIconManager: RibbonIconManager;
	commands: Command[] = [];

	/**
	 * @override
	 */
	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new IconicSettingTab(this));

		// Generate ICONS map
		getIconIds().map(id => [id, id.replace(/^lucide-/, '').replace(/-/g, ' ')])
			.sort(([, aName], [, bName]) => aName.localeCompare(bName))
			.forEach(([id, name]) => ICONS.set(id, name));

		this.startIconManagers();
		this.refreshBodyClasses();
		this.registerEvent(this.app.workspace.on('css-change', () => this.refreshIconManagers()));

		this.registerEvent(this.app.vault.on('rename', ({ path }, oldPath) => {
			const file = this.settings.fileIcons[oldPath];
			if (file) {
				this.settings.fileIcons[path] = file;
				delete this.settings.fileIcons[oldPath];
				this.saveSettings();
				this.fileIconManager?.refreshIcons();
				this.bookmarkIconManager?.refreshIcons();
			}
		}));

		this.registerEvent(this.app.vault.on('delete', ({ path }) => {
			if (this.settings.rememberDeletedItems === false) {
				delete this.settings.fileIcons[path];
				this.saveSettings();
				this.fileIconManager?.refreshIcons();
				this.bookmarkIconManager?.refreshIcons();
			}
		}));

		this.commands.push(this.addCommand({
			id: 'toggle-bigger-icons',
			name: STRINGS.commands.toggleBiggerIcons,
			callback: () => {
				if (Platform.isDesktop) {
					if (this.settings.biggerIcons === 'on') this.settings.biggerIcons = 'mobile';
					else if (this.settings.biggerIcons === 'desktop') this.settings.biggerIcons = 'off';
					else if (this.settings.biggerIcons === 'mobile') this.settings.biggerIcons = 'on';
					else if (this.settings.biggerIcons === 'off') this.settings.biggerIcons = 'desktop';
				} else {
					if (this.settings.biggerIcons === 'on') this.settings.biggerIcons = 'desktop';
					else if (this.settings.biggerIcons === 'desktop') this.settings.biggerIcons = 'on';
					else if (this.settings.biggerIcons === 'mobile') this.settings.biggerIcons = 'off';
					else if (this.settings.biggerIcons === 'off') this.settings.biggerIcons = 'mobile';
				}
				this.saveSettings();
				this.refreshBodyClasses();
			}
		}));

		this.commands.push(this.addCommand({
			id: 'toggle-clickable-icons',
			name: Platform.isDesktop ? STRINGS.commands.toggleClickableIcons.desktop : STRINGS.commands.toggleClickableIcons.mobile,
			callback: () => {
				if (Platform.isDesktop) {
					if (this.settings.clickableIcons === 'on') this.settings.clickableIcons = 'mobile';
					else if (this.settings.clickableIcons === 'desktop') this.settings.clickableIcons = 'off';
					else if (this.settings.clickableIcons === 'mobile') this.settings.clickableIcons = 'on';
					else if (this.settings.clickableIcons === 'off') this.settings.clickableIcons = 'desktop';
				} else {
					if (this.settings.clickableIcons === 'on') this.settings.clickableIcons = 'desktop';
					else if (this.settings.clickableIcons === 'desktop') this.settings.clickableIcons = 'on';
					else if (this.settings.clickableIcons === 'mobile') this.settings.clickableIcons = 'off';
					else if (this.settings.clickableIcons === 'off') this.settings.clickableIcons = 'mobile';
				}
				this.saveSettings();
				this.refreshIconManagers();
				this.refreshBodyClasses();
			}
		}));

		this.commands.push(this.addCommand({
			id: 'toggle-all-file-icons',
			name: STRINGS.commands.toggleAllFileIcons,
			callback: () => {
				this.settings.showAllFileIcons = !this.settings.showAllFileIcons;
				this.saveSettings();
				this.fileIconManager?.refreshIcons();
			}
		}));

		this.commands.push(this.addCommand({
			id: 'toggle-bigger-search-results',
			name: STRINGS.commands.toggleBiggerSearchResults,
			callback: () => {
				if (Platform.isDesktop) {
					if (this.settings.biggerSearchResults === 'on') this.settings.biggerSearchResults = 'mobile';
					else if (this.settings.biggerSearchResults === 'desktop') this.settings.biggerSearchResults = 'off';
					else if (this.settings.biggerSearchResults === 'mobile') this.settings.biggerSearchResults = 'on';
					else if (this.settings.biggerSearchResults === 'off') this.settings.biggerSearchResults = 'desktop';
				} else {
					if (this.settings.biggerSearchResults === 'on') this.settings.biggerSearchResults = 'desktop';
					else if (this.settings.biggerSearchResults === 'desktop') this.settings.biggerSearchResults = 'on';
					else if (this.settings.biggerSearchResults === 'mobile') this.settings.biggerSearchResults = 'off';
					else if (this.settings.biggerSearchResults === 'off') this.settings.biggerSearchResults = 'mobile';
				}
				this.saveSettings();
				this.refreshBodyClasses();
			}
		}));
	}

	/**
	 * Initialize all icon managers.
	 */
	private startIconManagers(): void {
		this.menuManager = new MenuManager();
		this.appIconManager = new AppIconManager(this);
		this.tabIconManager = new TabIconManager(this);
		this.fileIconManager = new FileIconManager(this);
		this.bookmarkIconManager = new BookmarkIconManager(this);
		this.propertyIconManager = new PropertyIconManager(this);
		this.editorIconManager = new EditorIconManager(this);
		this.ribbonIconManager = new RibbonIconManager(this);
	}

	/**
	 * Refresh all icon managers.
	 */
	refreshIconManagers(): void {
		this.appIconManager?.refreshIcons();
		this.tabIconManager?.refreshIcons();
		this.fileIconManager?.refreshIcons();
		this.bookmarkIconManager?.refreshIcons();
		this.propertyIconManager?.refreshIcons();
		this.editorIconManager?.refreshIcons();
		this.ribbonIconManager?.refreshIcons();
	}

	/**
	 * Refresh any global classes on document body.
	 */
	refreshBodyClasses(): void {
		activeDocument.body.toggleClass('iconic-bigger-icons', this.isSettingEnabled('biggerIcons'));
		activeDocument.body.toggleClass('iconic-clickable-icons', this.isSettingEnabled('clickableIcons'));
		activeDocument.body.toggleClass('iconic-bigger-search-results', this.isSettingEnabled('biggerSearchResults'));
		activeDocument.body.toggleClass('iconic-uncolor-hover', this.settings.uncolorHover);
		activeDocument.body.toggleClass('iconic-uncolor-select', this.settings.uncolorSelect);
	}

	/**
	 * Check whether setting is enabled for the current platform.
	 */
	isSettingEnabled(setting: keyof IconicSettings): boolean {
		const state = this.settings[setting];
		return state === 'on' || Platform.isDesktop && state === 'desktop' || Platform.isMobile && state === 'mobile';
	}

	/**
	 * Get app item definition.
	 */
	getAppItem(appItemId: 'help' | 'settings' | 'pin' | 'sidebarLeft' | 'sidebarRight', unloading?: boolean): AppItem {
		const appIcon = this.settings.appIcons[appItemId] ?? {};
		let name, iconDefault;
		switch (appItemId) {
			case 'help': {
				name = STRINGS.appItems.help;
				iconDefault = 'help';
				break;
			}
			case 'settings': {
				name = STRINGS.appItems.settings;
				iconDefault = 'lucide-settings';
				break;
			}
			case 'pin': {
				name = STRINGS.appItems.pin;
				iconDefault = 'lucide-pin';
				break;
			}
			case 'sidebarLeft': {
				name = STRINGS.appItems.sidebarLeft;
				iconDefault = 'sidebar-left';
				break;
			}
			case 'sidebarRight': {
				name = STRINGS.appItems.sidebarRight;
				iconDefault = 'sidebar-right';
				break;
			}
		}
		return {
			id: appItemId,
			name: name ?? null,
			category: 'app',
			iconDefault: iconDefault ?? null,
			icon: unloading ? null : appIcon.icon ?? null,
			color: unloading ? null : appIcon.color ?? null,
		}
	}

	/**
	 * Get array of tab definitions.
	 */
	getTabItems(unloading?: boolean): TabItem[] {
		const tabIcons: TabItem[] = [];
		this.app.workspace.iterateAllLeaves(leaf => {
			tabIcons.push(this.defineTabItem(leaf, unloading));
		});
		return tabIcons;
	}

	/**
	 * Get tab definition.
	 */
	getTabItem(tabId: string, unloading?: boolean): TabItem | null {
		let tab = null;
		this.app.workspace.iterateAllLeaves(leaf => {
			if (leaf.view.getViewType() === tabId || leaf.view instanceof FileView && leaf.view.file?.path === tabId && leaf.view.allowNoFile === false) {
				tab = this.defineTabItem(leaf, unloading);
			}
		});
		return tab;
	}

	/**
	 * Create tab definition.
	 */
	defineTabItem(leaf: WorkspaceLeaf, unloading?: boolean): TabItem {
		// @ts-expect-error (Private API)
		let iconEl: HTMLElement | null = leaf.tabHeaderInnerIconEl;
		if (Platform.isMobile) {
			// @ts-expect-error (Private API)
			if (leaf.containerEl?.parentElement === this.app.workspace.leftSplit.activeTabContentEl) {
				// @ts-expect-error (Private API)
				iconEl = this.app.workspace.leftSplit.activeTabIconEl;
			// @ts-expect-error (Private API)
			} else if (leaf.containerEl?.parentElement === this.app.workspace.rightSplit.activeTabContentEl) {
				// @ts-expect-error (Private API)
				iconEl = this.app.workspace.rightSplit.activeTabIconEl;
			}
		}
		if (leaf.view instanceof FileView && leaf.view.file && leaf.view.allowNoFile === false) {
			const fileId: string = leaf.view.file.path;
			const fileIcon = this.settings.fileIcons[fileId] ?? {};
			return {
				id: fileId,
				name: leaf.getDisplayText(),
				category: 'file',
				iconDefault: leaf.view.icon,
				icon: unloading ? null : fileIcon.icon ?? null,
				color: unloading ? null : fileIcon.color ?? null,
				isFile: true,
				// @ts-expect-error (Private API)
				isRoot: leaf.parent?.parent === this.app.workspace.rootSplit,
				iconEl: iconEl ?? null,
				// @ts-expect-error (Private API)
				tabEl: leaf.tabHeaderEl ?? null,
			}
		} else {
			const tabIcon = this.settings.tabIcons[leaf.view.getViewType()] ?? {};
			return {
				id: leaf.view.getViewType(),
				name: leaf.getDisplayText(),
				category: 'tab',
				iconDefault: leaf.view.icon,
				icon: unloading ? null : tabIcon.icon ?? null,
				color: unloading ? null : tabIcon.color ?? null,
				isFile: false,
				// @ts-expect-error (Private API)
				isRoot: leaf.parent?.parent === this.app.workspace.rootSplit,
				iconEl: iconEl ?? null,
				// @ts-expect-error (Private API)
				tabEl: leaf.tabHeaderEl ?? null,
			}
		}
	}

	/**
	 * Get array of file definitions.
	 */
	getFileItems(unloading?: boolean): FileItem[] {
		// @ts-expect-error (Private API)
		const fileBases = this.app.vault.fileMap ?? {};
		return Object.values(fileBases).map(fileBase => this.defineFileItem(fileBase, unloading));
	}

	/**
	 * Get file definition.
	 */
	getFileItem(fileId: string, unloading?: boolean): FileItem {
		// @ts-expect-error (Private API)
		const fileBase = this.app.vault.fileMap?.[fileId] ?? {};
		return this.defineFileItem(fileBase, unloading);
	}

	/**
	 * Create file definition.
	 */
	private defineFileItem(fileBase: any, unloading?: boolean): FileItem {
		const fileIcon = this.settings.fileIcons[fileBase.path] ?? {};
		let iconDefault = null;
		if (fileIcon.color || this.settings.showAllFileIcons) {
			if (fileBase.path?.endsWith('.canvas')) {
				iconDefault = 'lucide-layout-dashboard';
			} else if (fileBase.path?.endsWith('.pdf')) {
				iconDefault = 'lucide-file-text';
			} else if (IMAGE_EXTENSIONS.some(ext => fileBase.path?.endsWith(ext))) {
				iconDefault = 'lucide-image';
			} else {
				iconDefault = 'lucide-file';
			}
		}
		return {
			id: fileBase.path,
			name: fileBase.path?.replace(/\.md$/, '') ?? null,
			category: fileBase.children ? 'folder' : 'file',
			iconDefault: unloading ? null : iconDefault,
			icon: unloading ? null : fileIcon.icon ?? null,
			color: unloading ? null : fileIcon.color ?? null,
			items: fileBase.children?.map((file: any) => this.defineFileItem(file, unloading)) ?? null,
		}
	}

	/**
	 * Get array of bookmark definitions.
	 */
	getBookmarkItems(unloading?: boolean): BookmarkItem[] {
		function flattenBookmarks(bmarkBases: any[]): any[] {
			const flatArray = [];
			for (const bmarkBase of bmarkBases) {
				flatArray.push(bmarkBase);
				if (bmarkBase.items) flatArray.concat(flattenBookmarks(bmarkBase.items));
			}
			return flatArray;
		}
		// @ts-expect-error (Private API)
		const bmarkBases: any[] = flattenBookmarks(this.app.internalPlugins?.plugins?.bookmarks?.instance?.items ?? []);
		return bmarkBases.map(bmark => this.defineBookmarkItem(bmark, unloading));
	}

	/**
	 * Get bookmark definition.
	 */
	getBookmarkItem(bmarkId: string, isFile: boolean, unloading?: boolean): BookmarkItem {
		function findBookmark(bmarkBases: any[]): any {
			for (const bmarkBase of bmarkBases) {
				if (isFile) {
					if (bmarkBase.path === bmarkId) return bmarkBase;
				} else {
					if (bmarkBase.type === 'group' && bmarkBase.ctime === bmarkId) return bmarkBase;
				}
				if (bmarkBase.items) {
					const childBase = findBookmark(bmarkBase.items);
					if (childBase) return childBase;
				};
			}
		}
		// @ts-expect-error (Private API)
		const bmarkBase = findBookmark(this.app.internalPlugins?.plugins?.bookmarks?.instance?.items ?? []) ?? {};
		return this.defineBookmarkItem(bmarkBase, unloading);
	}

	/**
	 * Create bookmark definition.
	 */
	private defineBookmarkItem(bmarkBase: any, unloading?: boolean): BookmarkItem {
		let id, name, bmarkIcon;
		if (bmarkBase.type === 'file' || bmarkBase.type === 'folder') {
			id = bmarkBase.path;
			name = bmarkBase.path?.replace(/\.md$/, '');
			bmarkIcon = this.settings.fileIcons[id] ?? {};
		} else if (bmarkBase.type === 'group') {
			id = bmarkBase.ctime;
			name = bmarkBase.title;
			bmarkIcon = this.settings.groupIcons[id] ?? {};
		}
		let iconDefault = 'lucide-file';
		if (bmarkBase.subpath) {
			iconDefault = 'lucide-heading';
		} else if (bmarkBase.type === 'folder') {
			iconDefault = 'lucide-folder';
		} else if (bmarkBase.path?.endsWith('.canvas')) {
			iconDefault = 'lucide-layout-dashboard';
		} else if (!unloading) {
			if (bmarkBase.path?.endsWith('.pdf')) {
				iconDefault = 'lucide-file-text';
			} else if (IMAGE_EXTENSIONS.some(ext => bmarkBase.path?.endsWith(ext))) {
				iconDefault = 'lucide-image';
			}
		}
		return {
			id: id,
			name: name ?? null,
			category: bmarkBase.type ?? 'file',
			iconDefault: iconDefault,
			icon: unloading ? null : bmarkIcon?.icon ?? null,
			color: unloading ? null : bmarkIcon?.color ?? null,
			isFile: bmarkBase.type === 'file' || bmarkBase.type === 'folder',
			items: bmarkBase.items?.map((bmark: any) => this.defineBookmarkItem(bmark, unloading)) ?? null,
		}
	}

	/**
	 * Get array of property definitions.
	 */
	getPropertyItems(unloading?: boolean): PropertyItem[] {
		// @ts-expect-error (Private API)
		const propBases: any[] = Object.values(this.app.metadataTypeManager?.properties) ?? [];
		return propBases.map(prop => this.definePropertyItem(prop, unloading));
	}

	/**
	 * Get property definition.
	 */
	getPropertyItem(propId: string, unloading?: boolean): PropertyItem {
		// @ts-expect-error (Private API)
		const propBase: any = this.app.metadataTypeManager?.properties[propId] ?? {};
		return this.definePropertyItem(propBase, unloading);
	}

	/**
	 * Create property definition.
	 */
	private definePropertyItem(propBase: any, unloading?: boolean): PropertyItem {
		const propIcon = this.settings.propertyIcons[propBase.name] ?? {};
		let iconDefault;
		switch (propBase.type) {
			case 'text': iconDefault = 'lucide-text'; break;
			case 'multitext': iconDefault = 'lucide-list'; break;
			case 'number': iconDefault = 'lucide-binary'; break;
			case 'checkbox': iconDefault = 'lucide-check-square'; break;
			case 'date': iconDefault = 'lucide-calendar'; break;
			case 'datetime': iconDefault = 'lucide-clock'; break;
			case 'aliases': iconDefault = 'lucide-forward'; break;
			case 'tags': iconDefault = 'lucide-tags'; break;
			default: iconDefault = 'lucide-file-question'; break;
		}
		return {
			id: propBase.name,
			name: propBase.name,
			category: 'property',
			iconDefault: iconDefault,
			icon: unloading ? null : propIcon.icon ?? null,
			color: unloading ? null : propIcon.color ?? null,
			type: propBase.type ?? null,
		}
	}

	/**
	 * Get array of ribbon command definitions.
	 */
	getRibbonItems(unloading?: boolean): RibbonItem[] {
		// @ts-expect-error (Private API)
		const itemBases: any[] = this.app.workspace.leftRibbon.items ?? [];
		return itemBases.map(item => this.defineRibbonItem(item, unloading));
	}

	/**
	 * Get ribbon command definition.
	 */
	getRibbonItem(itemId: string, unloading?: boolean): RibbonItem {
		// @ts-expect-error (Private API)
		const itemBase: any = this.app.workspace.leftRibbon.items
			?.find((itemBase: any) => itemBase?.id === itemId) ?? {};
		return this.defineRibbonItem(itemBase, unloading);
	}

	/**
	 * Create ribbon command definition.
	 */
	private defineRibbonItem(itemBase: any, unloading?: boolean): RibbonItem {
		const itemIcon = this.settings.ribbonIcons[itemBase.id] ?? {};
		return {
			id: itemBase.id,
			name: itemBase.title ?? null,
			category: 'ribbon',
			iconDefault: itemBase.icon ?? null,
			icon: unloading ? null : itemIcon.icon ?? null,
			color: unloading ? null : itemIcon.color ?? null,
			iconEl: itemBase.buttonEl ?? null,
		}
	}

	/**
	 * Save app icon changes to settings.
	 */
	saveAppIcon(appItem: AppItem, icon: string | null, color: string | null): void {
		this.updateIconSetting(this.settings.appIcons, appItem.id, icon, color);
		this.saveSettings();
	}

	/**
	 * Save tab icon changes to settings.
	 */
	saveTabIcon(tab: TabItem, icon: string | null, color: string | null): void {
		this.updateIconSetting(this.settings.tabIcons, tab.id, icon, color);
		this.saveSettings();
	}

	/**
	 * Save file icon changes to settings.
	 */
	saveFileIcon(file: FileItem, icon: string | null, color: string | null): void {
		this.updateIconSetting(this.settings.fileIcons, file.id, icon, color);
		this.saveSettings();
	}

	/**
	 * Save multiple file icon changes to settings.
	 * @param icon If undefined, leave icons unchanged
	 * @param color If undefined, leave colors unchanged
	 */
	saveFileIcons(files: FileItem[], icon: string | null | undefined, color: string | null | undefined): void {
		for (const file of files) {
			if (icon !== undefined) file.icon = icon;
			if (color !== undefined) file.color = color;
			this.updateIconSetting(this.settings.fileIcons, file.id, file.icon, file.color);
		}
		this.saveSettings();
	}

	/**
	 * Save bookmark icon changes to settings.
	 */
	saveBookmarkIcon(bmark: BookmarkItem, icon: string | null, color: string | null): void {
		if (bmark.category === 'file' || bmark.category === 'folder') {
			this.updateIconSetting(this.settings.fileIcons, bmark.id, icon, color);
		} else if (bmark.category === 'group') {
			this.updateIconSetting(this.settings.groupIcons, bmark.id, icon, color);
		}
		this.saveSettings();
	}

	/**
	 * Save multiple bookmark icon changes to settings.
	 * @param icon If undefined, leave icons unchanged
	 * @param color If undefined, leave colors unchanged
	 */
	saveBookmarkIcons(bmarks: BookmarkItem[], icon: string | null | undefined, color: string | null | undefined): void {
		for (const bmark of bmarks) {
			if (icon !== undefined) bmark.icon = icon;
			if (color !== undefined) bmark.color = color;
			if (bmark.category === 'file' || bmark.category === 'folder') {
				this.updateIconSetting(this.settings.fileIcons, bmark.id, bmark.icon, bmark.color);
			} else if (bmark.category === 'group') {
				this.updateIconSetting(this.settings.groupIcons, bmark.id, bmark.icon, bmark.color);
			}
		}
		this.saveSettings();
	}

	/**
	 * Save property icon changes to settings.
	 */
	savePropertyIcon(prop: PropertyItem, icon: string | null, color: string | null): void {
		this.updateIconSetting(this.settings.propertyIcons, prop.id, icon, color);
		this.saveSettings();
	}

	/**
	 * Save multiple property icon changes to settings.
	 * @param icon If undefined, leave icons unchanged
	 * @param color If undefined, leave colors unchanged
	 */
	savePropertyIcons(props: PropertyItem[], icon: string | null | undefined, color: string | null | undefined): void {
		for (const prop of props) {
			if (icon !== undefined) prop.icon = icon;
			if (color !== undefined) prop.color = color;
			this.updateIconSetting(this.settings.propertyIcons, prop.id, prop.icon, prop.color);
		}
		this.saveSettings();
	}

	/**
	 * Save ribbon icon changes to settings.
	 */
	saveRibbonIcon(ribbonItem: RibbonItem, icon: string | null, color: string | null): void {
		this.updateIconSetting(this.settings.ribbonIcons, ribbonItem.id, icon, color);
		this.saveSettings();
	}

	/**
	 * Update icon in a given settings object.
	 */
	private updateIconSetting(settings: any, itemId: string, icon: string | null, color: string | null): void {
		if (icon || color) {
			settings[itemId] = {};
			if (icon) settings[itemId].icon = icon;
			if (color) settings[itemId].color = color;
		} else {
			delete settings[itemId];
		}
	}

	/**
	 * Load settings from storage.
	 */
	private async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * Save settings to storage, pruning any deleted items if necessary.
	 * Item IDs are sorted for human-readability.
	 */
	async saveSettings(): Promise<void> {
		if (!this.settings.rememberDeletedItems) {
			function flattenGroupIds(bmarkBases: any[]): string[] {
				const flatArray = [];
				for (const bmarkBase of bmarkBases) {
					if (bmarkBase.type === 'group' && bmarkBase.items) {
						flatArray.push(bmarkBase.ctime.toString());
						flatArray.concat(flattenGroupIds(bmarkBase.items));
					}
				}
				return flatArray;
			}
			// @ts-expect-error (Private API)
			const groupIds: any[] = flattenGroupIds(this.app.internalPlugins?.plugins?.bookmarks?.instance?.items ?? []);
			for (const groupId in this.settings.groupIcons) {
				if (!groupIds.includes(groupId)) {
					delete this.settings.groupIcons[groupId];
				}
			}
			// @ts-expect-error (Private API)
			const propIds = Object.keys(this.app.metadataTypeManager?.properties ?? {});
			for (const propId in this.settings.propertyIcons) {
				if (!propIds.includes(propId)) {
					delete this.settings.propertyIcons[propId];
				}
			}
		}
		this.settings.appIcons = Object.fromEntries(Object.entries(this.settings.appIcons).sort());
		this.settings.tabIcons = Object.fromEntries(Object.entries(this.settings.tabIcons).sort());
		this.settings.fileIcons = Object.fromEntries(Object.entries(this.settings.fileIcons).sort());
		this.settings.groupIcons = Object.fromEntries(Object.entries(this.settings.groupIcons).sort());
		this.settings.propertyIcons = Object.fromEntries(Object.entries(this.settings.propertyIcons).sort());
		this.settings.ribbonIcons = Object.fromEntries(Object.entries(this.settings.ribbonIcons).sort());
		await this.saveData(this.settings);
	}

	/**
	 * @override
	 */
	async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings();
		this.refreshIconManagers();
		this.refreshBodyClasses();
	}

	/**
	 * @override
	 */
	onunload(): void {
		this.appIconManager?.unload();
		this.tabIconManager?.unload();
		this.fileIconManager?.unload();
		this.bookmarkIconManager?.unload();
		this.propertyIconManager?.unload();
		this.editorIconManager?.unload();
		this.ribbonIconManager?.unload();
	}
}
