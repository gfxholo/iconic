import { ButtonComponent, Hotkey, Modal, Platform, Setting } from 'obsidian';
import IconicPlugin, { Category, Item, ICONS, EMOJIS, STRINGS } from 'src/IconicPlugin.js';
import { RuleItem } from 'src/managers/RuleManager.js';
import RuleEditor from 'src/dialogs/RuleEditor.js';
import CalloutComponent from 'src/components/CalloutComponent.js';
import IconColorComponent from 'src/components/IconColorComponent.js';
import IconColorResetComponent from 'src/components/IconColorResetComponent.js';
import IconSearchComponent, { IconSearchResult } from 'src/components/IconSearchComponent.js';
import IconSearchResultsSetting from 'src/components/IconSearchResultsSetting.js';
import ToggleButtonComponent from 'src/components/ToggleButtonComponent.js';
import ExternalLibraryManager from 'src/managers/ExternalLibraryManager.js';

/**
 * Callback for setting icon & color of a single item.
 */
export interface IconPickerCallback {
	(icon: string | null, color: string | null): void;
}

/**
 * Callback for setting icons & colors of multiple items at once.
 */
export interface MultiIconPickerCallback {
	(icon: string | null | undefined, color: string | null | undefined): void;
}

/**
 * Dialog for changing icons & colors of single/multiple items.
 */
export default class IconPicker extends Modal {
	private readonly plugin: IconicPlugin;

	// Item
	private readonly items: Item[];
	private readonly icon: string | null | undefined;
	private color: string | null | undefined;
	private readonly callback: IconPickerCallback | null;
	private readonly multiCallback: MultiIconPickerCallback | null;

	// Components
	private overruleCallout!: CalloutComponent;
	private searchSetting!: Setting;
	private resultsSetting!: IconSearchResultsSetting;
	private resetButton!: IconColorResetComponent;
	private colorPicker!: IconColorComponent;
	private searchField!: IconSearchComponent;

	// State
	private searchResults: IconSearchResult[] = [];

	private constructor(
		plugin: IconicPlugin,
		items: Item[],
		callback: IconPickerCallback | null,
		multiCallback: MultiIconPickerCallback | null,
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.items = items;
		const firstItem = this.items.first();
		if (firstItem) {
			this.icon = this.items.every(item => item.icon === firstItem.icon) ? firstItem.icon : undefined;
			this.color = this.items.every(item => item.color === firstItem.color) ? firstItem.color : undefined;
		}
		this.callback = callback;
		this.multiCallback = multiCallback;

		// Allow hotkeys in dialog
		for (const command of this.plugin.dialogCommands) if (command.callback) {
			// @ts-expect-error (Private API)
			const hotkeys: Hotkey[] = this.app.hotkeyManager?.customKeys?.[command.id] ?? [];
			for (const hotkey of hotkeys) {
				this.scope.register(hotkey.modifiers, hotkey.key, command.callback);
			}
		}

		// Navigation hotkeys
		this.scope.register(null, 'ArrowUp', event => this.nudgeFocus(event));
		this.scope.register(null, 'ArrowDown', event => this.nudgeFocus(event));
		this.scope.register(null, 'ArrowLeft', event => this.nudgeFocus(event));
		this.scope.register(null, 'ArrowRight', event => this.nudgeFocus(event));
		this.scope.register(null, 'Enter', event => this.confirmFocus(event));
		this.scope.register(null, ' ', event => this.confirmFocus(event));
		this.scope.register(null, 'Delete', event => this.deleteFocus(event));
		this.scope.register(null, 'Backspace', event => this.deleteFocus(event));
	}

	/**
	 * Nudge the focused element.
	 */
	private nudgeFocus(event: KeyboardEvent): void {
		if (!(event.target instanceof HTMLElement)) return;
		let focusEl: Element | null = null;

		switch (event.key) {
			case 'ArrowUp': this.colorPicker.previousColor; return;
			case 'ArrowDown': this.colorPicker.nextColor(); return;
			case 'ArrowLeft': {
				// Search results
				if (this.resultsSetting.settingEl.contains(event.target)) {
					if (event.target !== this.resultsSetting.settingEl && event.target.previousElementSibling) {
						focusEl = event.target.previousElementSibling;
					} else if (!event.repeat) {
						focusEl = this.resultsSetting.controlEl.lastElementChild;
					}
				}
				break;
			}
			case 'ArrowRight': {
				// Search results
				if (this.resultsSetting.settingEl.contains(event.target)) {
					if (event.target !== this.resultsSetting.settingEl && event.target.nextElementSibling) {
						focusEl = event.target.nextElementSibling;
					} else if (!event.repeat) {
						focusEl = this.resultsSetting.controlEl.firstElementChild;
					}
				}
			}
		}

		if (focusEl?.instanceOf(HTMLElement)) {
			event.preventDefault();
			focusEl.focus();
		}
	}

	/**
	 * Confirm the focused element.
	 */
	private confirmFocus(event: KeyboardEvent): void {
		if (!(event.target instanceof HTMLElement)) return;

		// Extra setting buttons
		if (event.target.hasClass('extra-setting-button')) {
			event.preventDefault();
			event.target.click();
		}
		// Color picker
		else if (event.target === this.colorPicker.colorEl) {
			event.preventDefault();
			const rect = this.colorPicker.colorEl.getBoundingClientRect();
			const x = rect.x + rect.width / 4;
			const y = rect.y + rect.height / 4;
			this.colorPicker.showColorOptions(x, y);
		}
		// Search field
		else if (event.target === this.searchField.inputEl && event.key === 'Enter') {
			const [firstResultIcon] = this.searchResults.first() ?? [];
			if (firstResultIcon) {
				event.preventDefault();
				this.closeAndSave(firstResultIcon, this.color);
			}
		}
	}

	/**
	 * Delete the focused element.
	 */
	private deleteFocus(event: KeyboardEvent): void {
		if (!(event.target instanceof HTMLElement)) return;

		// Anywhere except the search field
		if (event.target !== this.searchField.inputEl ) {
			if (event.target === this.resetButton.extraSettingsEl) this.colorPicker.colorEl?.focus();
			this.colorPicker.setColor(null);
		}
	}

	/**
	 * Open a dialog to change a single icon.
	 */
	static openSingle(plugin: IconicPlugin, item: Item, callback: IconPickerCallback): void {
		new IconPicker(plugin, [item], callback, null).open();
	}

	/**
	 * Open a dialog to change multiple icons at once.
	 */
	static openMulti(plugin: IconicPlugin, items: Item[], multiCallback: MultiIconPickerCallback): void {
		new IconPicker(plugin, items, null, multiCallback).open();
	}

	/**
	 * @override
	 */
	onOpen(): void {
		const { dialogState } = this.plugin.settings;
		this.containerEl.addClass('mod-confirmation');
		this.modalEl.addClass('iconic-icon-picker');
		this.setTitle(this.items.length === 1
			? STRINGS.iconPicker.changeIcon
			: STRINGS.iconPicker.changeIcons.replace('{#}', this.items.length.toString())
		);

		// CALLOUT: Overrule callout
		this.overruleCallout = new CalloutComponent(this.contentEl);
		this.updateOverruleCallout();

		// SETTING: Item name
		const showItemName = this.plugin.settings.showItemName === 'on'
			|| Platform.isDesktop && this.plugin.settings.showItemName === 'desktop'
			|| Platform.isMobile && this.plugin.settings.showItemName === 'mobile';
		if (showItemName) {
			const setting = new Setting(this.contentEl)
				.addText(itemNameField => itemNameField.setValue(this.items.map(item => item.name).join(', ')))
				.setDisabled(true);
			const firstItem = this.items.first();
			const category = firstItem && this.items.every(item => item.category === firstItem.category)
				? firstItem.category
				: null;
			if (this.items.length === 1) switch (category) {
				default: setting.setName(STRINGS.categories.item); break;
				case 'app': setting.setName(STRINGS.categories.appItem); break;
				case 'tab': setting.setName(STRINGS.categories.tab); break;
				case 'file': setting.setName(STRINGS.categories.file); break;
				case 'folder': setting.setName(STRINGS.categories.folder); break;
				case 'group': setting.setName(STRINGS.categories.group); break;
				case 'search': setting.setName(STRINGS.categories.search); break;
				case 'graph': setting.setName(STRINGS.categories.graph); break;
				case 'url': setting.setName(STRINGS.categories.url); break;
				case 'tag': setting.setName(STRINGS.categories.tag); break;
				case 'property': setting.setName(STRINGS.categories.property); break;
				case 'ribbon': setting.setName(STRINGS.categories.ribbonItem); break;
				case 'rule': setting.setName(STRINGS.categories.rule); break;
			} else switch (category) {
				default: setting.setName(STRINGS.categories.items); break;
				case 'app': setting.setName(STRINGS.categories.appItems); break;
				case 'tab': setting.setName(STRINGS.categories.tabs); break;
				case 'file': setting.setName(STRINGS.categories.files); break;
				case 'folder': setting.setName(STRINGS.categories.folders); break;
				case 'group': setting.setName(STRINGS.categories.groups); break;
				case 'search': setting.setName(STRINGS.categories.searches); break;
				case 'graph': setting.setName(STRINGS.categories.graphs); break;
				case 'url': setting.setName(STRINGS.categories.urls); break;
				case 'tag': setting.setName(STRINGS.categories.tags); break;
				case 'property': setting.setName(STRINGS.categories.properties); break;
				case 'ribbon': setting.setName(STRINGS.categories.ribbonItems); break;
				case 'rule': setting.setName(STRINGS.categories.rules); break;
			}
		}

		// SETTING: Search
		this.searchSetting = new Setting(this.contentEl)
			.addComponent(controlEl => new IconColorResetComponent(controlEl)
				.setTooltip(STRINGS.iconPicker.resetColor, { delay: 300 })
				.onClick(() => this.colorPicker.setColor(null))
				.then(component => {
					component.toggleVisibility(this.color !== null);
					this.resetButton = component;
				})
			)
			.addComponent(controlEl => new IconColorComponent(controlEl)
				.setColor(this.color ?? null)
				.setColorOptions({
					red: STRINGS.iconPicker.colors.red,
					orange: STRINGS.iconPicker.colors.orange,
					yellow: STRINGS.iconPicker.colors.yellow,
					green: STRINGS.iconPicker.colors.green,
					cyan: STRINGS.iconPicker.colors.cyan,
					blue: STRINGS.iconPicker.colors.blue,
					purple: STRINGS.iconPicker.colors.purple,
					pink: STRINGS.iconPicker.colors.pink,
					gray: STRINGS.iconPicker.colors.gray,
				})
				.onColorChange(color => {
					this.color = color;
					this.resetButton.toggleVisibility(color !== null)
					this.resultsSetting.setColor(color);
				})
				.then(component => {
					if (this.plugin.settings.colorPicker1 === 'list' || this.plugin.settings.colorPicker1 === 'rgb') {
						component.setPrimaryMode(this.plugin.settings.colorPicker1);
					}
					if (this.plugin.settings.colorPicker2 === 'list' || this.plugin.settings.colorPicker2 === 'rgb') {
						component.setSecondaryMode(this.plugin.settings.colorPicker2);
					}
					this.colorPicker = component;
				})
			)
			.addComponent(controlEl => new IconSearchComponent(controlEl)
				.setPlaceholder(STRINGS.iconPicker.searchIcons)
				.onSearch((query, results) => {
					// If query is blank, just show the current icon
					if (!query && this.icon) {
						const iconName = ICONS.get(this.icon)?.[0] ?? ExternalLibraryManager.getName(this.icon) ?? this.icon;
						void this.resultsSetting.setResults([[this.icon, iconName, [], 0]]);
						return;
					}
					void this.resultsSetting.setResults(results);
				})
				.then(component => this.searchField = component)
			);
		if (!Platform.isPhone) this.searchSetting.setName(STRINGS.iconPicker.search);

		// SETTING: Search results
		this.resultsSetting = new IconSearchResultsSetting(this.contentEl)
			.setLimit(this.plugin.settings.maxSearchResults)
			.setColor(this.color ?? null)
			.forEach((iconButton, [id, name, keywords]) => {
				const tooltip = name + '\n' + keywords.slice(0, 3).join(' • ');
				iconButton
					.onClick(() => this.closeAndSave(id, this.color))
					.setTooltip(tooltip, {
						delay: 300,
						placement: Platform.isMobile ? 'top' : undefined,
						classes: ['iconic-search-tooltip'],
					});
				// Set long-touch tooltips on mobile
				if (Platform.isMobile) {
					iconButton.onSecondaryClick(() => {
						navigator.vibrate?.(100); // Not supported on iOS
						iconButton.displayTooltip(tooltip, {
							placement: 'top',
							classes: ['iconic-search-tooltip'],
						});
					});
				}
			});

		// Auto-select the most useful mode
		if (this.icon) {
			if (ICONS.has(this.icon)) {
				dialogState.iconMode = true;
				this.searchField.setValue(ICONS.get(this.icon)?.[0] ?? '');
			} else if (EMOJIS.has(this.icon)) {
				dialogState.emojiMode = true;
				this.searchField.setValue(EMOJIS.get(this.icon)?.[0] ?? '');
			} else if (ExternalLibraryManager.isExternalIcon(this.icon)) {
				dialogState.iconMode = true;
				this.searchField.setValue(ExternalLibraryManager.getName(this.icon) ?? this.icon);
			} else {
				this.searchField.setValue(this.icon);
			}
		} else if (!dialogState.iconMode && !dialogState.emojiMode) {
			dialogState.iconMode = true;
		}
		this.searchField.setModes({
			iconMode: dialogState.iconMode,
			emojiMode: dialogState.emojiMode,
			keywordMode: this.plugin.isSettingEnabled('useSearchKeywords'),
		});

		// Match styling of bookmark edit dialog
		const buttonContainerEl = this.modalEl.createDiv({ cls: 'modal-button-container' });
		const removeContainerEl = Platform.isMobile ? buttonContainerEl.createDiv({ cls: 'iconic-button-row' }) : buttonContainerEl;
		const saveContainerEl = Platform.isPhone ? this.modalEl : buttonContainerEl;

		// BUTTON: Remove
		if (this.icon || this.color) {
			const removeEl = new ButtonComponent(removeContainerEl)
				.setButtonText(this.items.length === 1
					? STRINGS.menu.removeIcon
					: STRINGS.menu.removeIcons.replace('{#}', this.items.length.toString())
				)
				.onClick(() => this.closeAndSave(null, null))
				.buttonEl;
			removeEl.addClasses(Platform.isPhone
				? ['mod-warning']
				: ['mod-secondary', 'mod-destructive']
			);
		}

		// BUTTON: Toggle icons
		new ToggleButtonComponent(removeContainerEl)
			.setValue(dialogState.iconMode)
			.setTooltip(STRINGS.iconPicker.toggleIcons, { delay: 300, placement: 'top' })
			.setIcons('lucide-image', 'lucide-square')
			.setClass('iconic-mode-button')
			.onChange(on => {
				dialogState.iconMode = on;
				this.updateTitle();
				this.searchField.setModes({ iconMode: on });
			});

		// BUTTON: Toggle emojis
		new ToggleButtonComponent(removeContainerEl)
			.setValue(dialogState.emojiMode)
			.setTooltip(STRINGS.iconPicker.toggleEmojis, { delay: 300, placement: 'top' })
			.setIcons('lucide-smile', 'lucide-circle')
			.setClass('iconic-mode-button')
			.onChange(on => {
				dialogState.emojiMode = on;
				this.updateTitle();
				this.searchField.setModes({ emojiMode: on });
			});

		// BUTTON: Cancel
		new ButtonComponent(saveContainerEl)
			.setButtonText(STRINGS.iconPicker.cancel)
			.onClick(() => this.close())
			.buttonEl.addClasses(Platform.isPhone
				? ['modal-nav-action', 'mod-secondary']
				: ['mod-cancel']
			);

		// BUTTON: Save
		const saveEl = new ButtonComponent(saveContainerEl)
			.setButtonText(STRINGS.iconPicker.save)
			.onClick(() => this.closeAndSave(this.icon, this.color))
			.buttonEl;
		saveEl.addClasses(Platform.isPhone
			? ['modal-nav-action', 'mod-cta']
			: ['mod-cta']
		);

		// Hack to guarantee initial focus
		activeWindow.requestAnimationFrame(() => this.searchField.inputEl.select());
	}

	private updateTitle(): void {
		const { dialogState } = this.plugin.settings;
		const isSingular = this.items.length === 1;

		if (dialogState.iconMode && dialogState.emojiMode) {
			this.setTitle(isSingular
				? STRINGS.iconPicker.changeMix
				: STRINGS.iconPicker.changeMixes.replace('{#}', this.items.length.toString())
			);
		} else if (dialogState.emojiMode) {
			this.setTitle(isSingular
				? STRINGS.iconPicker.changeEmoji
				: STRINGS.iconPicker.changeEmojis.replace('{#}', this.items.length.toString())
			);
		} else {
			this.setTitle(isSingular
				? STRINGS.iconPicker.changeIcon
				: STRINGS.iconPicker.changeIcons.replace('{#}', this.items.length.toString())
			);
			this.searchField.setPlaceholder(STRINGS.iconPicker.searchIcons);
		}
	}

	/**
	 * Display a callout if this icon is currently overruled.
	 */
	private updateOverruleCallout(): void {
		let page: Category;
		let rule: RuleItem | null = null;

		// Determine which rule to display
		if (this.items.length > 1) {
			for (const item of this.items) {
				rule = this.plugin.ruleManager?.checkRuling(item.category, item.id) ?? null;
				page = item.category;
				if (rule) break;
			}
		} else {
			const item = this.items.first();
			if (item) {
				rule = this.plugin.ruleManager?.checkRuling(item.category, item.id) ?? null;
				page = item.category;
			}
		}

		// Hide callout if nothing is overruling this icon
		if (rule) {
			this.overruleCallout.setVisibility(true);
		} else {
			this.overruleCallout.setVisibility(false);
			return;
		}

		// If multiple items are being edited, display a non-specific message
		if (this.items.length > 1) {
			this.overruleCallout
				.setIcon('lucide-book-image')
				.setColor(null)
				.setTitle(STRINGS.iconPicker.overrules);
		// Else, display a clickable link to the specific rule
		} else {
			this.overruleCallout
				.setIcon(rule.icon)
				.setColor(rule.color);
			const titleFrag = new DocumentFragment();
			titleFrag.appendText(STRINGS.iconPicker.overrulePrefix);
			titleFrag.createEl('a', { text: rule.name }).addEventListener('click', () => {
				RuleEditor.open(this.plugin, page, rule, newRule => {
					const isRulingChanged = newRule
						? this.plugin.ruleManager?.saveRule(page, newRule)
						: this.plugin.ruleManager?.deleteRule(page, rule.id);
					if (isRulingChanged) this.plugin.refreshManagers(page);
					this.updateOverruleCallout();
				});
			});
			titleFrag.appendText(STRINGS.iconPicker.overruleSuffix);
			this.overruleCallout.setTitle(titleFrag);
		}
	}

	/**
	 * Close dialog while passing icon & color to original callback.
	 */
	private closeAndSave(icon: string | null | undefined, color: string | null | undefined): void {
		if (this.callback) {
			this.callback(icon ?? null, color ?? null);
		} else if (this.multiCallback) {
			this.multiCallback(icon, color);
		}
		this.close();
	}

	/**
	 * @override
	 */
	onClose(): void {
		this.contentEl.empty();
		void this.plugin.saveSettings(); // Save any changes to dialogState
	}
}
