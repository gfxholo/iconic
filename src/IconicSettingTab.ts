import { ExtraButtonComponent, Platform, PluginSettingTab, Setting } from 'obsidian';
import IconicPlugin, { STRINGS } from './IconicPlugin';

/**
 * Exposes UI settings for the plugin.
 */
export default class IconicSettingTab extends PluginSettingTab {
	private readonly plugin: IconicPlugin;
	private readonly indicators: {
		biggerIcons: ExtraButtonComponent,
		clickableIcons: ExtraButtonComponent,
		showItemName: ExtraButtonComponent,
		biggerSearchResults: ExtraButtonComponent,
		colorPicker1: ExtraButtonComponent,
		colorPicker2: ExtraButtonComponent,
	} = {} as any;

	constructor(plugin: IconicPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	/**
	 * @override
	 */
	display(): void {
		this.containerEl.empty();

		// HEADING: Lists & tabs
		new Setting(this.containerEl).setName(STRINGS.settings.headingListsAndTabs).setHeading();

		// Bigger icons
		new Setting(this.containerEl)
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
					this.plugin.refreshBodyClasses();
				});
				this.refreshIndicator(this.indicators.biggerIcons, dropdown.getValue());
			});

		// Clickable icons
		new Setting(this.containerEl)
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
					this.plugin.refreshIconManagers();
					this.plugin.refreshBodyClasses();
				});
				this.refreshIndicator(this.indicators.clickableIcons, dropdown.getValue());
			});

		// Show all file icons
		new Setting(this.containerEl)
			.setName(STRINGS.settings.showAllFileIcons.name)
			.setDesc(STRINGS.settings.showAllFileIcons.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showAllFileIcons)
				.onChange(value => {
					this.plugin.settings.showAllFileIcons = value;
					this.plugin.saveSettings();
					this.plugin.tabIconManager?.refreshIcons();
					this.plugin.fileIconManager?.refreshIcons();
				})
			);

		// HEADING: Icon picker
		new Setting(this.containerEl).setName(STRINGS.settings.headingIconPicker).setHeading();

		// Show item name
		new Setting(this.containerEl)
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
			});

		// Bigger search results
		new Setting(this.containerEl)
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
					this.plugin.refreshBodyClasses();
				});
				this.refreshIndicator(this.indicators.biggerSearchResults, dropdown.getValue());
			});

		// Max search results
		new Setting(this.containerEl)
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
			);

		// Main color picker
		new Setting(this.containerEl)
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
			});

		// Second color picker
		new Setting(this.containerEl)
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
			});

		// HEADING: Advanced
		new Setting(this.containerEl).setHeading().setName(STRINGS.settings.headingAdvanced);

		// Uncolored hover
		new Setting(this.containerEl)
			.setName(STRINGS.settings.uncolorHover.name)
			.setDesc(STRINGS.settings.uncolorHover.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.uncolorHover)
				.onChange(value => {
					this.plugin.settings.uncolorHover = value;
					this.plugin.saveSettings();
					this.plugin.refreshBodyClasses();
				})
			);

		// Uncolored selection
		new Setting(this.containerEl)
			.setName(STRINGS.settings.uncolorSelect.name)
			.setDesc(STRINGS.settings.uncolorSelect.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.uncolorSelect)
				.onChange(value => {
					this.plugin.settings.uncolorSelect = value;
					this.plugin.saveSettings();
					this.plugin.refreshBodyClasses();
				})
			);

		// Remember icons of deleted items
		new Setting(this.containerEl)
			.setName(STRINGS.settings.rememberDeletedItems.name)
			.setDesc(STRINGS.settings.rememberDeletedItems.desc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.rememberDeletedItems)
				.onChange(value => {
					this.plugin.settings.rememberDeletedItems = value;
					this.plugin.saveSettings();
				})
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
