import { ExtraButtonComponent, Menu, Modal, Setting, ToggleComponent } from 'obsidian';
import IconicPlugin, { Category, Icon, Item, STRINGS } from 'src/IconicPlugin';
import ColorUtils from 'src/ColorUtils';
import { RuleItem } from 'src/managers/RuleManager';
import IconManager from 'src/managers/IconManager';
import RuleEditor from 'src/dialogs/RuleEditor';
import IconPicker from 'src/dialogs/IconPicker';

/**
 * Exposes private methods as public for use by {@link RulePicker}.
 */
class RulePickerManager extends IconManager {
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

export default class RulePicker extends Modal {
	private readonly plugin: IconicPlugin;
	private readonly iconManager: RulePickerManager;

	// Components
	private readonly ruleEls: HTMLElement[] = [];
	private addRuleSetting: Setting;

	private constructor(plugin: IconicPlugin) {
		super(plugin.app);
		this.plugin = plugin;
		this.iconManager = new RulePickerManager(plugin);

		// Allow hotkeys in dialog
		for (const command of this.plugin.dialogCommands) if (command.callback) {
			// @ts-expect-error (Private API)
			const hotkeys: Hotkey[] = this.app.hotkeyManager?.customKeys?.[command.id] ?? [];
			for (const hotkey of hotkeys) {
				this.scope.register(hotkey.modifiers, hotkey.key, command.callback);
			}
		}
	}

	static open(plugin: IconicPlugin): void {
		// Silently no-op if rulebook hasn't finished loading
		if (plugin.ruleManager) new RulePicker(plugin).open();
	}

	/**
	 * @override
	 */
	onOpen(): void {
		const { dialogState } = this.plugin.settings;
		this.containerEl.addClass('mod-confirmation');
		this.modalEl.addClass('iconic-rule-picker');
		this.setTitle(STRINGS.settings.rulebook.name);

		// DROPDOWN: Select a page
		new Setting(this.contentEl)
			.setName(STRINGS.rulePicker.selectPage)
			.addDropdown(dropdown => { dropdown
				.addOptions({
					file: STRINGS.rulePicker.fileRules,
					folder: STRINGS.rulePicker.folderRules,
				})
				.onChange((value: Category) => {
					dialogState.rulePage = value;
					this.refreshRules();
				})
				.setValue(dialogState.rulePage);
			});

		// HEADING: Rules
		new Setting(this.contentEl).setHeading().setName(STRINGS.rulePicker.rules);

		// BUTTON: Add rule
		this.addRuleSetting = new Setting(this.contentEl).addExtraButton(button => { button
			.setIcon('lucide-circle-plus')
			.setTooltip(STRINGS.rulePicker.addRule)
			.onClick(() => this.addRule())
			.extraSettingsEl.style.color = ColorUtils.toRgb('green');
		});
		this.addRuleSetting.settingEl.addClass('iconic-add');
		this.addRuleSetting.infoEl.remove();

		// LIST: Rules
		const rules: RuleItem[] = [];
		switch (dialogState.rulePage) {
			case 'file': rules.push(...this.plugin.ruleManager.getRules(dialogState.rulePage)); break;
			case 'folder': rules.push(...this.plugin.ruleManager.getRules(dialogState.rulePage)); break;
		}
		for (const rule of rules) {
			this.insertRule(rule, this.ruleEls.length);
		}
	}

	/**
	 * Display a given page of rules.
	 */
	private refreshRules(): void {
		for (const ruleEl of this.ruleEls) {
			ruleEl.remove();
		}
		this.ruleEls.length = 0;
		for (const rule of this.plugin.ruleManager.getRules(this.plugin.settings.dialogState.rulePage)) {
			this.insertRule(rule, this.ruleEls.length);
		}
	}

	/**
	 * Insert a given rule onto the page at a specific index.
	 * @param rule The rule backing this row.
	 * @param index Index to insert the rule at.
	 * @param isNewRule Whether to highlight the rule name after creation.
	 */
	insertRule(rule: RuleItem, index: number, isNewRule?: boolean): void {
		const page = this.plugin.settings.dialogState.rulePage;
		const ruleSetting = new RuleSetting(
			this.contentEl,
			this.plugin,
			this.iconManager,
			page,
			rule,
			this.ruleEls,
			(rule, index) => this.insertRule(rule, index),
			() => this.plugin.refreshManagers(page),
		);

		// Insert rule into DOM
		this.ruleEls[index]?.insertAdjacentElement('beforebegin', ruleSetting.settingEl);
		if (isNewRule) ruleSetting.toggleEditable(ruleSetting.nameEl, true);

		// Insert rule into array
		this.ruleEls.splice(index, 0, ruleSetting.settingEl);

		// Register context menu
		this.iconManager.setEventListener(ruleSetting.settingEl, 'contextmenu', event => {
			navigator.vibrate?.(100); // Not supported on iOS
			const menu = new Menu();

			// Highlight the selected rule
			ruleSetting.settingEl.addClass('has-active-menu');
			menu.onHide(() => ruleSetting.settingEl.win.requestAnimationFrame(() => {
				ruleSetting.settingEl.removeClass('has-active-menu');
			}));

			// MENU ITEM: Add rule
			menu.addItem(item => { item
				.setIcon('lucide-plus-circle')
				.setTitle(STRINGS.rulePicker.addRule)
				.setSection('action-primary')
				.onClick(() => this.addRule(this.ruleEls.indexOf(ruleSetting.settingEl)));
			});

			// MENU ITEM: Duplicate rule
			menu.addItem(item => { item
				.setIcon('lucide-files')
				.setTitle(STRINGS.rulePicker.duplicateRule)
				.setSection('action-primary')
				.onClick(() => ruleSetting.duplicateRule());
			});

			// MENU ITEM: Move rule to top
			menu.addItem(item => { item
				.setIcon('lucide-arrow-up-to-line')
				.setTitle(STRINGS.rulePicker.moveRuleToTop)
				.setSection('move')
				.onClick(() => ruleSetting.moveRule(0))
				.setDisabled(ruleSetting.settingEl === this.ruleEls.first());
			});

			// MENU ITEM: Move rule to bottom
			menu.addItem(item => { item
				.setIcon('lucide-arrow-down-to-line')
				.setTitle(STRINGS.rulePicker.moveRuleToBottom)
				.setSection('move')
				.onClick(() => ruleSetting.moveRule(this.ruleEls.length))
				.setDisabled(ruleSetting.settingEl === this.ruleEls.last());
			});

			// MENU ITEM: Remove rule
			menu.addItem(item => { item
				.setIcon('lucide-trash-2')
				.setTitle(STRINGS.rulePicker.removeRule)
				.setSection('danger')
				.onClick(() => ruleSetting.deleteRule());
				// @ts-expect-error (Private API)
				item.dom?.addClass?.('is-warning');
			});

			menu.showAtMouseEvent(event);
		});

		// Move the Add Rule button to the bottom
		this.contentEl.append(this.addRuleSetting.settingEl);
	}

	/**
	 * Create new rule and insert it onto the page at a specific index.
	 * @param index Index to create the rule at. If undefined or negative, append rule to the bottom.
	 */
	private addRule(index?: number): void {
		const page = this.plugin.settings.dialogState.rulePage;
		const newRule = this.plugin.ruleManager.newRule(page);

		if (index !== undefined && index >= 0) {
			this.plugin.ruleManager.moveRule(page, newRule, index);
			this.insertRule(newRule, index, true);
		} else {
			index = this.ruleEls.length;
			this.insertRule(newRule, index, true);
			this.addRuleSetting.settingEl.scrollIntoView({ behavior: 'smooth' });
		}
	}

	/**
	 * @override
	 */
	onClose(): void {
		this.ruleEls.length = 0;
		this.contentEl.empty();
		this.iconManager.stopEventListeners();
		this.iconManager.stopMutationObservers();
		// Clean up any drag ghosts left hanging when dialog is closed
		for (const ghostEl of activeDocument.body.findAll(':scope > .drag-reorder-ghost')) {
			ghostEl.remove();
		}
		this.plugin.saveSettings(); // Save any changes to dialogState
	}
}

/**
 * Setting for displaying a rule item.
 */
class RuleSetting extends Setting {
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
