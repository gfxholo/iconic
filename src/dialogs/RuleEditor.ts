import { ButtonComponent, Modal, Platform, Setting, TextComponent } from 'obsidian';
import IconicPlugin, { Category, Icon, Item, FileItem, STRINGS } from 'src/IconicPlugin';
import ColorUtils from 'src/ColorUtils';
import { RuleItem, ConditionItem } from 'src/managers/RuleManager';
import IconManager from 'src/managers/IconManager';
import RuleChecker from 'src/dialogs/RuleChecker';
import IconPicker from 'src/dialogs/IconPicker';
import ConditionSetting from 'src/components/ConditionSetting';

export type OperatorValueType = 'text' | 'regex' | 'number' | 'datetime' | 'date' | 'time' | 'weekday' | 'month' | 'color' | 'hex';

const FILE_SOURCES = [
	'icon',
	'color',
	'name',
	'filename',
	'extension',
	'tree',
	'path',
	'headings',
	'links',
	'embeds',
	'tags',
	'created',
	'modified',
	'clock',
	'properties',
];

const FOLDER_SOURCES = [
	'icon',
	'color',
	'name',
	'tree',
	'path',
	'created',
	'modified',
	'clock',
];

const TEXT_OPERATORS = [
	'is',
	'!is',
	'contains',
	'startsWith',
	'endsWith',
	'matches',
	'!contains',
	'!startsWith',
	'!endsWith',
	'!matches',
];

const LIST_OPERATORS = [
	'includes',
	'!includes',
	'allAre',
	'allContain',
	'allStartWith',
	'allEndWith',
	'allMatch',
	'anyContain',
	'anyStartWith',
	'anyEndWith',
	'anyMatch',
	'noneContain',
	'noneStartWith',
	'noneEndWith',
	'noneMatch',
	'countIs',
	'!countIs',
	'countIsLess',
	'countIsMore',
];

const NUMBER_OPERATORS = [
	'equals',
	'!equals',
	'isLess',
	'isMore',
	'isDivisible',
	'!isLess',
	'!isMore',
	'!isDivisible',
];

const BOOLEAN_OPERATORS = [
	'isTrue',
	'!isTrue',
	'isFalse',
	'!isFalse',
];

const DATETIME_OPERATORS = [
	'datetimeIs',
	'!datetimeIs',
	'datetimeIsBefore',
	'datetimeIsAfter',
	'isNow',
	'!isNow',
	'isBeforeNow',
	'isAfterNow',
	'timeIs',
	'!timeIs',
	'timeIsBefore',
	'timeIsAfter',
	'timeIsNow',
	'!timeIsNow',
	'timeIsBeforeNow',
	'timeIsAfterNow',
	'dateIs',
	'!dateIs',
	'dateIsBefore',
	'dateIsAfter',
	'isToday',
	'!isToday',
	'isBeforeToday',
	'isAfterToday',
	'isLessDaysAgo',
	'isLessDaysAway',
	'isMoreDaysAgo',
	'isMoreDaysAway',
	'weekdayIs',
	'!weekdayIs',
	'weekdayIsBefore',
	'weekdayIsAfter',
	'monthdayIs',
	'!monthdayIs',
	'monthdayIsBefore',
	'monthdayIsAfter',
	'monthIs',
	'!monthIs',
	'monthIsBefore',
	'monthIsAfter',
	'yearIs',
	'!yearIs',
	'yearIsBefore',
	'yearIsAfter',
];

const DATE_OPERATORS = [
	'dateIs',
	'!dateIs',
	'dateIsBefore',
	'dateIsAfter',
	'isToday',
	'!isToday',
	'isBeforeToday',
	'isAfterToday',
	'isLessDaysAgo',
	'isLessDaysAway',
	'isMoreDaysAgo',
	'isMoreDaysAway',
	'weekdayIs',
	'!weekdayIs',
	'weekdayIsBefore',
	'weekdayIsAfter',
	'monthdayIs',
	'!monthdayIs',
	'monthdayIsBefore',
	'monthdayIsAfter',
	'monthIs',
	'!monthIs',
	'monthIsBefore',
	'monthIsAfter',
	'yearIs',
	'!yearIs',
	'yearIsBefore',
	'yearIsAfter',
];

const PAST_OPERATORS = [
	'datetimeIs',
	'!datetimeIs',
	'datetimeIsBefore',
	'datetimeIsAfter',
	'timeIs',
	'!timeIs',
	'timeIsBefore',
	'timeIsAfter',
	'timeIsNow',
	'!timeIsNow',
	'timeIsBeforeNow',
	'timeIsAfterNow',
	'dateIs',
	'!dateIs',
	'dateIsBefore',
	'dateIsAfter',
	'isToday',
	'!isToday',
	'isLessDaysAgo',
	'isMoreDaysAgo',
	'weekdayIs',
	'!weekdayIs',
	'weekdayIsBefore',
	'weekdayIsAfter',
	'monthdayIs',
	'!monthdayIs',
	'monthdayIsBefore',
	'monthdayIsAfter',
	'monthIs',
	'!monthIs',
	'monthIsBefore',
	'monthIsAfter',
	'yearIs',
	'!yearIs',
	'yearIsBefore',
	'yearIsAfter',
];

const PRESENT_OPERATORS = [
	'datetimeIs',
	'!datetimeIs',
	'datetimeIsBefore',
	'datetimeIsAfter',
	'timeIs',
	'!timeIs',
	'timeIsBefore',
	'timeIsAfter',
	'dateIs',
	'!dateIs',
	'dateIsBefore',
	'dateIsAfter',
	'weekdayIs',
	'!weekdayIs',
	'weekdayIsBefore',
	'weekdayIsAfter',
	'monthdayIs',
	'!monthdayIs',
	'monthdayIsBefore',
	'monthdayIsAfter',
	'monthIs',
	'!monthIs',
	'monthIsBefore',
	'monthIsAfter',
	'yearIs',
	'!yearIs',
	'yearIsBefore',
	'yearIsAfter',
];

const ICON_OPERATORS = [
	'iconIs',
	'!iconIs',
	'nameIs',
	'!nameIs',
	'nameContains',
	'nameStartsWith',
	'nameEndsWith',
	'nameMatches',
	'!nameContains',
	'!nameStartsWith',
	'!nameEndsWith',
	'!nameMatches',
];

const COLOR_OPERATORS = [
	'colorIs',
	'!colorIs',
	'hexIs',
	'!hexIs',
];

const VALUE_OPERATORS = [
	'hasValue',
	'!hasValue',
];

const PROPERTY_OPERATORS = [
	'hasProperty',
	'!hasProperty',
];

const WEEKDAY_VALUES = [
	1,
	2,
	3,
	4,
	5,
	6,
	7,
];

const MONTH_VALUES = [
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	11,
	12,
];

const COLOR_VALUES = [
	'red',
	'orange',
	'yellow',
	'green',
	'cyan',
	'blue',
	'purple',
	'pink',
	'gray'
];

const SOURCE_OPERATORS: Record<string, string[]> = {
	icon: [...ICON_OPERATORS, ...VALUE_OPERATORS],
	color: [...COLOR_OPERATORS, ...VALUE_OPERATORS],
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

const OPERATOR_VALUE_TYPES: Record<string, OperatorValueType> = {
	is: 'text',
	'!is': 'text',
	contains: 'text',
	startsWith: 'text',
	endsWith: 'text',
	matches: 'regex',
	'!contains': 'text',
	'!startsWith': 'text',
	'!endsWith': 'text',
	'!matches': 'regex',
	includes: 'text',
	'!includes': 'text',
	allAre: 'text',
	allContain: 'text',
	allStartWith: 'text',
	allEndWith: 'text',
	allMatch: 'regex',
	anyContain: 'text',
	anyStartWith: 'text',
	anyEndWith: 'text',
	anyMatch: 'regex',
	noneContain: 'text',
	noneStartWith: 'text',
	noneEndWith: 'text',
	noneMatch: 'regex',
	countIs: 'number',
	'!countIs': 'number',
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
	nameMatches: 'regex',
	'!nameContains': 'text',
	'!nameStartsWith': 'text',
	'!nameEndsWith': 'text',
	'!nameMatches': 'regex',
	colorIs: 'color',
	'!colorIs': 'color',
	hexIs: 'hex',
	'!hexIs': 'hex',
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

		const nameSetting = new Setting(this.contentEl);
		nameSetting.infoEl.remove();

		// BUTTON: Rule icon
		nameSetting.addExtraButton(button => { button
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
		});

		// FIELD: Rule name
		nameSetting.addText(text => { text
			.setValue(this.rule.name)
			.setPlaceholder(STRINGS.ruleEditor.enterName);
			this.iconManager.setEventListener(text.inputEl, 'keydown', event => {
				if (event.key === 'Enter') this.closeAndSave(this.rule);
			});
			this.nameField = text;
		});

		// TOGGLE: Enable/disable rule
		nameSetting.addToggle(toggle => { toggle
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
		const condSetting: ConditionSetting = new ConditionSetting(this.contentEl, condition)
			.onSourceChange(source => {
				this.setConditionSource(condSetting, source);
				this.setConditionOperator(condSetting, condition.operator);
				this.setConditionValue(condSetting, condition.value);
				this.updateMatchesButton();
			})
			.onOperatorChange(operator => {
				this.setConditionOperator(condSetting, operator);
				this.setConditionValue(condSetting, condition.value);
				this.updateMatchesButton();
			})
			.onValueChange(value => {
				this.setConditionValue(condSetting, value);
				this.updateMatchesButton();
			})
			.onRemove(() => this.removeCondition(condSetting))
			.onDragStart((x, y) => this.onDragStart(condSetting, x, y))
			.onDrag((x, y) => this.onDrag(condSetting, x, y))
			.onDragEnd(() => this.onDragEnd(condSetting));

		this.setConditionSource(condSetting, condition.source);
		this.setConditionOperator(condSetting, condition.operator);
		this.setConditionValue(condSetting, condition.value);

		this.condEls.push(condSetting.settingEl);

		if (this.addCondSetting) {
			condSetting.settingEl.after(this.addCondSetting.settingEl);
		}

		this.updateMatchesButton();
	}

	/**
	 * Set the source of a condition setting, updating its dropdown box.
	 */
	private setConditionSource(setting: ConditionSetting, source: string): void {
		setting.condition.source = source;
		setting.srcDropdown.setValue(source);

		if (setting.condition.source === 'properties' || setting.condition.source.startsWith('property:')) {
			// Get property sources
			let propSources: string[] = [];
			propSources = this.plugin.getPropertyItems().map(prop => 'property:' + prop.id).sort((a, b) => a.localeCompare(b))
			// Populate source dropdown
			setting.srcDropdown.selectEl.empty();
			setting.srcDropdown.addOption('properties-close', '...');
			for (const propSource of propSources) {
				setting.srcDropdown.addOption(propSource, propSource.replace('property:', ''));
			}
			// Preserve the selected property if possible
			if (propSources.includes(setting.condition.source)) {
				setting.srcDropdown.setValue(setting.condition.source);
			} else {
				setting.condition.source = propSources[0];
				setting.srcDropdown.setValue(propSources[0]);
			}
		} else {
			// Get sources based on rule page
			let sources: string[] = [];
			switch (this.page) {
				case 'file': sources = FILE_SOURCES; break;
				case 'folder': sources = FOLDER_SOURCES; break;
			}
			// Populate source dropdown
			setting.srcDropdown.selectEl.empty();
			for (const source of sources) {
				const label = STRINGS.ruleEditor.source[source as keyof typeof STRINGS.ruleEditor.source]
				setting.srcDropdown.addOption(source, label);
			}
			// Preserve the selected source if possible
			if (sources.includes(setting.condition.source)) {
				setting.srcDropdown.setValue(setting.condition.source);
			} else {
				setting.condition.source = sources[0];
				setting.srcDropdown.setValue(sources[0]);
			}
		}
	}

	/**
	 * Set the operator of a condition setting, updating its dropdown box.
	 */
	private setConditionOperator(setting: ConditionSetting, operator: string): void {
		const oldValueType = OPERATOR_VALUE_TYPES[setting.condition.operator];
		setting.condition.operator = operator;

		// Determine the operators
		let operators: string[] = [];
		if (setting.condition.source.startsWith('property:')) {
			const propId = setting.condition.source.replace('property:', '');
			const prop = this.plugin.getPropertyItem(propId);
			switch (prop.type) {
				default: operators = TEXT_OPERATORS; break;
				case 'multitext': operators = LIST_OPERATORS; break;
				case 'number': operators = NUMBER_OPERATORS; break;
				case 'checkbox': operators = BOOLEAN_OPERATORS; break;
				case 'date': operators = DATE_OPERATORS; break;
				case 'datetime': operators = DATETIME_OPERATORS; break;
				case 'aliases': operators = LIST_OPERATORS; break;
				case 'tags': operators = LIST_OPERATORS; break;
			}
		} else {
			operators = SOURCE_OPERATORS[setting.condition.source];
		}

		// Populate operator dropdown
		setting.opDropdown.selectEl.empty();
		for (const operator of operators) {
			const label = STRINGS.ruleEditor.operator[operator as keyof typeof STRINGS.ruleEditor.operator];
			setting.opDropdown.addOption(operator, label);
		}

		// Preserve the selected operator if possible
		if (operators.includes(setting.condition.operator)) {
			setting.opDropdown.setValue(setting.condition.operator);
		} else {
			setting.condition.operator = operators[0];
			setting.opDropdown.setValue(operators[0]);
		}

		// If value type has changed, empty the condition value
		const valueType = OPERATOR_VALUE_TYPES[setting.condition.operator];
		if (valueType !== oldValueType) {
			setting.condition.value = '';
		}
	}

	/**
	 * Set the value of a condition setting, updating its input field or dropdown box.
	 */
	private setConditionValue(setting: ConditionSetting, value: string): void {
		setting.condition.value = value;

		const valueType = OPERATOR_VALUE_TYPES[setting.condition.operator];

		// Decide how to display the value
		let inputType: string | null = null;
		let inputPlaceholder: string = '';
		let dropdownValues: (string | number)[] | null = null;
		let dropdownLabels: Record<(string | number), string> | null = null;
		switch (valueType) {
			case 'text': {
				inputType = 'text';
				inputPlaceholder = STRINGS.ruleEditor.enterValue;
				break;
			}
			case 'regex': {
				inputType = 'text';
				inputPlaceholder = STRINGS.ruleEditor.enterRegex;
				break;
			}
			case 'hex': {
				inputType = 'text';
				inputPlaceholder = STRINGS.ruleEditor.enterHexCode;
				break;
			}
			case 'number': {
				inputType = 'text';
				inputPlaceholder = STRINGS.ruleEditor.enterNumber;
				break;
			}
			case 'datetime': {
				inputType = 'datetime_local';
				inputPlaceholder = '';
				break;
			}
			case 'date': {
				inputType = 'date';
				inputPlaceholder = '';
				break;
			}
			case 'time': {
				inputType = 'time';
				inputPlaceholder = '';
				break;
			}
			case 'weekday': {
				dropdownValues = WEEKDAY_VALUES;
				dropdownLabels = STRINGS.ruleEditor.weekday;
				break;
			}
			case 'month': {
				dropdownValues = MONTH_VALUES;
				dropdownLabels = STRINGS.ruleEditor.month;
				break;
			}
			case 'color': {
				dropdownValues = COLOR_VALUES;
				dropdownLabels = STRINGS.iconPicker.colors;
				break;
			}
		}

		// Populate value input, or remove it
		if (inputType) {
			setting.valInput.inputEl.type = inputType;
			setting.valInput.setPlaceholder(inputPlaceholder);
			setting.valInput.setValue(setting.condition.value);
			// Insert element if not present
			if (setting.opDropdown.selectEl.nextElementSibling !== setting.valInput.inputEl) {
				setting.opDropdown.selectEl.after(setting.valInput.inputEl);
			}
		} else {
			// Remove element
			setting.valInput.inputEl.remove();
		}

		// Populate value dropdown, or remove
		setting.valDropdown.selectEl.empty();
		if (dropdownValues && dropdownLabels) {
			for (const value of dropdownValues) {
				const label = dropdownLabels[value as keyof typeof dropdownLabels];
				setting.valDropdown.addOption(value.toString(), label);
			}
			if (dropdownValues.includes(setting.condition.value)) {
				setting.valDropdown.setValue(setting.condition.value);
			}
			// Insert element if not present
			if (setting.opDropdown.selectEl.nextElementSibling !== setting.valDropdown.selectEl) {
				setting.opDropdown.selectEl.after(setting.valDropdown.selectEl);
			}

			// Preserve the selected value if possible
			if (dropdownValues.includes(setting.condition.value)) {
				setting.valDropdown.setValue(setting.condition.value);
			} else {
				setting.condition.value = dropdownValues[0].toString();
				setting.valDropdown.setValue(dropdownValues[0].toString());
			}
		} else {
			// Remove element
			setting.valDropdown.selectEl.remove();
		}
	}

	/**
	 * Create a new condition and append it to the rule object.
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
	 * Move a condition within the rule object.
	 */
	private moveCondition(condition: ConditionItem, toIndex: number): void {
		const index = this.rule.conditions.indexOf(condition);
		if (index < 0) return;
		this.rule.conditions.splice(index, 1);
		this.rule.conditions.splice(toIndex, 0, condition);
	}

	/**
	 * Create a ghost setting that the cursor will drag along.
	 */
	private onDragStart(setting: ConditionSetting, x: number, y: number): void {
		const { settingEl, gripEl } = setting;
		navigator.vibrate?.(100); // Not supported on iOS

		// Create ghost and set initial position
		setting.ghostEl = settingEl.doc.body.createDiv({ cls: 'drag-reorder-ghost' });
		setting.ghostEl.setCssStyles({
			width: settingEl.clientWidth + 'px',
			height: settingEl.clientHeight + 'px',
			left: settingEl.doc.body.hasClass('mod-rtl')
				? x - settingEl.clientWidth + gripEl.clientWidth / 2 + 'px'
				: x - gripEl.clientWidth / 2 + 'px',
			top: y - settingEl.clientHeight / 2 + 'px',
		});
		setting.ghostEl.appendChild(settingEl.cloneNode(true));

		// Show correct values in ghost dropdowns
		const [ghostSourceEl, ghostOperatorEl] = setting.ghostEl.findAll('select') as HTMLSelectElement[];
		if (ghostSourceEl) ghostSourceEl.value = setting.condition.source;
		if (ghostOperatorEl) ghostOperatorEl.value = setting.condition.operator;

		// Show drop zone effect
		settingEl.addClass('drag-ghost-hidden');

		// Hack to hide the browser-native drag ghost
		settingEl.style.opacity = '0%';
		settingEl.win.requestAnimationFrame(() => settingEl.style.removeProperty('opacity'));
	}

	private onDrag(setting: ConditionSetting, x: number, y: number): void {
		const { settingEl, gripEl } = setting;

		// Ignore initial (0, 0) event
		if (x === 0 && y === 0) return;

		// Update ghost position
		setting.ghostEl?.setCssStyles({
			left: settingEl.doc.body.hasClass('mod-rtl')
				? x - settingEl.clientWidth + gripEl.clientWidth / 2 + 'px'
				: x - gripEl.clientWidth / 2 + 'px',
			top: y - settingEl.clientHeight / 2 + 'px',
		});

		// Get position in list
		const index = this.condEls.indexOf(settingEl);

		// If ghost is dragged into condition above, swap the conditions
		const prevCondEl = this.condEls[index - 1];
		const prevOverdrag = prevCondEl?.clientHeight * 0.25 || 0;
		if (prevCondEl && y < prevCondEl.getBoundingClientRect().bottom - prevOverdrag) {
			navigator.vibrate?.(100); // Not supported on iOS
			prevCondEl.before(settingEl);
			this.condEls.splice(index, 1);
			this.condEls.splice(index - 1, 0, settingEl);
		}

		// If ghost is dragged into condition below, swap the conditions
		const nextCondEl = this.condEls[index + 1];
		const nextOverdrag = nextCondEl?.clientHeight * 0.25 || 0;
		if (nextCondEl && y > nextCondEl.getBoundingClientRect().top + nextOverdrag) {
			navigator.vibrate?.(100); // Not supported on iOS
			nextCondEl.after(settingEl);
			this.condEls.splice(index, 1);
			this.condEls.splice(index + 1, 0, settingEl);
		}
	}

	/**
	 * Reset drag UI and save the new position.
	 */
	private onDragEnd(setting: ConditionSetting): void {
		setting.ghostEl?.remove()
		setting.ghostEl = null;
		setting.settingEl.removeClass('drag-ghost-hidden');
		setting.settingEl.removeAttribute('draggable');

		// Save condition position
		const toIndex = this.condEls.indexOf(setting.settingEl);
		if (toIndex > -1) this.moveCondition(setting.condition, toIndex);
	}

	/**
	 * Remove a condition from the rule object.
	 */
	private removeCondition(setting: ConditionSetting): void {
		setting.settingEl.remove();
		this.rule.conditions.remove(setting.condition);
		this.condEls.remove(setting.settingEl);
		this.updateMatchesButton();
	}

	/**
	 * Update number displayed on the matches button.
	 */
	private async updateMatchesButton(): Promise<void> {
		if (!this.matchesButton) return;

		// Show a loading spinner if check takes longer than 100ms
		const timeoutId = this.modalEl.win.setTimeout(() => {
			// @ts-expect-error (Private API)
			this.matchesButton.setLoading(true);
			this.matchesButton.setDisabled(true);
		}, 100);

		// Update matches
		switch (this.page) {
			case 'file': this.matches = this.plugin.ruleManager.judgeFiles(this.rule, new Date(), true); break;
			case 'folder': this.matches = this.plugin.ruleManager.judgeFolders(this.rule, new Date(), true); break;
		}
		this.modalEl.win.clearTimeout(timeoutId);

		// Update button text
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
