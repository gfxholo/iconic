import { DropdownComponent, ExtraButtonComponent, Platform, Setting, TextComponent } from 'obsidian';
import { STRINGS } from 'src/IconicPlugin';
import ColorUtils from 'src/ColorUtils';
import { ConditionItem } from 'src/managers/RuleManager';

/**
 * Setting for displaying a condition item.
 */
export default class ConditionSetting extends Setting {
	condition: ConditionItem;

	// Components
	readonly srcDropdown: DropdownComponent;
	readonly opDropdown: DropdownComponent;
	readonly valInput: TextComponent;
	readonly valDropdown: DropdownComponent;

	// Elements
	readonly handleEl: HTMLElement;
	ghostEl: HTMLElement | null = null;

	// Callbacks
	private sourceChangeCallback: ((source: string) => any) | null = null;
	private operatorChangeCallback: ((operator: string) => any) | null = null;
	private valueChangeCallback: ((value: string) => any) | null = null;
	private dragStartCallback: ((x: number, y: number) => any) | null = null;
	private dragCallback: ((x: number, y: number) => any) | null = null;
	private dragEndCallback: (() => any) | null = null;
	private removeCallback: (() => any) | null = null;

	constructor(containerEl: HTMLElement, condition: ConditionItem,) {
		super(containerEl);
		this.condition = condition;

		this.settingEl.addClass('iconic-condition');
		this.infoEl.remove();

		// BUTTON: Remove condition
		this.addExtraButton(button => { button
			.setIcon('lucide-circle-minus')
			.setTooltip(STRINGS.ruleEditor.removeCondition)
			.onClick(() => this.removeCallback?.())
			.extraSettingsEl.style.color = ColorUtils.toRgb('red');
		});

		const ctrlContainer = Platform.isPhone
			? this.controlEl.createDiv({ cls: 'iconic-control-column' })
			: this.controlEl;
		const dropContainer = Platform.isPhone
			? ctrlContainer.createDiv({ cls: 'iconic-dropdown-row' })
			: this.controlEl;

		// DROPDOWN: Source
		this.srcDropdown = new DropdownComponent(dropContainer)
			.onChange(value => this.sourceChangeCallback?.(value));

		// DROPDOWN: Operator
		this.opDropdown = new DropdownComponent(dropContainer)
			.onChange(value => this.operatorChangeCallback?.(value));

		// FIELD: Value
		this.valInput = new TextComponent(ctrlContainer)
			.onChange(value => this.valueChangeCallback?.(value));

		// DROPDOWN: Value
		this.valDropdown = new DropdownComponent(ctrlContainer)
			.onChange(value => this.valueChangeCallback?.(value));

		// BUTTON: Drag handle
		this.handleEl = new ExtraButtonComponent(this.controlEl)
			.setIcon('lucide-menu')
			.setTooltip(STRINGS.rulePicker.drag)
			.extraSettingsEl;
		this.handleEl.addClass('iconic-drag');

		// Drag & drop (mouse)
		this.handleEl.addEventListener('pointerdown', () => {
			this.settingEl.draggable = true;
		});
		this.settingEl.addEventListener('dragstart', event => {
			this.dragStartCallback?.(event.clientX, event.clientY);
		});
		this.settingEl.addEventListener('drag', event => {
			this.dragCallback?.(event.clientX, event.clientY);
		});
		this.settingEl.addEventListener('dragend', () => this.dragEndCallback?.());

		// Drag & drop (multi-touch)
		this.handleEl.addEventListener('touchstart', event => {
			event.preventDefault(); // Prevent dragstart
			const touch = event.targetTouches[0];
			this.dragStartCallback?.(touch.clientX, touch.clientY);
		});
		this.handleEl.addEventListener('touchmove', event => {
			event.preventDefault(); // Prevent scrolling
			const touch = event.targetTouches[0];
			this.dragCallback?.(touch.clientX, touch.clientY);
		});
		this.handleEl.addEventListener('touchend', () => this.dragEndCallback?.());
		this.handleEl.addEventListener('touchcancel', () => this.dragEndCallback?.());
	}

	onSourceChange(callback: (source: string) => any): this {
		this.sourceChangeCallback = callback;
		return this;
	}

	onOperatorChange(callback: (operator: string) => any): this {
		this.operatorChangeCallback = callback;
		return this;
	}

	onValueChange(callback: (value: string) => any): this {
		this.valueChangeCallback = callback;
		return this;
	}

	onRemove(callback: () => any): this {
		this.removeCallback = callback;
		return this;
	}

	onDragStart(callback: (x: number, y: number) => any): this {
		this.dragStartCallback = callback;
		return this;
	}

	onDrag(callback: (x: number, y: number) => any): this {
		this.dragCallback = callback;
		return this;
	}

	onDragEnd(callback: () => any): this {
		this.dragEndCallback = callback;
		return this;
	}
}
