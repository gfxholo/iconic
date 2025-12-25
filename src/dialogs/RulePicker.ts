import { Modal, Setting } from 'obsidian';
import IconicPlugin, { Category, Icon, Item, STRINGS } from 'src/IconicPlugin';
import ColorUtils from 'src/ColorUtils';
import { RuleItem } from 'src/managers/RuleManager';
import IconManager from 'src/managers/IconManager';
import IconPicker from 'src/dialogs/IconPicker';
import RuleEditor from 'src/dialogs/RuleEditor';
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
	private scrollerEl: HTMLElement;

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
		new Setting(this.contentEl).setHeading()
			.setName(STRINGS.rulePicker.rules)
			.addExtraButton(button => button
				.setIcon('lucide-plus')
				.setTooltip(STRINGS.rulePicker.addRule)
				.onClick(() => this.newRule())
			);

		// LIST: Rules
		const rules: RuleItem[] = [];
		switch (dialogState.rulePage) {
			case 'file': rules.push(...this.plugin.ruleManager.getRules(dialogState.rulePage)); break;
			case 'folder': rules.push(...this.plugin.ruleManager.getRules(dialogState.rulePage)); break;
		}
		this.scrollerEl = this.modalEl.createDiv({ cls: 'iconic-scroller' });
		for (const rule of rules) {
			this.insertRule(rule, this.scrollerEl.childElementCount);
		}
	}

	/**
	 * Display a given page of rules.
	 */
	private refreshRules(): void {
		this.scrollerEl.empty();
		for (const rule of this.plugin.ruleManager.getRules(this.plugin.settings.dialogState.rulePage)) {
			this.insertRule(rule, this.scrollerEl.childElementCount);
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
		const ruleSetting = new RuleSetting(this.scrollerEl, rule);
		const { settingEl, gripEl } = ruleSetting;

		// Set icon
		this.iconManager.refreshIcon(rule, ruleSetting.iconEl);

		// Set callbacks
		ruleSetting.onRename(name => {
			rule.name = name;
			const isRulingChanged = this.plugin.ruleManager.saveRule(page, rule);
			if (isRulingChanged) this.plugin.refreshManagers(page);
		})
		.onToggle(enabled => {
			rule.enabled = enabled;
			const isRulingChanged = this.plugin.ruleManager.saveRule(page, rule);
			if (isRulingChanged) this.plugin.refreshManagers(page);
		})
		.onIconClick(() => {
			IconPicker.openSingle(this.plugin, rule, (newIcon, newColor) => {
				this.iconManager.refreshIcon({
					icon: newIcon ?? this.plugin.ruleManager.getPageIcon(page),
					color: newColor,
				}, ruleSetting.iconEl);
				rule.icon = newIcon;
				rule.color = newColor;
				const isRulingChanged = this.plugin.ruleManager.saveRule(page, rule);
				if (isRulingChanged) this.plugin.refreshManagers(page);
			});
		})
		.onEditClick(() => {
			RuleEditor.open(this.plugin, page, rule, newRule => {
				let isRulingChanged;
				if (newRule) {
					rule = newRule;
					ruleSetting.setName(newRule.name);
					this.iconManager.refreshIcon({
						icon: newRule.icon ?? this.plugin.ruleManager.getPageIcon(page),
						color: newRule.color,
					}, ruleSetting.iconEl);
					ruleSetting.toggle.setValue(newRule.enabled);
					isRulingChanged = this.plugin.ruleManager.saveRule(page, newRule);
				} else {
					settingEl.remove();
					isRulingChanged = this.plugin.ruleManager.deleteRule(page, rule.id);
				}
				if (isRulingChanged) this.plugin.refreshManagers(page);
			})
		})
		.onAdd(() => {
			const atIndex = this.scrollerEl.indexOf(settingEl);
			this.newRule(atIndex);
		})
		.onDuplicate(() => {
			const page = this.plugin.settings.dialogState.rulePage;
			const duplicateRule = this.plugin.ruleManager.duplicateRule(page, rule);
			const index = this.scrollerEl.indexOf(settingEl) + 1;
			this.insertRule(duplicateRule, index);
		})
		.onEdgeCheck(edge => {
			switch (edge) {
				case 'top': return settingEl === this.scrollerEl.firstElementChild;
				case 'bottom': return settingEl === this.scrollerEl.lastElementChild;
			}
		})
		.onEdgeMove(edge => {
			const toIndex = edge === 'top' ? 0 : this.scrollerEl.childElementCount;
			if (edge === 'top') {
				this.scrollerEl.firstElementChild?.before(settingEl);
			} else {
				this.scrollerEl.lastElementChild?.after(settingEl);
			}
			const isRulingChanged = this.plugin.ruleManager.moveRule(page, rule, toIndex);
			if (isRulingChanged) this.plugin.refreshManagers(page);
		})
		.onRemove(() => {
			settingEl.remove();
			const isRulingChanged = this.plugin.ruleManager.deleteRule(page, rule.id);
			if (isRulingChanged) this.plugin.refreshManagers(page);
		})
		.onDragStart((x, y) => {
			navigator.vibrate?.(100); // Not supported on iOS
			// Get bounding rectangles
			const settingRect = settingEl.getBoundingClientRect();
			const gripRect = gripEl.getBoundingClientRect();
			// Create drag ghost
			ruleSetting.ghostRuleEl = this.modalEl.doc.body.createDiv({ cls: ['drag-reorder-ghost', 'iconic-rule-dragger'] });
			ruleSetting.ghostRuleEl.setCssStyles({
				width: settingRect.width + 'px',
				height: settingRect.height + 'px',
				left: x - (gripRect.x - settingRect.x) - (gripRect.width / 2) + 'px',
				top: y - settingRect.height / 2 + 'px',
			});
			ruleSetting.ghostRuleEl.appendChild(settingEl.cloneNode(true));
			// Display drop zone effect
			settingEl.addClass('drag-ghost-hidden');
			// Hack to hide the browser-native drag ghost
			settingEl.style.opacity = '0%';
			activeWindow.requestAnimationFrame(() => settingEl.style.removeProperty('opacity'));
		})
		.onDrag((x, y) => {
			// Ignore initial (0, 0) event
			if (x === 0 && y === 0) return;
			// Get bounding rectangles
			const settingRect = settingEl.getBoundingClientRect();
			const gripRect = gripEl.getBoundingClientRect();
			// Update ghost position
			ruleSetting.ghostRuleEl?.setCssStyles({
				left: x - (gripRect.x - settingRect.x) - (gripRect.width / 2) + 'px',
				top: y - settingRect.height / 2 + 'px',
			});
			// Get position in list
			const index = this.scrollerEl.indexOf(settingEl);
			// If ghost is dragged into rule above, swap the rules
			const prevRuleEl = this.scrollerEl.children[index - 1];
			const prevOverdrag = prevRuleEl?.clientHeight * 0.25 || 0;
			if (prevRuleEl && y < prevRuleEl.getBoundingClientRect().bottom - prevOverdrag) {
				navigator.vibrate?.(100); // Not supported on iOS
				prevRuleEl.before(settingEl);
			}
			// If ghost is dragged into rule below, swap the rules
			const nextRuleEl = this.scrollerEl.children[index + 1];
			const nextOverdrag = nextRuleEl?.clientHeight * 0.25 || 0;
			if (nextRuleEl && y > nextRuleEl.getBoundingClientRect().top + nextOverdrag) {
				navigator.vibrate?.(100); // Not supported on iOS
				nextRuleEl.after(settingEl);
			}
		})
		.onDragEnd(() => {
			ruleSetting.ghostRuleEl?.remove();
			ruleSetting.ghostRuleEl = null;
			settingEl.removeClass('drag-ghost-hidden');
			settingEl.removeAttribute('draggable');
			// Save rule position
			const toIndex = this.scrollerEl.indexOf(settingEl);
			if (toIndex > -1) {
				const isRulingChanged = this.plugin.ruleManager.moveRule(page, rule, toIndex);
				if (isRulingChanged) this.plugin.refreshManagers(page);
			}
		});

		// Insert rule into DOM
		this.scrollerEl.childNodes[index]?.before(settingEl);
		if (isNewRule) ruleSetting.toggleEditable(ruleSetting.nameEl, true);
	}

	/**
	 * Create new rule and insert it onto the page at a specific index.
	 * @param index Index to create the rule at. If undefined or negative, append rule to the bottom.
	 */
	private newRule(index?: number): void {
		const page = this.plugin.settings.dialogState.rulePage;
		const newRule = this.plugin.ruleManager.newRule(page);

		if (index !== undefined && index >= 0) {
			this.plugin.ruleManager.moveRule(page, newRule, index);
			this.insertRule(newRule, index, true);
		} else {
			index = this.scrollerEl.childElementCount;
			this.insertRule(newRule, index, true);
			this.scrollerEl.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
		}
	}

	/**
	 * @override
	 */
	onClose(): void {
		this.contentEl.empty();
		this.iconManager.stopEventListeners();
		this.iconManager.stopMutationObservers();
		// Clean up any drag ghosts left hanging when dialog is closed
		for (const ghostEl of this.modalEl.doc.body.findAll(':scope > .iconic-rule-dragger')) {
			ghostEl.remove();
		}
		this.plugin.saveSettings(); // Save any changes to dialogState
	}
}
