export default class Strings {
	static appItems = {
		help: 'Open help',
		settings: 'Open settings',
		pin: 'Toggle pin',
		sidebarLeft: 'Toggle left sidebar',
		sidebarRight: 'Toggle right sidebar'
	};
	static menu = {
		changeIcon: 'Change icon...',
		changeIcons: 'Change {#} icons...',
		removeIcon: 'Remove icon',
		removeIcons: 'Remove {#} icons',
		resetColor: 'Reset color',
		resetColors: 'Reset {#} colors',
	};
	static iconPicker = {
		changeIcon: 'Change icon',
		changeIcons: 'Change {#} icons',
		changeEmoji: 'Change emoji',
		changeEmojis: 'Change {#} emojis',
		search: 'Search',
		searchIcons: 'Search icons...',
		searchEmojis: 'Search emojis...',
		changeColor: 'Change color',
		resetColor: 'Reset color',
		remove: 'Remove',
		removeIcons: 'Remove {#} icons',
		icons: 'Icons',
		emojis: 'Emojis',
		save: 'Save',
		saveIcons: 'Save {#} icons',
		cancel: 'Cancel',
		colors: {
			red: 'Red',
			orange: 'Orange',
			yellow: 'Yellow',
			green: 'Green',
			cyan: 'Cyan',
			blue: 'Blue',
			purple: 'Purple',
			pink: 'Pink',
			gray: 'Gray',
		},
	};
	static categories = {
		item: 'Item',
		items: 'Items',
		appItem: 'Button',
		appItems: 'Buttons',
		tab: 'Tab',
		tabs: 'Tabs',
		file: 'File',
		files: 'Files',
		folder: 'Folder',
		folders: 'Folders',
		group: 'Group',
		groups: 'Groups',
		search: 'Query',
		searches: 'Queries',
		graph: 'Graph',
		graphs: 'Graphs',
		url: 'URL',
		urls: 'URLs',
		property: 'Property',
		properties: 'Properties',
		ribbonItem: 'Ribbon command',
		ribbonItems: 'Ribbon commands',
	};
	static commands = {
		toggleBiggerIcons: 'Toggle bigger icons',
		toggleClickableIcons: {
			desktop: 'Toggle clickable icons',
			mobile: 'Toggle tappable icons',
		},
		toggleAllFileIcons: 'Toggle all file icons',
		toggleAllFolderIcons: 'Toggle all folder icons',
		toggleMinimalFolderIcons: 'Toggle minimal folder icons',
		toggleBiggerSearchResults: 'Toggle bigger search results',
	};
	static settings = {
		values: {
			on: 'On',
			off: 'Off',
			desktop: 'Desktop only',
			mobile: 'Mobile only',
			list: 'List of colors',
			rgb: 'RGB picker',
		},
		headingListsAndTabs: 'List & tab icons',
		biggerIcons: {
			name: 'Bigger icons',
			desc: 'Show bigger icons than the default UI.',
		},
		clickableIcons: {
			nameDesktop: 'Clickable icons',
			nameMobile: 'Tappable icons',
			descDesktop: 'Click an icon to open the icon picker.',
			descMobile: 'Tap an icon to open the icon picker.',
		},
		showAllFileIcons: {
			name: 'Show all file icons',
			desc: 'Show icons for files that have no custom icon.',
		},
		showAllFolderIcons: {
			name: 'Show all folder icons',
			desc: 'Show icons for folders that have no custom icon.',
		},
		minimalFolderIcons: {
			name: 'Minimal folder icons',
			desc: 'Replace folder arrows with your folder icons.',
		},
		headingIconPicker: 'Icon picker',
		showItemName: {
			name: 'Show item name',
			desc: 'Show the name of the item being edited.',
		},
		biggerSearchResults: {
			name: 'Bigger search results',
			desc: 'Show bigger icons in search results.',
		},
		maxSearchResults: {
			name: 'Maximum search results',
			desc: 'Choose how many icons to show at once.',
		},
		colorPicker1: {
			name: 'Main color picker',
			descDesktop: 'Appears when you click the color bubble.',
			descMobile: 'Appears when you tap the color bubble.',
		},
		colorPicker2: {
			name: 'Second color picker',
			descDesktop: 'Appears when you secondary-click the color bubble.',
			descMobile: 'Appears when you press & hold the color bubble.',
		},
		headingAdvanced: 'Advanced',
		uncolorHover: {
			name: 'Colorless hover',
			desc: 'Disable icon color while hovering an item.',
		},
		uncolorDrag: {
			name: 'Colorless drag',
			desc: 'Disable icon color while dragging an item.',
		},
		uncolorSelect: {
			name: 'Colorless selection',
			desc: 'Disable icon color while item is selected.',
		},
		uncolorQuick: {
			name: 'Colorless ribbon button',
			desc: 'Disable icon color for the quick access ribbon button on mobile.'
		},
		rememberDeletedItems: {
			name: 'Remember icons of deleted items',
			desc: 'Any custom icons will reappear when their item exists again.',
		},
	};

	static {
		Strings.localize();
	}

	/**
	 * Dynamically import strings for the current language.
	 */
	private static async localize(): Promise<void> {
		let localizedStrings: any;
		switch (window.localStorage.language) {
			case 'ar': localizedStrings = await import('../i18n/ar.json'); break;
			case 'de': localizedStrings = await import('../i18n/de.json'); break;
			case 'en-GB': localizedStrings = await import('../i18n/en-GB.json'); break;
			case 'es': localizedStrings = await import('../i18n/es.json'); break;
			case 'fr': localizedStrings = await import('../i18n/fr.json'); break;
			case 'id': localizedStrings = await import('../i18n/id.json'); break;
			case 'ja': localizedStrings = await import('../i18n/ja.json'); break;
			case 'ru': localizedStrings = await import('../i18n/ru.json'); break;
			case 'zh': localizedStrings = await import('../i18n/zh.json'); break;
			default: return;
		}
		this.localizeDefaultStrings(this, localizedStrings);
	}

	/**
	 * Replace default strings with localized strings.
	 * Strings and their keys are always type-safe, even if the localized JSON is incomplete or broken.
	 */
	private static localizeDefaultStrings(defaultStrings: any, localizedStrings: any): void {
		for (const [key, value] of Object.entries(localizedStrings)) {
			if (typeof defaultStrings[key] === 'object') {
				if (typeof value === 'object') {
					this.localizeDefaultStrings(defaultStrings[key], value);
				}
			} else if (typeof value === 'string') {
				defaultStrings[key] = value;
			}
		}
	}
}
