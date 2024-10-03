import { ColorComponent, ExtraButtonComponent, Hotkey, Menu, Modal, Platform, Setting, TextComponent, prepareFuzzySearch, setIcon } from 'obsidian';
import IconicPlugin, { Item, Icon, ICONS, EMOJIS, STRINGS } from './IconicPlugin';
import ColorUtils, { COLORS } from './ColorUtils';
import IconManager from './IconManager';

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
	 * Not used by {@link IconPicker}.
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
}

/**
 * Dialog for changing icons & colors of single/multiple items.
 */
export default class IconPicker extends Modal {
	private readonly plugin: IconicPlugin;
	private readonly manager: IconPickerManager;

	// Item
	private readonly titleText: string;
	private readonly categoryText: string;
	private readonly nameText: string;
	private readonly icon: string | null | undefined;
	private color: string | null | undefined;
	private readonly callback: IconPickerCallback | null;
	private readonly multiCallback: MultiIconPickerCallback | null;

	// Components
	private searchSetting: Setting;
	private colorResetButton: ExtraButtonComponent;
	private colorPicker: ColorComponent;
	private searchField: TextComponent;
	private searchResultsSetting: Setting;
	private colorPickerEl: HTMLElement;
	private emojiButtonEl: HTMLElement;

	// State
	private emojiMode = false;
	private modeButtonHovered = false;
	private colorPickerPaused = false;
	private colorPickerHovered = false;
	private readonly searchResults: [icon: string, iconName: string][] = [];

	private constructor(plugin: IconicPlugin,
		titleText: string,
		categoryText: string,
		nameText: string,
		icon: string | null | undefined,
		color: string | null | undefined,
		callback: IconPickerCallback | null,
		multiCallback: MultiIconPickerCallback | null)
	{
		super(plugin.app);
		this.plugin = plugin;
		this.manager = new IconPickerManager(plugin);
		this.titleText = titleText;
		this.categoryText = categoryText;
		this.nameText = nameText;
		this.icon = icon;
		this.color = color;
		this.callback = callback;
		this.multiCallback = multiCallback;

		// Allow hotkeys in icon picker
		for (const command of this.plugin.commands) if (command.callback) {
			// @ts-expect-error (Private API)
			const hotkeys: Hotkey[] = this.app.hotkeyManager?.customKeys?.[command.id] ?? [];
			for (const hotkey of hotkeys) {
				this.scope.register(hotkey.modifiers, hotkey.key, command.callback);
			}
		}
	}

	/**
	 * Open a dialog to change a single icon.
	 */
	static openSingle(plugin: IconicPlugin, item: Item, callback: IconPickerCallback): void {
		const title = STRINGS.iconPicker.changeIcon;
		const nameText = item.name;

		let categoryText;
		switch (item.category) {
			case 'app': categoryText = STRINGS.categories.appItem; break;
			case 'tab': categoryText = STRINGS.categories.tab; break;
			case 'file': categoryText = STRINGS.categories.file; break;
			case 'folder': categoryText = STRINGS.categories.folder; break;
			case 'group': categoryText = STRINGS.categories.group; break;
			case 'search': categoryText = STRINGS.categories.search; break;
			case 'graph': categoryText = STRINGS.categories.graph; break;
			case 'url': categoryText = STRINGS.categories.url; break;
			case 'property': categoryText = STRINGS.categories.property; break;
			case 'ribbon': categoryText = STRINGS.categories.ribbonItem; break;
			default: categoryText = STRINGS.categories.item; break;
		}
		new IconPicker(plugin, title, categoryText, nameText, item.icon, item.color, callback, null).open();
	}

	/**
	 * Open a dialog to change multiple icons at once.
	 */
	static openMulti(plugin: IconicPlugin, items: Item[], multiCallback: MultiIconPickerCallback): void {
		const title = STRINGS.iconPicker.changeIcons.replace('{#}', items.length.toString());
		const nameText = items.map(item => item.name).join(', ');

		const everyCategory = items.every(item => item.category === items[0].category) ? items[0].category : undefined;
		const everyIcon = items.every(item => item.icon === items[0].icon) ? items[0].icon : undefined;
		const everyColor = items.every(item => item.color === items[0].color) ? items[0].color : undefined;

		let categoryText;
		switch (everyCategory) {
			case 'app': categoryText = STRINGS.categories.appItems; break;
			case 'tab': categoryText = STRINGS.categories.tabs; break;
			case 'file': categoryText = STRINGS.categories.files; break;
			case 'folder': categoryText = STRINGS.categories.folders; break;
			case 'group': categoryText = STRINGS.categories.groups; break;
			case 'search': categoryText = STRINGS.categories.searches; break;
			case 'graph': categoryText = STRINGS.categories.graphs; break;
			case 'url': categoryText = STRINGS.categories.urls; break;
			case 'property': categoryText = STRINGS.categories.properties; break;
			case 'ribbon': categoryText = STRINGS.categories.ribbonItems; break;
			default: categoryText = STRINGS.categories.items; break;
		}
		new IconPicker(plugin, title, categoryText, nameText, everyIcon, everyColor, null, multiCallback).open();
	}

	/**
	 * @override
	 */
	onOpen(): void {
		this.containerEl.addClass('mod-confirmation');
		this.modalEl.addClass('iconic-modal');
		this.setTitle(this.titleText);

		// Item name
		const showItemName = this.plugin.settings.showItemName === 'on'
			|| Platform.isDesktop && this.plugin.settings.showItemName === 'desktop'
			|| Platform.isMobile && this.plugin.settings.showItemName === 'mobile';
		if (showItemName) {
			new Setting(this.contentEl)
				.setName(this.categoryText)
				.addText(itemNameField => itemNameField.setValue(this.nameText))
				.setDisabled(true);
		}

		// Search
		this.searchSetting = new Setting(this.contentEl)
			.addExtraButton(colorResetButton => { colorResetButton
				.setIcon('lucide-rotate-ccw')
				.setTooltip(STRINGS.iconPicker.resetColor)
				.onClick(() => this.resetColor());
				colorResetButton.extraSettingsEl.tabIndex = 0;
				colorResetButton.extraSettingsEl.addClass('iconic-reset-color');
				colorResetButton.extraSettingsEl.toggleClass('iconic-invisible', this.color === null);
				this.manager.setEventListener(colorResetButton.extraSettingsEl, 'pointerdown', event => {
					event.preventDefault();
				});
				this.manager.setEventListener(colorResetButton.extraSettingsEl, 'keydown', event => {
					if (event.key === 'Enter' || event.key === ' ') {
						this.resetColor();
					}
				});
				this.colorResetButton = colorResetButton;
			})
			.addColorPicker(colorPicker => { colorPicker
				.setValueRgb(ColorUtils.toRgbObject(this.color))
				.onChange(value => {
					if (this.colorPickerPaused) {
						this.colorPickerPaused = false;
						return;
					}
					this.color = value;
					this.colorPickerEl.ariaLabel = this.color;
					this.colorResetButton.extraSettingsEl.removeClass('iconic-invisible');
					this.updateSearchResults();
				});
				this.colorPicker = colorPicker;
			})
			.addSearch(searchField => { searchField
				.setPlaceholder(STRINGS.iconPicker.searchIcons)
				.onChange(() => this.updateSearchResults());
				searchField.inputEl.enterKeyHint = 'go';
				this.manager.setEventListener(searchField.inputEl, 'keydown', event => {
					// Press Enter to choose the first icon in search results
					if (event.key === 'Enter' && this.searchResults.length > 0) {
						this.closeAndSave(this.searchResults[0][0], this.color);
					}
				});
				this.searchField = searchField;
			});
		if (!Platform.isPhone) this.searchSetting.setName(STRINGS.iconPicker.search);

		// Color picker
		let openRgbPicker = false;
		this.colorPickerEl = this.searchSetting.controlEl.find('input[type="color"]');
		this.colorPickerEl.tabIndex = 0;
		this.colorPickerEl.dataset.tooltipDelay = '300';
		this.manager.setEventListener(this.colorPickerEl, 'pointerenter', () => this.colorPickerHovered = true);
		this.manager.setEventListener(this.colorPickerEl, 'pointerleave', () => this.colorPickerHovered = false);
		this.manager.setEventListener(this.colorPickerEl, 'click', event => {
			if (openRgbPicker === true) {
				openRgbPicker = false;
			} else if (this.plugin.settings.colorPicker1 === 'list') {
				this.openColorMenu(event.x, event.y);
				event.preventDefault();
			}
		});
		this.manager.setEventListener(this.colorPickerEl, 'contextmenu', event => {
			navigator?.vibrate(100); // Might not be supported on iOS
			if (this.plugin.settings.colorPicker2 === 'rgb') {
				openRgbPicker = true;
				this.colorPickerEl.click();
			} else if (this.plugin.settings.colorPicker2 === 'list') {
				this.openColorMenu(event.x, event.y);
				event.preventDefault();
			}
		});
		this.manager.setEventListener(this.colorPickerEl, 'keydown', event => {
			if (event.key === 'Enter' || event.key === ' ') {
				const rect = this.colorPickerEl.getBoundingClientRect();
				this.openColorMenu(rect.top, rect.right);
				event.preventDefault();
			} else if (event.key === 'Delete' || event.key === 'Backspace') {
				this.resetColor();
			} else if (event.key == 'ArrowUp' || event.key === 'ArrowLeft') {
				this.previousColor();
			} else if (event.key == 'ArrowDown' || event.key === 'ArrowRight') {
				this.nextColor();
			}
		});
		this.manager.setEventListener(this.colorPickerEl, 'wheel', event => {
			event.deltaY + event.deltaX < 0 ? this.previousColor() : this.nextColor();
		}, { passive: true });
		this.updateColorPicker();

		// Search results
		this.searchResultsSetting = new Setting(this.contentEl);
		this.searchResultsSetting.settingEl.addClass('iconic-search-results');
		// Allow vertical scrolling to work horizontally
		this.manager.setEventListener(this.searchResultsSetting.settingEl, 'wheel', event => {
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
			const removeButtonEl = (buttonRowEl ?? buttonContainerEl).createEl('button', {
				cls: Platform.isPhone ? 'mod-warning' : ['mod-secondary', 'mod-destructive'],
				text: STRINGS.iconPicker.remove,
			});
			this.manager.setEventListener(removeButtonEl, 'click', () => this.closeAndSave(null, null));
		}

		// [Emojis]
		if (Platform.isMobile && buttonRowEl) {
			this.emojiButtonEl = buttonRowEl.createEl('button', {
				text: STRINGS.iconPicker.emojis,
			});
		} else {
			this.emojiButtonEl = buttonContainerEl.createDiv({
				cls: ['clickable-icon', 'setting-editor-extra-setting-button'],
				attr: { tabIndex: 0, 'aria-label': STRINGS.iconPicker.emojis, 'data-tooltip-position': 'top' },
			});
			setIcon(this.emojiButtonEl, 'lucide-smile-plus');
		}
		this.manager.setEventListener(this.emojiButtonEl, 'pointerenter', () => this.modeButtonHovered = true);
		this.manager.setEventListener(this.emojiButtonEl, 'pointerleave', () => this.modeButtonHovered = false);
		this.manager.setEventListener(this.emojiButtonEl, 'pointerdown', event => event.preventDefault()); // Prevent focus theft
		this.manager.setEventListener(this.emojiButtonEl, 'click', () => this.toggleEmojiMode());
		this.manager.setEventListener(this.emojiButtonEl, 'keydown', event => {
			if (event.key === 'Enter' || event.key === ' ') {
				this.toggleEmojiMode();
			}
		});
		if (this.icon) {
			if (ICONS.has(this.icon)) {
				this.searchField.setValue(ICONS.get(this.icon) ?? '');
			} else if (EMOJIS.has(this.icon)) {
				this.toggleEmojiMode();
				this.searchField.setValue(EMOJIS.get(this.icon) ?? '');
			}
		}

		// [Cancel]
		const cancelEl = Platform.isPhone
			? this.modalEl.createEl('button', { cls: ['modal-nav-action', 'mod-secondary'], text: STRINGS.iconPicker.cancel })
			: buttonContainerEl.createEl('button', { cls: 'mod-cancel', text: STRINGS.iconPicker.cancel });
		this.manager.setEventListener(cancelEl, 'click', () => this.close());

		// [Save]
		const saveEl = Platform.isPhone
			? this.modalEl.createEl('button', { cls: ['modal-nav-action', 'mod-cta'], text: STRINGS.iconPicker.save })
			: buttonContainerEl.createEl('button', { cls: 'mod-cta', text: STRINGS.iconPicker.save });
		this.manager.setEventListener(saveEl, 'click', () => this.closeAndSave(this.icon, this.color));

		// Hack to guarantee initial focus
		setTimeout(() => {
			this.searchField.inputEl.focus();
			this.searchField.inputEl.select();
		}, 0);

		this.updateSearchResults();
	}

	/**
	 * Open color menu at the given coordinates.
	 */
	private openColorMenu(x: number, y: number): void {
		const menu = new Menu();
		for (const color of COLORS) {
			menu.addItem(menuItem => { menuItem
				.setTitle((STRINGS.iconPicker.colors as any)[color])
				.setChecked(color === this.color)
				.setSection('color')
				.onClick(() => {
					if (this.color === color) {
						this.color = null;
						this.colorResetButton.extraSettingsEl.addClass('iconic-invisible');
					} else {
						this.color = color;
						this.colorResetButton.extraSettingsEl.removeClass('iconic-invisible');
					}
					this.updateColorPicker();
					this.updateSearchResults();
				});
				// @ts-expect-error (Private API)
				this.manager.refreshIcon({ icon: 'lucide-paint-bucket', color }, menuItem.iconEl);
			});
		}
		menu.showAtPosition({ x, y });
	}

	/**
	 * Select previous color in list. Used by keyboard and scrollwheel events.
	 */
	private previousColor(): void {
		let index = COLORS.length - 1;
		if (this.color && COLORS.includes(this.color) && this.color !== COLORS.first()) {
			index = COLORS.indexOf(this.color) - 1;
		}
		this.color = COLORS[index];
		this.colorResetButton.extraSettingsEl.removeClass('iconic-invisible');
		this.updateColorPicker();
		this.updateColorTooltip();
		this.updateSearchResults();
	}

	/**
	 * Select next color in list. Used by keyboard and scrollwheel events.
	 */
	private nextColor(): void {
		let index = 0;
		if (this.color && COLORS.includes(this.color) && this.color !== COLORS.last()) {
			index = COLORS.indexOf(this.color) + 1;
		}
		this.color = COLORS[index];
		this.colorResetButton.extraSettingsEl.removeClass('iconic-invisible');
		this.updateColorPicker();
		this.updateColorTooltip();
		this.updateSearchResults();
	}

	/**
	 * Reset icon to the default color.
	 */
	private resetColor(): void {
		this.color = null;
		this.colorResetButton.extraSettingsEl.addClass('iconic-invisible');
		this.updateColorPicker();
		this.updateColorTooltip();
		this.updateSearchResults();
	}

	/**
	 * Toggle between icon search and emoji search.
	 */
	private toggleEmojiMode(): void {
		this.emojiMode = !this.emojiMode;
		if (this.emojiMode) {
			this.setTitle(STRINGS.iconPicker.changeEmoji);
			this.searchField.setPlaceholder(STRINGS.iconPicker.searchEmojis);
			if (Platform.isMobile) {
				this.emojiButtonEl.setText(STRINGS.iconPicker.icons);
			} else {
				setIcon(this.emojiButtonEl, 'lucide-image-plus');
				this.emojiButtonEl.ariaLabel = STRINGS.iconPicker.icons;
			}
		} else {
			this.setTitle(STRINGS.iconPicker.changeIcon);
			this.searchField.setPlaceholder(STRINGS.iconPicker.searchIcons);
			if (Platform.isMobile) {
				this.emojiButtonEl.setText(STRINGS.iconPicker.emojis);
			} else {
				setIcon(this.emojiButtonEl, 'lucide-smile-plus');
				this.emojiButtonEl.ariaLabel = STRINGS.iconPicker.emojis;
			}
		}
		this.updateModeTooltip();
		this.updateSearchResults();
	}

	/**
	 * Update color of color picker without triggering its onChange() callback.
	 */
	private updateColorPicker(): void {
		this.colorPickerPaused = true;
		this.colorPicker.setValueRgb(ColorUtils.toRgbObject(this.color));

		if (!this.color) {
			this.colorPickerEl.ariaLabel = STRINGS.iconPicker.changeColor;
		} else if (COLORS.includes(this.color)) {
			this.colorPickerEl.ariaLabel = (STRINGS.iconPicker.colors as any)[this.color];
		} else {
			this.colorPickerEl.ariaLabel = this.color;
		}
	}

	/**
	 * Update tooltip currently displayed for the color picker.
	 */
	private updateColorTooltip(): void {
		if (!this.colorPickerHovered) return;

		const tooltipEl = activeDocument.body.find(':scope > .tooltip');
		if (tooltipEl && tooltipEl.firstChild) {
			tooltipEl.style.removeProperty('width');
			tooltipEl.firstChild.nodeValue = this.color
				? (STRINGS.iconPicker.colors as any)[this.color]
				: STRINGS.iconPicker.changeColor;
		}
	}

	/**
	 * Update tooltip currently displayed for the mode button.
	 */
	private updateModeTooltip(): void {
		if (!this.modeButtonHovered) return;

		const tooltipEl = activeDocument.body.find(':scope > .tooltip');
		if (tooltipEl && tooltipEl.firstChild) {
			tooltipEl.style.removeProperty('width');
			tooltipEl.firstChild.nodeValue = this.emojiMode
				? STRINGS.iconPicker.icons
				: STRINGS.iconPicker.emojis;
		}
	}

	/**
	 * Update search results based on current query.
	 */
	private updateSearchResults(): void {
		const query = this.searchField.getValue();
		const fuzzySearch = prepareFuzzySearch(query);
		const matches: [score: number, iconEntry: [string, string]][] = [];
		const iconEntries = this.emojiMode ? [...EMOJIS] : [...ICONS];

		this.searchResults.length = 0;
		this.searchResultsSetting.clear();

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
		for (const [, iconEntry] of matches) {
			this.searchResults.push(iconEntry);
			if (this.searchResults.length === this.plugin.settings.maxSearchResults) break;
		}

		// Populate icon buttons
		for (const iconEntry of this.searchResults) {
			const [icon, iconName] = iconEntry;
			this.searchResultsSetting.addExtraButton(iconButton => {
				iconButton.setTooltip(iconName, { delay: 300 });
				const iconEl = iconButton.extraSettingsEl;
				iconEl.addClass('iconic-search-result');
				iconEl.tabIndex = 0;

				this.manager.refreshIcon({ icon: icon, color: this.color ?? null }, iconEl, () => {
					this.closeAndSave(icon, this.color);
				});

				this.manager.setEventListener(iconEl, 'keydown', event => {
					if (event.key === 'Enter' || event.key === ' ') {
						this.closeAndSave(icon, this.color);
					}
				});
			});
		}

		// Use an invisible button to preserve height
		if (this.searchResults.length === 0) {
			this.searchResultsSetting.addExtraButton(button => {
				button.extraSettingsEl.addClasses(['iconic-invisible', 'iconic-search-result']);
			});
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
		this.manager.stopEventListeners();
	}
}
