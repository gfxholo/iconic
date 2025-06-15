import 'obsidian';

// Some typings were taken from Obsidian Extended Typings by Fevol, MIT licensed.
// See: https://github.com/Fevol/obsidian-typings

declare module 'obsidian' {
	interface App {
		appId: string;
		customCss: CustomCss;
		hotkeyManager: HotkeyManager;
		internalPlugins: InternalPluginManager;
		metadataTypeManager: MetadataTypeManager;
		mobileNavbar: MobileNavbar | null;
		plugins: PluginManager;
		setting: AppSetting;
	}

	interface AppSetting extends Modal {}

	interface BookmarkItem<T extends BookmarkItemType = BookmarkItemType> {
		type: T;
		title?: string | undefined;
		path?: string | undefined;
		url?: string | undefined;
	}

	type BookmarkItemType =
		| 'file'
		| 'folder'
		| 'group'
		| 'graph'
		| 'search'
		| 'url';

	interface BookmarkLookup<T extends BookmarkItemType = BookmarkItemType> {
		[path: string]: BookmarkItem<T>;
	}

	type BookmarksPlugin = InternalPlugin<BookmarksPluginInstance>;

	interface BookmarksPluginInstance extends InternalPluginInstance, Events {
		bookmarkLookup: BookmarkLookup<'file' | 'folder'>;
		items: BookmarkItem[];
		getBookmarks(): BookmarkItem[];
		removeItem(item: BookmarkItem): void;
		urlBookmarkLookup: BookmarkLookup<'url'>;
	}

	interface ButtonComponent {
		setDisabled(on: boolean): this;
		setLoading(on: boolean): this;
	}

	interface CustomCss extends Component {
		theme: string;
	}

	interface HotkeyManager {
		get customKeys(): Record<string, Hotkey[]>;
	}

	interface InternalPlugin<T extends InternalPluginInstance> extends Component {
		instance: T;
	}

	interface InternalPluginInstance {}
	
	interface InternalPluginInstanceMap {
		'bookmarks': BookmarksPluginInstance;
		'sync': SyncPluginInstance;
	}

	interface InternalPluginManager extends Events {
		plugins: {
			[ID in keyof InternalPluginInstanceMap]: InternalPlugin<InternalPluginInstanceMap[ID]>;
		};
		getPluginById<T extends IntenalPluginIDs>(id: T): InternalPlugin<InternalPluginInstanceMap[T]>;
		getEnabledPluginById<T extends IntenalPluginIDs>(id: T): InternalPluginInstanceMap[T] | null;
	}

	type IntenalPluginIDs = keyof InternalPluginInstanceMap;

	interface MarkdownView {
		metadataEditor: MetadataEditor;
	}

	interface MetadataCache {
		getTags(): Record<string, number>;
	}

	interface MetadataEditor extends Component {
		propertyListEl: HTMLElement;
	}

	interface MetadataTypeManager extends Events {
		properties: Record<string, PropertyInfo>;
	}

	interface Menu {
		items: MenuItem[];
		sections: string[];
	}

	interface MenuItem {
		iconEl: HTMLElement;
		section: string;
	}

	interface MobileNavbar {
		ribbonMenuItemEl: HTMLElement;
	}

	interface PluginManager {
		plugins: PluginMap;
	}

	interface PluginMap {
		[id: string]: Plugin;
	}

	interface PropertyInfo {
		count: number;
		name: string;
		type: string;
	}

	interface RibbonItem {
		buttonEl: HTMLElement;
		callback: () => unknown;
		hidden: boolean;
		icon: IconName;
		id: string;
		title: string;
	}

	type SyncPlugin = InternalPlugin<SyncPluginInstance>;

	interface SyncPluginInstance extends InternalPluginInstance, Events {
		allowTypes: Set<string>;
		ignoreFolders: string[];
		pause: boolean;
		syncing: boolean;
	}

	interface Vault {
		getConfig<T extends keyof VaultConfig>(key: T): VaultConfig[T];
	}

	interface VaultConfig {
		mobileQuickRibbonItem?: string;
	}
	
	interface WorkspaceItem {
		containerEl: HTMLElement;
	}

	interface WorkspaceLeaf {
		tabHeaderEl: HTMLElement;
		tabHeaderInnerIconEl: HTMLElement;
	}

	interface WorkspaceMobileDrawer {
		activeTabContentEl: HTMLElement;
		activeTabHeaderEl: HTMLElement;
		activeTabIconEl: HTMLElement;
		activeTabSelectEl: HTMLSelectElement;
	}

	interface WorkspaceRibbon {
		items: RibbonItem[];
		ribbonItemsEl: HTMLElement | null;
	}

	interface WorkspaceTabs {
		isStacked: boolean;
	}
}