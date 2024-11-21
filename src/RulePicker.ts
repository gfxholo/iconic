import { Modal, Setting } from 'obsidian';
import IconicPlugin, { Icon, Item, STRINGS } from './IconicPlugin';
import { RulePage, RuleItem } from './RuleManager';
import IconManager from './IconManager';
import IconPicker from './IconPicker';
import ColorUtils from './ColorUtils';

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
	 * Not used by {@link RulePicker}.
	 */
	refreshIcons(): void {}

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

		// Allow hotkeys in rule picker
		for (const command of this.plugin.commands) if (command.callback) {
			// @ts-expect-error (Private API)
			const hotkeys: Hotkey[] = this.app.hotkeyManager?.customKeys?.[command.id] ?? [];
			for (const hotkey of hotkeys) {
				this.scope.register(hotkey.modifiers, hotkey.key, command.callback);
			}
		}
	}

	static open(plugin: IconicPlugin): void {
		new RulePicker(plugin).open();
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
				.onChange(value => {
					switch (value) {
						case 'file': dialogState.rulePage = value; break;
						case 'folder': dialogState.rulePage = value; break;
					}
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
			this.appendRule(rule);
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
			this.appendRule(rule);
		}
	}

	/**
	 * Append a given rule to the page.
	 */
	private appendRule(rule: RuleItem, isNewRule?: boolean): void {
		const ruleSetting = new RuleSetting(
			this.contentEl,
			this.plugin,
			this.iconManager,
			this.plugin.settings.dialogState.rulePage,
			rule,
			isNewRule,
		);
		this.ruleEls.push(ruleSetting.settingEl);

		// Move the Add Rule button below this rule
		ruleSetting.settingEl.insertAdjacentElement('afterend', this.addRuleSetting.settingEl);
	}

	/**
	 * Create new rule and append it to the current page.
	 */
	private addRule(): void {
		const newRule = this.plugin.ruleManager.newRule(this.plugin.settings.dialogState.rulePage);
		this.appendRule(newRule, true);
		this.addRuleSetting.settingEl.scrollIntoView({ behavior: 'smooth' });
	}

	/**
	 * @override
	 */
	onClose(): void {
		this.contentEl.empty();
		this.plugin.saveSettings(); // Save any changes to dialogState
	}
}

/**
 * Setting for displaying a rule item.
 */
class RuleSetting extends Setting {
	constructor(
		containerEl: HTMLElement,
		plugin: IconicPlugin,
		iconManager: RulePickerManager,
		page: RulePage,
		rule: RuleItem,
		isNewRule = false,
	) {
		super(containerEl);
		this.settingEl.addClass('iconic-rule');

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
				plugin.ruleManager.saveRule(page, rule);
			}));
			iconManager.refreshIcon({
				icon: rule.icon ?? plugin.ruleManager.getPageIcon(page),
				color: rule.color,
			}, button.extraSettingsEl);
			button.extraSettingsEl.addClass('iconic-rule-icon');
			this.settingEl.prepend(button.extraSettingsEl); // Move button to left side
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
		if (isNewRule) this.toggleEditable(this.nameEl, true);

		// BUTTON: Edit rule
		this.addExtraButton(button => { button
			.setIcon('lucide-settings')
			.setTooltip(STRINGS.rulePicker.editRule);
		});

		// TOGGLE: Enable/disable rule
		this.addToggle(toggle => { toggle
			.setValue(rule.enabled)
			.onChange(value => {
				rule.enabled = value;
				plugin.ruleManager.saveRule(page, rule);
			});
		});

		// BUTTON: Drag handle
		this.addExtraButton(button => { button
			.setIcon('lucide-menu')
			.setTooltip(STRINGS.rulePicker.drag)
			.extraSettingsEl.addClass('iconic-drag');
		});
	}

	/**
	 * Toggle an element to content-editing mode.
	 */
	private toggleEditable(el: HTMLElement, value: boolean) {
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
