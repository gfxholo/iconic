import { ExtraButtonComponent, Setting, ToggleComponent } from 'obsidian';
import IconicPlugin, { Category, STRINGS } from 'src/IconicPlugin';
import { RuleItem } from 'src/managers/RuleManager';
import IconPicker from 'src/dialogs/IconPicker';
import RuleEditor from 'src/dialogs/RuleEditor';
import { RulePickerManager } from 'src/dialogs/RulePicker';

/**
 * Setting for displaying a rule item.
 */
export default class RuleSetting extends Setting {
	private readonly plugin: IconicPlugin;
	private readonly page: Category;
	private readonly rule: RuleItem;

	// Components
	private readonly ruleEls: HTMLElement[];
	private ghostRuleEl: HTMLElement | undefined;

	// Callbacks
	private readonly onInsertRule: (rule: RuleItem, index: number) => void;
	private readonly onRulingChange: () => void;

	constructor(
		containerEl: HTMLElement,
		plugin: IconicPlugin,
		iconManager: RulePickerManager,
		page: Category,
		rule: RuleItem,
		ruleEls: HTMLElement[],
		onInsertRule: (rule: RuleItem, index: number) => void,
		onRulingChange: () => void,
	) {
		super(containerEl);
		this.plugin = plugin;
		this.page = page;
		this.rule = rule;
		this.ruleEls = ruleEls;
		this.onInsertRule = onInsertRule;
		this.onRulingChange = onRulingChange;
		this.settingEl.addClass('iconic-rule');

		// Components
		let iconButton: ExtraButtonComponent;
		let ruleToggle: ToggleComponent;

		// BUTTON: Rule icon
		this.addExtraButton(button => { button
			.setTooltip(STRINGS.iconPicker.changeIcon)
			.onClick(() => IconPicker.openSingle(plugin, rule, (newIcon, newColor) => {
				iconManager.refreshIcon({
					icon: newIcon ?? plugin.ruleManager.getPageIcon(page),
					color: newColor,
				}, button.extraSettingsEl);
				rule.icon = newIcon;
				rule.color = newColor;
				const isRulingChanged = plugin.ruleManager.saveRule(page, rule);
				if (isRulingChanged) this.onRulingChange();
			}));
			iconManager.refreshIcon({
				icon: rule.icon ?? plugin.ruleManager.getPageIcon(page),
				color: rule.color,
			}, button.extraSettingsEl);
			button.extraSettingsEl.addClass('iconic-rule-icon');
			this.settingEl.prepend(button.extraSettingsEl); // Move button to left side
			iconButton = button;
		});

		// FIELD: Rule name
		this.setName(rule.name);
		this.nameEl.addClass('iconic-rule-name');
		// Edit name when clicked
		iconManager.setEventListener(this.nameEl, 'click', () => this.toggleEditable(this.nameEl, true));
		// Save name when focus is lost
		iconManager.setEventListener(this.nameEl, 'blur', () => {
			this.toggleEditable(this.nameEl, false);
			if (this.nameEl.getText()) {
				rule.name = this.nameEl.getText();
				plugin.ruleManager.saveRule(page, rule);
			} else {
				this.nameEl.setText(rule.name); // Prevent untitled rules
			}
		});
		iconManager.setEventListener(this.nameEl, 'keydown', event => {
			if (event.key === 'Enter') this.nameEl.blur();
		});

		// BUTTON: Edit rule
		this.addExtraButton(button => { button
			.setIcon('lucide-settings')
			.setTooltip(STRINGS.rulePicker.editRule)
			.onClick(() => RuleEditor.open(plugin, page, rule, newRule => {
				let isRulingChanged;
				if (newRule) {
					rule = newRule;
					this.setName(newRule.name);
					iconManager.refreshIcon({
						icon: newRule.icon ?? plugin.ruleManager.getPageIcon(page),
						color: newRule.color,
					}, iconButton.extraSettingsEl);
					ruleToggle.setValue(newRule.enabled);
					isRulingChanged = plugin.ruleManager.saveRule(page, newRule);
				} else {
					this.settingEl.remove();
					this.ruleEls.remove(this.settingEl);
					isRulingChanged = plugin.ruleManager.deleteRule(page, rule.id);
				}
				if (isRulingChanged) this.onRulingChange();
			}));
		});

		// TOGGLE: Enable/disable rule
		this.addToggle(toggle => { toggle
			.setValue(rule.enabled)
			.onChange(value => {
				rule.enabled = value;
				const isRulingChanged = plugin.ruleManager.saveRule(page, rule);
				if (isRulingChanged) this.onRulingChange();
			});
			ruleToggle = toggle;
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
	}

	/**
	 * Duplicate rule and insert the new one below.
	 */
	duplicateRule(): void {
		const page = this.plugin.settings.dialogState.rulePage;
		const duplicateRule = this.plugin.ruleManager.duplicateRule(page, this.rule);
		const index = this.ruleEls.indexOf(this.settingEl) + 1;
		this.onInsertRule(duplicateRule, index);
	}

	/**
	 * Move rule (and its setting element) within the current page.
	 * @param toIndex Index to move the rule to.
	 */
	moveRule(toIndex: number): void {
		if (toIndex < this.ruleEls.length) {
			this.ruleEls[toIndex]?.insertAdjacentElement('beforebegin', this.settingEl);
		} else {
			this.ruleEls.last()?.insertAdjacentElement('afterend', this.settingEl);
		}
		this.ruleEls[toIndex]?.insertAdjacentElement('beforebegin', this.settingEl);
		this.ruleEls.remove(this.settingEl);
		this.ruleEls.splice(toIndex, 0, this.settingEl);
		const isRulingChanged = this.plugin.ruleManager.moveRule(this.page, this.rule, toIndex);
		if (isRulingChanged) this.plugin.refreshManagers(this.page);
	}

	/**
	 * Delete rule (and its setting element) from the current page.
	 */
	deleteRule(): void {
		this.settingEl.remove();
		this.ruleEls.remove(this.settingEl);
		const isRulingChanged = this.plugin.ruleManager.deleteRule(this.page, this.rule.id);
		if (isRulingChanged) this.plugin.refreshManagers(this.page);
	}

	private onDragStart(x: number, y: number, dragButtonEl: HTMLElement): void {
		navigator.vibrate?.(100); // Not supported on iOS
		// Create drag ghost
		this.ghostRuleEl = activeDocument.body.createDiv({ cls: 'drag-reorder-ghost' });
		this.ghostRuleEl.setCssStyles({
			width: this.settingEl.clientWidth + 'px',
			height: this.settingEl.clientHeight + 'px',
			left: activeDocument.body.hasClass('mod-rtl')
				? x - dragButtonEl.clientWidth / 2 + 'px'
				: x - this.settingEl.clientWidth + dragButtonEl.clientWidth / 2 + 'px',
			top: y - this.settingEl.clientHeight / 2 + 'px',
		});
		this.ghostRuleEl.appendChild(this.settingEl.cloneNode(true));
		// Display drop zone effect
		this.settingEl.addClass('drag-ghost-hidden');
		// Hack to hide the browser-native drag ghost
		this.settingEl.style.opacity = '0%';
		activeWindow.requestAnimationFrame(() => this.settingEl.style.removeProperty('opacity'));
	}

	private onDrag(x: number, y: number, dragButtonEl: HTMLElement): void {
		// Ignore initial (0, 0) event
		if (x === 0 && y === 0) return;
		// Update ghost position
		this.ghostRuleEl?.setCssStyles({
			left: activeDocument.body.hasClass('mod-rtl')
				? x - dragButtonEl.clientWidth / 2 + 'px'
				: x - this.settingEl.clientWidth + dragButtonEl.clientWidth / 2 + 'px',
			top: y - this.settingEl.clientHeight / 2 + 'px',
		});
		// Get position in list
		const index = this.ruleEls.indexOf(this.settingEl);
		// If ghost is dragged into rule above, swap the rules
		const prevRuleEl = this.ruleEls[index - 1];
		const prevOverdrag = prevRuleEl?.clientHeight * 0.25 || 0;
		if (prevRuleEl && y < prevRuleEl.getBoundingClientRect().bottom - prevOverdrag) {
			navigator.vibrate?.(100); // Not supported on iOS
			prevRuleEl.insertAdjacentElement('beforebegin', this.settingEl);
			this.ruleEls.splice(index, 1);
			this.ruleEls.splice(index - 1, 0, this.settingEl);
		}
		// If ghost is dragged into rule below, swap the rules
		const nextRuleEl = this.ruleEls[index + 1];
		const nextOverdrag = nextRuleEl?.clientHeight * 0.25 || 0;
		if (nextRuleEl && y > nextRuleEl.getBoundingClientRect().top + nextOverdrag) {
			navigator.vibrate?.(100); // Not supported on iOS
			nextRuleEl.insertAdjacentElement('afterend', this.settingEl);
			this.ruleEls.splice(index, 1);
			this.ruleEls.splice(index + 1, 0, this.settingEl);
		}
	}

	private onDragEnd(): void {
		this.ghostRuleEl?.remove();
		delete this.ghostRuleEl;
		this.settingEl.removeClass('drag-ghost-hidden');
		this.settingEl.removeAttribute('draggable');
		// Save rule position
		const toIndex = this.ruleEls.indexOf(this.settingEl);
		if (toIndex > -1) this.plugin.ruleManager.moveRule(this.page, this.rule, toIndex);
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
		if (value && el !== activeDocument.activeElement) {
			const range = activeDocument.createRange();
			const selection = activeWindow.getSelection();
			range.selectNodeContents(el);
			selection?.removeAllRanges();
			selection?.addRange(range);
		}
	}
}
