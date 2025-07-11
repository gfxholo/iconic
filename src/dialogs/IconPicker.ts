import { ButtonComponent, ColorComponent, ExtraButtonComponent, Hotkey, Menu, Modal, Platform, Setting, TextComponent, displayTooltip, prepareFuzzySearch, setTooltip } from 'obsidian';
import IconicPlugin, { Category, Item, Icon, ICONS, EMOJIS, STRINGS } from 'src/IconicPlugin';
import ColorUtils, { COLORS } from 'src/ColorUtils';
import { RuleItem } from 'src/managers/RuleManager';
import IconManager from 'src/managers/IconManager';
import RuleEditor from 'src/dialogs/RuleEditor';

const COLOR_KEYS = [...COLORS.keys()];

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
 * Exposes private methods as public for use by {@link IconPicker}.
 */
class IconPickerManager extends IconManager {
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
 * Dialog for changing icons & colors of single/multiple items.
 */
export default class IconPicker extends Modal {
	private readonly plugin: IconicPlugin;
	private readonly iconManager: IconPickerManager;

	// Item
	private readonly items: Item[];
	private readonly icon: string | null | undefined;
	private color: string | null | undefined;
	private readonly callback: IconPickerCallback | null;
	private readonly multiCallback: MultiIconPickerCallback | null;

	// Components
	private overruleEl: HTMLElement;
	private searchSetting: Setting;
	private searchResultsSetting: Setting;
	private colorResetButton: ExtraButtonComponent;
	private colorPicker: ColorComponent;
	private searchField: TextComponent;
	private iconModeButton: ExtraButtonComponent;
	private emojiModeButton: ExtraButtonComponent;
	private mobileModeButton: ButtonComponent;
	private colorPickerEl: HTMLElement;

	// State
	private colorPickerPaused = false;
	private colorPickerHovered = false;
	private readonly searchResults: [icon: string, iconName: string][] = [];

	private constructor(
		plugin: IconicPlugin,
		items: Item[],
		callback: IconPickerCallback | null,
		multiCallback: MultiIconPickerCallback | null,
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.iconManager = new IconPickerManager(plugin);
		this.items = items;
		this.icon = this.items.every(item => item.icon === this.items[0].icon) ? this.items[0].icon : undefined;
		this.color = this.items.every(item => item.color === this.items[0].color) ? this.items[0].color : undefined;
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
			case 'ArrowUp': this.previousColor(); return;
			case 'ArrowDown': this.nextColor(); return;
			case 'ArrowLeft': {
				// Search results
				if (this.searchResultsSetting.settingEl.contains(event.target)) {
					if (event.target !== this.searchResultsSetting.settingEl && event.target.previousElementSibling) {
						focusEl = event.target.previousElementSibling;
					} else if (!event.repeat) {
						focusEl = this.searchResultsSetting.controlEl.lastElementChild;
					}
				}
				break;
			}
			case 'ArrowRight': {
				// Search results
				if (this.searchResultsSetting.settingEl.contains(event.target)) {
					if (event.target !== this.searchResultsSetting.settingEl && event.target.nextElementSibling) {
						focusEl = event.target.nextElementSibling;
					} else if (!event.repeat) {
						focusEl = this.searchResultsSetting.controlEl.firstElementChild;
					}
				}
			}
		}

		if (focusEl instanceof HTMLElement) {
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
		else if (event.target === this.colorPickerEl) {
			event.preventDefault();
			const rect = this.colorPickerEl.getBoundingClientRect();
			const x = rect.x + rect.width / 4;
			const y = rect.y + rect.height / 4;
			this.openColorMenu(x, y);
		}
		// Search field
		else if (event.target === this.searchField.inputEl) {
			if (event.key === 'Enter' && this.searchResults.length > 0) {
				event.preventDefault();
				this.closeAndSave(this.searchResults[0][0], this.color);
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
			if (event.target === this.colorResetButton.extraSettingsEl) this.colorPickerEl.focus();
			this.resetColor();
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
		this.updateOverruleReminder();

		// Item name
		const showItemName = this.plugin.settings.showItemName === 'on'
			|| Platform.isDesktop && this.plugin.settings.showItemName === 'desktop'
			|| Platform.isMobile && this.plugin.settings.showItemName === 'mobile';
		if (showItemName) {
			const setting = new Setting(this.contentEl)
				.addText(itemNameField => itemNameField.setValue(this.items.map(item => item.name).join(', ')))
				.setDisabled(true);
			const category = this.items.every(item => item.category === this.items[0].category)
				? this.items[0].category
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

		// Search
		this.searchSetting = new Setting(this.contentEl)
			.addExtraButton(colorResetButton => { colorResetButton
				.setIcon('lucide-rotate-ccw')
				.setTooltip(STRINGS.iconPicker.resetColor, { delay: 300 })
				.onClick(() => this.resetColor());
				colorResetButton.extraSettingsEl.addClass('iconic-reset-color');
				colorResetButton.extraSettingsEl.toggleClass('iconic-invisible', this.color === null);
				colorResetButton.extraSettingsEl.tabIndex = this.color === null ? -1 : 0;
				this.iconManager.setEventListener(colorResetButton.extraSettingsEl, 'pointerdown', event => {
					event.preventDefault();
				});
				this.colorResetButton = colorResetButton;
			})
			.addColorPicker(colorPicker => { colorPicker
				.setValueRgb(ColorUtils.toRgbObject(this.color))
				.onChange(value => {
					if (this.colorPickerPaused) return;
					this.color = value;
					this.colorResetButton.extraSettingsEl.removeClass('iconic-invisible');
					this.colorResetButton.extraSettingsEl.tabIndex = 0;
					this.updateColorTooltip();
					this.updateSearchResults();
				});
				this.colorPicker = colorPicker;
			})
			.addSearch(searchField => { searchField
				.setPlaceholder(STRINGS.iconPicker.searchIcons)
				.onChange(() => this.updateSearchResults());
				searchField.inputEl.enterKeyHint = 'go';
				this.searchField = searchField;
			});
		if (!Platform.isPhone) this.searchSetting.setName(STRINGS.iconPicker.search);

		// Color picker
		let openRgbPicker = false;
		this.colorPickerEl = this.searchSetting.controlEl.find('input[type="color"]');
		// Reset tooltip delay when cursor starts hovering
		this.iconManager.setEventListener(this.colorPickerEl, 'pointerenter', () => {
			this.updateColorTooltip();
			this.colorPickerHovered = true;
		});
		this.iconManager.setEventListener(this.colorPickerEl, 'pointerleave', () => {
			this.colorPickerHovered = false;
			this.updateColorTooltip();
		});
		// Primary color picker
		this.iconManager.setEventListener(this.colorPickerEl, 'click', event => {
			if (openRgbPicker === true) {
				openRgbPicker = false;
			} else if (this.plugin.settings.colorPicker1 === 'list') {
				this.openColorMenu(event.x, event.y);
				event.preventDefault();
			}
		});
		// Secondary color picker
		this.iconManager.setEventListener(this.colorPickerEl, 'contextmenu', event => {
			navigator?.vibrate(100); // Not supported on iOS
			if (this.plugin.settings.colorPicker2 === 'rgb') {
				openRgbPicker = true;
				this.colorPickerEl.click();
			} else if (this.plugin.settings.colorPicker2 === 'list') {
				this.openColorMenu(event.x, event.y);
				event.preventDefault();
			}
		});
		this.iconManager.setEventListener(this.colorPickerEl, 'wheel', event => {
			event.deltaY + event.deltaX < 0 ? this.previousColor() : this.nextColor();
		}, { passive: true });
		this.updateColorPicker();

		// Search results
		this.searchResultsSetting = new Setting(this.contentEl);
		this.searchResultsSetting.settingEl.addClass('iconic-search-results');
		this.searchResultsSetting.settingEl.tabIndex = 0;
		// Allow vertical scrolling to work horizontally
		this.iconManager.setEventListener(this.searchResultsSetting.settingEl, 'wheel', event => {
			if (activeDocument.body.hasClass('mod-rtl')) {
				this.searchResultsSetting.settingEl.scrollLeft -= event.deltaY;
			} else {
				this.searchResultsSetting.settingEl.scrollLeft += event.deltaY;
			}
		}, { passive: true });

		// Match styling of bookmark edit dialog
		const buttonContainerEl = this.modalEl.createDiv({ cls: 'modal-button-container' });
		const buttonRowEl = Platform.isMobile ? buttonContainerEl.createDiv({ cls: 'iconic-button-row' }) : null;

		// [Remove]
		if (this.icon !== null || this.color !== null) {
			new ButtonComponent(buttonRowEl ?? buttonContainerEl)
				.setButtonText(this.items.length === 1
					? STRINGS.menu.removeIcon
					: STRINGS.menu.removeIcons.replace('{#}', this.items.length.toString())
				)
				.onClick(() => this.closeAndSave(null, null))
				.buttonEl.addClasses(Platform.isPhone
					? ['mod-warning']
					: ['mod-secondary', 'mod-destructive']
				);
		}

		// Auto-select the most useful mode
		if (this.icon) {
			if (ICONS.has(this.icon)) {
				dialogState.iconMode = true;
				this.searchField.setValue(ICONS.get(this.icon) ?? '');
			} else if (EMOJIS.has(this.icon)) {
				dialogState.emojiMode = true;
				this.searchField.setValue(EMOJIS.get(this.icon) ?? '');
			} else {
				this.searchField.setValue(this.icon);
			}
		} else if (!dialogState.iconMode && !dialogState.emojiMode) {
			dialogState.iconMode = true;
		}

		// BUTTONS: Toggle icons & emojis
		if (Platform.isMobile && buttonRowEl) {
			this.mobileModeButton = new ButtonComponent(buttonRowEl)
				.onClick(() => this.toggleMobileSearchMode());
			this.iconManager.setEventListener(this.mobileModeButton.buttonEl, 'pointerdown', event => {
				event.preventDefault(); // Prevent focus theft
			});
			this.updateMobileSearchMode();
		} else {
			this.iconModeButton = new ExtraButtonComponent(buttonContainerEl)
				.setTooltip(STRINGS.iconPicker.toggleIcons, { placement: 'top', delay: 300 })
				.onClick(() => {
					dialogState.iconMode = !dialogState.iconMode;
					this.updateDesktopSearchMode();
				});
			this.iconModeButton.extraSettingsEl.tabIndex = 0;
			this.emojiModeButton = new ExtraButtonComponent(buttonContainerEl)
				.setTooltip(STRINGS.iconPicker.toggleEmojis, { placement: 'top', delay: 300 })
				.onClick(() => {
					dialogState.emojiMode = !dialogState.emojiMode;
					this.updateDesktopSearchMode();
				});
			this.emojiModeButton.extraSettingsEl.tabIndex = 0;
			this.iconManager.setEventListener(this.iconModeButton.extraSettingsEl, 'pointerdown', event => {
				event.preventDefault(); // Prevent focus theft
			});
			this.iconManager.setEventListener(this.emojiModeButton.extraSettingsEl, 'pointerdown', event => {
				event.preventDefault(); // Prevent focus theft
			});
			this.updateDesktopSearchMode();
		}

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
			.onClick(() => this.closeAndSave(this.icon, this.color))
			.buttonEl.addClasses(Platform.isPhone
				? ['modal-nav-action', 'mod-cta']
				: ['mod-cta']
			);

		// Hack to guarantee initial focus
		activeWindow.requestAnimationFrame(() => this.searchField.inputEl.select());

		this.updateSearchResults();
	}

	/**
	 * Open color menu at the given coordinates.
	 */
	private openColorMenu(x: number, y: number): void {
		const menu = new Menu();
		for (const color of COLOR_KEYS) {
			menu.addItem(menuItem => { menuItem
				.setTitle(STRINGS.iconPicker.colors[color as keyof typeof STRINGS.iconPicker.colors])
				.setChecked(color === this.color)
				.setSection('color')
				.onClick(() => {
					if (this.color === color) {
						this.color = null;
						this.colorResetButton.extraSettingsEl.addClass('iconic-invisible');
						this.colorResetButton.extraSettingsEl.tabIndex = -1;
					} else {
						this.color = color;
						this.colorResetButton.extraSettingsEl.removeClass('iconic-invisible');
						this.colorResetButton.extraSettingsEl.tabIndex = 0;
					}
					this.updateColorPicker();
					this.updateSearchResults();
				});
				// @ts-expect-error (Private API)
				this.iconManager.refreshIcon({ icon: 'lucide-paint-bucket', color }, menuItem.iconEl);
			});
		}
		menu.showAtPosition({ x, y });
	}

	/**
	 * Select previous color in list. Used by keyboard and scrollwheel events.
	 */
	private previousColor(): void {
		let index = COLOR_KEYS.length - 1;
		if (this.color && COLOR_KEYS.includes(this.color) && this.color !== COLOR_KEYS.first()) {
			index = COLOR_KEYS.indexOf(this.color) - 1;
		}
		this.color = COLOR_KEYS[index];
		this.colorResetButton.extraSettingsEl.removeClass('iconic-invisible');
		this.colorResetButton.extraSettingsEl.tabIndex = 0;
		this.updateColorPicker();
		this.updateSearchResults();
	}

	/**
	 * Select next color in list. Used by keyboard and scrollwheel events.
	 */
	private nextColor(): void {
		let index = 0;
		if (this.color && COLOR_KEYS.includes(this.color) && this.color !== COLOR_KEYS.last()) {
			index = COLOR_KEYS.indexOf(this.color) + 1;
		}
		this.color = COLOR_KEYS[index];
		this.colorResetButton.extraSettingsEl.removeClass('iconic-invisible');
		this.colorResetButton.extraSettingsEl.tabIndex = 0;
		this.updateColorPicker();
		this.updateSearchResults();
	}

	/**
	 * Reset icon to the default color.
	 */
	private resetColor(): void {
		this.color = null;
		this.colorResetButton.extraSettingsEl.addClass('iconic-invisible');
		this.colorResetButton.extraSettingsEl.tabIndex = -1;
		this.updateColorPicker();
		this.updateSearchResults();
	}

	private toggleMobileSearchMode(): void {
		const { dialogState } = this.plugin.settings;
		if (dialogState.iconMode && dialogState.emojiMode) {
			dialogState.iconMode = true;
			dialogState.emojiMode = false;
		} else if (dialogState.iconMode) {
			dialogState.iconMode = false;
			dialogState.emojiMode = true;
		} else {
			dialogState.iconMode = true;
			dialogState.emojiMode = true;
		}

		this.updateMobileSearchMode();
	}

	private updateMobileSearchMode(): void {
		const { dialogState } = this.plugin.settings;
		if (dialogState.iconMode && dialogState.emojiMode) {
			this.setTitle(this.items.length === 1
				? STRINGS.iconPicker.changeMix
				: STRINGS.iconPicker.changeMixes.replace('{#}', this.items.length.toString())
			);
			this.searchField.setPlaceholder(STRINGS.iconPicker.searchMix);
			this.mobileModeButton?.setButtonText(STRINGS.iconPicker.icons);
		} else if (dialogState.iconMode) {
			this.setTitle(this.items.length === 1
				? STRINGS.iconPicker.changeIcon
				: STRINGS.iconPicker.changeIcons.replace('{#}', this.items.length.toString())
			);
			this.searchField.setPlaceholder(STRINGS.iconPicker.searchIcons);
			this.mobileModeButton?.setButtonText(STRINGS.iconPicker.emojis);
		} else {
			this.setTitle(this.items.length === 1
				? STRINGS.iconPicker.changeEmoji
				: STRINGS.iconPicker.changeEmojis.replace('{#}', this.items.length.toString())
			);
			this.searchField.setPlaceholder(STRINGS.iconPicker.searchEmojis);
			this.mobileModeButton?.setButtonText(STRINGS.iconPicker.mixed);
		}

		this.updateSearchResults();
	}

	private updateDesktopSearchMode(): void {
		const { dialogState } = this.plugin.settings;
		this.iconModeButton.setIcon(dialogState.iconMode ? 'lucide-image' : 'lucide-square');
		this.emojiModeButton.setIcon(dialogState.emojiMode ? 'lucide-smile' : 'lucide-circle');
		this.iconModeButton.extraSettingsEl.toggleClass('iconic-mode-selected', dialogState.iconMode);
		this.emojiModeButton.extraSettingsEl.toggleClass('iconic-mode-selected', dialogState.emojiMode);

		if (dialogState.iconMode && dialogState.emojiMode) {
			this.setTitle(this.items.length === 1
				? STRINGS.iconPicker.changeMix
				: STRINGS.iconPicker.changeMixes.replace('{#}', this.items.length.toString())
			);
			this.searchField.setPlaceholder(STRINGS.iconPicker.searchMix);
		} else if (dialogState.emojiMode) {
			this.setTitle(this.items.length === 1
				? STRINGS.iconPicker.changeEmoji
				: STRINGS.iconPicker.changeEmojis.replace('{#}', this.items.length.toString())
			);
			this.searchField.setPlaceholder(STRINGS.iconPicker.searchEmojis);
		} else {
			this.setTitle(this.items.length === 1
				? STRINGS.iconPicker.changeIcon
				: STRINGS.iconPicker.changeIcons.replace('{#}', this.items.length.toString())
			);
			this.searchField.setPlaceholder(STRINGS.iconPicker.searchIcons);
		}

		this.updateSearchResults();
	}

	/**
	 * Update color of color picker without triggering its onChange() logic.
	 */
	private updateColorPicker(): void {
		this.colorPickerPaused = true;
		this.colorPicker.setValueRgb(ColorUtils.toRgbObject(this.color));
		this.colorPickerPaused = false;
		this.updateColorTooltip();
	}

	/**
	 * Update just the color picker tooltip.
	 */
	private updateColorTooltip(): void {
		// Set tooltip message
		let tooltip = STRINGS.iconPicker.changeColor;
		if (this.color) {
			if (COLOR_KEYS.includes(this.color)) {
				tooltip = STRINGS.iconPicker.colors[this.color as keyof typeof STRINGS.iconPicker.colors];
			} else {
				tooltip = this.color;
			}
		}

		// Update tooltip instantly if cursor is hovering over color picker
		if (this.colorPickerHovered) {
			displayTooltip(this.colorPickerEl, tooltip, { delay: 1 });
		} else {
			setTooltip(this.colorPickerEl, tooltip, { delay: 300 });
		}
	}

	/**
	 * Update search results based on current query.
	 */
	private updateSearchResults(): void {
		const query = this.searchField.getValue();
		const fuzzySearch = prepareFuzzySearch(query);
		const matches: [score: number, iconEntry: [string, string]][] = [];
		const iconEntries = [
			...(this.plugin.settings.dialogState.iconMode ? ICONS : []),
			...(this.plugin.settings.dialogState.emojiMode ? EMOJIS : []),
		];

		// Search all icon names
		if (query) for (const [icon, iconName] of iconEntries) {
			if (query === icon) { // Recognize emoji input
				matches.push([0, [icon, iconName]]);
			} else {
				const fuzzyMatch = fuzzySearch(iconName);
				if (fuzzyMatch) matches.push([fuzzyMatch.score, [icon, iconName]]);
			}
		}

		// Sort matches by score
		matches.sort(([scoreA,], [scoreB,]) => scoreA > scoreB ? -1 : +1);

		// Copy into an unscored array
		this.searchResults.length = 0;
		for (const [, iconEntry] of matches) {
			this.searchResults.push(iconEntry);
			if (this.searchResults.length === this.plugin.settings.maxSearchResults) break;
		}

		// Preserve UI state
		const { controlEl, settingEl } = this.searchResultsSetting;
		const focusedEl = activeDocument.activeElement;
		const focusedIndex = focusedEl ? controlEl.indexOf(focusedEl) : -1;
		const scrollLeft = settingEl.scrollLeft;

		// Populate icon buttons
		this.searchResultsSetting.clear();
		for (const iconEntry of this.searchResults) {
			const [icon, iconName] = iconEntry;
			this.searchResultsSetting.addExtraButton(iconButton => {
				iconButton.setTooltip(iconName, {
					delay: 300,
					placement: Platform.isPhone ? 'top' : 'bottom',
				});
				const iconEl = iconButton.extraSettingsEl;
				iconEl.addClass('iconic-search-result');
				iconEl.tabIndex = -1;

				this.iconManager.refreshIcon({ icon: icon, color: this.color ?? null }, iconEl, () => {
					this.closeAndSave(icon, this.color);
				});

				if (Platform.isPhone) this.iconManager.setEventListener(iconEl, 'contextmenu', () => {
					navigator?.vibrate(100); // Not supported on iOS
					displayTooltip(iconEl, iconName, { placement: 'top' });
				});
			});
		}

		// Restore UI state
		if (focusedIndex > -1) {
			const iconEl = controlEl.children[focusedIndex];
			if (iconEl instanceof HTMLElement) iconEl.focus();
		}
		settingEl.scrollLeft = scrollLeft;

		// Use an invisible button to preserve height
		if (this.searchResults.length === 0) {
			this.searchResultsSetting.addExtraButton(button => {
				button.extraSettingsEl.addClasses(['iconic-invisible', 'iconic-search-result']);
			});
		}
	}

	/**
	 * Display a reminder if this icon is currently overruled.
	 */
	private updateOverruleReminder(): void {
		this.overruleEl?.remove();
		let page: Category;
		let rule: RuleItem | null = null;

		// Determine which rule to display
		if (this.items.length > 1) {
			for (const item of this.items) {
				rule = this.plugin.ruleManager.checkRuling(item.category, item.id);
				page = item.category;
				if (rule) break;
			}
		} else {
			const item = this.items[0];
			rule = this.plugin.ruleManager.checkRuling(item.category, item.id);
			page = item.category;
		}

		if (rule) {
			const rgb = ColorUtils.toRgbObject(this.items.length === 1 ? rule.color : 'gray');
			const cssColor = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

			// Create callout elements
			this.overruleEl = createDiv({
				cls: 'callout',
				attr: { style: '--callout-color: ' + cssColor },
			});
			const titleEl = this.overruleEl.createDiv({ cls: 'callout-title' });
			const iconEl = titleEl.createDiv({ cls: 'callout-icon' });
			const innerEl = titleEl.createDiv({ cls: 'callout-title-inner' });

			// Populate callout message
			if (this.items.length > 1) {
				this.iconManager.refreshIcon({ icon: 'lucide-book-image', color: 'gray' }, iconEl);
				innerEl.setText(STRINGS.iconPicker.overrules);
			} else {
				this.iconManager.refreshIcon(rule, iconEl);
				innerEl.setText(STRINGS.iconPicker.overrulePrefix);
				const linkEl = innerEl.createEl('a', { text: rule.name });
				innerEl.appendText(STRINGS.iconPicker.overruleSuffix);
				this.iconManager.setEventListener(linkEl, 'click', () => {
					if (page && rule) RuleEditor.open(this.plugin, page, rule, newRule => {
						if (!rule) return;
						const isRulingChanged = newRule
							? this.plugin.ruleManager.saveRule(page, newRule)
							: this.plugin.ruleManager.deleteRule(page, rule.id);
						if (isRulingChanged) {
							this.plugin.refreshManagers(page);
						}
						this.updateOverruleReminder();
					});
				});
			}
			this.contentEl.prepend(this.overruleEl);
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
		this.iconManager.stopEventListeners();
		this.iconManager.stopMutationObservers();
		this.plugin.saveSettings(); // Save any changes to dialogState
	}
}
