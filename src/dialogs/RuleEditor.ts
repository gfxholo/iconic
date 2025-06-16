import { ButtonComponent, DropdownComponent, ExtraButtonComponent, Modal, Platform, Setting, TextComponent } from 'obsidian';
import IconicPlugin, { Category, Icon, Item, FileItem, STRINGS } from 'src/IconicPlugin';
import ColorUtils from 'src/ColorUtils';
import { RuleItem, ConditionItem } from 'src/managers/RuleManager';
import IconManager from 'src/managers/IconManager';
import RuleChecker from 'src/dialogs/RuleChecker';
import IconPicker from 'src/dialogs/IconPicker';

/**
 * Options for a DropdownComponent.
 * Localized strings are not available at compile time, so option labels are stored as functions.
 */
class DropdownOptions {
	constructor(private readonly options: { [value: string]: () => string }) { }

	/**
	 * Check if options contain a given value.
	 */
	has(value: string): boolean {
		return this.options.hasOwnProperty(value);
	}

	/**
	 * Get an object that can be loaded into addOptions().
	 */
	get(): Record<string, string> {
		const options: { [value: string]: string } = {};
		for (const [value, getLabel] of Object.entries(this.options)) {
			options[value] = getLabel();
		}
		return options;
	}

	/**
	 * Concatenate options together, returning a new object.
	 */
	plus(moreOptions: DropdownOptions): DropdownOptions {
		return new DropdownOptions({ ...this.options, ...moreOptions.options });
	}
}

const FILE_SOURCES = new DropdownOptions({
	icon: () => STRINGS.ruleEditor.source.icon,
	color: () => STRINGS.ruleEditor.source.color,
	name: () => STRINGS.ruleEditor.source.name,
	filename: () => STRINGS.ruleEditor.source.filename,
	extension: () => STRINGS.ruleEditor.source.extension,
	tree: () => STRINGS.ruleEditor.source.tree,
	path: () => STRINGS.ruleEditor.source.path,
	headings: () => STRINGS.ruleEditor.source.headings,
	links: () => STRINGS.ruleEditor.source.links,
	tags: () => STRINGS.ruleEditor.source.tags,
	properties: () => STRINGS.ruleEditor.source.properties,
	created: () => STRINGS.ruleEditor.source.created,
	modified: () => STRINGS.ruleEditor.source.modified,
	clock: () => STRINGS.ruleEditor.source.clock,
});

const FOLDER_SOURCES = new DropdownOptions({
	icon: () => STRINGS.ruleEditor.source.icon,
	color: () => STRINGS.ruleEditor.source.color,
	name: () => STRINGS.ruleEditor.source.name,
	tree: () => STRINGS.ruleEditor.source.tree,
	path: () => STRINGS.ruleEditor.source.path,
	created: () => STRINGS.ruleEditor.source.created,
	modified: () => STRINGS.ruleEditor.source.modified,
	clock: () => STRINGS.ruleEditor.source.clock,
});

const TEXT_OPERATORS = new DropdownOptions({
	is: () => STRINGS.ruleEditor.operator.is,
	'!is': () => STRINGS.ruleEditor.operator['!is'],
	contains: () => STRINGS.ruleEditor.operator.contains,
	startsWith: () => STRINGS.ruleEditor.operator.startsWith,
	endsWith: () => STRINGS.ruleEditor.operator.endsWith,
	matches: () => STRINGS.ruleEditor.operator.matches,
	'!contains': () => STRINGS.ruleEditor.operator['!contains'],
	'!startsWith': () => STRINGS.ruleEditor.operator['!startsWith'],
	'!endsWith': () => STRINGS.ruleEditor.operator['!endsWith'],
	'!matches': () => STRINGS.ruleEditor.operator['!matches'],
});

const LIST_OPERATORS = new DropdownOptions({
	includes: () => STRINGS.ruleEditor.operator.includes,
	'!includes': () => STRINGS.ruleEditor.operator['!includes'],
	allAre: () => STRINGS.ruleEditor.operator.allAre,
	allContain: () => STRINGS.ruleEditor.operator.allContain,
	allStartWith: () => STRINGS.ruleEditor.operator.allStartWith,
	allEndWith: () => STRINGS.ruleEditor.operator.allEndWith,
	allMatch: () => STRINGS.ruleEditor.operator.allMatch,
	anyContain: () => STRINGS.ruleEditor.operator.anyContain,
	anyStartWith: () => STRINGS.ruleEditor.operator.anyStartWith,
	anyEndWith: () => STRINGS.ruleEditor.operator.anyEndWith,
	anyMatch: () => STRINGS.ruleEditor.operator.anyMatch,
	noneContain: () => STRINGS.ruleEditor.operator.noneContain,
	noneStartWith: () => STRINGS.ruleEditor.operator.noneStartWith,
	noneEndWith: () => STRINGS.ruleEditor.operator.noneEndWith,
	noneMatch: () => STRINGS.ruleEditor.operator.noneMatch,
	countIs: () => STRINGS.ruleEditor.operator.countIs,
	'!countIs': () => STRINGS.ruleEditor.operator['!countIs'],
	countIsLess: () => STRINGS.ruleEditor.operator.countIsLess,
	countIsMore: () => STRINGS.ruleEditor.operator.countIsMore,
});

const NUMBER_OPERATORS = new DropdownOptions({
	equals: () => STRINGS.ruleEditor.operator.equals,
	'!equals': () => STRINGS.ruleEditor.operator['!equals'],
	isLess: () => STRINGS.ruleEditor.operator.isLess,
	isMore: () => STRINGS.ruleEditor.operator.isMore,
	isDivisible: () => STRINGS.ruleEditor.operator.isDivisible,
	'!isLess': () => STRINGS.ruleEditor.operator['!isLess'],
	'!isMore': () => STRINGS.ruleEditor.operator['!isMore'],
	'!isDivisible': () => STRINGS.ruleEditor.operator['!isDivisible'],
});

const BOOLEAN_OPERATORS = new DropdownOptions({
	isTrue: () => STRINGS.ruleEditor.operator.isTrue,
	'!isTrue': () => STRINGS.ruleEditor.operator['!isTrue'],
	isFalse: () => STRINGS.ruleEditor.operator.isFalse,
	'!isFalse': () => STRINGS.ruleEditor.operator['!isFalse'],
});

const DATETIME_OPERATORS = new DropdownOptions({
	datetimeIs: () => STRINGS.ruleEditor.operator.is,
	'!datetimeIs': () => STRINGS.ruleEditor.operator['!is'],
	datetimeIsBefore: () => STRINGS.ruleEditor.operator.isBefore,
	datetimeIsAfter: () => STRINGS.ruleEditor.operator.isAfter,
	isNow: () => STRINGS.ruleEditor.operator.isNow,
	'!isNow': () => STRINGS.ruleEditor.operator['!isNow'],
	isBeforeNow: () => STRINGS.ruleEditor.operator.isBeforeNow,
	isAfterNow: () => STRINGS.ruleEditor.operator.isAfterNow,
	timeIs: () => STRINGS.ruleEditor.operator.timeIs,
	'!timeIs': () => STRINGS.ruleEditor.operator['!timeIs'],
	timeIsBefore: () => STRINGS.ruleEditor.operator.timeIsBefore,
	timeIsAfter: () => STRINGS.ruleEditor.operator.timeIsAfter,
	timeIsNow: () => STRINGS.ruleEditor.operator.timeIsNow,
	'!timeIsNow': () => STRINGS.ruleEditor.operator['!timeIsNow'],
	timeIsBeforeNow: () => STRINGS.ruleEditor.operator.timeIsBeforeNow,
	timeIsAfterNow: () => STRINGS.ruleEditor.operator.timeIsAfterNow,
	dateIs: () => STRINGS.ruleEditor.operator.dateIs,
	'!dateIs': () => STRINGS.ruleEditor.operator['!dateIs'],
	dateIsBefore: () => STRINGS.ruleEditor.operator.dateIsBefore,
	dateIsAfter: () => STRINGS.ruleEditor.operator.dateIsAfter,
	isToday: () => STRINGS.ruleEditor.operator.isToday,
	'!isToday': () => STRINGS.ruleEditor.operator['!isToday'],
	isBeforeToday: () => STRINGS.ruleEditor.operator.isBeforeToday,
	isAfterToday: () => STRINGS.ruleEditor.operator.isAfterToday,
	isLessDaysAgo: () => STRINGS.ruleEditor.operator.isLessDaysAgo,
	isLessDaysAway: () => STRINGS.ruleEditor.operator.isLessDaysAway,
	isMoreDaysAgo: () => STRINGS.ruleEditor.operator.isMoreDaysAgo,
	isMoreDaysAway: () => STRINGS.ruleEditor.operator.isMoreDaysAway,
	weekdayIs: () => STRINGS.ruleEditor.operator.weekdayIs,
	'!weekdayIs': () => STRINGS.ruleEditor.operator['!weekdayIs'],
	weekdayIsBefore: () => STRINGS.ruleEditor.operator.weekdayIsBefore,
	weekdayIsAfter: () => STRINGS.ruleEditor.operator.weekdayIsAfter,
	monthdayIs: () => STRINGS.ruleEditor.operator.monthdayIs,
	'!monthdayIs': () => STRINGS.ruleEditor.operator['!monthdayIs'],
	monthdayIsBefore: () => STRINGS.ruleEditor.operator.monthdayIsBefore,
	monthdayIsAfter: () => STRINGS.ruleEditor.operator.monthdayIsAfter,
	monthIs: () => STRINGS.ruleEditor.operator.monthIs,
	'!monthIs': () => STRINGS.ruleEditor.operator['!monthIs'],
	monthIsBefore: () => STRINGS.ruleEditor.operator.monthIsBefore,
	monthIsAfter: () => STRINGS.ruleEditor.operator.monthIsAfter,
	yearIs: () => STRINGS.ruleEditor.operator.yearIs,
	'!yearIs': () => STRINGS.ruleEditor.operator['!yearIs'],
	yearIsBefore: () => STRINGS.ruleEditor.operator.yearIsBefore,
	yearIsAfter: () => STRINGS.ruleEditor.operator.yearIsAfter,
});

const DATE_OPERATORS = new DropdownOptions({
	dateIs: () => STRINGS.ruleEditor.operator.dateIs,
	'!dateIs': () => STRINGS.ruleEditor.operator['dateIs'],
	dateIsBefore: () => STRINGS.ruleEditor.operator.dateIsBefore,
	dateIsAfter: () => STRINGS.ruleEditor.operator.dateIsAfter,
	isToday: () => STRINGS.ruleEditor.operator.isToday,
	'!isToday': () => STRINGS.ruleEditor.operator['!isToday'],
	isBeforeToday: () => STRINGS.ruleEditor.operator.isBeforeToday,
	isAfterToday: () => STRINGS.ruleEditor.operator.isAfterToday,
	isLessDaysAgo: () => STRINGS.ruleEditor.operator.isLessDaysAgo,
	isLessDaysAway: () => STRINGS.ruleEditor.operator.isLessDaysAway,
	isMoreDaysAgo: () => STRINGS.ruleEditor.operator.isMoreDaysAgo,
	isMoreDaysAway: () => STRINGS.ruleEditor.operator.isMoreDaysAway,
	weekdayIs: () => STRINGS.ruleEditor.operator.weekdayIs,
	'!weekdayIs': () => STRINGS.ruleEditor.operator['!weekdayIs'],
	weekdayIsBefore: () => STRINGS.ruleEditor.operator.weekdayIsBefore,
	weekdayIsAfter: () => STRINGS.ruleEditor.operator.weekdayIsAfter,
	monthdayIs: () => STRINGS.ruleEditor.operator.monthdayIs,
	'!monthdayIs': () => STRINGS.ruleEditor.operator['!monthdayIs'],
	monthdayIsBefore: () => STRINGS.ruleEditor.operator.monthdayIsBefore,
	monthdayIsAfter: () => STRINGS.ruleEditor.operator.monthdayIsAfter,
	monthIs: () => STRINGS.ruleEditor.operator.monthIs,
	'!monthIs': () => STRINGS.ruleEditor.operator['!monthIs'],
	monthIsBefore: () => STRINGS.ruleEditor.operator.monthIsBefore,
	monthIsAfter: () => STRINGS.ruleEditor.operator.monthIsAfter,
	yearIs: () => STRINGS.ruleEditor.operator.yearIs,
	'!yearIs': () => STRINGS.ruleEditor.operator['!yearIs'],
	yearIsBefore: () => STRINGS.ruleEditor.operator.yearIsBefore,
	yearIsAfter: () => STRINGS.ruleEditor.operator.yearIsAfter,
});

const PAST_OPERATORS = new DropdownOptions({
	datetimeIs: () => STRINGS.ruleEditor.operator.is,
	'!datetimeIs': () => STRINGS.ruleEditor.operator['!is'],
	datetimeIsBefore: () => STRINGS.ruleEditor.operator.isBefore,
	datetimeIsAfter: () => STRINGS.ruleEditor.operator.isAfter,
	timeIs: () => STRINGS.ruleEditor.operator.timeIs,
	'!timeIs': () => STRINGS.ruleEditor.operator['!timeIs'],
	timeIsBefore: () => STRINGS.ruleEditor.operator.timeIsBefore,
	timeIsAfter: () => STRINGS.ruleEditor.operator.timeIsAfter,
	timeIsNow: () => STRINGS.ruleEditor.operator.timeIsNow,
	'!timeIsNow': () => STRINGS.ruleEditor.operator['!timeIsNow'],
	timeIsBeforeNow: () => STRINGS.ruleEditor.operator.timeIsBeforeNow,
	timeIsAfterNow: () => STRINGS.ruleEditor.operator.timeIsAfterNow,
	dateIs: () => STRINGS.ruleEditor.operator.dateIs,
	'!dateIs': () => STRINGS.ruleEditor.operator['!dateIs'],
	dateIsBefore: () => STRINGS.ruleEditor.operator.dateIsBefore,
	dateIsAfter: () => STRINGS.ruleEditor.operator.dateIsAfter,
	isToday: () => STRINGS.ruleEditor.operator.isToday,
	'!isToday': () => STRINGS.ruleEditor.operator['!isToday'],
	isLessDaysAgo: () => STRINGS.ruleEditor.operator.isLessDaysAgo,
	isMoreDaysAgo: () => STRINGS.ruleEditor.operator.isMoreDaysAgo,
	weekdayIs: () => STRINGS.ruleEditor.operator.weekdayIs,
	'!weekdayIs': () => STRINGS.ruleEditor.operator['!weekdayIs'],
	weekdayIsBefore: () => STRINGS.ruleEditor.operator.weekdayIsBefore,
	weekdayIsAfter: () => STRINGS.ruleEditor.operator.weekdayIsAfter,
	monthdayIs: () => STRINGS.ruleEditor.operator.monthdayIs,
	'!monthdayIs': () => STRINGS.ruleEditor.operator['!monthdayIs'],
	monthdayIsBefore: () => STRINGS.ruleEditor.operator.monthdayIsBefore,
	monthdayIsAfter: () => STRINGS.ruleEditor.operator.monthdayIsAfter,
	monthIs: () => STRINGS.ruleEditor.operator.monthIs,
	'!monthIs': () => STRINGS.ruleEditor.operator['!monthIs'],
	monthIsBefore: () => STRINGS.ruleEditor.operator.monthIsBefore,
	monthIsAfter: () => STRINGS.ruleEditor.operator.monthIsAfter,
	yearIs: () => STRINGS.ruleEditor.operator.yearIs,
	'!yearIs': () => STRINGS.ruleEditor.operator['!yearIs'],
	yearIsBefore: () => STRINGS.ruleEditor.operator.yearIsBefore,
	yearIsAfter: () => STRINGS.ruleEditor.operator.yearIsAfter,
});

const PRESENT_OPERATORS = new DropdownOptions({
	datetimeIs: () => STRINGS.ruleEditor.operator.is,
	'!datetimeIs': () => STRINGS.ruleEditor.operator['!is'],
	datetimeIsBefore: () => STRINGS.ruleEditor.operator.isBefore,
	datetimeIsAfter: () => STRINGS.ruleEditor.operator.isAfter,
	timeIs: () => STRINGS.ruleEditor.operator.timeIs,
	'!timeIs': () => STRINGS.ruleEditor.operator['!timeIs'],
	timeIsBefore: () => STRINGS.ruleEditor.operator.timeIsBefore,
	timeIsAfter: () => STRINGS.ruleEditor.operator.timeIsAfter,
	dateIs: () => STRINGS.ruleEditor.operator.dateIs,
	'!dateIs': () => STRINGS.ruleEditor.operator['!dateIs'],
	dateIsBefore: () => STRINGS.ruleEditor.operator.dateIsBefore,
	dateIsAfter: () => STRINGS.ruleEditor.operator.dateIsAfter,
	weekdayIs: () => STRINGS.ruleEditor.operator.weekdayIs,
	'!weekdayIs': () => STRINGS.ruleEditor.operator['!weekdayIs'],
	weekdayIsBefore: () => STRINGS.ruleEditor.operator.weekdayIsBefore,
	weekdayIsAfter: () => STRINGS.ruleEditor.operator.weekdayIsAfter,
	monthdayIs: () => STRINGS.ruleEditor.operator.monthdayIs,
	'!monthdayIs': () => STRINGS.ruleEditor.operator['!monthdayIs'],
	monthdayIsBefore: () => STRINGS.ruleEditor.operator.monthdayIsBefore,
	monthdayIsAfter: () => STRINGS.ruleEditor.operator.monthdayIsAfter,
	monthIs: () => STRINGS.ruleEditor.operator.monthIs,
	'!monthIs': () => STRINGS.ruleEditor.operator['!monthIs'],
	monthIsBefore: () => STRINGS.ruleEditor.operator.monthIsBefore,
	monthIsAfter: () => STRINGS.ruleEditor.operator.monthIsAfter,
	yearIs: () => STRINGS.ruleEditor.operator.yearIs,
	'!yearIs': () => STRINGS.ruleEditor.operator['!yearIs'],
	yearIsBefore: () => STRINGS.ruleEditor.operator.yearIsBefore,
	yearIsAfter: () => STRINGS.ruleEditor.operator.yearIsAfter,
});

const ICON_OPERATORS = new DropdownOptions({
	iconIs: () => STRINGS.ruleEditor.operator.iconIs,
	'!iconIs': () => STRINGS.ruleEditor.operator['!iconIs'],
	nameIs: () => STRINGS.ruleEditor.operator.nameIs,
	'!nameIs': () => STRINGS.ruleEditor.operator['!nameIs'],
	nameContains: () => STRINGS.ruleEditor.operator.nameContains,
	nameStartsWith: () => STRINGS.ruleEditor.operator.nameStartsWith,
	nameEndsWith: () => STRINGS.ruleEditor.operator.nameEndsWith,
	nameMatches: () => STRINGS.ruleEditor.operator.nameMatches,
	'!nameContains': () => STRINGS.ruleEditor.operator['!nameContains'],
	'!nameStartsWith': () => STRINGS.ruleEditor.operator['!nameStartsWith'],
	'!nameEndsWith': () => STRINGS.ruleEditor.operator['!nameEndsWith'],
	'!nameMatches': () => STRINGS.ruleEditor.operator['!nameMatches'],
});

const COLOR_OPERATORS = new DropdownOptions({
	colorIs: () => STRINGS.ruleEditor.operator.colorIs,
	'!colorIs': () => STRINGS.ruleEditor.operator['!colorIs'],
	hexIs: () => STRINGS.ruleEditor.operator.hexIs,
	'!hexIs': () => STRINGS.ruleEditor.operator['!hexIs'],
});

const VALUE_OPERATORS = new DropdownOptions({
	hasValue: () => STRINGS.ruleEditor.operator.hasValue,
	'!hasValue': () => STRINGS.ruleEditor.operator['!hasValue'],
});

const PROPERTY_OPERATORS = new DropdownOptions({
	hasProperty: () => STRINGS.ruleEditor.operator.hasProperty,
	'!hasProperty': () => STRINGS.ruleEditor.operator['!hasProperty'],
});

const WEEKDAY_VALUES = new DropdownOptions({
	1: () => STRINGS.ruleEditor.weekday[1],
	2: () => STRINGS.ruleEditor.weekday[2],
	3: () => STRINGS.ruleEditor.weekday[3],
	4: () => STRINGS.ruleEditor.weekday[4],
	5: () => STRINGS.ruleEditor.weekday[5],
	6: () => STRINGS.ruleEditor.weekday[6],
	7: () => STRINGS.ruleEditor.weekday[7],
});

const MONTH_VALUES = new DropdownOptions({
	1: () => STRINGS.ruleEditor.month[1],
	2: () => STRINGS.ruleEditor.month[2],
	3: () => STRINGS.ruleEditor.month[3],
	4: () => STRINGS.ruleEditor.month[4],
	5: () => STRINGS.ruleEditor.month[5],
	6: () => STRINGS.ruleEditor.month[6],
	7: () => STRINGS.ruleEditor.month[7],
	8: () => STRINGS.ruleEditor.month[8],
	9: () => STRINGS.ruleEditor.month[9],
	10: () => STRINGS.ruleEditor.month[10],
	11: () => STRINGS.ruleEditor.month[11],
	12: () => STRINGS.ruleEditor.month[12],
});

const COLOR_VALUES = new DropdownOptions({
	'red': () => STRINGS.iconPicker.colors.red,
	'orange': () => STRINGS.iconPicker.colors.orange,
	'yellow': () => STRINGS.iconPicker.colors.yellow,
	'green': () => STRINGS.iconPicker.colors.green,
	'cyan': () => STRINGS.iconPicker.colors.cyan,
	'blue': () => STRINGS.iconPicker.colors.blue,
	'purple': () => STRINGS.iconPicker.colors.purple,
	'pink': () => STRINGS.iconPicker.colors.pink,
	'gray': () => STRINGS.iconPicker.colors.gray,
});

type ValueType = 'text' | 'number' | 'datetime' | 'date' | 'time' | 'weekday' | 'monthday' | 'month' | 'color';

const SOURCE_OPERATORS: { [key: string]: DropdownOptions } = {
	icon: ICON_OPERATORS.plus(VALUE_OPERATORS),
	color: COLOR_OPERATORS.plus(VALUE_OPERATORS),
	name: TEXT_OPERATORS,
	filename: TEXT_OPERATORS,
	extension: TEXT_OPERATORS,
	tree: TEXT_OPERATORS,
	path: TEXT_OPERATORS,
	headings: LIST_OPERATORS,
	links: LIST_OPERATORS,
	tags: LIST_OPERATORS,
	created: PAST_OPERATORS,
	modified: PAST_OPERATORS,
	clock: PRESENT_OPERATORS,
};

const OPERATOR_VALUE_TYPES: { [key: string]: ValueType } = {
	is: 'text',
	'!is': 'text',
	contains: 'text',
	startsWith: 'text',
	endsWith: 'text',
	matches: 'text',
	'!contains': 'text',
	'!startsWith': 'text',
	'!endsWith': 'text',
	'!matches': 'text',
	includes: 'text',
	'!includes': 'text',
	allAre: 'text',
	allContain: 'text',
	allStartWith: 'text',
	allEndWith: 'text',
	allMatch: 'text',
	anyContain: 'text',
	anyStartWith: 'text',
	anyEndWith: 'text',
	anyMatch: 'text',
	noneContain: 'text',
	noneStartWith: 'text',
	noneEndWith: 'text',
	noneMatch: 'text',
	countIs: 'number',
	countIsLess: 'number',
	countIsMore: 'number',
	equals: 'number',
	'!equals': 'number',
	isLess: 'number',
	isMore: 'number',
	isDivisible: 'number',
	'!isLess': 'number',
	'!isMore': 'number',
	'!isDivisible': 'number',
	isLessDaysAgo: 'number',
	isLessDaysAway: 'number',
	isMoreDaysAgo: 'number',
	isMoreDaysAway: 'number',
	datetimeIs: 'datetime',
	'!datetimeIs': 'datetime',
	datetimeIsBefore: 'datetime',
	datetimeIsAfter: 'datetime',
	timeIs: 'time',
	'!timeIs': 'time',
	timeIsBefore: 'time',
	timeIsAfter: 'time',
	dateIs: 'date',
	'!dateIs': 'date',
	dateIsBefore: 'date',
	dateIsAfter: 'date',
	weekdayIs: 'weekday',
	'!weekdayIs': 'weekday',
	weekdayIsBefore: 'weekday',
	weekdayIsAfter: 'weekday',
	monthdayIs: 'number',
	'!monthdayIs': 'number',
	monthdayIsBefore: 'number',
	monthdayIsAfter: 'number',
	monthIs: 'month',
	'!monthIs': 'month',
	monthIsBefore: 'month',
	monthIsAfter: 'month',
	yearIs: 'number',
	'!yearIs': 'number',
	yearIsBefore: 'number',
	yearIsAfter: 'number',
	iconIs: 'text',
	'!iconIs': 'text',
	nameIs: 'text',
	'!nameIs': 'text',
	nameContains: 'text',
	nameStartsWith: 'text',
	nameEndsWith: 'text',
	nameMatches: 'text',
	'!nameContains': 'text',
	'!nameStartsWith': 'text',
	'!nameEndsWith': 'text',
	'!nameMatches': 'text',
	colorIs: 'color',
	'!colorIs': 'color',
	hexIs: 'text',
	'!hexIs': 'text',
};

/**
 * Callback for setting icon & color of a single item.
 */
export interface RuleEditorCallback {
	(rule: RuleItem | null): void;
}

/**
 * Exposes private methods as public for use by {@link RuleEditor}.
 */
class RuleEditorManager extends IconManager {
	constructor(plugin: IconicPlugin) {
		super(plugin);
	}

	/**
	 * @override
	 */
	refreshIcon(item: Item | Icon, iconEl: HTMLElement, onClick?: ((event: MouseEvent) => void)): void {
		super.refreshIcon(item, iconEl, onClick);
	}

	/**
	 * Not used by {@link RuleEditor}.
	 */
	refreshIcons(): void { }

	/**
	 * @override
	 */
	setEventListener<K extends keyof HTMLElementEventMap>(element: HTMLElement, type: K, listener: (this: HTMLElement, event: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void {
		super.setEventListener(element, type, listener, options);
	}

	/**
	 * @override
	 */
	stopEventListeners(): void {
		super.stopEventListeners();
	}

	/**
	 * @override
	 */
	setMutationObserver(element: HTMLElement | null, options: MutationObserverInit, callback: (mutation: MutationRecord) => void): void {
		super.setMutationObserver(element, options, callback);
	}

	/**
	 * @override
	 */
	stopMutationObservers(): void {
		super.stopMutationObservers();
	}
}

/**
 * Dialog for adding and modifying rule definitions.
 */
export default class RuleEditor extends Modal {
	private readonly plugin: IconicPlugin;
	private readonly iconManager: RuleEditorManager;

	// Rule
	private readonly page: Category;
	private readonly rule: RuleItem;
	private readonly callback: RuleEditorCallback | null;
	private matches: FileItem[] = [];

	// Components
	private readonly condEls: HTMLElement[] = [];
	private nameField: TextComponent;
	private addCondSetting: Setting;
	private matchesButton: ButtonComponent;

	private constructor(plugin: IconicPlugin, page: Category, rule: RuleItem, callback: RuleEditorCallback | null) {
		super(plugin.app);
		this.plugin = plugin;
		this.iconManager = new RuleEditorManager(plugin);
		this.page = page;
		this.rule = window.structuredClone(rule);
		this.callback = callback;

		// Allow hotkeys in rule editor
		for (const command of this.plugin.commands) if (command.callback) {
			// @ts-expect-error (Private API)
			const hotkeys: Hotkey[] = this.app.hotkeyManager?.customKeys?.[command.id] ?? [];
			for (const hotkey of hotkeys) {
				this.scope.register(hotkey.modifiers, hotkey.key, command.callback);
			}
		}
	}

	/**
	 * Open a dialog to edit a single rule.
	 */
	static open(plugin: IconicPlugin, page: Category, rule: RuleItem, callback: RuleEditorCallback): void {
		new RuleEditor(plugin, page, rule, callback).open();
	}

	/**
	 * @override
	 */
	onOpen(): void {
		this.containerEl.addClass('mod-confirmation');
		this.modalEl.addClass('iconic-rule-editor');
		switch (this.page) {
			case 'file': this.setTitle(STRINGS.ruleEditor.fileRule); break;
			case 'folder': this.setTitle(STRINGS.ruleEditor.folderRule); break;
			default: this.setTitle(STRINGS.categories.rule); break;
		}

		const ruleSetting = new Setting(this.contentEl);
		ruleSetting.infoEl.remove();

		// BUTTON: Rule icon
		ruleSetting.addExtraButton(button => { button
			.setIcon(this.rule.icon ?? this.plugin.ruleManager.getPageIcon(this.page))
			.setTooltip(STRINGS.iconPicker.changeIcon)
			.onClick(() => IconPicker.openSingle(this.plugin, this.rule, (newIcon, newColor) => {
				this.iconManager.refreshIcon({
					icon: newIcon ?? this.plugin.ruleManager.getPageIcon(this.page),
					color: newColor,
				}, button.extraSettingsEl);
				this.rule.icon = newIcon;
				this.rule.color = newColor;
			}));
			this.iconManager.refreshIcon({
				icon: this.rule.icon ?? this.plugin.ruleManager.getPageIcon(this.page),
				color: this.rule.color,
			}, button.extraSettingsEl);
			button.extraSettingsEl.addClass('iconic-rule-icon');
		});

		// FIELD: Rule name
		ruleSetting.addText(text => { text
			.setValue(this.rule.name)
			.setPlaceholder(STRINGS.ruleEditor.enterName);
			this.iconManager.setEventListener(text.inputEl, 'keydown', event => {
				if (event.key === 'Enter') this.closeAndSave(this.rule);
			});
			this.nameField = text;
		});

		// TOGGLE: Enable/disable rule
		ruleSetting.addToggle(toggle => { toggle
			.setValue(this.rule.enabled)
			.onChange(value => this.rule.enabled = value);
		});

		// BUTTONS: Match conditions
		const buttonEls: HTMLElement[] = [];
		new Setting(this.contentEl)
			.setName(STRINGS.ruleEditor.matchConditions.name)
			.setDesc(STRINGS.ruleEditor.matchConditions.desc)
			.addButton(button => { button
				.setButtonText(STRINGS.ruleEditor.matchConditions.all)
				.setTooltip('All conditions must match')
				.buttonEl.toggleClass('iconic-button-selected', this.rule.match === 'all');
				this.iconManager.setEventListener(button.buttonEl, 'pointerdown', () => {
					buttonEls.forEach(buttonEl => buttonEl.removeClass('iconic-button-selected'));
					button.buttonEl.addClass('iconic-button-selected');
					this.rule.match = 'all';
					this.updateMatchesButton();
				});
				buttonEls.push(button.buttonEl);
			})
			.addButton(button => { button
				.setButtonText(STRINGS.ruleEditor.matchConditions.any)
				.setTooltip('At least 1 condition must match')
				.buttonEl.toggleClass('iconic-button-selected', this.rule.match === 'any');
				this.iconManager.setEventListener(button.buttonEl, 'pointerdown', () => {
					buttonEls.forEach(buttonEl => buttonEl.removeClass('iconic-button-selected'));
					button.buttonEl.addClass('iconic-button-selected');
					this.rule.match = 'any';
					this.updateMatchesButton();
				});
				buttonEls.push(button.buttonEl);
			})
			.addButton(button => { button
				.setButtonText(STRINGS.ruleEditor.matchConditions.none)
				.setTooltip('All conditions must fail');
				button.buttonEl.toggleClass('iconic-button-selected', this.rule.match === 'none');
				this.iconManager.setEventListener(button.buttonEl, 'pointerdown', () => {
					buttonEls.forEach(buttonEl => buttonEl.removeClass('iconic-button-selected'));
					button.buttonEl.addClass('iconic-button-selected');
					this.rule.match = 'none';
					this.updateMatchesButton();
				});
				buttonEls.push(button.buttonEl);
			});

		// HEADING: Conditions
		new Setting(this.contentEl).setHeading().setName(STRINGS.ruleEditor.conditions);

		// LIST: Conditions
		for (const condition of this.rule.conditions) {
			this.appendCondition(condition);
		}

		// BUTTON: Add condition
		this.addCondSetting = new Setting(this.contentEl)
			.addExtraButton(button => { button
				.setIcon('lucide-circle-plus')
				.setTooltip(STRINGS.ruleEditor.addCondition)
				.onClick(() => this.newCondition())
				.extraSettingsEl.style.color = ColorUtils.toRgb('green');
			});
		this.addCondSetting.settingEl.addClass('iconic-add');
		this.addCondSetting.infoEl.remove();

		// Match styling of bookmark edit dialog
		const buttonContainerEl = this.modalEl.createDiv({ cls: 'modal-button-container' });
		const buttonRowEl = Platform.isMobile ? buttonContainerEl.createDiv({ cls: 'iconic-button-row' }) : null;

		// [Remove rule]
		new ButtonComponent(buttonRowEl ?? buttonContainerEl)
			.setButtonText(STRINGS.ruleEditor.removeRule)
			.onClick(() => this.closeAndSave(null))
			.buttonEl.addClasses(Platform.isPhone
				? ['mod-warning']
				: ['mod-secondary', 'mod-destructive']
			);

		// [Matches]
		this.matchesButton = new ButtonComponent(buttonRowEl ? buttonRowEl : buttonContainerEl)
			.setButtonText(STRINGS.ruleEditor.buttonNoMatches)
			.onClick(() => RuleChecker.open(this.plugin, this.page, this.matches))
			.setDisabled(this.rule.conditions === null)
			.setTooltip(this.rule.conditions === null ? 'No conditions added' : '',
				{ placement: 'top', delay: 100 }
			);

		// [Cancel]
		new ButtonComponent(Platform.isPhone ? this.modalEl : buttonContainerEl)
			.setButtonText(STRINGS.iconPicker.cancel)
			.onClick(() => this.close())
			.buttonEl.addClasses(Platform.isPhone
				? ['modal-nav-action', 'mod-secondary']
				: ['mod-cancel']
			);

		// [Save]
		new ButtonComponent(Platform.isPhone ? this.modalEl : buttonContainerEl)
			.setButtonText(STRINGS.iconPicker.save)
			.onClick(() => this.closeAndSave(this.rule))
			.buttonEl.addClasses(Platform.isPhone
				? ['modal-nav-action', 'mod-cta']
				: ['mod-cta']
			);

		this.updateMatchesButton();
	}

	/**
	 * Append a condition to the rule.
	 */
	private appendCondition(condition: ConditionItem): void {
		const condSetting = new ConditionSetting(
			this.contentEl,
			this.plugin,
			this.iconManager,
			this.page,
			condition,
			this.condEls,
			() => this.updateMatchesButton(),
			(toIndex) => this.moveCondition(condition, toIndex),
			() => this.removeCondition(condition),
		);
		this.condEls.push(condSetting.settingEl);

		if (this.addCondSetting) {
			condSetting.settingEl.insertAdjacentElement('afterend', this.addCondSetting.settingEl);
		}
		this.updateMatchesButton();
	}

	/**
	 * Create a new condition and append it to the rule.
	 */
	private newCondition(): void {
		const lastCondition = this.rule.conditions.last();
		const condition = lastCondition
			? { source: lastCondition.source, operator: lastCondition.operator, value: '' }
			: { source: 'name', operator: 'contains', value: '' };
		this.rule.conditions.push(condition);
		this.appendCondition(condition);
		if (this.addCondSetting) {
			this.addCondSetting.settingEl.scrollIntoView({ behavior: 'smooth' });
		}
	}

	/**
	 * Move a condition within the rule.
	 */
	private moveCondition(condition: ConditionItem, toIndex: number): void {
		const index = this.rule.conditions.indexOf(condition);
		if (index < 0) return;
		this.rule.conditions.splice(index, 1);
		this.rule.conditions.splice(toIndex, 0, condition);
	}

	/**
	 * Remove a condition from the rule.
	 */
	private removeCondition(condition: ConditionItem): void {
		this.rule.conditions.remove(condition);
		this.updateMatchesButton();
	}

	/**
	 * Update number displayed on the matches button.
	 */
	private async updateMatchesButton(): Promise<void> {
		if (!this.matchesButton) return;

		// Show a loading spinner if check takes longer than 100ms
		const timeoutId = setTimeout(() => {
			// @ts-expect-error (Private API)
			this.matchesButton.setLoading(true);
			this.matchesButton.setDisabled(true);
		}, 100);

		// Update matches
		switch (this.page) {
			case 'file': this.matches = this.plugin.ruleManager.judgeFiles(this.rule, new Date(), true); break;
			case 'folder': this.matches = this.plugin.ruleManager.judgeFolders(this.rule, new Date(), true); break;
		}
		clearTimeout(timeoutId);

		// Update button
		switch (this.matches.length) {
			case 0: this.matchesButton.setButtonText(STRINGS.ruleEditor.buttonNoMatches); break;
			case 1: this.matchesButton.setButtonText(STRINGS.ruleEditor.buttonMatch); break;
			default: {
				this.matchesButton.setButtonText(
					STRINGS.ruleEditor.buttonMatches.replace('{#}', this.matches.length.toString())
				);
				break;
			}
		}
		// @ts-expect-error (Private API)
		this.matchesButton.setLoading(false);
		this.matchesButton.setDisabled(this.matches.length === 0);
	}

	/**
	 * Close dialog while passing rule settings to original callback.
	 */
	private closeAndSave(rule: RuleItem | null): void {
		this.close();
		if (rule) rule.name = this.nameField.getValue() || rule.name; // Prevent untitled rules
		if (this.callback) this.callback(rule);
	}

	/**
	 * @override
	 */
	onClose(): void {
		this.condEls.length = 0;
		this.contentEl.empty();
		this.iconManager.stopEventListeners();
		this.iconManager.stopMutationObservers();
		// Clean up any drag ghosts left hanging when dialog is closed
		for (const ghostEl of activeDocument.body.findAll(':scope > .drag-reorder-ghost')) {
			ghostEl.remove();
		}
	}
}

/**
 * Setting for displaying a condition item.
 */
class ConditionSetting extends Setting {
	private readonly plugin: IconicPlugin;
	private readonly page: Category;
	private readonly condition: ConditionItem;

	// Components
	private readonly condEls: HTMLElement[];
	private removeButton: ExtraButtonComponent;
	private srcDropdown: DropdownComponent;
	private opDropdown: DropdownComponent;
	private valField: TextComponent;
	private valDropdown: DropdownComponent;
	private valOptions: DropdownOptions | undefined;
	private ghostCondEl: HTMLElement | undefined;

	// Callbacks
	private readonly onChange: () => void;
	private readonly onMove: (toIndex: number) => void;
	private readonly onRemove: () => void;

	constructor(
		containerEl: HTMLElement,
		plugin: IconicPlugin,
		iconManager: RuleEditorManager,
		page: Category,
		condition: ConditionItem,
		condEls: HTMLElement[],
		onChange: () => void,
		onMove: (toIndex: number) => void,
		onRemove: () => void,
	) {
		super(containerEl);
		this.plugin = plugin;
		this.page = page;
		this.condition = condition;
		this.condEls = condEls;
		this.onChange = onChange;
		this.onMove = onMove;
		this.onRemove = onRemove;
		this.settingEl.addClass('iconic-condition');
		this.infoEl.remove();

		// BUTTON: Remove condition
		this.addExtraButton(button => { button
			.setIcon('lucide-circle-minus')
			.setTooltip(STRINGS.ruleEditor.removeCondition)
			.onClick(() => {
				this.settingEl.remove();
				this.onRemove();
			})
			.extraSettingsEl.style.color = ColorUtils.toRgb('red');
			this.removeButton = button;
		});

		const ctrlContainer = Platform.isPhone
			? this.controlEl.createDiv({ cls: 'iconic-control-column' })
			: this.controlEl;
		const dropContainer = Platform.isPhone
			? ctrlContainer.createDiv({ cls: 'iconic-dropdown-row' })
			: this.controlEl;

		// DROPDOWN: Source
		this.srcDropdown = new DropdownComponent(dropContainer)
			.onChange(value => {
				this.condition.source = value;
				if (value === 'properties' || value.startsWith('property:')) {
					this.refreshPropertyDropdowns();
				} else {
					this.refreshDropdowns();
				}
			});

		// DROPDOWN: Operator
		this.opDropdown = new DropdownComponent(dropContainer)
			.onChange(value => {
				this.condition.operator = value;
				this.refreshValue();
			});

		// FIELD: Value
		this.valField = new TextComponent(ctrlContainer)
			.onChange(value => {
				this.condition.value = value;
				this.onChange();
			});

		// DROPDOWN: Value
		this.valDropdown = new DropdownComponent(ctrlContainer)
			.onChange(value => {
				this.condition.value = value;
				this.onChange();
			});

		// BUTTON: Drag handle
		this.addExtraButton(button => { button
			.setIcon('lucide-menu')
			.setTooltip(STRINGS.rulePicker.drag)
			.extraSettingsEl.addClass('iconic-drag');

			// Drag & drop (mouse)
			iconManager.setEventListener(button.extraSettingsEl, 'pointerdown', () => {
				this.settingEl.draggable = true;
			});
			iconManager.setEventListener(this.settingEl, 'dragstart', event => {
				this.onDragStart(event.clientX, event.clientY, button.extraSettingsEl);
			});
			iconManager.setEventListener(this.settingEl, 'drag', event => {
				this.onDrag(event.clientX, event.clientY, button.extraSettingsEl);
			});
			iconManager.setEventListener(this.settingEl, 'dragend', () => this.onDragEnd());

			// Drag & drop (multi-touch)
			iconManager.setEventListener(button.extraSettingsEl, 'touchstart', event => {
				event.preventDefault(); // Prevent dragstart
				const touch = event.targetTouches[0];
				this.onDragStart(touch.clientX, touch.clientY, button.extraSettingsEl);
			});
			iconManager.setEventListener(button.extraSettingsEl, 'touchmove', event => {
				event.preventDefault(); // Prevent scrolling
				const touch = event.targetTouches[0];
				this.onDrag(touch.clientX, touch.clientY, button.extraSettingsEl);
			});
			iconManager.setEventListener(button.extraSettingsEl, 'touchend', () => this.onDragEnd());
			iconManager.setEventListener(button.extraSettingsEl, 'touchcancel', () => this.onDragEnd());
		});

		if (this.condition.source.startsWith('property:')) {
			this.refreshPropertyDropdowns();
		} else {
			this.refreshDropdowns();
		}
	}

	private onDragStart(x: number, y: number, dragButtonEl: HTMLElement): void {
		navigator?.vibrate(100); // Not supported on iOS
		// Create drag ghost
		this.ghostCondEl = activeDocument.body.createDiv({ cls: 'drag-reorder-ghost' });
		this.ghostCondEl.setCssStyles({
			width: this.settingEl.clientWidth + 'px',
			height: this.settingEl.clientHeight + 'px',
			left: activeDocument.body.hasClass('mod-rtl')
				? x - dragButtonEl.clientWidth / 2 + 'px'
				: x - this.settingEl.clientWidth + dragButtonEl.clientWidth / 2 + 'px',
			top: y - this.settingEl.clientHeight / 2 + 'px',
		});
		this.ghostCondEl.appendChild(this.settingEl.cloneNode(true));
		// Show correct values in ghost dropdowns
		const ghostSelectEls = this.ghostCondEl.findAll('select') as HTMLSelectElement[];
		if (ghostSelectEls[0]) ghostSelectEls[0].value = this.condition.source;
		if (ghostSelectEls[1]) ghostSelectEls[1].value = this.condition.operator;
		// Show drop zone effect
		this.settingEl.addClass('drag-ghost-hidden');
		// Hack to hide the browser-native drag ghost
		this.settingEl.style.opacity = '0%';
		activeWindow.requestAnimationFrame(() => this.settingEl.style.removeProperty('opacity'));
	}

	private onDrag(x: number, y: number, dragButtonEl: HTMLElement): void {
		// Ignore initial (0, 0) event
		if (x === 0 && y === 0) return;
		// Update ghost position
		this.ghostCondEl?.setCssStyles({
			left: activeDocument.body.hasClass('mod-rtl')
				? x - dragButtonEl.clientWidth / 2 + 'px'
				: x - this.settingEl.clientWidth + dragButtonEl.clientWidth / 2 + 'px',
			top: y - this.settingEl.clientHeight / 2 + 'px',
		});
		// Get position in list
		const index = this.condEls.indexOf(this.settingEl);
		// If ghost is dragged into condition above, swap the conditions
		const prevCondEl = this.condEls[index - 1];
		const prevOverdrag = prevCondEl?.clientHeight * 0.25 || 0;
		if (prevCondEl && y < prevCondEl.getBoundingClientRect().bottom - prevOverdrag) {
			navigator?.vibrate(100); // Not supported on iOS
			prevCondEl.insertAdjacentElement('beforebegin', this.settingEl);
			this.condEls.splice(index, 1);
			this.condEls.splice(index - 1, 0, this.settingEl);
		}
		// If ghost is dragged into condition below, swap the conditions
		const nextCondEl = this.condEls[index + 1];
		const nextOverdrag = nextCondEl?.clientHeight * 0.25 || 0;
		if (nextCondEl && y > nextCondEl.getBoundingClientRect().top + nextOverdrag) {
			navigator?.vibrate(100); // Not supported on iOS
			nextCondEl.insertAdjacentElement('afterend', this.settingEl);
			this.condEls.splice(index, 1);
			this.condEls.splice(index + 1, 0, this.settingEl);
		}
	}

	private onDragEnd(): void {
		this.ghostCondEl?.remove();
		delete this.ghostCondEl;
		this.settingEl.removeClass('drag-ghost-hidden');
		this.settingEl.removeAttribute('draggable');
		// Save condition position
		const toIndex = this.condEls.indexOf(this.settingEl);
		if (toIndex > -1) this.onMove(toIndex);
	}

	/**
	 * Refresh dropdowns to handle a normal source.
	 */
	private refreshDropdowns(): void {
		// Update sources
		let srcOptions: DropdownOptions;
		switch (this.page) {
			default: srcOptions = FILE_SOURCES; break;
			case 'file': srcOptions = FILE_SOURCES; break;
			case 'folder': srcOptions = FOLDER_SOURCES; break;
		}
		this.srcDropdown.selectEl.empty();
		this.srcDropdown.addOptions(srcOptions?.get() ?? {});
		// If selected source is invalid, select the default
		if (!srcOptions.has(this.condition.source)) {
			this.condition.source = this.srcDropdown.getValue();
		}
		// Update selection
		this.srcDropdown.setValue(this.condition.source);

		// Update operators
		const opOptions = SOURCE_OPERATORS[this.condition.source];
		this.opDropdown.selectEl.empty();
		this.opDropdown.addOptions(opOptions?.get() ?? {});
		// If selected operator is invalid, select the default
		if (!opOptions.has(this.condition.operator)) {
			this.condition.operator = this.opDropdown.getValue();
		}
		// Update selection
		this.opDropdown.setValue(this.condition.operator);

		this.refreshValue();
	}

	/**
	 * Refresh dropdowns to handle a property source.
	 */
	private refreshPropertyDropdowns(): void {
		// Change remove icon
		this.removeButton.setIcon('lucide-archive');
		this.removeButton.setTooltip(STRINGS.ruleEditor.resetCondition);
		this.removeButton.onClick(() => {
			this.removeButton.setIcon('lucide-circle-minus')
				.setTooltip(STRINGS.ruleEditor.removeCondition)
				.onClick(() => {
					this.settingEl.remove();
					this.onRemove();
				});
			this.condition.source = 'name';
			this.condition.operator = 'is';
			this.refreshDropdowns();
		});

		// Update sources
		const props = this.plugin.getPropertyItems().sort((propA, propB) => propA.id < propB.id ? -1 : +1);
		const srcOptions = new DropdownOptions(
			Object.fromEntries(props.map(prop => ['property:' + prop.id, () => prop.name]))
		);
		this.srcDropdown.selectEl.empty();
		this.srcDropdown.addOptions(srcOptions.get());
		// Update selected source
		this.condition.source = srcOptions.has(this.condition.source)
			? this.condition.source
			: this.srcDropdown.getValue();
		this.srcDropdown.setValue(this.condition.source);

		// Update operators
		const propId = this.condition.source.replace('property:', '');
		const prop = this.plugin.getPropertyItem(propId);
		if (!prop) return;
		let opOptions: DropdownOptions;
		switch (prop.type) {
			default: opOptions = TEXT_OPERATORS; break;
			case 'multitext': opOptions = LIST_OPERATORS; break;
			case 'number': opOptions = NUMBER_OPERATORS; break;
			case 'checkbox': opOptions = BOOLEAN_OPERATORS; break;
			case 'date': opOptions = DATE_OPERATORS; break;
			case 'datetime': opOptions = DATETIME_OPERATORS; break;
			case 'aliases': opOptions = LIST_OPERATORS; break;
			case 'tags': opOptions = LIST_OPERATORS; break;
		}
		opOptions = opOptions.plus(VALUE_OPERATORS).plus(PROPERTY_OPERATORS);
		this.opDropdown.selectEl.empty();
		this.opDropdown.addOptions(opOptions.get());
		// Update selected operator
		this.condition.operator = opOptions.has(this.condition.operator)
			? this.condition.operator
			: this.opDropdown.getValue();
		this.opDropdown.setValue(this.condition.operator);

		this.refreshValue();
	}

	/**
	 * Refresh the value field to match the operator value type.
	 */
	private refreshValue(): void {
		const isFirstRefresh = !this.valField.getValue() && !this.valDropdown.getValue();
		const operator = this.condition.operator.replace('!', '');
		let valType: string | undefined;
		let valPlaceholder: string | undefined;
		let valOptions: DropdownOptions | undefined;

		switch (OPERATOR_VALUE_TYPES[operator]) {
			case 'text': {
				valType = 'text';
				switch (operator) {
					default: valPlaceholder = STRINGS.ruleEditor.enterValue; break;
					case 'matches': valPlaceholder = STRINGS.ruleEditor.enterRegex; break;
					case 'anyMatch': valPlaceholder = STRINGS.ruleEditor.enterRegex; break;
					case 'allMatch': valPlaceholder = STRINGS.ruleEditor.enterRegex; break;
					case 'noneMatch': valPlaceholder = STRINGS.ruleEditor.enterRegex; break;
					case 'nameMatches': valPlaceholder = STRINGS.ruleEditor.enterRegex; break;
					case 'colorHexIs': valPlaceholder = STRINGS.ruleEditor.enterHexCode; break;
				}
				break;
			}
			case 'number': {
				valType = 'number';
				valPlaceholder = STRINGS.ruleEditor.enterNumber;
				break;
			}
			case 'datetime': valType = 'datetime-local'; break;
			case 'date': valType = 'date'; break;
			case 'time': valType = 'time'; break;
			case 'weekday': valOptions = WEEKDAY_VALUES; break;
			case 'month': valOptions = MONTH_VALUES; break;
			case 'color': valOptions = COLOR_VALUES; break;
		}

		if (valType) {
			// If input type or visibility have changed, reset the value
			if ((valType !== this.valField.inputEl.type || !this.valField.inputEl.isShown()) && !isFirstRefresh) {
				this.condition.value = '';
			}
			this.valField.inputEl.type = valType;
			this.valField.setPlaceholder(valPlaceholder ?? '');
			this.valField.setValue(this.condition.value);
			this.valField.inputEl.show();
		} else {
			this.valField.inputEl.hide();
		}

		if (valOptions) {
			// If dropdown was just created, select the saved value (if valid)
			if (!this.valOptions) {
				this.valDropdown.addOptions(valOptions.get());
				if (valOptions.has(this.condition.value)) {
					this.valDropdown.setValue(this.condition.value);
				} else {
					this.condition.value = this.valDropdown.getValue();
				}
			// If dropdown has changed, reset the saved value
			} else if (this.valOptions !== valOptions || !this.valDropdown.selectEl.isShown()) {
				this.valDropdown.selectEl.empty();
				this.valDropdown.addOptions(valOptions.get());
				this.condition.value = this.valDropdown.getValue();
			}
			this.valOptions = valOptions;
			this.valDropdown.selectEl.show();
		} else {
			this.valDropdown.selectEl.hide();
		}

		this.onChange();
	}
}
