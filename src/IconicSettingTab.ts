import { ExtraButtonComponent, Platform, PluginSettingTab, Setting, SettingGroup } from 'obsidian';
import IconicPlugin, { STRINGS } from 'src/IconicPlugin';
import RulePicker from 'src/dialogs/RulePicker';

/**
 * Exposes UI settings for the plugin.
 */
export default class IconicSettingTab extends PluginSettingTab {
	private readonly plugin: IconicPlugin;
	private readonly indicators = {
		biggerIcons: undefined as unknown,
		clickableIcons: undefined as unknown,
		showItemName: undefined as unknown,
		biggerSearchResults: undefined as unknown,
		colorPicker1: undefined as unknown,
		colorPicker2: undefined as unknown,
	} as Record<string, ExtraButtonComponent>;
	public icon = 'lucide-images';

	constructor(plugin: IconicPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	/**
	 * @override
	 */
	display(): void {
		this.containerEl.empty();

		// GROUP: Top
		const groupTop = new SettingGroup(this.containerEl);

		// SETTING: Rules
		groupTop.addSetting(setting => setting
			.setName(STRINGS.settings.rulebook.name)
			.setDesc(STRINGS.settings.rulebook.desc)
			.addButton(button => { button
				.setButtonText(STRINGS.settings.rulebook.manage)
				.onClick(() => {
					// Silently no-op if rulebook hasn't finished loading
					if (!this.plugin.ruleManager) return;
					// @ts-expect-error (Private API)
					this.app.setting.close();
					RulePicker.open(this.plugin);
				});
			})
		);

		// SETTING: Bigger icons
		groupTop.addSetting(setting => setting
			.setName(STRINGS.settings.biggerIcons.name)
			.setDesc(STRINGS.settings.biggerIcons.desc)
			.addExtraButton(indicator => {
				indicator.extraSettingsEl.addClass('iconic-indicator');
				this.indicators.biggerIcons = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOption('on', STRINGS.settings.values.on)
				.addOption('desktop', STRINGS.settings.values.desktop)
				.addOption('mobile', STRINGS.settings.values.mobile)
				.addOption('off', STRINGS.settings.values.off)
				.setValue(this.plugin.settings.biggerIcons)
				.onChange(value => {
					this.refreshIndicator(this.indicators.biggerIcons, value);
					this.plugin.settings.biggerIcons = value;
					this.plugin.saveSettings();
					this.plugin.refreshBody();
				});
				this.refreshIndicator(this.indicators.biggerIcons, dropdown.getValue());
			})
		);

		// SETTING: Clickable icons
		groupTop.addSetting(setting => setting
			.setName(Platform.isDesktop
				? STRINGS.settings.clickableIcons.nameDesktop
				: STRINGS.settings.clickableIcons.nameMobile
			)
			.setDesc(Platform.isDesktop
				? STRINGS.settings.clickableIcons.descDesktop
				: STRINGS.settings.clickableIcons.descMobile
			)
			.addExtraButton(indicator => {
				indicator.extraSettingsEl.addClass('iconic-indicator');
				this.indicators.clickableIcons = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOption('on', STRINGS.settings.values.on)
				.addOption('desktop', STRINGS.settings.values.desktop)
				.addOption('mobile', STRINGS.settings.values.mobile)
				.addOption('off', STRINGS.settings.values.off)
				.setValue(this.plugin.settings.clickableIcons)
				.onChange(value => {
					this.refreshIndicator(this.indicators.clickableIcons, value);
					this.plugin.settings.clickableIcons = value;
					this.plugin.saveSettings();
					this.plugin.refreshManagers();
					this.plugin.refreshBody();
				});
				this.refreshIndicator(this.indicators.clickableIcons, dropdown.getValue());
			})
		);

		// GROUP: Sidebars & tabs
		const groupSidebarsAndTabs = new SettingGroup(this.containerEl)
			.setHeading(STRINGS.settings.headingSidebarsAndTabs);

		// SETTING: Show all file icons
		groupSidebarsAndTabs.addSetting(setting => setting
			.setName(STRINGS.settings.showAllFileIcons.name)
			.setDesc(STRINGS.settings.showAllFileIcons.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showAllFileIcons)
				.onChange(value => {
					this.plugin.settings.showAllFileIcons = value;
					this.plugin.saveSettings();
					this.plugin.refreshManagers('file');
				})
			)
		);

		// SETTING: Show all folder icons
		groupSidebarsAndTabs.addSetting(setting => setting
			.setName(STRINGS.settings.showAllFolderIcons.name)
			.setDesc(STRINGS.settings.showAllFolderIcons.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showAllFolderIcons)
				.onChange(value => {
					this.plugin.settings.showAllFolderIcons = value;
					this.plugin.saveSettings();
					this.plugin.refreshManagers('folder');
				})
			)
		);

		// SETTING: Minimal folder icons
		groupSidebarsAndTabs.addSetting(setting => setting
			.setName(STRINGS.settings.minimalFolderIcons.name)
			.setDesc(STRINGS.settings.minimalFolderIcons.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.minimalFolderIcons)
				.onChange(value => {
					this.plugin.settings.minimalFolderIcons = value;
					this.plugin.saveSettings();
					this.plugin.refreshManagers('folder');
				})
			)
		);

		// SETTING: Show Markdown tab icons
		groupSidebarsAndTabs.addSetting(setting => setting
			.setName(STRINGS.settings.showMarkdownTabIcons.name)
			.setDesc(STRINGS.settings.showMarkdownTabIcons.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showMarkdownTabIcons)
				.onChange(value => {
					this.plugin.settings.showMarkdownTabIcons = value;
					this.plugin.saveSettings();
					this.plugin.refreshBody();
				})
			)
		);

		// GROUP: Editor
		const groupEditor = new SettingGroup(this.containerEl)
			.setHeading(STRINGS.settings.headingEditor);

		// SETTING: Show title icons
		groupEditor.addSetting(setting => setting
			.setName(STRINGS.settings.showTitleIcons.name)
			.setDesc(STRINGS.settings.showTitleIcons.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showTitleIcons)
				.onChange(value => {
					this.plugin.settings.showTitleIcons = value;
					this.plugin.saveSettings();
					this.plugin.refreshManagers('file');
				})
			)
		);

		// SETTING: Show tag pill icons
		groupEditor.addSetting(setting => setting
			.setName(STRINGS.settings.showTagPillIcons.name)
			.setDesc(STRINGS.settings.showTagPillIcons.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showTagPillIcons)
				.onChange(value => {
					this.plugin.settings.showTagPillIcons = value;
					this.plugin.saveSettings();
					this.plugin.refreshManagers('tag');
				})
			)
		);

		// GROUP: Menus & dialogs
		const groupMenusAndDialogs = new SettingGroup(this.containerEl)
			.setHeading(STRINGS.settings.headingMenusAndDialogs);

		// SETTING: Show menu actions
		groupMenusAndDialogs.addSetting(setting => setting
			.setName(STRINGS.settings.showMenuActions.name)
			.setDesc(STRINGS.settings.showMenuActions.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showMenuActions)
				.onChange(value => {
					this.plugin.settings.showMenuActions = value;
					this.plugin.saveSettings();
					this.plugin.refreshManagers();
				})
			)
		);

		// SETTING: Show suggestion icons
		groupMenusAndDialogs.addSetting(setting => setting
			.setName(STRINGS.settings.showSuggestionIcons.name)
			.setDesc(STRINGS.settings.showSuggestionIcons.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showSuggestionIcons)
				.onChange(value => {
					this.plugin.settings.showSuggestionIcons = value;
					this.plugin.saveSettings();
				})
			)
		);

		// SETTING: Show quick switcher icons
		groupMenusAndDialogs.addSetting(setting => setting
			.setName(STRINGS.settings.showQuickSwitcherIcons.name)
			.setDesc(STRINGS.settings.showQuickSwitcherIcons.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showQuickSwitcherIcons)
				.onChange(value => {
					this.plugin.settings.showQuickSwitcherIcons = value;
					this.plugin.saveSettings();
				})
			)
		);

		// SETTING: Show "Move file" dialog icons
		groupMenusAndDialogs.addSetting(setting => setting
			.setName(STRINGS.settings.showMoveFileIcons.name)
			.setDesc(STRINGS.settings.showMoveFileIcons.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showMoveFileIcons)
				.onChange(value => {
					this.plugin.settings.showMoveFileIcons = value;
					this.plugin.saveSettings();
				})
			)
		);

		// GROUP: Icon picker
		const groupIconPicker = new SettingGroup(this.containerEl)
			.setHeading(STRINGS.settings.headingIconPicker);

		// SETTING: Show item name
		groupIconPicker.addSetting(setting => setting
			.setName(STRINGS.settings.showItemName.name)
			.setDesc(STRINGS.settings.showItemName.desc)
			.addExtraButton(indicator => {
				indicator.extraSettingsEl.addClass('iconic-indicator');
				this.indicators.showItemName = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOption('on', STRINGS.settings.values.on)
				.addOption('desktop', STRINGS.settings.values.desktop)
				.addOption('mobile', STRINGS.settings.values.mobile)
				.addOption('off', STRINGS.settings.values.off)
				.setValue(this.plugin.settings.showItemName)
				.onChange(value => {
					this.refreshIndicator(this.indicators.showItemName, value);
					this.plugin.settings.showItemName = value;
					this.plugin.saveSettings();
				});
				this.refreshIndicator(this.indicators.showItemName, dropdown.getValue());
			})
		);

		// SETTING: Bigger search results
		groupIconPicker.addSetting(setting => setting
			.setName(STRINGS.settings.biggerSearchResults.name)
			.setDesc(STRINGS.settings.biggerSearchResults.desc)
			.addExtraButton(indicator => {
				indicator.extraSettingsEl.addClass('iconic-indicator');
				this.indicators.biggerSearchResults = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOption('on', STRINGS.settings.values.on)
				.addOption('desktop', STRINGS.settings.values.desktop)
				.addOption('mobile', STRINGS.settings.values.mobile)
				.addOption('off', STRINGS.settings.values.off)
				.setValue(this.plugin.settings.biggerSearchResults)
				.onChange(value => {
					this.refreshIndicator(this.indicators.biggerSearchResults, value);
					this.plugin.settings.biggerSearchResults = value;
					this.plugin.saveSettings();
					this.plugin.refreshBody();
				});
				this.refreshIndicator(this.indicators.biggerSearchResults, dropdown.getValue());
			})
		);

		// SETTING: Max search results
		groupIconPicker.addSetting(setting => setting
			.setName(STRINGS.settings.maxSearchResults.name)
			.setDesc(STRINGS.settings.maxSearchResults.desc)
			.addSlider(slider => slider
				.setLimits(10, 300, 10)
				.setValue(this.plugin.settings.maxSearchResults)
				.setDynamicTooltip()
				.onChange(value => {
					this.plugin.settings.maxSearchResults = value;
					this.plugin.saveSettings();
				})
			)
		);

		// SETTING: Main color picker
		groupIconPicker.addSetting(setting => setting
			.setName(STRINGS.settings.colorPicker1.name)
			.setDesc(Platform.isDesktop
				? STRINGS.settings.colorPicker1.descDesktop
				: STRINGS.settings.colorPicker1.descMobile
			)
			.addExtraButton(indicator => {
				indicator.extraSettingsEl.addClass('iconic-indicator');
				this.indicators.colorPicker1 = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOption('list', STRINGS.settings.values.list)
				.addOption('rgb', STRINGS.settings.values.rgb)
				.setValue(this.plugin.settings.colorPicker1)
				.onChange(value => {
					this.refreshIndicator(this.indicators.colorPicker1, value);
					this.plugin.settings.colorPicker1 = value;
					this.plugin.saveSettings();
				})
				this.refreshIndicator(this.indicators.colorPicker1, dropdown.getValue());
			})
		);

		// SETTING: Second color picker
		groupIconPicker.addSetting(setting => setting
			.setName(STRINGS.settings.colorPicker2.name)
			.setDesc(Platform.isDesktop
				? STRINGS.settings.colorPicker2.descDesktop
				: STRINGS.settings.colorPicker2.descMobile
			)
			.addExtraButton(indicator => {
				indicator.extraSettingsEl.addClass('iconic-indicator');
				this.indicators.colorPicker2 = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOption('list', STRINGS.settings.values.list)
				.addOption('rgb', STRINGS.settings.values.rgb)
				.setValue(this.plugin.settings.colorPicker2)
				.onChange(value => {
					this.refreshIndicator(this.indicators.colorPicker2, value);
					this.plugin.settings.colorPicker2 = value;
					this.plugin.saveSettings();
				});
				this.refreshIndicator(this.indicators.colorPicker2, dropdown.getValue());
			})
		);

		// GROUP: Advanced
		const groupAdvanced = new SettingGroup(this.containerEl)
			.setHeading(STRINGS.settings.headingAdvanced);

		// SETTING: Colorless hover
		groupAdvanced.addSetting(setting => setting
			.setName(STRINGS.settings.uncolorHover.name)
			.setDesc(STRINGS.settings.uncolorHover.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.uncolorHover)
				.onChange(value => {
					this.plugin.settings.uncolorHover = value;
					this.plugin.saveSettings();
					this.plugin.refreshBody();
				})
			)
		);

		// SETTING: Colorless drag
		groupAdvanced.addSetting(setting => setting
			.setName(STRINGS.settings.uncolorDrag.name)
			.setDesc(STRINGS.settings.uncolorDrag.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.uncolorDrag)
				.onChange(value => {
					this.plugin.settings.uncolorDrag = value;
					this.plugin.saveSettings();
					this.plugin.refreshBody();
				})
			)
		);

		// SETTING: Colorless selection
		groupAdvanced.addSetting(setting => setting
			.setName(STRINGS.settings.uncolorSelect.name)
			.setDesc(STRINGS.settings.uncolorSelect.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.uncolorSelect)
				.onChange(value => {
					this.plugin.settings.uncolorSelect = value;
					this.plugin.saveSettings();
					this.plugin.refreshBody();
				})
			)
		);

		// SETTING: Colorless ribbon button
		groupAdvanced.addSetting(setting => setting
			.setName(STRINGS.settings.uncolorQuick.name)
			.setDesc(STRINGS.settings.uncolorQuick.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.uncolorQuick)
				.onChange(value => {
					this.plugin.settings.uncolorQuick = value;
					this.plugin.saveSettings();
					this.plugin.refreshManagers('ribbon');
				})
			)
		);

		// SETTING: Remember icons of deleted items
		groupAdvanced.addSetting(setting => setting
			.setName(STRINGS.settings.rememberDeletedItems.name)
			.setDesc(STRINGS.settings.rememberDeletedItems.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.rememberDeletedItems)
				.onChange(value => {
					this.plugin.settings.rememberDeletedItems = value;
					this.plugin.saveSettings();
				})
			)
		);
	}

	/**
	 * Change a dropdown indicator icon.
	 */
	private refreshIndicator(indicator: ExtraButtonComponent, value: string): void {
		switch (value) {
			case 'desktop': indicator.setIcon('lucide-monitor'); break;
			case 'mobile': indicator.setIcon('lucide-tablet-smartphone'); break;
			case 'list': indicator.setIcon('lucide-paint-bucket'); break;
			case 'rgb': indicator.setIcon('lucide-pipette'); break;
			default: indicator.extraSettingsEl.hide(); return;
		}
		indicator.extraSettingsEl.show();
	}
}
