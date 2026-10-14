import { Command, Notice, Platform, Plugin, TAbstractFile, TFile, TFolder, View, WorkspaceFloating, WorkspaceLeaf, WorkspaceRoot, getIconIds, getLanguage, normalizePath } from 'obsidian';
import IconicSettingTab from 'src/IconicSettingTab.js';
import ObsidianUtils, { ObsidianBookmark, ObsidianTag, ObsidianProperty, ObsidianRibbonItem } from 'src/utils/ObsidianUtils.js';
import ResourceUtils from 'src/utils/ResourceUtils.js';
import MenuManager from 'src/managers/MenuManager.js';
import RuleManager, { RuleTrigger } from 'src/managers/RuleManager.js';
import IconManager from 'src/managers/IconManager.js';
import AppIconManager from 'src/managers/AppIconManager.js';
import TabIconManager from 'src/managers/TabIconManager.js';
import FileIconManager from 'src/managers/FileIconManager.js';
import BookmarkIconManager from 'src/managers/BookmarkIconManager.js';
import TagIconManager from 'src/managers/TagIconManager.js';
import PropertyIconManager from 'src/managers/PropertyIconManager.js';
import EditorIconManager from 'src/managers/EditorIconManager.js';
import RibbonIconManager from 'src/managers/RibbonIconManager.js';
import SuggestionIconManager from 'src/managers/SuggestionIconManager.js';
import SuggestionDialogIconManager from 'src/managers/SuggestionDialogIconManager.js';
import ExternalLibraryManager from 'src/managers/ExternalLibraryManager.js';
import IconPicker from 'src/dialogs/IconPicker.js';
import RulePicker from 'src/dialogs/RulePicker.js';

export const [ICONS, ICON_KEYWORDS] = ResourceUtils.getIcons(getIconIds());
export const [EMOJIS, EMOJI_KEYWORDS] = ResourceUtils.getEmojis();
export const STRINGS = ResourceUtils.getStrings(getLanguage());

export type Category = 'app' | 'tab' | 'file' | 'folder' | 'group' | 'search' | 'graph' | 'url' | 'tag' | 'property' | 'ribbon' | 'rule';
export type AppItemId = 'help' | 'settings' | 'pin' | 'sidebarLeft' | 'sidebarRight' | 'minimize' | 'maximize' | 'unmaximize' | 'close';

// Plugin tabs that contain a file, but should still display a tab-specific icon
export const PLUGIN_TAB_TYPES = [
	'backlink',
	'file-properties',
	'footnotes',
	'localgraph',
	'outgoing-link',
	'outline',
];

const IMAGE_EXTENSIONS = ['bmp', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', '3gp', 'flac', 'ogg', 'oga', 'opus'];

const HOUR = 1000 * 60 * 60; // 1 hour in millis
const MINUTE = 1000 * 60; // 1 minute in millis
const SECOND = 1000; // 1 second in millis

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
	category: Category;
	iconDefault: string | null;
}
export type AppItem = Item;
export interface TabItem extends Item {
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
	items: BookmarkItem[] | null;
}
export type TagItem = Item;
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
	showMarkdownTabIcons: boolean;
	showTitleIcons: boolean;
	showTagPillIcons: boolean;
	showMenuActions: boolean;
	showSuggestionIcons: boolean;
	showQuickSwitcherIcons: boolean;
	showMoveFileIcons: boolean;
	showItemName: string;
	useSearchKeywords: string;
	maxSearchResults: number;
	colorPicker1: string;
	colorPicker2: string;
	uncolorHover: boolean;
	uncolorDrag: boolean;
	uncolorSelect: boolean;
	uncolorQuick: boolean;
	maxBackups: number;
	enableExternalLibraries: boolean;
	externalLibraries: string[];
	dialogState: {
		iconMode: boolean;
		emojiMode: boolean;
		rulePage: Category;
	},
	appIcons: Record<string, { icon?: string, color?: string }>;
	tabIcons: Record<string, { icon?: string, color?: string }>;
	fileIcons: Record<string, { icon?: string, color?: string }>;
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
	minimalFolderIcons: true,
	showMarkdownTabIcons: true,
	showTitleIcons: true,
	showTagPillIcons: false,
	showMenuActions: true,
	showSuggestionIcons: false,
	showQuickSwitcherIcons: true,
	showMoveFileIcons: true,
	showItemName: 'desktop',
	useSearchKeywords: 'on',
	maxSearchResults: 100,
	colorPicker1: 'list',
	colorPicker2: 'rgb',
	uncolorHover: false,
	uncolorDrag: false,
	uncolorSelect: false,
	uncolorQuick: false,
	maxBackups: 2,
	enableExternalLibraries: false,
	externalLibraries: [],
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
	settings: IconicSettings = DEFAULT_SETTINGS;
	menuManager?: MenuManager;
	ruleManager?: RuleManager;
	appIconManager?: AppIconManager;
	tabIconManager?: TabIconManager;
	fileIconManager?: FileIconManager;
	bookmarkIconManager?: BookmarkIconManager;
	tagIconManager?: TagIconManager;
	propertyIconManager?: PropertyIconManager;
	editorIconManager?: EditorIconManager;
	ribbonIconManager?: RibbonIconManager;
	suggestionIconManager?: SuggestionIconManager;
	suggestionDialogIconManager?: SuggestionDialogIconManager;
	dialogCommands: Command[] = [];
	private isSaving = false;

	/**
	 * @override
	 */
	async onload(): Promise<void> {
		await this.loadSettings();
		void ExternalLibraryManager.refresh(this);
		this.addSettingTab(new IconicSettingTab(this));

		this.app.workspace.onLayoutReady(() => {
			this.startManagers();
			this.refreshBody();

			this.registerEvent(this.app.vault.on('create', tAbstractFile => {
				const page = tAbstractFile instanceof TFile ? 'file' : 'folder';
				// If a created file/folder triggers a new ruling, refresh icons
				if (this.ruleManager?.triggerRulings(page, 'rename', 'move', 'modify')) {
					this.refreshManagers(page);
				}
			}));

			this.registerEvent(this.app.vault.on('rename', (tAbstractFile, oldPath) => {
				const { path } = tAbstractFile;
				const fileIcon = this.settings.fileIcons[oldPath];
				if (fileIcon) {
					this.settings.fileIcons[path] = fileIcon;
					delete this.settings.fileIcons[oldPath];
					void this.saveSettings();
				}
				const { filename, tree } = this.splitFilePath(path);
				const { filename: oldFilename, tree: oldTree } = this.splitFilePath(oldPath);
				const page = tAbstractFile instanceof TFile ? 'file' : 'folder';
				// If a renamed file/folder triggers a new ruling, refresh icons
				if (filename !== oldFilename && this.ruleManager?.triggerRulings(page, 'rename')) {
					this.refreshManagers(page);
				// If a moved file/folder triggers a new ruling, refresh icons
				} else if (tree !== oldTree && this.ruleManager?.triggerRulings(page, 'move')) {
					this.refreshManagers(page);
				}
			}));

			this.registerEvent(this.app.vault.on('modify', tAbstractFile => {
				this.onFileModify(tAbstractFile);
			}));
			this.registerEvent(this.app.metadataCache.on('changed', tAbstractFile => {
				this.onFileModify(tAbstractFile);
			}));

			this.registerEvent(this.app.vault.on('delete', (tAbstractFile) => {
				const { path } = tAbstractFile;
				delete this.settings.fileIcons[path];
				void this.saveSettings();
				// If a deleted file/folder was associated with a ruling, update rulings
				const page = tAbstractFile instanceof TFile ? 'file' : 'folder';
				if (this.ruleManager?.checkRuling(page, path)) {
					this.ruleManager.updateRulings(page);
				}
			}));
		});

		this.registerEvent(this.app.workspace.on('css-change', () => {
			this.refreshManagers();
			this.refreshBody();
		}));

		// RIBBON: Open rulebook
		this.addRibbonIcon(
			'lucide-book-image',
			STRINGS.commands.openRulebook,
			() => RulePicker.open(this),
		);

		// COMMAND: Open rulebook
		this.addCommand({
			id: 'open-rulebook',
			name: STRINGS.commands.openRulebook,
			callback: () => RulePicker.open(this),
		});

		// COMMAND: Toggle bigger icons
		this.dialogCommands.push(this.addCommand({
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
				void this.saveSettings();
				this.refreshBody();
			}
		}));

		// COMMAND: Toggle clickable icons
		this.dialogCommands.push(this.addCommand({
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
				void this.saveSettings();
				this.refreshManagers();
				this.refreshBody();
			}
		}));

		// COMMAND: Toggle all file icons
		this.dialogCommands.push(this.addCommand({
			id: 'toggle-all-file-icons',
			name: STRINGS.commands.toggleAllFileIcons,
			callback: () => {
				this.settings.showAllFileIcons = !this.settings.showAllFileIcons;
				void this.saveSettings();
				this.refreshManagers('file');
			}
		}));

		// COMMAND: Toggle all folder icons
		this.dialogCommands.push(this.addCommand({
			id: 'toggle-all-folder-icons',
			name: STRINGS.commands.toggleAllFolderIcons,
			callback: () => {
				this.settings.showAllFolderIcons = !this.settings.showAllFolderIcons;
				void this.saveSettings();
				this.refreshManagers('file', 'tag');
			}
		}));

		// COMMAND: Toggle minimal folder icons
		this.dialogCommands.push(this.addCommand({
			id: 'toggle-minimal.folder-icons',
			name: STRINGS.commands.toggleMinimalFolderIcons,
			callback: () => {
				this.settings.minimalFolderIcons = !this.settings.minimalFolderIcons;
				void this.saveSettings();
				this.refreshManagers('file', 'tag');
			}
		}));

		// COMMAND: Toggle Markdown tab icons
		this.dialogCommands.push(this.addCommand({
			id: 'toggle-markdown-tab-icons',
			name: STRINGS.commands.toggleMarkdownTabIcons,
			callback: () => {
				this.settings.showMarkdownTabIcons = !this.settings.showMarkdownTabIcons;
				void this.saveSettings();
				this.refreshBody();
			}
		}));

		// COMMAND: Toggle title icons
		this.dialogCommands.push(this.addCommand({
			id: 'toggle-title-icons',
			name: STRINGS.commands.toggleTitleIcons,
			callback: () => {
				this.settings.showTitleIcons = !this.settings.showTitleIcons;
				void this.saveSettings();
				this.refreshManagers('file');
			}
		}));

		// COMMAND: Toggle tag pill icons
		this.addCommand({
			id: 'toggle-tag-pill-icons',
			name: STRINGS.commands.toggleTagPillIcons,
			callback: () => {
				this.settings.showTagPillIcons = !this.settings.showTagPillIcons;
				void this.saveSettings();
				this.refreshManagers('tag');
			}
		});

		// COMMAND: Toggle menu actions
		this.addCommand({
			id: 'toggle-menu-actions',
			name: STRINGS.commands.toggleMenuActions,
			callback: () => {
				this.settings.showMenuActions = !this.settings.showMenuActions;
				void this.saveSettings();
				this.refreshManagers();
				this.menuManager?.closeAndFlush();
			}
		});

		// COMMAND: Toggle suggestion icons
		this.addCommand({
			id: 'toggle-suggestion-icons',
			name: STRINGS.commands.toggleSuggestionIcons,
			callback: () => {
				this.settings.showSuggestionIcons = !this.settings.showSuggestionIcons;
				void this.saveSettings();
			}
		});

		// COMMAND: Toggle quick switcher icons
		this.addCommand({
			id: 'toggle-quick-switcher-icons',
			name: STRINGS.commands.toggleQuickSwitcherIcons,
			callback: () => {
				this.settings.showQuickSwitcherIcons = !this.settings.showQuickSwitcherIcons;
				void this.saveSettings();
			}
		});

		// COMMAND: Toggle "Move file" icons
		this.addCommand({
			id: 'toggle-move-file-icons',
			name: STRINGS.commands.toggleMoveFileIcons,
			callback: () => {
				this.settings.showMoveFileIcons = !this.settings.showMoveFileIcons;
				void this.saveSettings();
			}
		});

		// COMMAND: Change icon of the current file
		this.addCommand({
			id: 'change-icon-current-file',
			name: STRINGS.commands.changeIconCurrentFile,
			checkCallback: checking => {
				const tFile = this.app.workspace.getActiveFile();
				if (tFile === null) return false;

				const file = this.getFileItem(tFile.path);
				if (file === null) return false;

				if (!checking) {
					IconPicker.openSingle(this, file, (newIcon, newColor) => {
						this.saveFileIcon(file, newIcon, newColor);
						this.refreshManagers('file');
					});
				}
				return true
			},
		});
	}

	/**
	 * @override
	 */
	async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings();
		await ExternalLibraryManager.refresh(this);
		this.refreshManagers();
		this.refreshBody();
	}

	/**
	 * Refresh icon managers after a file/folder is modified.
	 */
	private onFileModify(tAbstractFile: TAbstractFile): void {
		const page = tAbstractFile instanceof TFile ? 'file' : 'folder';
		// If a modified file/folder triggers a new ruling, refresh icons
		if (this.ruleManager?.triggerRulings(page, 'modify')) {
			this.refreshManagers(page);
		}
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
		try { this.suggestionIconManager = new SuggestionIconManager(this) } catch (e) { console.error(e) }
		try { this.suggestionDialogIconManager = new SuggestionDialogIconManager(this) } catch (e) { console.error(e) }
	}

	/**
	 * Refresh all icon managers, or a specific group of them.
	 */
	refreshManagers(...categories: Category[]): void {
		if (categories.length === 0) {
			categories = ['app', 'tab', 'file', 'folder', 'tag', 'property', 'ribbon'];
		}
		const managers = new Set<IconManager | undefined>();

		if (categories.includes('app')) {
			managers.add(this.appIconManager);
		}
		if (categories.includes('tab')) {
			managers.add(this.tabIconManager);
		}
		if (categories.includes('file')) {
			managers.add(this.tabIconManager);
			managers.add(this.fileIconManager);
			managers.add(this.bookmarkIconManager);
			managers.add(this.editorIconManager);
		}
		if (categories.includes('folder')) {
			managers.add(this.fileIconManager);
			managers.add(this.bookmarkIconManager);
		}
		if (categories.includes('tag')) {
			managers.add(this.tagIconManager);
			managers.add(this.editorIconManager);
		}
		if (categories.includes('property')) {
			managers.add(this.propertyIconManager);
			managers.add(this.editorIconManager);
		}
		if (categories.includes('ribbon')) {
			managers.add(this.ribbonIconManager);
		}

		managers.delete(undefined);
		for (const manager of managers) manager?.refreshIcons();
	}

	/**
	 * Refresh any classes or attributes on every document body.
	 * @param unloading Remove all classes if true
	 */
	refreshBody(unloading?: boolean): void {
		// Check all open windows
		const bodyEls = new Set<HTMLElement>();
		this.app.workspace.iterateAllLeaves(leaf => {
			// @ts-expect-error (Private API)
			const bodyEl: unknown = leaf?.containerEl?.doc?.body;
			if (bodyEl instanceof HTMLElement) bodyEls.add(bodyEl);
		});

		// Refresh classes and theme attribute
		for (const bodyEl of bodyEls) {
			bodyEl.toggleClass('iconic-bigger-icons', unloading ? false : this.isSettingEnabled('biggerIcons'));
			bodyEl.toggleClass('iconic-clickable-icons', unloading ? false : this.isSettingEnabled('clickableIcons'));
			bodyEl.toggleClass('iconic-markdown-tab-icons', unloading ? false : this.settings.showMarkdownTabIcons);
			bodyEl.toggleClass('iconic-uncolor-hover', unloading ? false : this.settings.uncolorHover);
			bodyEl.toggleClass('iconic-uncolor-drag', unloading ? false : this.settings.uncolorDrag);
			bodyEl.toggleClass('iconic-uncolor-select', unloading ? false : this.settings.uncolorSelect);

			// @ts-expect-error (Private API)
			const theme = this.app.customCss?.theme;
			if (theme) {
				bodyEl.setAttr('data-theme', theme);
			} else {
				bodyEl.removeAttribute('data-theme');
			}
		}
	}

	/**
	 * Check whether setting is enabled for the current platform.
	 */
	isSettingEnabled(setting: keyof IconicSettings): boolean {
		const state = this.settings[setting];
		return state === 'on' || Platform.isDesktop && state === 'desktop' || Platform.isMobile && state === 'mobile';
	}

	/**
	 * Check whether a community plugin is installed and enabled.
	 */
	isPluginEnabled(pluginId: string): boolean {
		// @ts-expect-error (Private API)
		const plugins: unknown = this.app.plugins?.plugins;
		return ObsidianUtils.isObject(plugins) ? pluginId in plugins : false;
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
				iconDefault = 'sidebar-toggle-button-icon';
				break;
			}
			case 'sidebarRight': {
				name = STRINGS.appItems.sidebarRight;
				iconDefault = 'sidebar-toggle-button-icon';
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
			if (tabType === tabId || leaf.view.getState().file === tabId && !PLUGIN_TAB_TYPES.includes(tabType)) {
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
		const isRoot = leaf.getRoot() instanceof WorkspaceRoot || leaf.getRoot() instanceof WorkspaceFloating;

		// @ts-expect-error (Private API)
		const isStacked = leaf.parent?.isStacked === true;
		const filePath = leaf.view.getState().file; // Used because view.file is undefined on deferred views

		if (filePath && !PLUGIN_TAB_TYPES.includes(tabType)) {
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
		const subpathExts = ['md', 'base', 'pdf']; // Extensions with linkable subpaths
		const subpathStart = Math.max(...subpathExts.map(ext => {
			const index = fileId.lastIndexOf(`.${ext}#`);
			return index > -1 ? (index + ext.length + 1) : -1;
		}));
		const subpath = subpathStart > -1 ? fileId.substring(subpathStart, fileId.length) : '';
		const path = subpathStart > -1 ? fileId.substring(0, subpathStart) : fileId;

		const [, tree = '', filename = ''] = path.match(/^(.*\/)?(.*)$/s) ?? [];
		const extensionStart = filename.lastIndexOf('.');
		const extension = filename.substring(extensionStart > -1 ? extensionStart + 1 : filename.length) || '';
		const basename = filename.substring(0, extensionStart > -1 ? extensionStart : filename.length) || '';

		return { path, tree, filename, basename, extension, subpath };
	}

	/**
	 * Get array of bookmark definitions.
	 */
	getBookmarkItems(unloading?: boolean): BookmarkItem[] {
		const oBmarks = ObsidianUtils.getObsidianBookmarks(this.app);
		return oBmarks.map(oBmark => this.defineBookmarkItem(oBmark, unloading));
	}

	/**
	 * Get bookmark definition.
	 */
	getBookmarkItem(bmarkId: string, bmarkCategory: Category, unloading?: boolean): BookmarkItem | null {
		const oBmark = ObsidianUtils.getObsidianBookmark(this.app, bmarkCategory, bmarkId);
		return oBmark ? this.defineBookmarkItem(oBmark, unloading) : null;
	}

	/**
	 * Create bookmark definition.
	 */
	private defineBookmarkItem(oBmark: ObsidianBookmark, unloading?: boolean): BookmarkItem {
		let id = '';
		let name = '';
		let category: Category = 'file';
		let icon: string | null = null;
		let color: string | null = null;
		let iconDefault: string | null = null;

		switch (oBmark.type) {
			case 'file': {
				const { path, filename, basename, extension } = this.splitFilePath(oBmark.path ?? '');
				const subpath = oBmark.subpath ?? '';
				id = path + subpath;
				name = (extension === 'md' ? basename : filename) + subpath;
				category = 'file';
				icon = this.settings.fileIcons[id]?.icon ?? null;
				color = this.settings.fileIcons[id]?.color ?? null;
				iconDefault = this.getDefaultBookmarkIcon(extension, subpath, unloading);
				break;
			}
			case 'folder': {
				category = 'folder';
				id = oBmark.path ?? '';
				name = oBmark.title ?? '';
				icon = this.settings.fileIcons[id]?.icon ?? null;
				color = this.settings.fileIcons[id]?.color ?? null;
				iconDefault = 'lucide-folder';
				break;
			}
			case 'group': {
				category = 'group';
				id = oBmark.ctime.toString();
				name = oBmark.title ?? '';
				icon = this.settings.bookmarkIcons[id]?.icon ?? null;
				color = this.settings.bookmarkIcons[id]?.color ?? null;
				if (color && !this.settings.minimalFolderIcons || this.settings.showAllFolderIcons) {
					iconDefault = 'lucide-folder-closed';
				}
				break;
			}
			case 'search': {
				category = 'search';
				id = oBmark.ctime.toString();
				name = oBmark.query ?? '';
				icon = this.settings.bookmarkIcons[id]?.icon ?? null;
				color = this.settings.bookmarkIcons[id]?.color ?? null;
				iconDefault = 'lucide-search';
				break;
			}
			case 'graph': {
				category = 'graph';
				id = oBmark.ctime.toString();
				name = oBmark.title ?? '';
				icon = this.settings.bookmarkIcons[id]?.icon ?? null;
				color = this.settings.bookmarkIcons[id]?.color ?? null;
				iconDefault = 'lucide-git-fork';
				break;
			}
			case 'url': {
				id = oBmark.ctime.toString();
				name = oBmark.url ?? '';
				icon = this.settings.bookmarkIcons[id]?.icon ?? null;
				color = this.settings.bookmarkIcons[id]?.color ?? null;
				iconDefault = 'lucide-globe-2';
			}
		}

		return {
			id,
			name,
			category,
			iconDefault,
			icon: unloading ? null : icon,
			color: unloading ? null : color,
			items: oBmark.items?.map(oBmark => this.defineBookmarkItem(oBmark, unloading)) ?? null,
		};
	}

	/**
	 * Get the default bookmark icon for a given file extension and file subpath.
	 */
	private getDefaultBookmarkIcon(extension: string, subpath: string, unloading?: boolean): string {
		// Vanilla bookmark icons
		if (extension === 'canvas') {
			return 'lucide-layout-dashboard';
		} else if (subpath.startsWith('#^')) {
			return 'lucide-toy-brick';
		} else if (subpath.startsWith('#')) {
			return 'lucide-heading';
		} else if (unloading) {
			return 'lucide-file';
		}
		// Derived from the vanilla tab icons for these filetypes
		if (extension === 'pdf') {
			return 'lucide-file-text';
		} else if (IMAGE_EXTENSIONS.includes(extension)) {
			return 'lucide-image';
		} else if (AUDIO_EXTENSIONS.includes(extension)) {
			return 'lucide-file-audio';
		}
		// Generic icon
		return 'lucide-file';
	}

	/**
	 * Get array of tag definitions.
	 */
	getTagItems(unloading?: boolean): TagItem[] {
		const oTags = ObsidianUtils.getObsidianTags(this.app);
		if (!oTags) return [];
		return oTags?.map(oTag => this.defineTagItem(oTag, unloading));
	}

	/**
	 * Get tag definition.
	 */
	getTagItem(tagId: string, unloading?: boolean): TagItem | null {
		const oTag = ObsidianUtils.getObsidianTag(this.app, tagId);
		if (!oTag) return null;
		return this.defineTagItem(oTag, unloading);
	}

	/**
	 * Create tag definition.
	 */
	private defineTagItem(oTag: ObsidianTag, unloading?: boolean): TagItem {
		const [hashtag] = oTag;
		const tagId = hashtag.replace('#', '');
		const tagIcon = this.settings.tagIcons[tagId];

		return {
			id: tagId,
			name: hashtag,
			category: 'tag',
			iconDefault: null,
			icon: unloading ? null : tagIcon?.icon ?? null,
			color: unloading ? null : tagIcon?.color ?? null,
		};
	}

	/**
	 * Get array of property definitions.
	 */
	getPropertyItems(unloading?: boolean): PropertyItem[] {
		const oProps = ObsidianUtils.getObsidianProperties(this.app);
		return oProps.map(oProp => this.definePropertyItem(oProp, unloading));
	}

	/**
	 * Get property definition.
	 * @param propId Case-insensitive property ID
	 */
	getPropertyItem(propId: string, unloading?: boolean): PropertyItem | null {
		const oProp = ObsidianUtils.getObsidianProperty(this.app, propId);
		if (!oProp) return null;
		return this.definePropertyItem(oProp, unloading);
	}

	/**
	 * Create property definition.
	 */
	private definePropertyItem(oProp: ObsidianProperty, unloading?: boolean): PropertyItem {
		const { name, widget } = oProp[1];
		const propIcon = this.settings.propertyIcons[name];
		const iconDefault = ObsidianUtils.getDefaultPropertyIcon(this.app, widget);
		return {
			id: name,
			name: name,
			category: 'property',
			iconDefault: iconDefault,
			icon: unloading ? null : propIcon?.icon ?? null,
			color: unloading ? null : propIcon?.color ?? null,
			type: widget,
		};
	}

	/**
	 * Get array of ribbon item definitions.
	 */
	getRibbonItems(unloading?: boolean): RibbonItem[] {
		const oRibbonItems = ObsidianUtils.getObsidianRibbonItems(this.app);
		return oRibbonItems.map(oRibbonItem => this.defineRibbonItem(oRibbonItem, unloading));
	}

	/**
	 * Get ribbon item definition.
	 */
	getRibbonItem(itemId: string, unloading?: boolean): RibbonItem | null {
		const oRibbonItem = ObsidianUtils.getObsidianRibbonItem(this.app, itemId);
		if (!oRibbonItem) return null;
		return this.defineRibbonItem(oRibbonItem, unloading);
	}

	/**
	 * Create ribbon item definition.
	 */
	private defineRibbonItem(oRibbonItem: ObsidianRibbonItem, unloading?: boolean): RibbonItem {
		const ribbonIcon = this.settings.ribbonIcons[oRibbonItem.id];

		return {
			id: oRibbonItem.id,
			name: oRibbonItem.title ,
			category: 'ribbon',
			iconDefault: oRibbonItem.icon ,
			icon: unloading ? null : ribbonIcon?.icon ?? null,
			color: unloading ? null : ribbonIcon?.color ?? null,
			isHidden: oRibbonItem.hidden,
			iconEl: oRibbonItem.buttonEl,
		};
	}

	/**
	 * Save app icon changes to settings.
	 */
	saveAppIcon(appItem: AppItem, icon: string | null, color: string | null): void {
		this.updateIconSetting(this.settings.appIcons, appItem.id, icon, color);
		void this.saveSettings();
	}

	/**
	 * Save tab icon changes to settings.
	 */
	saveTabIcon(tab: TabItem, icon: string | null, color: string | null): void {
		this.updateIconSetting(this.settings.tabIcons, tab.id, icon, color);
		void this.saveSettings();
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
		void this.saveSettings();
		this.ruleManager?.triggerRulings('file', ...triggers);
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
		void this.saveSettings();
		this.ruleManager?.triggerRulings('file', ...triggers);
	}

	/**
	 * Save bookmark icon changes to settings.
	 */
	saveBookmarkIcon(bmark: BookmarkItem, icon: string | null, color: string | null): void {
		const triggers: Set<RuleTrigger> = new Set();
		switch (bmark.category) {
			case 'file': // Fallthrough
			case 'folder': {
				const bmarkBase = this.settings.fileIcons[bmark.id];
				if (icon !== bmarkBase?.icon) triggers.add('icon');
				if (color !== bmarkBase?.color) triggers.add('color');
				this.updateIconSetting(this.settings.fileIcons, bmark.id, icon, color);
				break;
			}
			default: {
				this.updateIconSetting(this.settings.bookmarkIcons, bmark.id, icon, color);
				break;
			}
		}
		void this.saveSettings();
		this.ruleManager?.triggerRulings('file', ...triggers);
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
			switch (bmark.category) {
				case 'file': // Fallthrough
				case 'folder': {
					const bmarkBase = this.settings.fileIcons[bmark.id];
					if (icon !== bmarkBase?.icon) triggers.add('icon');
					if (color !== bmarkBase?.color) triggers.add('color');
					this.updateIconSetting(this.settings.fileIcons, bmark.id, bmark.icon, bmark.color);
					break;
				}
				default: {
					this.updateIconSetting(this.settings.bookmarkIcons, bmark.id, bmark.icon, bmark.color);
					break;
				}
			}
		}
		void this.saveSettings();
		this.ruleManager?.triggerRulings('file', ...triggers);
	}

	/**
	 * Save tag icon changes to settings.
	 */
	saveTagIcon(tag: TagItem, icon: string | null, color: string | null): void {
		this.updateIconSetting(this.settings.tagIcons, tag.id, icon, color);
		void this.saveSettings();
	}

	/**
	 * Save property icon changes to settings.
	 */
	savePropertyIcon(prop: PropertyItem, icon: string | null, color: string | null): void {
		this.updateIconSetting(this.settings.propertyIcons, prop.id, icon, color);
		void this.saveSettings();
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
		void this.saveSettings();
	}

	/**
	 * Save ribbon icon changes to settings.
	 */
	saveRibbonIcon(ribbonItem: RibbonItem, icon: string | null, color: string | null): void {
		this.updateIconSetting(this.settings.ribbonIcons, ribbonItem.id, icon, color);
		void this.saveSettings();
	}

	/**
	 * Update icon in a given settings object.
	 */
	private updateIconSetting(settings: Record<string, Partial<{ icon?: string, color?: string }>>, itemId: string, icon: string | null, color: string | null): void {
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
		const { adapter } = this.app.vault;
		const dataPath = normalizePath(this.manifest.dir + '/data.json');
		const backupPath = normalizePath(dataPath + '.backup');

		// If a backup exists, check `data.json` for corruption
		if (await adapter.exists(backupPath + 1)) {
			let dataObject = {};

			// Try to read `data.json`
			if (await adapter.exists(dataPath)) {
				const dataJson = await adapter.read(dataPath);
				try { dataObject = JSON.parse(dataJson) } catch (_) { /* Ignore */ }
			}

			// If `data.json` is missing or corrupted, restore the backup
			if (Object.keys(dataObject).length === 0) {
				await this.restoreBackup();
			}
		}

		// Load `data.json`
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Normalize external library settings: older versions stored a map of
		// library IDs to booleans, while newer versions store an array of IDs.
		if (!Array.isArray(this.settings.externalLibraries)) {
			const legacyLibraries = this.settings.externalLibraries as unknown as Record<string, boolean> | undefined;
			this.settings.externalLibraries = Object.entries(legacyLibraries ?? {})
				.filter(([, enabled]) => enabled === true)
				.map(([libraryId]) => libraryId);
		}
	}

	/**
	 * Restore backup settings from storage.
	 */
	private async restoreBackup(): Promise<void> {
		const { adapter } = this.app.vault;
		const dataPath = normalizePath(this.manifest.dir + '/data.json');
		const backupPath = normalizePath(dataPath + '.backup');
		const backupStat = await adapter.stat(backupPath + 1);
		if (!backupStat) return;

		// Overwrite `data.json` with the backup
		if (await adapter.exists(dataPath)) {
			await adapter.remove(dataPath);
		}
		await adapter.copy(backupPath + 1, dataPath);

		// Describe how long ago the backup was made
		const ago = Date.now() - backupStat.mtime;
		let message = STRINGS.backups.backupNotice + '\n\n';
		if (ago < 60 * SECOND) {
			message += STRINGS.backups.backupSecondsAgo.replace('{#}', Math.round(ago / SECOND).toString());
		} else if (ago < 60 * MINUTE) {
			message += STRINGS.backups.backupMinutesAgo.replace('{#}', Math.round(ago / MINUTE).toString());
		} else if (ago < 24 * HOUR) {
			message += STRINGS.backups.backupHoursAgo.replace('{#}', Math.round(ago / HOUR).toString());
		} else {
			const dateFormat = new Intl.DateTimeFormat(getLanguage(), {
				dateStyle: 'long',
				timeStyle: 'short'
			}).format(backupStat?.mtime);
			message += STRINGS.backups.backupDate.replace('{#}', dateFormat);
		}

		// Notify user about the restored data
		new Notice(message, 0);
	}

	/**
	 * Save settings to storage.
	 */
	async saveSettings(): Promise<void> {
		if (this.isSaving) return;
		this.isSaving = true;

		// Sort item IDs for human-readability
		this.settings.appIcons = Object.fromEntries(Object.entries(this.settings.appIcons).sort());
		this.settings.tabIcons = Object.fromEntries(Object.entries(this.settings.tabIcons).sort());
		this.settings.fileIcons = Object.fromEntries(Object.entries(this.settings.fileIcons).sort());
		this.settings.bookmarkIcons = Object.fromEntries(Object.entries(this.settings.bookmarkIcons).sort());
		this.settings.propertyIcons = Object.fromEntries(Object.entries(this.settings.propertyIcons).sort());
		this.settings.ribbonIcons = Object.fromEntries(Object.entries(this.settings.ribbonIcons).sort());

		// Pause before writing to storage, in case the current state cause an instant crash
		await sleep(300);

		// Save and backup settings
		await this.saveData(this.settings);
		await this.saveBackup();
		this.isSaving = false;
	}

	/**
	 * Backup settings into a numbered backup file.
	 */
	async saveBackup(): Promise<void> {
		const dataPath = normalizePath(this.manifest.dir + '/data.json');
		const backupPath = normalizePath(dataPath + '.backup');
		const { adapter } = this.app.vault;

		// Determine if a new backup is due for creation
		const backupStat = await adapter.stat(backupPath + 1);
		const timeSinceLastBackup = Date.now() - (backupStat?.mtime ?? 0);
		const isDueForBackup = this.settings.maxBackups > 0 && timeSinceLastBackup >= HOUR * 3;

		// Loop through backup files
		for (let i = 10; i--; i === 0) {
			if (await adapter.exists(backupPath + i)) {
				if (i > this.settings.maxBackups || isDueForBackup && i === this.settings.maxBackups) {
					// Delete any backup numbered higher than the maximum, or due for replacement
					await adapter.remove(backupPath + i);
				} else if (isDueForBackup && i < this.settings.maxBackups) {
					// Increment backup number
					await adapter.rename(backupPath + i, backupPath + (i + 1));
				}
			}
		}

		// Create new backup if necessary
		if (isDueForBackup) {
			await adapter.copy(dataPath, backupPath + 1);
		}
	}

	/**
	 * @override
	 */
	onunload(): void {
		this.menuManager?.unload();
		this.ruleManager?.unload();
		this.appIconManager?.unload();
		this.tabIconManager?.unload();
		this.fileIconManager?.unload();
		this.bookmarkIconManager?.unload();
		this.tagIconManager?.unload();
		this.propertyIconManager?.unload();
		this.editorIconManager?.unload();
		this.ribbonIconManager?.unload();
		this.suggestionIconManager?.unload();
		this.suggestionDialogIconManager?.unload();
		this.refreshBody(true);
	}
}
