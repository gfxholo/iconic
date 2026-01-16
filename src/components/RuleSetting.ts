import { ExtraButtonComponent, Menu, Setting, ToggleComponent } from 'obsidian';
import { STRINGS } from 'src/IconicPlugin';
import { RuleItem } from 'src/managers/RuleManager';

/**
 * Setting for displaying a rule item.
 */
export default class RuleSetting extends Setting {
	// Components
	readonly toggle: ToggleComponent;

	// Elements
	readonly iconEl: HTMLElement;
	readonly gripEl: HTMLElement;
	ghostRuleEl: HTMLElement | null = null;

	// Callbacks
	private renameCallback: ((name: string) => any) | null = null;
	private toggleCallback: ((enabled: boolean) => any) | null = null;
	private iconClickCallback: (() => any) | null = null;
	private editClickCallback: (() => any) | null = null;
	private dragStartCallback: ((x: number, y: number) => any) | null = null;
	private dragCallback: ((x: number, y: number) => any) | null = null;
	private dragEndCallback: (() => any) | null = null;

	// Menu callbacks
	private addCallback: (() => any) | null = null;
	private duplicateCallback: (() => any) | null = null;
	private edgeCheckCallback: ((edge: 'top' | 'bottom') => boolean) | null = null;
	private edgeMoveCallback: ((edge: 'top' | 'bottom') => any) | null = null;
	private removeCallback: (() => any) | null = null;

	constructor(containerEl: HTMLElement, rule: RuleItem) {
		super(containerEl);
		this.settingEl.addClass('iconic-rule');

		// BUTTON: Grip
		this.gripEl = new ExtraButtonComponent(this.settingEl)
			.setIcon('lucide-grip-vertical')
			.extraSettingsEl;
		this.gripEl.addClass('iconic-grip');
		this.settingEl.prepend(this.gripEl);

		// BUTTON: Rule icon
		this.iconEl = new ExtraButtonComponent(this.settingEl)
			.setIcon(rule.icon ?? rule.iconDefault ?? 'lucide-file')
			.setTooltip(STRINGS.iconPicker.changeIcon)
			.onClick(() => this.iconClickCallback?.())
			.extraSettingsEl;
		this.gripEl.after(this.iconEl);

		// FIELD: Rule name
		this.setName(rule.name);
		this.nameEl.addEventListener('click', () => this.toggleEditable(this.nameEl, true));
		this.nameEl.addEventListener('blur', () => {
			this.toggleEditable(this.nameEl, false);
			const name = this.nameEl.getText();
			if (name.length > 0) {
				this.renameCallback?.(name);
			} else {
				this.nameEl.setText(rule.name); // Prevent untitled rules
			}
		});
		this.nameEl.addEventListener('keydown', event => {
			if (event.key === 'Enter') this.nameEl.blur();
		});

		// BUTTON: Edit rule
		this.addExtraButton(button => button
			.setIcon('lucide-settings')
			.setTooltip(STRINGS.rulePicker.editRule)
			.onClick(() => this.editClickCallback?.())
		);

		// TOGGLE: Enable/disable rule
		this.toggle = new ToggleComponent(this.controlEl)
			.setValue(rule.enabled)
			.onChange(value => this.toggleCallback?.(value));

		// Drag & drop (mouse)
		this.gripEl.addEventListener('pointerdown', () => {
			this.settingEl.draggable = true;
		});
		this.settingEl.addEventListener('dragstart', event => {
			this.dragStartCallback?.(event.clientX, event.clientY);
		});
		this.settingEl.addEventListener('drag', event => {
			this.dragCallback?.(event.clientX, event.clientY);
		});
		this.settingEl.addEventListener('dragend', () => {
			this.dragEndCallback?.();
		});

		// Drag & drop (multi-touch)
		this.gripEl.addEventListener('touchstart', event => {
			event.preventDefault(); // Prevent dragstart
			const touch = event.targetTouches[0];
			this.dragStartCallback?.(touch.clientX, touch.clientY);
		});
		this.gripEl.addEventListener('touchmove', event => {
			event.preventDefault(); // Prevent scrolling
			const touch = event.targetTouches[0];
			this.dragCallback?.(touch.clientX, touch.clientY);
		});
		this.gripEl.addEventListener('touchend', () => this.dragEndCallback?.());
		this.gripEl.addEventListener('touchcancel', () => this.dragEndCallback?.());

		// Register menu listener
		this.settingEl.addEventListener('contextmenu', event => this.showMenu(event));
	}

	/**
	 * Set the callback used when the name field is changed.
	 */
	onRename(callback: (name: string) => any): this {
		this.renameCallback = callback;
		return this;
	}

	/**
	 * Set the callback used when the enabled toggle changes.
	 */
	onToggle(callback: (enabled: boolean) => any): this {
		this.toggleCallback = callback;
		return this;
	}

	/**
	 * Set the callback used when the icon button is clicked.
	 */
	onIconClick(callback: () => any): this {
		this.iconClickCallback = callback;
		return this;
	}

	/**
	 * Set the callback used when the edit button is clicked.
	 */
	onEditClick(callback: () => any): this {
		this.editClickCallback = callback;
		return this;
	}

	onDragStart(callback: ((x: number, y: number) => any) | null): this {
		this.dragStartCallback = callback;
		return this;
	}

	onDrag(callback: ((x: number, y: number) => any) | null): this {
		this.dragCallback = callback;
		return this;
	}

	onDragEnd(callback: (() => any) | null): this {
		this.dragEndCallback = callback;
		return this;
	}

	/**
	 * Set the callback used when "Add rule" is selected.
	 */
	onAdd(callback: () => any): this {
		this.addCallback = callback;
		return this;
	}

	/**
	 * Set the callback used when "Duplicate rule" is selected.
	 */
	onDuplicate(callback: () => any): this {
		this.duplicateCallback = callback;
		return this;
	}

	/**
	 * Set the callback used to determine whether "Move to top" or "Move to bottom" are disabled.
	 * @param callback Return true to disable the action specified by `edge`.
	 */
	onEdgeCheck(callback: (edge: 'top' | 'bottom') => boolean): this {
		this.edgeCheckCallback = callback;
		return this;
	}

	/**
	 * Set the callback used when "Move to top" or "Move to bottom" are selected.
	 */
	onEdgeMove(callback: (edge: 'top' | 'bottom') => any): this {
		this.edgeMoveCallback = callback;
		return this;
	}

	/**
	 * Set the callback used when "Remove rule" is selected.
	 */
	onRemove(callback: () => any): this {
		this.removeCallback = callback;
		return this;
	}

	/**
	 * Show context menu for this rule.
	 */
	private showMenu(event: MouseEvent): void {
		navigator.vibrate?.(100); // Not supported on iOS
		const menu = new Menu();

		// Highlight rule until menu closes
		this.settingEl.addClass('has-active-menu');
		menu.onHide(() => activeWindow.requestAnimationFrame(() => {
			this.settingEl.removeClass('has-active-menu');
		}));

		// MENU ITEM: Add rule
		menu.addItem(item => { item
			.setIcon('lucide-plus')
			.setTitle(STRINGS.rulePicker.addRule)
			.setSection('action-primary')
			.onClick(() => this.addCallback?.());
		});

		// MENU ITEM: Duplicate rule
		menu.addItem(item => { item
			.setIcon('lucide-files')
			.setTitle(STRINGS.rulePicker.duplicateRule)
			.setSection('action-primary')
			.onClick(() => this.duplicateCallback?.());
		});

		// MENU ITEM: Move rule to top
		menu.addItem(item => { item
			.setIcon('lucide-arrow-up-to-line')
			.setTitle(STRINGS.rulePicker.moveRuleToTop)
			.setSection('move')
			.onClick(() => this.edgeMoveCallback?.('top'))
			.setDisabled(this.edgeCheckCallback?.('top') === true);
		});

		// MENU ITEM: Move rule to bottom
		menu.addItem(item => { item
			.setIcon('lucide-arrow-down-to-line')
			.setTitle(STRINGS.rulePicker.moveRuleToBottom)
			.setSection('move')
			.onClick(() => this.edgeMoveCallback?.('bottom'))
			.setDisabled(this.edgeCheckCallback?.('bottom') === true);
		});

		// MENU ITEM: Remove rule
		menu.addItem(item => { item
			.setIcon('lucide-trash-2')
			.setTitle(STRINGS.rulePicker.removeRule)
			.setSection('danger')
			.onClick(() => this.removeCallback?.());
			// @ts-expect-error (Private API)
			item.dom?.addClass?.('is-warning');
		});

		menu.showAtMouseEvent(event);
	}

	/**
	 * Toggle an element to content-editing mode.
	 */
	toggleEditable(el: HTMLElement, value: boolean): void {
		if (value) {
			el.contentEditable = 'true';
		} else {
			el.removeAttribute('contenteditable');
		}
		// Select text if element isn't focused already
		if (value && el !== el.doc.activeElement) {
			const range = el.doc.createRange();
			const selection = el.win.getSelection();
			range.selectNodeContents(el);
			selection?.removeAllRanges();
			selection?.addRange(range);
		}
	}
}
