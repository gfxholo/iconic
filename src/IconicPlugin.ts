import { Command, FileView, Platform, Plugin, TAbstractFile, TFile, TFolder, WorkspaceLeaf, getIconIds } from 'obsidian';
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

const IMAGE_EXTENSIONS = ['bmp', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', '3gp', 'flac', 'ogg', 'oga', 'opus'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogv', 'mov', 'mkv'];
const ALL_EXTENSIONS = ['md', 'canvas', 'pdf'].concat(IMAGE_EXTENSIONS).concat(AUDIO_EXTENSIONS).concat(VIDEO_EXTENSIONS);

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
	fileIcons: { [fileId: string]: { icon?: string, color?: string, unsynced?: string[] } };
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
		this.registerEvent(this.app.workspace.on('css-change', () => {
			this.refreshIconManagers();
			this.refreshBodyClasses();
		}));

		this.registerEvent(this.app.vault.on('rename', ({ path }, oldPath) => {
			const fileIcon = this.settings.fileIcons[oldPath];
			if (fileIcon) {
				this.settings.fileIcons[path] = fileIcon;
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
				this.tabIconManager?.refreshIcons();
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
	 * @override
	 */
	async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings();
		this.refreshIconManagers();
		this.refreshBodyClasses();
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
	 * @param unloading Remove all classes if true
	 */
	refreshBodyClasses(unloading?: boolean): void {
		activeDocument.body.toggleClass('iconic-bigger-icons', unloading ? false : this.isSettingEnabled('biggerIcons'));
		activeDocument.body.toggleClass('iconic-clickable-icons', unloading ? false : this.isSettingEnabled('clickableIcons'));
		activeDocument.body.toggleClass('iconic-bigger-search-results', unloading ? false : this.isSettingEnabled('biggerSearchResults'));
		activeDocument.body.toggleClass('iconic-uncolor-hover', unloading ? false : this.settings.uncolorHover);
		activeDocument.body.toggleClass('iconic-uncolor-select', unloading ? false : this.settings.uncolorSelect);
		// @ts-expect-error (Private API)
		activeDocument.body.toggleClass('iconic-its-theme', unloading ? false : this.app.customCss?.theme === 'ITS Theme');
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
		let iconDefault = leaf.view.icon;
		// @ts-expect-error (Private API)
		const isStacked = leaf.parent?.isStacked === true;
		if (leaf.view instanceof FileView && leaf.view.file && leaf.view.allowNoFile === false) {
			const fileId = leaf.view.file.path;
			const fileIcon = this.settings.fileIcons[fileId] ?? {};
			// @ts-expect-error (Private API)
			const isRoot = leaf.parent?.parent === this.app.workspace.rootSplit;
			const isMarkdown = leaf.view.getViewType() === 'markdown';
			return {
				id: fileId,
				name: leaf.getDisplayText(),
				category: 'file',
				iconDefault: isRoot && isMarkdown && !isStacked && !this.settings.showAllFileIcons
					? null
					: iconDefault,
				icon: unloading ? null : fileIcon.icon ?? null,
				color: unloading ? null : fileIcon.color ?? null,
				isFile: true,
				isRoot: isRoot,
				iconEl: iconEl ?? null,
				// @ts-expect-error (Private API)
				tabEl: leaf.tabHeaderEl ?? null,
			}
		} else {
			const tabId = leaf.view.getViewType();
			const tabIcon = this.settings.tabIcons[tabId] ?? {};
			let iconDefault;
			switch (tabId) {
				case 'empty':
					iconDefault = isStacked ? leaf.view.icon : null; break;
				case 'release-notes': // Add some sparkle to Obsidian updates
					iconDefault = unloading ? leaf.view.icon : 'lucide-sparkle'; break;
				default:
					iconDefault = leaf.view.icon; break;
			}
			return {
				id: tabId,
				name: leaf.getDisplayText(),
				category: 'tab',
				iconDefault: iconDefault,
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
		const tFiles = this.app.vault.getAllLoadedFiles();
		const rootFolder = tFiles.find(tFile => tFile.path === '/');
		if (rootFolder) tFiles.remove(rootFolder);
		return tFiles.map(tFile => this.defineFileItem(tFile, tFile.path, unloading));
	}

	/**
	 * Get file definition.
	 */
	getFileItem(fileId: string, unloading?: boolean): FileItem {
		const tFile = this.app.vault.getAbstractFileByPath(fileId);
		return this.defineFileItem(tFile, fileId, unloading);
	}

	/**
	 * Create file definition.
	 * If file is null, the file ID is used as a reasonable fallback.
	 */
	private defineFileItem(tFile: TAbstractFile | null, fileId: string, unloading?: boolean): FileItem {
		const fileIcon = (tFile ? this.settings.fileIcons[tFile.path] : this.settings.fileIcons[fileId]) ?? {};
		let iconDefault = null;
		if (tFile instanceof TFile && (fileIcon.color || this.settings.showAllFileIcons)) {
			if (tFile.extension === 'canvas') {
				iconDefault = 'lucide-layout-dashboard';
			} else if (tFile.extension === 'pdf') {
				iconDefault = 'lucide-file-text';
			} else if (IMAGE_EXTENSIONS.some(ext => tFile.extension === ext)) {
				iconDefault = 'lucide-image';
			} else if (AUDIO_EXTENSIONS.some(ext => tFile.extension === ext)) {
				iconDefault = 'lucide-file-audio';
			} else {
				iconDefault = 'lucide-file';
			}
		}
		return {
			id: tFile ? tFile.path : fileId,
			name: (tFile ? tFile.path : fileId).replace(/\.md$/, ''),
			category: tFile instanceof TFolder ? 'folder' : 'file',
			iconDefault: unloading ? null : iconDefault,
			icon: unloading ? null : fileIcon.icon ?? null,
			color: unloading ? null : fileIcon.color ?? null,
			items: tFile instanceof TFolder ? tFile.children.map(tChild => this.defineFileItem(tChild, tChild.path, unloading)) : null,
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
				}
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
			} else if (IMAGE_EXTENSIONS.some(ext => bmarkBase.path?.endsWith('.' + ext))) {
				iconDefault = 'lucide-image';
			} else if (AUDIO_EXTENSIONS.some(ext => bmarkBase.path?.endsWith('.' + ext))) {
				iconDefault = 'lucide-file-audio';
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
			iconDefault: itemBase.hidden ? null : itemBase.icon ?? null,
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
			if (!settings[itemId]) settings[itemId] = {};

			if (icon) settings[itemId].icon = icon;
			else delete settings[itemId].icon;
			if (color) settings[itemId].color = color;
			else delete settings[itemId].color;
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
	 * Flag any files excluded from Sync on this device.
	 */
	private updateUnsyncedFiles(): void {
		// @ts-expect-error (Private API)
		const appId = this.app.appId;
		// @ts-expect-error (Private API)
		const unsyncedFolders: string[] = this.app.internalPlugins?.plugins?.sync?.instance?.ignoreFolders ?? [];
		const unsyncedTypes: string[] = ['image', 'audio', 'video', 'pdf', 'unsupported'].filter(type =>
			// @ts-expect-error (Private API)
			!this.app.internalPlugins?.plugins?.sync?.instance?.allowTypes?.has(type)
		);
		for (const [fileId, fileIcon] of Object.entries(this.settings.fileIcons)) {
			// Excluded folders
			if (unsyncedFolders.some(folder => fileId === folder || fileId.startsWith(folder + '/'))) {
				if (fileIcon.unsynced) {
					if (!fileIcon.unsynced.includes(appId)) fileIcon.unsynced.push(appId);
				} else {
					fileIcon.unsynced = [appId];
				}
				continue;
			}
			// Excluded filetypes
			const fileExt = fileId.match(/\.([^.]*)$/)?.[1];
			if (fileExt) {
				if (unsyncedTypes.includes('unsupported') && !ALL_EXTENSIONS.includes(fileExt)) {
					if (fileIcon.unsynced) {
						if (!fileIcon.unsynced.includes(appId)) fileIcon.unsynced.push(appId);
					} else {
						fileIcon.unsynced = [appId];
					}
					continue;
				}
				const unsyncedExts = [];
				if (unsyncedTypes.includes('image')) {
					unsyncedExts.push(...IMAGE_EXTENSIONS);
				}
				if (unsyncedTypes.includes('audio')) {
					unsyncedExts.push(...AUDIO_EXTENSIONS);
				}
				if (unsyncedTypes.includes('video')) {
					unsyncedExts.push(...VIDEO_EXTENSIONS);
				}
				if (unsyncedTypes.includes('pdf')) {
					unsyncedExts.push('pdf');
				}
				if (unsyncedExts.some(ext => ext === fileExt)) {
					if (fileIcon.unsynced) {
						if (!fileIcon.unsynced.includes(appId)) fileIcon.unsynced.push(appId);
					} else {
						fileIcon.unsynced = [appId];
					}
					continue;
				}
			}
			if (fileIcon.unsynced?.includes(appId)) {
				fileIcon.unsynced.remove(appId);
			}
			if (fileIcon.unsynced?.length === 0) {
				delete this.settings.fileIcons[fileId].unsynced;
			}
		}
	}

	/**
	 * Save settings to storage.
	 */
	async saveSettings(): Promise<void> {
		this.updateUnsyncedFiles();

		// @ts-expect-error (Private API)
		const isNotSyncing = this.app.internalPlugins?.plugins?.sync?.instance?.syncing !== true;
		// @ts-expect-error (Private API)
		const isNotPaused = this.app.internalPlugins?.plugins?.sync?.instance?.pause !== true;

		// Check for any deleted items and prune their icons
		if (isNotSyncing && isNotPaused && !this.settings.rememberDeletedItems) {
			// @ts-expect-error (Private API)
			const thisAppId = this.app.appId;
			for (const [fileId, fileIcon] of Object.entries(this.settings.fileIcons)) {
				// Skip file pruning if excluded from Sync on any other device
				if (fileIcon.unsynced?.some(appId => appId !== thisAppId)) {
					continue;
				} else if (!this.app.vault.getAbstractFileByPath(fileId)) {
					delete this.settings.fileIcons[fileId];
				}
			}
			function flattenGroupIds(bmarkBases: any[]): string[] {
				const flatArray = [];
				for (const bmarkBase of bmarkBases) {
					if (bmarkBase.type === 'group' && bmarkBase.items) {
						flatArray.push(bmarkBase.ctime.toString());
						flatArray.push(...flattenGroupIds(bmarkBase.items));
					}
				}
				return flatArray;
			}
			// @ts-expect-error (Private API)
			if (this.app.internalPlugins?.plugins?.bookmarks?.instance?.items) {
				// @ts-expect-error (Private API)
				const groupIds: string[] = flattenGroupIds(this.app.internalPlugins?.plugins?.bookmarks?.instance?.items);
				for (const groupId in this.settings.groupIcons) {
					if (!groupIds.includes(groupId)) {
						delete this.settings.groupIcons[groupId];
					}
				}
			}
			// @ts-expect-error (Private API)
			if (this.app.metadataTypeManager?.properties) {
				// @ts-expect-error (Private API)
				const propIds = Object.keys(this.app.metadataTypeManager?.properties);
				for (const propId in this.settings.propertyIcons) {
					if (!propIds.includes(propId)) {
						delete this.settings.propertyIcons[propId];
					}
				}
			}
		}

		// Sort item IDs for human-readability
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
	onunload(): void {
		this.appIconManager?.unload();
		this.tabIconManager?.unload();
		this.fileIconManager?.unload();
		this.bookmarkIconManager?.unload();
		this.propertyIconManager?.unload();
		this.editorIconManager?.unload();
		this.ribbonIconManager?.unload();
		this.refreshBodyClasses(true);
	}
}
