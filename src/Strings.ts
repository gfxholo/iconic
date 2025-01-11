export default class Strings {
	static appItems = {
		help: 'Open help',
		settings: 'Open settings',
		pin: 'Toggle pin',
		sidebarLeft: 'Toggle left sidebar',
		sidebarRight: 'Toggle right sidebar',
		minimize: 'Minimize',
		maximize: 'Maximize',
		unmaximize: 'Restore down',
		close: 'Close window',
	};
	static menu = {
		changeIcon: 'Change icon...',
		changeIcons: 'Change {#} icons...',
		removeIcon: 'Remove icon',
		removeIcons: 'Remove {#} icons',
		resetColor: 'Reset color',
		resetColors: 'Reset {#} colors',
		editRule: 'Edit rule...',
	};
	static rulePicker = {
		selectPage: 'Select a page',
		fileRules: 'File rules',
		folderRules: 'Folder rules',
		rules: 'Rules',
		addRule: 'Add rule',
		editRule: 'Edit rule',
		removeRule: 'Remove rule',
		untitledRule: 'Untitled rule',
		drag: 'Drag to rearrange',
	};
	static ruleEditor = {
		fileRule: 'File rule',
		folderRule: 'Folder rule',
		conditions: 'Conditions',
		addCondition: 'Add condition',
		resetCondition: 'Reset condition',
		removeCondition: 'Remove condition',
		removeRule: 'Remove rule',
		buttonMatch: '1 match',
		buttonMatches: '{#} matches',
		buttonNoMatches: 'No matches',
		enterName: 'Give this rule a name',
		enterValue: 'Enter a value',
		enterRegex: 'Enter a regex',
		enterHexCode: 'Enter a #hexcode',
		enterNumber: 'Enter a number',
		matchConditions: {
			name: 'Match conditions',
			desc: 'Choose how many conditions need to match.',
			all: 'All',
			any: 'Any',
			none: 'None',
		},
		source: {
			icon: 'Icon',
			color: 'Color',
			name: 'Name',
			filename: 'Filename',
			extension: 'Extension',
			tree: 'Folder tree',
			path: 'Path in vault',
			headings: 'Headings',
			links: 'Links',
			tags: 'Tags',
			properties: 'Properties...',
			created: 'Date created',
			modified: 'Date modified',
			clock: 'System clock',
		},
		operator: {
			is: 'is',
			'!is': 'is not',
			contains: 'contains',
			startsWith: 'starts with',
			endsWith: 'ends with',
			matches: 'matches regex',
			'!contains': 'does not contain',
			'!startsWith': 'does not start with',
			'!endsWith': 'does not end with',
			'!matches': 'does not match regex',
			includes: 'includes item',
			'!includes': 'does not include item',
			allAre: 'all are',
			allContain: 'all contain',
			allStartWith: 'all start with',
			allEndWith: 'all end with',
			allMatch: 'all match regex',
			anyContain: 'any contain',
			anyStartWith: 'any start with',
			anyEndWith: 'any end with',
			anyMatch: 'any match regex',
			noneContain: 'none contain',
			noneStartWith: 'none start with',
			noneEndWith: 'none end with',
			noneMatch: 'none match regex',
			countIs: 'count is',
			'!countIs': 'count is not',
			countIsLess: 'count is less than',
			countIsMore: 'count is more than',
			isTrue: 'is true',
			'!isTrue': 'is not true',
			isFalse: 'is false',
			'!isFalse': 'is not false',
			equals: 'equals',
			'!equals': 'does not equal',
			isLess: 'is less than',
			isMore: 'is more than',
			isDivisible: 'is divisible by',
			'!isLess': 'is not less than',
			'!isMore': 'is not more than',
			'!isDivisible': 'is not divisible by',
			isBefore: 'is before',
			isAfter: 'is after',
			isNow: 'is now',
			'!isNow': 'is not now',
			isBeforeNow: 'is before now',
			isAfterNow: 'is after now',
			timeIs: 'time is',
			'!timeIs': 'time is not',
			timeIsBefore: 'time is before',
			timeIsAfter: 'time is after',
			timeIsNow: 'time is now',
			'!timeIsNow': 'time is not now',
			timeIsBeforeNow: 'time is before now',
			timeIsAfterNow: 'time is after now',
			dateIs: 'date is',
			'!dateIs': 'date is not',
			dateIsBefore: 'date is before',
			dateIsAfter: 'date is after',
			isToday: 'date is today',
			'!isToday': 'date is not today',
			isBeforeToday: 'date is before today',
			isAfterToday: 'date is after today',
			isLessDaysAgo: 'is under X days ago',
			isLessDaysAway: 'is under X days away',
			isMoreDaysAgo: 'is over X days ago',
			isMoreDaysAway: 'is over X days away',
			weekdayIs: 'day of week is',
			'!weekdayIs': 'day of week is not',
			weekdayIsBefore: 'day of week is before',
			weekdayIsAfter: 'day of week is after',
			monthdayIs: 'day of month is',
			'!monthdayIs': 'day of month is not',
			monthdayIsBefore: 'day of month is before',
			monthdayIsAfter: 'day of month is after',
			monthIs: 'month is',
			'!monthIs': 'month is not',
			monthIsBefore: 'month is before',
			monthIsAfter: 'month is after',
			yearIs: 'year is',
			'!yearIs': 'year is not',
			yearIsBefore: 'year is before',
			yearIsAfter: 'year is after',
			iconIs: 'ID is',
			'!iconIs': 'ID is not',
			nameIs: 'name is',
			'!nameIs': 'name is not',
			nameContains: 'name contains',
			nameStartsWith: 'name starts with',
			nameEndsWith: 'name ends with',
			nameMatches: 'name matches regex',
			'!nameContains': 'name does not contain',
			'!nameStartsWith': 'name does not start with',
			'!nameEndsWith': 'name does not end with',
			'!nameMatches': 'name does not match regex',
			colorIs: 'is',
			'!colorIs': 'is not',
			hexIs: 'hexcode is',
			'!hexIs': 'hexcode is not',
			hasValue: 'has any value',
			'!hasValue': 'has no value',
			hasProperty: 'property is present',
			'!hasProperty': 'property is missing',
		},
		weekday: {
			1: 'Monday',
			2: 'Tuesday',
			3: 'Wednesday',
			4: 'Thursday',
			5: 'Friday',
			6: 'Saturday',
			7: 'Sunday',
		},
		month: {
			1: 'January',
			2: 'February',
			3: 'March',
			4: 'April',
			5: 'May',
			6: 'June',
			7: 'July',
			8: 'August',
			9: 'September',
			10: 'October',
			11: 'November',
			12: 'December',
		},
	};
	static ruleChecker = {
		fileMatch: '1 matching file',
		folderMatch: '1 matching folder',
		filesMatch: '{#} matching files',
		foldersMatch: '{#} matching folders',
		highlight: 'Highlight',
		headingMatches: 'Matches',
	};
	static iconPicker = {
		changeIcon: 'Change icon',
		changeIcons: 'Change {#} icons',
		changeEmoji: 'Change emoji',
		changeEmojis: 'Change {#} emojis',
		changeMix: 'Change icon / emoji',
		changeMixes: 'Change {#} icons / emojis',
		overrulePrefix: 'Your rule ',
		overruleSuffix: ' is overruling this icon.',
		overrules: 'Your rulebook is overruling some of these icons.',
		search: 'Search',
		searchIcons: 'Search icons...',
		searchEmojis: 'Search emojis...',
		searchMix: 'Search icons / emojis...',
		changeColor: 'Change color',
		resetColor: 'Reset color',
		removeIcon: 'Remove icon',
		removeIcons: 'Remove {#} icons',
		icons: 'Icons',
		emojis: 'Emojis',
		mixed: 'Mixed',
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
		tag: 'Tag',
		tags: 'Tags',
		property: 'Property',
		properties: 'Properties',
		ribbonItem: 'Ribbon command',
		ribbonItems: 'Ribbon commands',
		rule: 'Rule',
		rules: 'Rules',
	};
	static commands = {
		openRulebook: 'Open rulebook',
		toggleBiggerIcons: 'Toggle bigger icons',
		toggleClickableIcons: {
			desktop: 'Toggle clickable icons',
			mobile: 'Toggle tappable icons',
		},
		toggleAllFileIcons: 'Toggle all file icons',
		toggleAllFolderIcons: 'Toggle all folder icons',
		toggleMinimalFolderIcons: 'Toggle minimal folder icons',
		toggleBiggerSearchResults: 'Toggle bigger search results',
		changeIconCurrentFile: 'Change icon of the current file',
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
		rulebook: {
			name: 'Rulebook',
			desc: 'Set up automated rules for file and folder icons.',
			manage: 'Manage',
		},
		headingSidebarAndTabIcons: 'Sidebar & tab icons',
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
			desc: 'Disable icon color for the quick access ribbon button on mobile.',
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
			case 'ar': localizedStrings = await import('i18n/ar.json'); break;
			case 'de': localizedStrings = await import('i18n/de.json'); break;
			case 'en-GB': localizedStrings = await import('i18n/en-GB.json'); break;
			case 'es': localizedStrings = await import('i18n/es.json'); break;
			case 'fr': localizedStrings = await import('i18n/fr.json'); break;
			case 'id': localizedStrings = await import('i18n/id.json'); break;
			case 'ja': localizedStrings = await import('i18n/ja.json'); break;
			case 'ru': localizedStrings = await import('i18n/ru.json'); break;
			case 'zh': localizedStrings = await import('i18n/zh.json'); break;
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
