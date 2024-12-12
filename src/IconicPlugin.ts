import { Command, FileView, Platform, Plugin, TAbstractFile, TFile, TFolder, View, WorkspaceLeaf, getIconIds } from 'obsidian';
import IconicSettingTab from './IconicSettingTab';
import MenuManager from './MenuManager';
import RuleManager, { RulePage, RuleTrigger } from './RuleManager';
import AppIconManager from './AppIconManager';
import TabIconManager from './TabIconManager';
import FileIconManager from './FileIconManager';
import BookmarkIconManager from './BookmarkIconManager';
import TagIconManager from './TagIconManager';
import PropertyIconManager from './PropertyIconManager';
import EditorIconManager from './EditorIconManager';
import RibbonIconManager from './RibbonIconManager';
import EMOJIS from './Emojis';
import STRINGS from './Strings';
import IconPicker from './IconPicker';
import RulePicker from './RulePicker';

export const ICONS = new Map<string, string>();
export { EMOJIS };
export { STRINGS };
export type AppItemId = 'help' | 'settings' | 'pin' | 'sidebarLeft' | 'sidebarRight' | 'minimize' | 'maximize' | 'unmaximize' | 'close';

const OPENABLE_TYPES = ['markdown', 'canvas', 'audio', 'video', 'pdf'];
const SYNCABLE_TYPES = ['image', 'audio', 'video', 'pdf', 'unsupported'];
const IMAGE_EXTENSIONS = ['bmp', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', '3gp', 'flac', 'ogg', 'oga', 'opus'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogv', 'mov', 'mkv'];
const SYNCABLE_EXTENSIONS = ['md', 'canvas', 'pdf'].concat(IMAGE_EXTENSIONS).concat(AUDIO_EXTENSIONS).concat(VIDEO_EXTENSIONS);

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
	category: 'app' | 'tab' | 'file' | 'folder' | 'group' | 'search' | 'graph' | 'url' | 'tag' | 'property' | 'ribbon' | 'rule';
	iconDefault: string | null;
}
export type AppItem = Item;
export interface TabItem extends Item {
	isFile: boolean;
	isActive: boolean;
	isRoot: boolean;
	isStacked: boolean;
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
export interface TagItem extends Item {
	items: TagItem[] | null;
}
export interface PropertyItem extends Item {
	type: string | null;
}
export interface RibbonItem extends Item {
	isHidden: boolean;
	iconEl: HTMLElement | null;
}

/**
 * Interface for storing plugin settings and user-selected icons.
 */
interface IconicSettings {
	biggerIcons: string;
	clickableIcons: string;
	showAllFileIcons: boolean,
	showAllFolderIcons: boolean,
	minimalFolderIcons: boolean;
	showItemName: string;
	biggerSearchResults: string;
	maxSearchResults: number;
	colorPicker1: string;
	colorPicker2: string;
	uncolorHover: boolean;
	uncolorDrag: boolean;
	uncolorSelect: boolean;
	uncolorQuick: boolean;
	rememberDeletedItems: boolean;
	dialogState: {
		iconMode: boolean;
		emojiMode: boolean;
		rulePage: RulePage;
	},
	appIcons: Record<string, { icon?: string, color?: string }>;
	tabIcons: Record<string, { icon?: string, color?: string }>;
	fileIcons: Record<string, { icon?: string, color?: string, unsynced?: string[] }>;
	bookmarkIcons: Record<string, { icon?: string, color?: string }>;
	tagIcons: Record<string, { icon?: string, color?: string }>;
	propertyIcons: Record<string, { icon?: string, color?: string }>;
	ribbonIcons: Record<string, { icon?: string, color?: string }>;
	fileRules: Array<{
		id?: string,
		name?: string,
		icon?: string,
		color?: string,
		match?: string,
		conditions?: Array<{
			source?: string,
			operator?: string,
			value?: string,
		}>,
		enabled?: boolean,
	}>;
	folderRules: Array<{
		id?: string,
		name?: string,
		icon?: string,
		color?: string,
		match?: string,
		conditions?: Array<{
			source?: string,
			operator?: string,
			value?: string,
		}>,
		enabled?: boolean,
	}>;
}

const DEFAULT_SETTINGS: IconicSettings = {
	biggerIcons: 'mobile',
	clickableIcons: 'desktop',
	showAllFileIcons: false,
	showAllFolderIcons: false,
	minimalFolderIcons: false,
	showItemName: 'desktop',
	biggerSearchResults: 'mobile',
	maxSearchResults: 50,
	colorPicker1: 'list',
	colorPicker2: 'rgb',
	uncolorHover: false,
	uncolorDrag: false,
	uncolorSelect: false,
	uncolorQuick: false,
	rememberDeletedItems: false,
	dialogState: {
		iconMode: true,
		emojiMode: false,
		rulePage: 'file',
	},
	appIcons: {},
	tabIcons: {},
	fileIcons: {},
	bookmarkIcons: {},
	tagIcons: {},
	propertyIcons: {},
	ribbonIcons: {},
	fileRules: [],
	folderRules: [],
}

/**
 * Loads, unloads, and manages storage for the plugin.
 */
export default class IconicPlugin extends Plugin {
	settings: IconicSettings;
	menuManager: MenuManager;
	ruleManager: RuleManager;
	appIconManager?: AppIconManager;
	tabIconManager?: TabIconManager;
	fileIconManager?: FileIconManager;
	bookmarkIconManager?: BookmarkIconManager;
	tagIconManager?: TagIconManager;
	propertyIconManager?: PropertyIconManager;
	editorIconManager?: EditorIconManager;
	ribbonIconManager?: RibbonIconManager;
	commands: Command[] = [];

	/**
	 * @override
	 */
	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new IconicSettingTab(this));

		this.app.workspace.onLayoutReady(() => {
			// Generate icon names from available icon IDs
			getIconIds().map(id => {
				let name = id;
				name = name.replace(/^lucide-/, '').replaceAll('-', ' ');
				name = (name[0]?.toUpperCase() + name.slice(1))
				.replace(/^Tv/, 'TV')
				.replace(/ 2x 2$/, ' 2x2')
				.replace(/ 3x 3$/, ' 3x3')
				.replace(/ 3d$/, ' 3D')
				.replace(/ az$/, ' AZ')
				.replace(/ za$/, ' ZA')
				.replace(/ x$/, ' X')
				.replace(/ x2$/, ' X2')
				return [id, name];
			})
			// Sort icon names alphabetically
			.sort(([, aName], [, bName]) => aName.localeCompare(bName))
			// Populate ICONS map
			.forEach(([id, name]) => ICONS.set(id, name));
			
			this.startManagers();
			this.refreshBodyClasses();
		});

		this.registerEvent(this.app.workspace.on('css-change', () => {
			this.refreshManagers();
			this.refreshBodyClasses();
		}));

		this.registerEvent(this.app.vault.on('rename', (tAbstractFile, oldPath) => {
			const { path } = tAbstractFile;
			const fileIcon = this.settings.fileIcons[oldPath];
			if (fileIcon) {
				this.settings.fileIcons[path] = fileIcon;
				delete this.settings.fileIcons[oldPath];
				this.saveSettings();
			}
			const { filename, tree } = this.splitFilePath(path);
			const { filename: oldFilename, tree: oldTree } = this.splitFilePath(oldPath);
			const page = tAbstractFile instanceof TFile ? 'file' : 'folder';
			// If this rename triggers a new ruling, refresh icons
			if (filename !== oldFilename && this.ruleManager.triggerRulings(page, 'rename')) {
				if (page === 'file') this.tabIconManager?.refreshIcons();
				this.fileIconManager?.refreshIcons();
				this.bookmarkIconManager?.refreshIcons();
			// If this move triggers a new ruling, refresh icons
			} else if (tree !== oldTree && this.ruleManager.triggerRulings(page, 'move')) {
				if (page === 'file') this.tabIconManager?.refreshIcons();
				this.fileIconManager?.refreshIcons();
				this.bookmarkIconManager?.refreshIcons();
			}
		}));

		this.registerEvent(this.app.vault.on('modify', tAbstractFile => {
			const page = tAbstractFile instanceof TFile ? 'file' : 'folder';
			// If this modification triggers a new ruling, refresh icons
			if (this.ruleManager.triggerRulings(page, 'modify')) {
				if (page === 'file') this.tabIconManager?.refreshIcons();
				this.fileIconManager?.refreshIcons();
				this.bookmarkIconManager?.refreshIcons();
			}
		}));

		this.registerEvent(this.app.vault.on('delete', (tAbstractFile) => {
			const { path } = tAbstractFile;
			if (this.settings.rememberDeletedItems === false) {
				delete this.settings.fileIcons[path];
				this.saveSettings();
			}
			// If this deleted file/folder was associated with a ruling, update rulings
			const page = tAbstractFile instanceof TFile ? 'file' : 'folder';
			if (this.ruleManager.checkRuling(page, path)) {
				this.ruleManager.updateRulings(page);
			}
		}));

		// RIBBON: Open rulebook
		this.addRibbonIcon(
			'lucide-book-image',
			STRINGS.commands.openRulebook,
			() => RulePicker.open(this)
		);

		// COMMAND: Open rulebook
		this.addCommand({
			id: 'open-rulebook',
			name: STRINGS.commands.openRulebook,
			callback: () => RulePicker.open(this),
		});

		// COMMAND: Toggle bigger icons
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

		// COMMAND: Toggle clickable icons
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
				this.refreshManagers();
				this.refreshBodyClasses();
			}
		}));

		// COMMAND: Toggle all file icons
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

		// COMMAND: Toggle all folder icons
		this.commands.push(this.addCommand({
			id: 'toggle-all-folder-icons',
			name: STRINGS.commands.toggleAllFolderIcons,
			callback: () => {
				this.settings.showAllFolderIcons = !this.settings.showAllFolderIcons;
				this.saveSettings();
				this.fileIconManager?.refreshIcons();
				this.bookmarkIconManager?.refreshIcons();
				this.tagIconManager?.refreshIcons();
			}
		}));

		// COMMAND: Toggle minimal folder icons
		this.commands.push(this.addCommand({
			id: 'toggle-minimal.folder-icons',
			name: STRINGS.commands.toggleMinimalFolderIcons,
			callback: () => {
				this.settings.minimalFolderIcons = !this.settings.minimalFolderIcons;
				this.saveSettings();
				this.fileIconManager?.refreshIcons();
				this.bookmarkIconManager?.refreshIcons();
				this.tagIconManager?.refreshIcons();
			}
		}));

		// COMMAND: Toggle bigger search results
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

		// COMMAND: Change icon of the current file
		this.addCommand({
			id: 'change-icon-current-file',
			name: STRINGS.commands.changeIconCurrentFile,
			checkCallback: checking => {
				const tFile = this.app.workspace.getActiveFile();
				if (tFile === null) return false;

				const file = this.getFileItem(tFile.path);
				if (checking) return file !== null;

				IconPicker.openSingle(this, file, (newIcon, newColor) => {
					this.saveFileIcon(file, newIcon, newColor);
					this.fileIconManager?.refreshIcons();
					this.tabIconManager?.refreshIcons();
					this.bookmarkIconManager?.refreshIcons();
				});
			},
		});
	}

	/**
	 * @override
	 */
	async onExternalSettingsChange(): Promise<any> {
		await this.loadSettings();
		this.refreshManagers();
		this.refreshBodyClasses();
	}

	/**
	 * Initialize all manager instances.
	 */
	private startManagers(): void {
		this.menuManager = new MenuManager();
		this.ruleManager = new RuleManager(this);
		try { this.appIconManager = new AppIconManager(this) } catch (e) { console.error(e) }
		try { this.tabIconManager = new TabIconManager(this) } catch (e) { console.error(e) }
		try { this.fileIconManager = new FileIconManager(this) } catch (e) { console.error(e) }
		try { this.tagIconManager = new TagIconManager(this) } catch (e) { console.error(e) }
		try { this.bookmarkIconManager = new BookmarkIconManager(this) } catch (e) { console.error(e) }
		try { this.propertyIconManager = new PropertyIconManager(this) } catch (e) { console.error(e) }
		try { this.editorIconManager = new EditorIconManager(this) } catch (e) { console.error(e) }
		try { this.ribbonIconManager = new RibbonIconManager(this) } catch (e) { console.error(e) }
	}

	/**
	 * Refresh all manager instances.
	 */
	refreshManagers(): void {
		this.appIconManager?.refreshIcons();
		this.tabIconManager?.refreshIcons();
		this.fileIconManager?.refreshIcons();
		this.bookmarkIconManager?.refreshIcons();
		this.tagIconManager?.refreshIcons();
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
		activeDocument.body.toggleClass('iconic-uncolor-drag', unloading ? false : this.settings.uncolorDrag);
		activeDocument.body.toggleClass('iconic-uncolor-select', unloading ? false : this.settings.uncolorSelect);

		// @ts-expect-error (Private API)
		const themeName = this.app.customCss?.theme;
		activeDocument.body.toggleClass('iconic-theme-btopaz', unloading ? false : themeName === 'Blue Topaz');
		activeDocument.body.toggleClass('iconic-theme-border', unloading ? false : themeName === 'Border');
		activeDocument.body.toggleClass('iconic-theme-cat', unloading ? false : themeName === 'Catppuccin');
		activeDocument.body.toggleClass('iconic-theme-cglow', unloading ? false : themeName === 'Cyber Glow');
		activeDocument.body.toggleClass('iconic-theme-discord', unloading ? false : themeName === 'Discordian');
		activeDocument.body.toggleClass('iconic-theme-its', unloading ? false : themeName === 'ITS Theme');
		activeDocument.body.toggleClass('iconic-theme-lyt', unloading ? false : themeName === 'LYT Mode');
		activeDocument.body.toggleClass('iconic-theme-mflow', unloading ? false : themeName === 'Mado Miniflow');
		activeDocument.body.toggleClass('iconic-theme-sanctum', unloading ? false : themeName === 'Sanctum');
		activeDocument.body.toggleClass('iconic-theme-shiba', unloading ? false : themeName === 'Shiba Inu');
		activeDocument.body.toggleClass('iconic-theme-shimmer', unloading ? false : themeName === 'Shimmering Focus');
		activeDocument.body.toggleClass('iconic-theme-sodalite', unloading ? false : themeName === 'Sodalite');
		activeDocument.body.toggleClass('iconic-theme-spectrum', unloading ? false : themeName === 'Spectrum');
		activeDocument.body.toggleClass('iconic-theme-terminal', unloading ? false : themeName === 'Terminal');
		activeDocument.body.toggleClass('iconic-theme-ukiyo', unloading ? false : themeName === 'Ukiyo');
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
	getAppItem(appItemId: AppItemId, unloading?: boolean): AppItem {
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
			case 'minimize': name = STRINGS.appItems.minimize; break;
			case 'maximize': name = STRINGS.appItems.maximize; break;
			case 'unmaximize': name = STRINGS.appItems.unmaximize; break;
			case 'close': name = STRINGS.appItems.close; break;
		}
		return {
			id: appItemId,
			name: name ?? '',
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
		let tab: TabItem | null = null;
		this.app.workspace.iterateAllLeaves(leaf => {
			if (tab) return;
			const tabType = leaf.view.getViewType();
			if (tabType === tabId || OPENABLE_TYPES.includes(tabType) && leaf.view.getState().file === tabId) {
				tab = this.defineTabItem(leaf, unloading);
			}
		});
		return tab;
	}

	/**
	 * Create tab definition.
	 */
	private defineTabItem(leaf: WorkspaceLeaf, unloading?: boolean): TabItem {
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

		const tabType = leaf.view.getViewType();
		// @ts-expect-error (Private API)
		const isActive = leaf.view === this.app.workspace.getActiveViewOfType(View) || leaf.tabHeaderEl?.hasClass('is-active');
		const isRoot = leaf.getRoot() === this.app.workspace.rootSplit;
		// @ts-expect-error (Private API)
		const isStacked = leaf.parent?.isStacked === true;

		if (OPENABLE_TYPES.includes(tabType)) {
			const filePath = leaf.view.getState().file; // Used because view.file is undefined on deferred views
			const fileId = typeof filePath === 'string' ? filePath : '';
			const fileIcon = this.settings.fileIcons[fileId] ?? {};
			const isMarkdown = tabType === 'markdown';
			return {
				id: fileId,
				name: leaf.getDisplayText(),
				category: 'file',
				iconDefault: isRoot && isMarkdown && !isStacked && !fileIcon.color && !this.settings.showAllFileIcons
					? null
					: leaf.view.getIcon(),
				icon: unloading ? null : fileIcon.icon ?? null,
				color: unloading ? null : fileIcon.color ?? null,
				isFile: true,
				isActive: isActive,
				isRoot: isRoot,
				isStacked: isStacked,
				iconEl: iconEl ?? null,
				// @ts-expect-error (Private API)
				tabEl: leaf.tabHeaderEl ?? null,
			}
		} else {
			const tabIcon = this.settings.tabIcons[tabType] ?? {};
			let iconDefault;
			switch (tabType) {
				case 'empty':
					iconDefault = !isRoot || isStacked || tabIcon.color ? leaf.view.getIcon() : null; break;
				case 'release-notes': // Add some sparkle to Obsidian updates
					iconDefault = unloading ? leaf.view.getIcon() : 'lucide-sparkle'; break;
				default:
					iconDefault = leaf.view.getIcon(); break;
			}
			return {
				id: tabType,
				name: leaf.getDisplayText(),
				category: 'tab',
				iconDefault: iconDefault,
				icon: unloading ? null : tabIcon.icon ?? null,
				color: unloading ? null : tabIcon.color ?? null,
				isFile: false,
				isActive: isActive,
				isRoot: isRoot,
				isStacked: isStacked,
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
		const { path } = this.splitFilePath(fileId); // Ignore subpath
		const tFile = this.app.vault.getAbstractFileByPath(path);
		return this.defineFileItem(tFile, fileId, unloading);
	}

	/**
	 * Create file definition.
	 */
	private defineFileItem(tFile: TAbstractFile | null, fileId: string, unloading?: boolean): FileItem {
		const { filename, basename, extension } = this.splitFilePath(fileId);
		const fileIcon = this.settings.fileIcons[fileId] ?? {};
		let iconDefault = null;

		if (tFile instanceof TFile && (fileIcon.color || this.settings.showAllFileIcons)) {
			if (extension === 'canvas') {
				iconDefault = 'lucide-layout-dashboard';
			} else if (extension === 'pdf') {
				iconDefault = 'lucide-file-text';
			} else if (IMAGE_EXTENSIONS.includes(extension)) {
				iconDefault = 'lucide-image';
			} else if (AUDIO_EXTENSIONS.includes(extension)) {
				iconDefault = 'lucide-file-audio';
			} else {
				iconDefault = 'lucide-file';
			}
		} else if (tFile instanceof TFolder && (fileIcon.color && !this.settings.minimalFolderIcons || this.settings.showAllFolderIcons)) {
			iconDefault = 'lucide-folder-closed';
		}

		return {
			id: fileId,
			name: extension === 'md' ? basename : filename,
			category: tFile instanceof TFolder ? 'folder' : 'file',
			iconDefault: unloading ? null : iconDefault,
			icon: unloading ? null : fileIcon.icon ?? null,
			color: unloading ? null : fileIcon.color ?? null,
			items: tFile instanceof TFolder
				? tFile.children.map(tChild => this.defineFileItem(tChild, tChild.path, unloading))
				: null,
		}
	}

	/**
	 * Split a filepath into its hierarchical components.
	 */
	splitFilePath(fileId = ''): {
		path: string      // Folder tree + Filename
		tree: string      // Folder tree only
		filename: string  // Name.Extension
		basename: string  // Name only
		extension: string // Extension only
		subpath: string   // #Subpath after extension
	} {
		const subpathExts = ['md', 'pdf']; // Extensions with linkable subpaths
		const subpathStart = Math.max(...subpathExts.map(ext => {
			const index = fileId.lastIndexOf(`.${ext}#`);
			return index > -1 ? (index + ext.length + 1) : -1;
		}));
		const subpath = subpathStart > -1 ? fileId.substring(subpathStart, fileId.length) : '';
		const path = subpathStart > -1 ? fileId.substring(0, subpathStart) : fileId;

		const [, tree = '', filename] = path.match(/^(.*\/)?(.*)$/) ?? [];
		const extensionStart = filename.lastIndexOf('.');
		const extension = filename.substring(extensionStart > -1 ? extensionStart + 1 : filename.length) || '';
		const basename = filename.substring(0, extensionStart > -1 ? extensionStart : filename.length) || '';

		return { path, tree, filename, basename, extension, subpath };
	}

	/**
	 * Get array of bookmark definitions.
	 */
	getBookmarkItems(unloading?: boolean): BookmarkItem[] {
		// @ts-expect-error (Private API)
		const bmarkBases: any[] = this.app.internalPlugins?.plugins?.bookmarks?.instance?.items ?? [];
		return bmarkBases.map(bmarkBase => this.defineBookmarkItem(bmarkBase, unloading));
	}

	/**
	 * Get bookmark definition.
	 */
	getBookmarkItem(bmarkId: string, isFile: boolean, unloading?: boolean): BookmarkItem {
		// @ts-expect-error (Private API)
		const bmarkBases = this.flattenBookmarks(this.app.internalPlugins?.plugins?.bookmarks?.instance?.items ?? []);
		const bmarkBase = bmarkBases.find(bmarkBase => {
			return isFile && bmarkBase.path + (bmarkBase.subpath ?? '') === bmarkId || bmarkBase.ctime === bmarkId
		}) ?? {};
		return this.defineBookmarkItem(bmarkBase, unloading);
	}

	/**
	 * Create bookmark definition.
	 */
	private defineBookmarkItem(bmarkBase: any, unloading?: boolean): BookmarkItem {
		const { path, filename, basename, extension } = this.splitFilePath(bmarkBase.path);
		const subpath = bmarkBase.subpath ?? '';
		let id, name, bmarkIcon, iconDefault = null;

		switch (bmarkBase.type) {
			case 'file': {
				id = path + subpath;
				name = (extension === 'md' ? basename : filename) + subpath;
				if (extension === 'canvas') {
					iconDefault = 'lucide-layout-dashboard';
				} else if (subpath.startsWith('#^')) {
					iconDefault = 'lucide-toy-brick';
				} else if (subpath.startsWith('#')) {
					iconDefault = 'lucide-heading';
				} else {
					iconDefault = 'lucide-file';
					if (!unloading) {
						if (extension === 'pdf') {
							iconDefault = 'lucide-file-text';
						} else if (IMAGE_EXTENSIONS.includes(extension)) {
							iconDefault = 'lucide-image';
						} else if (AUDIO_EXTENSIONS.includes(extension)) {
							iconDefault = 'lucide-file-audio';
						}
					}
				}
				bmarkIcon = this.settings.fileIcons[id] ?? {};
				break;
			}
			case 'folder': {
				id = path;
				name = basename;
				bmarkIcon = this.settings.fileIcons[id] ?? {};
				iconDefault = 'lucide-folder';
				break;
			}
			case 'group': {
				id = bmarkBase.ctime;
				name = bmarkBase.title;
				bmarkIcon = this.settings.bookmarkIcons[id] ?? {};
				if (bmarkIcon.color && !this.settings.minimalFolderIcons || this.settings.showAllFolderIcons) {
					iconDefault = 'lucide-folder-closed';
				}
				break;
			}
			case 'search': {
				id = bmarkBase.ctime;
				name = bmarkBase.query;
				bmarkIcon = this.settings.bookmarkIcons[id] ?? {};
				iconDefault = 'lucide-search';
				break;
			}
			case 'graph': {
				id = bmarkBase.ctime;
				name = bmarkBase.title;
				bmarkIcon = this.settings.bookmarkIcons[id] ?? {};
				iconDefault = 'lucide-git-fork';
				break;
			}
			case 'url': {
				id = bmarkBase.ctime;
				name = bmarkBase.url;
				bmarkIcon = this.settings.bookmarkIcons[id] ?? {};
				iconDefault = 'lucide-globe-2';
				break;
			}
		}
		return {
			id: id,
			name: name,
			category: bmarkBase.type ?? 'file',
			iconDefault: iconDefault,
			icon: unloading ? null : bmarkIcon?.icon ?? null,
			color: unloading ? null : bmarkIcon?.color ?? null,
			isFile: bmarkBase.type === 'file' || bmarkBase.type === 'folder',
			items: bmarkBase.items?.map((bmark: any) => this.defineBookmarkItem(bmark, unloading)) ?? null,
		}
	}

	/**
	 * Flatten an array of bookmark bases to include all children.
	 */
	private flattenBookmarks(bmarkBases: any[]): any[] {
		const flatArray = [];
		for (const bmarkBase of bmarkBases) {
			flatArray.push(bmarkBase);
			if (bmarkBase.items) flatArray.push(...this.flattenBookmarks(bmarkBase.items));
		}
		return flatArray;
	}

	/**
	 * Get array of tag definitions.
	 */
	getTagItems(unloading?: boolean): TagItem[] {
		// @ts-expect-error (Private API)
		const tagHashes: string[] = Object.keys(this.app.metadataCache.getTags()) ?? [];
		const tagBases = tagHashes.map(tagHash => {
			return {
				id: tagHash.replace('#', ''),
				name: tagHash,
				items: this.getChildTagBases(tagHash, tagHashes),
			}
		});
		return tagBases.map(tagBase => this.defineTagItem(tagBase, unloading));
	}

	/**
	 * Get tag definition.
	 */
	getTagItem(tagId: string, unloading?: boolean): TagItem | null {
		const tagHash = '#' + tagId;
		// @ts-expect-error (Private API)
		const tagHashes: string[] = Object.keys(this.app.metadataCache.getTags()) ?? [];
		const childTagBases = this.getChildTagBases(tagHash, tagHashes);
		return tagHashes.includes(tagHash)
			? this.defineTagItem({
				id: tagId,
				name: tagHash,
				items: childTagBases.length > 0 ? childTagBases : null,
			}, unloading) : null;
	}

	/**
	 * Create tag definition.
	 */
	private defineTagItem(tagBase: any, unloading?: boolean): TagItem {
		const tagIcon = this.settings.tagIcons[tagBase.id] ?? {};
		const childTagItems = tagBase.items?.map((childBase: any) => this.defineTagItem(childBase, unloading));

		return {
			id: tagBase.id,
			name: tagBase.name,
			category: 'tag',
			iconDefault: null,
			icon: unloading ? null : tagIcon.icon ?? null,
			color: unloading ? null : tagIcon.color ?? null,
			items: childTagItems?.length > 0 ? childTagItems : null,
		};
	}

	/**
	 * Get array of tag bases that share a given parent.
	 */
	private getChildTagBases(parentTagHash: string, tagHashes: string[]): any[] {
		const tagBases = [];
		const parentTagSlash = parentTagHash + '/';
		for (const tagHash of tagHashes) {
			if (tagHash.startsWith(parentTagSlash) && !tagHash.replace(parentTagSlash, '').includes('/')) {
				tagBases.push({
					id: tagHash.replace('#', ''),
					name: tagHash,
					items: this.getChildTagBases(tagHash, tagHashes),
				});
			}
		}
		return tagBases;
	}

	/**
	 * Get array of property definitions.
	 */
	getPropertyItems(unloading?: boolean): PropertyItem[] {
		// @ts-expect-error (Private API)
		const propBases: any[] = Object.values(this.app.metadataTypeManager?.properties) ?? [];
		return propBases.map(propBase => this.definePropertyItem(propBase, unloading));
	}

	/**
	 * Get property definition.
	 */
	getPropertyItem(propId: string, unloading?: boolean): PropertyItem {
		// @ts-expect-error (Private API)
		const propBases: any[] = Object.values(this.app.metadataTypeManager?.properties) ?? [];
		const propBase = propBases.find(propBase => propBase.name === propId) ?? {};
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
			isHidden: itemBase.hidden ?? false,
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
		const triggers: Set<RuleTrigger> = new Set();
		const fileBase = this.settings.fileIcons[file.id];
		if (icon !== fileBase?.icon) triggers.add('icon');
		if (color !== fileBase?.color) triggers.add('color');
		this.updateIconSetting(this.settings.fileIcons, file.id, icon, color);
		this.saveSettings();
		this.ruleManager.triggerRulings('file', ...triggers);
	}

	/**
	 * Save multiple file icon changes to settings.
	 * @param icon If undefined, leave icons unchanged
	 * @param color If undefined, leave colors unchanged
	 */
	saveFileIcons(files: FileItem[], icon: string | null | undefined, color: string | null | undefined): void {
		const triggers: Set<RuleTrigger> = new Set();
		for (const file of files) {
			if (icon !== undefined) file.icon = icon;
			if (color !== undefined) file.color = color;
			const bmarkBase = this.settings.fileIcons[file.id];
			if (icon !== bmarkBase?.icon) triggers.add('icon');
			if (color !== bmarkBase?.color) triggers.add('color');
			this.updateIconSetting(this.settings.fileIcons, file.id, file.icon, file.color);
		}
		this.saveSettings();
		this.ruleManager.triggerRulings('file', ...triggers);
	}

	/**
	 * Save bookmark icon changes to settings.
	 */
	saveBookmarkIcon(bmark: BookmarkItem, icon: string | null, color: string | null): void {
		const triggers: Set<RuleTrigger> = new Set();
		if (bmark.category === 'file' || bmark.category === 'folder') {
			const bmarkBase = this.settings.fileIcons[bmark.id];
			if (icon !== bmarkBase?.icon) triggers.add('icon');
			if (color !== bmarkBase?.color) triggers.add('color');
			this.updateIconSetting(this.settings.fileIcons, bmark.id, icon, color);
		} else {
			this.updateIconSetting(this.settings.bookmarkIcons, bmark.id, icon, color);
		}
		this.saveSettings();
		this.ruleManager.triggerRulings('file', ...triggers);
	}

	/**
	 * Save multiple bookmark icon changes to settings.
	 * @param icon If undefined, leave icons unchanged
	 * @param color If undefined, leave colors unchanged
	 */
	saveBookmarkIcons(bmarks: BookmarkItem[], icon: string | null | undefined, color: string | null | undefined): void {
		const triggers: Set<RuleTrigger> = new Set();
		for (const bmark of bmarks) {
			if (icon !== undefined) bmark.icon = icon;
			if (color !== undefined) bmark.color = color;
			if (bmark.category === 'file' || bmark.category === 'folder') {
				const bmarkBase = this.settings.fileIcons[bmark.id];
				if (icon !== bmarkBase?.icon) triggers.add('icon');
				if (color !== bmarkBase?.color) triggers.add('color');
				this.updateIconSetting(this.settings.fileIcons, bmark.id, bmark.icon, bmark.color);
			} else {
				this.updateIconSetting(this.settings.bookmarkIcons, bmark.id, bmark.icon, bmark.color);
			}
		}
		this.saveSettings();
		this.ruleManager.triggerRulings('file', ...triggers);
	}

	/**
	 * Save tag icon changes to settings.
	 */
	saveTagIcon(tag: TagItem, icon: string | null, color: string | null): void {
		this.updateIconSetting(this.settings.tagIcons, tag.id, icon, color);
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

		// 1.0.9: Migrate groupIcons from versions 1.0.3 ~ 1.0.8
		if ('groupIcons' in this.settings) {
			type GroupSettings = IconicSettings & {
				groupIcons?: {},
			}
			if (Object.keys(this.settings.bookmarkIcons).length === 0) {
				this.settings.bookmarkIcons = (this.settings as GroupSettings).groupIcons ?? {};
			}
			delete (this.settings as GroupSettings).groupIcons;
		}
	}

	/**
	 * Save settings to storage.
	 */
	async saveSettings(): Promise<void> {
		this.pruneSettings();

		// Sort item IDs for human-readability
		this.settings.appIcons = Object.fromEntries(Object.entries(this.settings.appIcons).sort());
		this.settings.tabIcons = Object.fromEntries(Object.entries(this.settings.tabIcons).sort());
		this.settings.fileIcons = Object.fromEntries(Object.entries(this.settings.fileIcons).sort());
		this.settings.bookmarkIcons = Object.fromEntries(Object.entries(this.settings.bookmarkIcons).sort());
		this.settings.propertyIcons = Object.fromEntries(Object.entries(this.settings.propertyIcons).sort());
		this.settings.ribbonIcons = Object.fromEntries(Object.entries(this.settings.ribbonIcons).sort());
		await this.saveData(this.settings);
	}

	/**
	 * Check for any deleted items and prune their icons.
	 */
	private pruneSettings(): void {
		this.updateUnsyncedFiles();

		// @ts-expect-error (Private API)
		const isSyncing = this.app.internalPlugins?.plugins?.sync?.instance?.syncing === true;
		// @ts-expect-error (Private API)
		const isPaused = this.app.internalPlugins?.plugins?.sync?.instance?.pause === true;

		// Disable pruning under these conditions
		if (isSyncing || isPaused || this.settings.rememberDeletedItems) {
			return;
		}

		// @ts-expect-error (Private API)
		const thisAppId = this.app.appId;
		// @ts-expect-error (Private API)
		const bmarkBases = this.flattenBookmarks(this.app.internalPlugins?.plugins?.bookmarks?.instance?.items ?? []);
		// @ts-expect-error (Private API)
		const propBases = this.app.metadataTypeManager?.properties ?? [];

		const fileIcons = Object.entries(this.settings.fileIcons).filter(([fileId, fileIcon]) =>
			// Never prune files that are unsynced on another device
			fileIcon.unsynced?.every(appId => appId === thisAppId) ?? true
		);

		for (const [fileId] of fileIcons) {
			const { path, subpath } = this.splitFilePath(fileId);
			const bmarkSubpath = subpath.replaceAll(/(?<!^)#|(?<!^#)\^|\s\s/g, ' ');
			if (!this.app.vault.getAbstractFileByPath(path)) {
				delete this.settings.fileIcons[fileId];
			} else if (subpath && !bmarkBases.some(bmarkBase => bmarkBase.path === path && bmarkBase.subpath === bmarkSubpath)) {
				delete this.settings.fileIcons[fileId];
			}
		}

		if (bmarkBases.length > 0) {
			const bmarkIds = bmarkBases
				.filter(bmarkBase => bmarkBase.type !== 'file' && bmarkBase.type !== 'folder')
				.map(bmarkBase => bmarkBase.ctime.toString());
			for (const bmarkId in this.settings.bookmarkIcons) {
				if (!bmarkIds.includes(bmarkId)) {
					delete this.settings.bookmarkIcons[bmarkId];
				}
			}
		}

		if (propBases.length > 0) {
			const propIds = Object.keys(propBases);
			for (const propId in this.settings.propertyIcons) {
				if (!propIds.includes(propId)) {
					delete this.settings.propertyIcons[propId];
				}
			}
		}
	}

	/**
	 * Flag any files excluded from Sync on this device.
	 */
	private updateUnsyncedFiles(): void {
		// @ts-expect-error (Private API)
		const appId = this.app.appId;
		// @ts-expect-error (Private API)
		const unsyncedFolders: string[] = this.app.internalPlugins?.plugins?.sync?.instance?.ignoreFolders ?? [];
		// @ts-expect-error (Private API)
		const unsyncedTypes: string[] = SYNCABLE_TYPES.filter(type => !this.app.internalPlugins?.plugins?.sync?.instance?.allowTypes.has(type));

		for (const [fileId, fileIcon] of Object.entries(this.settings.fileIcons)) {
			if (!Array.isArray(fileIcon.unsynced)) {
				delete fileIcon.unsynced;
			}

			const { extension } = this.splitFilePath(fileId);
			const unsynced = unsyncedFolders.some(folder => folder === fileId || fileId.startsWith(folder + '/'))
				|| unsyncedTypes.includes('unsupported') && !SYNCABLE_EXTENSIONS.includes(extension)
				|| unsyncedTypes.includes('image') && IMAGE_EXTENSIONS.includes(extension)
				|| unsyncedTypes.includes('audio') && AUDIO_EXTENSIONS.includes(extension)
				|| unsyncedTypes.includes('video') && VIDEO_EXTENSIONS.includes(extension)
				|| unsyncedTypes.includes('pdf') && extension === 'pdf';

			if (unsynced) {
				fileIcon.unsynced = fileIcon.unsynced ?? [];
				if (!fileIcon.unsynced.includes(appId)) fileIcon.unsynced.push(appId);
			} else {
				if (fileIcon.unsynced?.includes(appId)) fileIcon.unsynced?.remove(appId);
				if (fileIcon.unsynced?.length === 0) delete fileIcon.unsynced;
			}
		}
	}

	/**
	 * @override
	 */
	onunload(): void {
		this.ruleManager.unload();
		this.appIconManager?.unload();
		this.tabIconManager?.unload();
		this.fileIconManager?.unload();
		this.bookmarkIconManager?.unload();
		this.tagIconManager?.unload();
		this.propertyIconManager?.unload();
		this.editorIconManager?.unload();
		this.ribbonIconManager?.unload();
		this.refreshBodyClasses(true);
	}
}
