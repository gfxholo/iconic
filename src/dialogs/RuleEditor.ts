import { ButtonComponent, Modal, Platform, Setting, TextComponent } from 'obsidian';
import IconicPlugin, { Category, Icon, Item, FileItem, STRINGS } from 'src/IconicPlugin';
import ColorUtils from 'src/ColorUtils';
import { RuleItem, ConditionItem } from 'src/managers/RuleManager';
import IconManager from 'src/managers/IconManager';
import RuleChecker from 'src/dialogs/RuleChecker';
import IconPicker from 'src/dialogs/IconPicker';
import ConditionSetting from 'src/components/ConditionSetting';

/**
 * Options for a DropdownComponent.
 * Localized strings are not available at compile time, so option labels are stored as functions.
 */
export class DropdownOptions {
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

export const FILE_SOURCES = new DropdownOptions({
	icon: () => STRINGS.ruleEditor.source.icon,
	color: () => STRINGS.ruleEditor.source.color,
	name: () => STRINGS.ruleEditor.source.name,
	filename: () => STRINGS.ruleEditor.source.filename,
	extension: () => STRINGS.ruleEditor.source.extension,
	tree: () => STRINGS.ruleEditor.source.tree,
	path: () => STRINGS.ruleEditor.source.path,
	headings: () => STRINGS.ruleEditor.source.headings,
	links: () => STRINGS.ruleEditor.source.links,
	embeds: () => STRINGS.ruleEditor.source.embeds,
	tags: () => STRINGS.ruleEditor.source.tags,
	properties: () => STRINGS.ruleEditor.source.properties,
	created: () => STRINGS.ruleEditor.source.created,
	modified: () => STRINGS.ruleEditor.source.modified,
	clock: () => STRINGS.ruleEditor.source.clock,
});

export const FOLDER_SOURCES = new DropdownOptions({
	icon: () => STRINGS.ruleEditor.source.icon,
	color: () => STRINGS.ruleEditor.source.color,
	name: () => STRINGS.ruleEditor.source.name,
	tree: () => STRINGS.ruleEditor.source.tree,
	path: () => STRINGS.ruleEditor.source.path,
	created: () => STRINGS.ruleEditor.source.created,
	modified: () => STRINGS.ruleEditor.source.modified,
	clock: () => STRINGS.ruleEditor.source.clock,
});

export const TEXT_OPERATORS = new DropdownOptions({
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

export const LIST_OPERATORS = new DropdownOptions({
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

export const NUMBER_OPERATORS = new DropdownOptions({
	equals: () => STRINGS.ruleEditor.operator.equals,
	'!equals': () => STRINGS.ruleEditor.operator['!equals'],
	isLess: () => STRINGS.ruleEditor.operator.isLess,
	isMore: () => STRINGS.ruleEditor.operator.isMore,
	isDivisible: () => STRINGS.ruleEditor.operator.isDivisible,
	'!isLess': () => STRINGS.ruleEditor.operator['!isLess'],
	'!isMore': () => STRINGS.ruleEditor.operator['!isMore'],
	'!isDivisible': () => STRINGS.ruleEditor.operator['!isDivisible'],
});

export const BOOLEAN_OPERATORS = new DropdownOptions({
	isTrue: () => STRINGS.ruleEditor.operator.isTrue,
	'!isTrue': () => STRINGS.ruleEditor.operator['!isTrue'],
	isFalse: () => STRINGS.ruleEditor.operator.isFalse,
	'!isFalse': () => STRINGS.ruleEditor.operator['!isFalse'],
});

export const DATETIME_OPERATORS = new DropdownOptions({
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

export const DATE_OPERATORS = new DropdownOptions({
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

export const PAST_OPERATORS = new DropdownOptions({
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

export const PRESENT_OPERATORS = new DropdownOptions({
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

export const ICON_OPERATORS = new DropdownOptions({
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

export const COLOR_OPERATORS = new DropdownOptions({
	colorIs: () => STRINGS.ruleEditor.operator.colorIs,
	'!colorIs': () => STRINGS.ruleEditor.operator['!colorIs'],
	hexIs: () => STRINGS.ruleEditor.operator.hexIs,
	'!hexIs': () => STRINGS.ruleEditor.operator['!hexIs'],
});

export const VALUE_OPERATORS = new DropdownOptions({
	hasValue: () => STRINGS.ruleEditor.operator.hasValue,
	'!hasValue': () => STRINGS.ruleEditor.operator['!hasValue'],
});

export const PROPERTY_OPERATORS = new DropdownOptions({
	hasProperty: () => STRINGS.ruleEditor.operator.hasProperty,
	'!hasProperty': () => STRINGS.ruleEditor.operator['!hasProperty'],
});

export const WEEKDAY_VALUES = new DropdownOptions({
	1: () => STRINGS.ruleEditor.weekday[1],
	2: () => STRINGS.ruleEditor.weekday[2],
	3: () => STRINGS.ruleEditor.weekday[3],
	4: () => STRINGS.ruleEditor.weekday[4],
	5: () => STRINGS.ruleEditor.weekday[5],
	6: () => STRINGS.ruleEditor.weekday[6],
	7: () => STRINGS.ruleEditor.weekday[7],
});

export const MONTH_VALUES = new DropdownOptions({
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

export const COLOR_VALUES = new DropdownOptions({
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

export const SOURCE_OPERATORS: { [key: string]: DropdownOptions } = {
	icon: ICON_OPERATORS.plus(VALUE_OPERATORS),
	color: COLOR_OPERATORS.plus(VALUE_OPERATORS),
	name: TEXT_OPERATORS,
	filename: TEXT_OPERATORS,
	extension: TEXT_OPERATORS,
	tree: TEXT_OPERATORS,
	path: TEXT_OPERATORS,
	headings: LIST_OPERATORS,
	links: LIST_OPERATORS,
	embeds: LIST_OPERATORS,
	tags: LIST_OPERATORS,
	created: PAST_OPERATORS,
	modified: PAST_OPERATORS,
	clock: PRESENT_OPERATORS,
};

export const OPERATOR_VALUE_TYPES: { [key: string]: ValueType } = {
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
export class RuleEditorManager extends IconManager {
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

		// Allow hotkeys in dialog
		for (const command of this.plugin.dialogCommands) if (command.callback) {
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
