import { DropdownComponent, ExtraButtonComponent, Platform, Setting, TextComponent } from 'obsidian';
import IconicPlugin, { Category, STRINGS } from 'src/IconicPlugin';
import ColorUtils from 'src/ColorUtils';
import { BOOLEAN_OPERATORS, COLOR_VALUES, DATE_OPERATORS, DATETIME_OPERATORS, DropdownOptions, FILE_SOURCES, FOLDER_SOURCES, LIST_OPERATORS, MONTH_VALUES, NUMBER_OPERATORS, OPERATOR_VALUE_TYPES, PROPERTY_OPERATORS, RuleEditorManager, SOURCE_OPERATORS, TEXT_OPERATORS, VALUE_OPERATORS, WEEKDAY_VALUES } from 'src/dialogs/RuleEditor';
import { ConditionItem } from 'src/managers/RuleManager';

/**
 * Setting for displaying a condition item.
 */
export default class ConditionSetting extends Setting {
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
		navigator.vibrate?.(100); // Not supported on iOS
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
			navigator.vibrate?.(100); // Not supported on iOS
			prevCondEl.insertAdjacentElement('beforebegin', this.settingEl);
			this.condEls.splice(index, 1);
			this.condEls.splice(index - 1, 0, this.settingEl);
		}
		// If ghost is dragged into condition below, swap the conditions
		const nextCondEl = this.condEls[index + 1];
		const nextOverdrag = nextCondEl?.clientHeight * 0.25 || 0;
		if (nextCondEl && y > nextCondEl.getBoundingClientRect().top + nextOverdrag) {
			navigator.vibrate?.(100); // Not supported on iOS
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
