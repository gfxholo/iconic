import { Menu, Modal, Setting } from 'obsidian';
import IconicPlugin, { Category, Icon, Item, STRINGS } from 'src/IconicPlugin';
import ColorUtils from 'src/ColorUtils';
import { RuleItem } from 'src/managers/RuleManager';
import IconManager from 'src/managers/IconManager';
import RuleSetting from 'src/components/RuleSetting';

/**
 * Exposes private methods as public for use by {@link RulePicker}.
 */
export class RulePickerManager extends IconManager {
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
