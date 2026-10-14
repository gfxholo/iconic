import { ExtraButtonComponent, Platform, PluginSettingTab, Setting, SettingDefinitionGroup, SettingDefinitionItem, SettingGroup, ToggleComponent } from 'obsidian';
import IconicPlugin, { FileItem, STRINGS } from 'src/IconicPlugin.js';
import RulePicker from 'src/dialogs/RulePicker.js';
import UsageChecker from 'src/dialogs/UsageChecker.js';
import ExternalLibraryManager from 'src/managers/ExternalLibraryManager.js';

/**
 * Exposes UI settings for the plugin.
 */
export default class IconicSettingTab extends PluginSettingTab {
	private readonly plugin: IconicPlugin;
	public icon = 'lucide-images';

	// Components
	private biggerIconsIndicator?: ExtraButtonComponent;
	private showItemNameIndicator?: ExtraButtonComponent;
	private clickableIconsIndicator?: ExtraButtonComponent;
	private useSearchKeywordsIndicator?: ExtraButtonComponent;
	private colorPickerIndicator1?: ExtraButtonComponent;
	private colorPickerIndicator2?: ExtraButtonComponent;
	private externalLibraryToggles: ToggleComponent[] = [];

	constructor(plugin: IconicPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	/**
	 * @override
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		// GROUP: Top
		const groupTop: SettingDefinitionGroup = { type: 'group', items: [] };

		// SETTING: Rules
		groupTop.items?.push({
			name: STRINGS.settings.rulebook.name,
			desc: STRINGS.settings.rulebook.desc,
			render: setting => { setting
				.addButton(button => { button
				.setButtonText(STRINGS.settings.manage)
				.onClick(() => {
					// Silently no-op if rulebook hasn't finished loading
					if (!this.plugin.ruleManager) return;
						// @ts-expect-error (Private API)
						this.app.setting.close();
						RulePicker.open(this.plugin);
					});
				});
			},
		});

		// SETTING: Bigger icons
		groupTop.items?.push({
			name: STRINGS.settings.biggerIcons.name,
			desc: STRINGS.settings.biggerIcons.desc,
			render: setting => { setting
				.addExtraButton(indicator => {
					indicator.extraSettingsEl.addClass('iconic-indicator');
					this.biggerIconsIndicator = indicator;
				})
				.addDropdown(dropdown => { dropdown
					.addOptions({ 
						on: STRINGS.settings.values.on,
						desktop: STRINGS.settings.values.desktop,
						mobile: STRINGS.settings.values.mobile,
						off: STRINGS.settings.values.off,
					})
					.setValue(this.plugin.settings.biggerIcons)
					.onChange(value => {
						this.refreshIndicator(this.biggerIconsIndicator, value);
						this.plugin.settings.biggerIcons = value;
						void this.plugin.saveSettings();
						this.plugin.refreshBody();
					});
					this.refreshIndicator(this.biggerIconsIndicator, dropdown.getValue());
				});
			},
		});

		// SETTING: Clickable icons
		groupTop.items?.push({
			name: Platform.isDesktop
				? STRINGS.settings.clickableIcons.nameDesktop
				: STRINGS.settings.clickableIcons.nameMobile,
			desc: Platform.isDesktop
				? STRINGS.settings.clickableIcons.descDesktop
				: STRINGS.settings.clickableIcons.descMobile,
			render: setting => { setting
				.addExtraButton(indicator => {
					indicator.extraSettingsEl.addClass('iconic-indicator');
					this.clickableIconsIndicator = indicator;
				})
				.addDropdown(dropdown => { dropdown
					.addOptions({ 
						on: STRINGS.settings.values.on,
						desktop: STRINGS.settings.values.desktop,
						mobile: STRINGS.settings.values.mobile,
						off: STRINGS.settings.values.off,
					})
					.setValue(this.plugin.settings.clickableIcons)
					.onChange(value => {
						this.refreshIndicator(this.clickableIconsIndicator, value);
						this.plugin.settings.clickableIcons = value;
						void this.plugin.saveSettings();
						this.plugin.refreshManagers();
						this.plugin.refreshBody();
					});
					this.refreshIndicator(this.clickableIconsIndicator, dropdown.getValue());
				});
			},
		});

		// GROUP: Sidebars & tabs
		const groupSidebarsAndTabs: SettingDefinitionGroup = {
			type: 'group',
			heading: STRINGS.settings.headingSidebarsAndTabs,
			items: [],
		};

		// SETTING: Show all file icons
		groupSidebarsAndTabs.items?.push({
			name: STRINGS.settings.showAllFileIcons.name,
			desc: STRINGS.settings.showAllFileIcons.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.showAllFileIcons)
					.onChange(value => {
						this.plugin.settings.showAllFileIcons = value;
						void this.plugin.saveSettings();
						this.plugin.refreshManagers('file');
					});
				});
			},
		});

		// SETTING: Minimal folder icons
		groupSidebarsAndTabs.items?.push({
			name: STRINGS.settings.minimalFolderIcons.name,
			desc: STRINGS.settings.minimalFolderIcons.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.minimalFolderIcons)
					.onChange(value => {
						this.plugin.settings.minimalFolderIcons = value;
						void this.plugin.saveSettings();
						this.plugin.refreshManagers('folder');
					});
				});
			},
		});

		// SETTING: Show Markdown tab icons
		groupSidebarsAndTabs.items?.push({
			name: STRINGS.settings.showMarkdownTabIcons.name,
			desc: STRINGS.settings.showMarkdownTabIcons.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.showMarkdownTabIcons)
					.onChange(value => {
						this.plugin.settings.showMarkdownTabIcons = value;
						void this.plugin.saveSettings();
						this.plugin.refreshBody();
					});
				});
			},
		});

		// GROUP: Editor
		const groupEditor: SettingDefinitionGroup = {
			type: 'group',
			heading: STRINGS.settings.headingEditor,
			items: [],
		};

		// SETTING: Show title icons
		groupEditor.items?.push({
			name: STRINGS.settings.showTitleIcons.name,
			desc: STRINGS.settings.showTitleIcons.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.showTitleIcons)
					.onChange(value => {
						this.plugin.settings.showTitleIcons = value;
						void this.plugin.saveSettings();
						this.plugin.refreshManagers('file');
					});
				});
			},
		});

		// SETTING: Show tag pill icons
		groupEditor.items?.push({
			name: STRINGS.settings.showTagPillIcons.name,
			desc: STRINGS.settings.showTagPillIcons.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.showTagPillIcons)
					.onChange(value => {
						this.plugin.settings.showTagPillIcons = value;
						void this.plugin.saveSettings();
						this.plugin.refreshManagers('tag');
					});
				});
			},
		});

		// GROUP: Menus & dialogs
		const groupMenusAndDialogs: SettingDefinitionGroup = {
			type: 'group',
			heading: STRINGS.settings.headingMenusAndDialogs,
			items: [],
		};

		// SETTING: Show menu actions
		groupMenusAndDialogs.items?.push({
			name: STRINGS.settings.showMenuActions.name,
			desc: STRINGS.settings.showMenuActions.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.showMenuActions)
					.onChange(value => {
						this.plugin.settings.showMenuActions = value;
						void this.plugin.saveSettings();
						this.plugin.refreshManagers();
					});
				});
			},
		});

		// SETTING: Show suggestion icons
		groupMenusAndDialogs.items?.push({
			name: STRINGS.settings.showSuggestionIcons.name,
			desc: STRINGS.settings.showSuggestionIcons.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.showSuggestionIcons)
					.onChange(value => {
						this.plugin.settings.showSuggestionIcons = value;
						void this.plugin.saveSettings();
					});
				});
			},
		});

		// SETTING: Show quick switcher icons
		groupMenusAndDialogs.items?.push({
			name: STRINGS.settings.showQuickSwitcherIcons.name,
			desc: STRINGS.settings.showQuickSwitcherIcons.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.showQuickSwitcherIcons)
					.onChange(value => {
						this.plugin.settings.showQuickSwitcherIcons = value;
						void this.plugin.saveSettings();
					});
				});
			},
		});

		// SETTING: Show “Move file” dialog icons
		groupMenusAndDialogs.items?.push({
			name: STRINGS.settings.showMoveFileIcons.name,
			desc: STRINGS.settings.showMoveFileIcons.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.showMoveFileIcons)
					.onChange(value => {
						this.plugin.settings.showMoveFileIcons = value;
						void this.plugin.saveSettings();
					});
				});
			},
		});

		// GROUP: Icon picker
		const groupIconPicker: SettingDefinitionGroup = {
			type: 'group',
			heading: STRINGS.settings.headingIconPicker,
			items: [],
		};

		// SETTING: Show item name
		groupIconPicker.items?.push({
			name: STRINGS.settings.showItemName.name,
			desc: STRINGS.settings.showItemName.desc,
			render: setting => { setting
				.addExtraButton(indicator => {
					indicator.extraSettingsEl.addClass('iconic-indicator');
					this.showItemNameIndicator = indicator;
				})
				.addDropdown(dropdown => { dropdown
					.addOptions({
						on: STRINGS.settings.values.on,
						desktop: STRINGS.settings.values.desktop,
						mobile: STRINGS.settings.values.mobile,
						off: STRINGS.settings.values.off,
					})
					.setValue(this.plugin.settings.showItemName)
					.onChange(value => {
						this.refreshIndicator(this.showItemNameIndicator, value);
						this.plugin.settings.showItemName = value;
						void this.plugin.saveSettings();
					});
					this.refreshIndicator(this.showItemNameIndicator, dropdown.getValue());
				});
			},
		});

		// SETTING: Use search keywords
		groupIconPicker.items?.push({
			name: STRINGS.settings.useSearchKeywords.name,
			desc: STRINGS.settings.useSearchKeywords.desc,
			render: setting => { setting
				.addExtraButton(indicator => {
					indicator.extraSettingsEl.addClass('iconic-indicator');
					this.useSearchKeywordsIndicator = indicator;
				})
				.addDropdown(dropdown => { dropdown
					.addOptions({
						on: STRINGS.settings.values.on,
						desktop: STRINGS.settings.values.desktop,
						mobile: STRINGS.settings.values.mobile,
						off: STRINGS.settings.values.off,
					})
					.setValue(this.plugin.settings.useSearchKeywords)
					.onChange(value => {
						this.refreshIndicator(this.useSearchKeywordsIndicator, value);
						this.plugin.settings.useSearchKeywords = value;
						void this.plugin.saveSettings();
						this.plugin.refreshBody();
					});
					this.refreshIndicator(this.useSearchKeywordsIndicator, dropdown.getValue());
				});
			},
		});

		// SETTING: Maximum search results
		groupIconPicker.items?.push({
			name: STRINGS.settings.maxSearchResults.name,
			desc: STRINGS.settings.maxSearchResults.desc,
			control: {
				type: 'slider', 
				key: 'maxSearchResults',
				min: 50,
				max: 300,
				step: 10,
			},
		});

		// SETTING: Main color picker
		groupIconPicker.items?.push({
			name: STRINGS.settings.colorPicker1.name,
			desc: Platform.isDesktop
				? STRINGS.settings.colorPicker1.descDesktop
				: STRINGS.settings.colorPicker1.descMobile,
			render: setting => { setting
				.addExtraButton(indicator => {
					indicator.extraSettingsEl.addClass('iconic-indicator');
					this.colorPickerIndicator1 = indicator;
				})
				.addDropdown(dropdown => { dropdown
					.addOptions({
						list: STRINGS.settings.values.list,
						rgb: STRINGS.settings.values.rgb,
					})
					.setValue(this.plugin.settings.colorPicker1)
					.onChange(value => {
						this.refreshIndicator(this.colorPickerIndicator1, value);
						this.plugin.settings.colorPicker1 = value;
						void this.plugin.saveSettings();
					});
					this.refreshIndicator(this.colorPickerIndicator1, dropdown.getValue());
				});
			},
		});

		// SETTING: Second color picker
		groupIconPicker.items?.push({
			name: STRINGS.settings.colorPicker2.name,
			desc: Platform.isDesktop
				? STRINGS.settings.colorPicker2.descDesktop
				: STRINGS.settings.colorPicker2.descMobile,
			render: setting => { setting
				.addExtraButton(indicator => {
					indicator.extraSettingsEl.addClass('iconic-indicator');
					this.colorPickerIndicator2 = indicator;
				})
				.addDropdown(dropdown => { dropdown
					.addOptions({
						list: STRINGS.settings.values.list,
						rgb: STRINGS.settings.values.rgb,
					})
					.setValue(this.plugin.settings.colorPicker2)
					.onChange(value => {
						this.refreshIndicator(this.colorPickerIndicator2, value);
						this.plugin.settings.colorPicker2 = value;
						void this.plugin.saveSettings();
					});
					this.refreshIndicator(this.colorPickerIndicator2, dropdown.getValue());
				});
			},
		});

		// GROUP: External libraries
		this.externalLibraryToggles = [];
		const groupExternalLibraries: SettingDefinitionGroup = {
			type: 'group',
			heading: STRINGS.settings.headingExternalLibraries,
			items: [],
		};

		// SETTING: Enable external libraries
		groupExternalLibraries.items?.push({
			name: STRINGS.settings.enableExternalLibraries.name,
			desc: STRINGS.settings.enableExternalLibraries.desc,
			render: setting => { setting
				.addToggle(toggle => this.bindExternalLibrariesMasterToggle(toggle));
			},
		});

		// SETTING: Imported libraries
		groupExternalLibraries.items?.push({
			name: STRINGS.settings.headingExternalLibraries,
			aliases: ExternalLibraryManager.getLibraries().map(library => library.name),
			render: setting => this.renderExternalLibraryGrid(setting),
		});

		// GROUP: Advanced
		const groupAdvanced: SettingDefinitionGroup = {
			type: 'group',
			heading: STRINGS.settings.headingAdvanced,
			items: [],
		};

		// SETTING: Colorless hover
		groupAdvanced.items?.push({
			name: STRINGS.settings.uncolorHover.name,
			desc: STRINGS.settings.uncolorHover.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.uncolorHover)
					.onChange(value => {
						this.plugin.settings.uncolorHover = value;
						void this.plugin.saveSettings();
						this.plugin.refreshBody();
					});
				});
			},
		});

		// SETTING: Colorless drag
		groupAdvanced.items?.push({
			name: STRINGS.settings.uncolorDrag.name,
			desc: STRINGS.settings.uncolorDrag.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.uncolorDrag)
					.onChange(value => {
						this.plugin.settings.uncolorDrag = value;
						void this.plugin.saveSettings();
						this.plugin.refreshBody();
					});
				});
			},
		});

		// SETTING: Colorless selection
		groupAdvanced.items?.push({
			name: STRINGS.settings.uncolorSelect.name,
			desc: STRINGS.settings.uncolorSelect.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.uncolorSelect)
					.onChange(value => {
						this.plugin.settings.uncolorSelect = value;
						void this.plugin.saveSettings();
						this.plugin.refreshBody();
					});
				});
			},
		});

		// SETTING: Colorless ribbon button
		groupAdvanced.items?.push({
			name: STRINGS.settings.uncolorQuick.name,
			desc: STRINGS.settings.uncolorQuick.desc,
			render: setting => { setting
				.addToggle(toggle => { toggle
					.setValue(this.plugin.settings.uncolorQuick)
					.onChange(value => {
						this.plugin.settings.uncolorQuick = value;
						void this.plugin.saveSettings();
						this.plugin.refreshManagers('ribbon');
					});
				});
			},
		});

		// SETTING: View unused icons
		groupAdvanced.items?.push({
			name: STRINGS.settings.viewUnusedIcons.name,
			desc: STRINGS.settings.viewUnusedIcons.desc,
			render: setting => { setting
				.addButton(button => { button
					.setButtonText(STRINGS.settings.manage)
					.onClick(async () => {
						const unusedIcons: FileItem[] = [];
						for (const fileId of Object.keys(this.plugin.settings.fileIcons)) {
							if (!await this.app.vault.adapter.exists(fileId)) {
								const file = this.plugin.getFileItem(fileId);
								unusedIcons.push(file);
							}
						}
						UsageChecker.open(this.plugin, unusedIcons);
					});
				});
			},
		});

		// SETTING: Maximum automatic backups
		groupAdvanced.items?.push({
			name: STRINGS.settings.maxBackups.name,
			desc: STRINGS.settings.maxBackups.desc,
			render: setting => { setting
				.then(setting => {
					if (Platform.isDesktop) setting.addExtraButton(button => { button
						.setIcon('lucide-folder-open')
						.setTooltip(STRINGS.settings.maxBackups.openPluginFolder)
						.onClick(() => {
							// @ts-expect-error (Private API)
							this.app.openWithDefaultApp(this.plugin.manifest.dir ?? '');
						});
					});
				})
				.addDropdown(dropdown => { dropdown
					.addOptions({
						0: STRINGS.settings.values.none,
						1: '1',
						2: '2',
						3: '3',
						4: '4',
						5: '5',
						6: '6',
						7: '7',
						8: '8',
						9: '9',
					})
					.setValue(this.plugin.settings.maxBackups.toString())
					.onChange(value => {
						this.plugin.settings.maxBackups = Number(value) || 0;
						void this.plugin.saveSettings();
					});
				});
			},
		});

		return [
			groupTop,
			groupSidebarsAndTabs,
			groupEditor,
			groupMenusAndDialogs,
			groupIconPicker,
			groupExternalLibraries,
			groupAdvanced,
		];
	}

	/**
	 * @override
	 */
	display(): void {
		this.containerEl.empty();

		// GROUP: Top
		const groupTop = new SettingGroup(this.containerEl);

		// SETTING: Rulebook
		groupTop.addSetting(setting => { setting
			.setName(STRINGS.settings.rulebook.name)
			.setDesc(STRINGS.settings.rulebook.desc)
			.addButton(button => { button
				.setButtonText(STRINGS.settings.manage)
				.onClick(() => {
					// Silently no-op if rulebook hasn't finished loading
					if (!this.plugin.ruleManager) return;
					// @ts-expect-error (Private API)
					this.app.setting.close();
					RulePicker.open(this.plugin);
				});
			});
		});

		// SETTING: Bigger icons
		groupTop.addSetting(setting => { setting
			.setName(STRINGS.settings.biggerIcons.name)
			.setDesc(STRINGS.settings.biggerIcons.desc)
			.addExtraButton(indicator => {
				indicator.extraSettingsEl.addClass('iconic-indicator');
				this.biggerIconsIndicator = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOptions({ 
					on: STRINGS.settings.values.on,
					desktop: STRINGS.settings.values.desktop,
					mobile: STRINGS.settings.values.mobile,
					off: STRINGS.settings.values.off,
				})
				.setValue(this.plugin.settings.biggerIcons)
				.onChange(value => {
					this.refreshIndicator(this.biggerIconsIndicator, value);
					this.plugin.settings.biggerIcons = value;
					void this.plugin.saveSettings();
					this.plugin.refreshBody();
				});
				this.refreshIndicator(this.biggerIconsIndicator, dropdown.getValue());
			});
		});

		// SETTING: Clickable icons
		groupTop.addSetting(setting => { setting
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
				this.clickableIconsIndicator = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOptions({ 
					on: STRINGS.settings.values.on,
					desktop: STRINGS.settings.values.desktop,
					mobile: STRINGS.settings.values.mobile,
					off: STRINGS.settings.values.off,
				})
				.setValue(this.plugin.settings.clickableIcons)
				.onChange(value => {
					this.refreshIndicator(this.clickableIconsIndicator, value);
					this.plugin.settings.clickableIcons = value;
					void this.plugin.saveSettings();
					this.plugin.refreshManagers();
					this.plugin.refreshBody();
				});
				this.refreshIndicator(this.clickableIconsIndicator, dropdown.getValue());
			});
		});

		// GROUP: Sidebars & tabs
		const groupSidebarsAndTabs = new SettingGroup(this.containerEl)
			.setHeading(STRINGS.settings.headingSidebarsAndTabs);

		// SETTING: Show all file icons
		groupSidebarsAndTabs.addSetting(setting => { setting
			.setName(STRINGS.settings.showAllFileIcons.name)
			.setDesc(STRINGS.settings.showAllFileIcons.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.showAllFileIcons)
				.onChange(value => {
					this.plugin.settings.showAllFileIcons = value;
					void this.plugin.saveSettings();
					this.plugin.refreshManagers('file');
				});
			});
		});

		// SETTING: Show all folder icons
		groupSidebarsAndTabs.addSetting(setting => { setting
			.setName(STRINGS.settings.showAllFolderIcons.name)
			.setDesc(STRINGS.settings.showAllFolderIcons.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.showAllFolderIcons)
				.onChange(value => {
					this.plugin.settings.showAllFolderIcons = value;
					void this.plugin.saveSettings();
					this.plugin.refreshManagers('folder');
				});
			});
		});

		// SETTING: Minimal folder icons
		groupSidebarsAndTabs.addSetting(setting => { setting
			.setName(STRINGS.settings.minimalFolderIcons.name)
			.setDesc(STRINGS.settings.minimalFolderIcons.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.minimalFolderIcons)
				.onChange(value => {
					this.plugin.settings.minimalFolderIcons = value;
					void this.plugin.saveSettings();
					this.plugin.refreshManagers('folder');
				});
			});
		});

		// SETTING: Show Markdown tab icons
		groupSidebarsAndTabs.addSetting(setting => { setting
			.setName(STRINGS.settings.showMarkdownTabIcons.name)
			.setDesc(STRINGS.settings.showMarkdownTabIcons.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.showMarkdownTabIcons)
				.onChange(value => {
					this.plugin.settings.showMarkdownTabIcons = value;
					void this.plugin.saveSettings();
					this.plugin.refreshBody();
				});
			});
		});

		// GROUP: Editor
		const groupEditor = new SettingGroup(this.containerEl)
			.setHeading(STRINGS.settings.headingEditor);

		// SETTING: Show title icons
		groupEditor.addSetting(setting => { setting
			.setName(STRINGS.settings.showTitleIcons.name)
			.setDesc(STRINGS.settings.showTitleIcons.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.showTitleIcons)
				.onChange(value => {
					this.plugin.settings.showTitleIcons = value;
					void this.plugin.saveSettings();
					this.plugin.refreshManagers('file');
				});
			});
		});

		// SETTING: Show tag pill icons
		groupEditor.addSetting(setting => { setting
			.setName(STRINGS.settings.showTagPillIcons.name)
			.setDesc(STRINGS.settings.showTagPillIcons.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.showTagPillIcons)
				.onChange(value => {
					this.plugin.settings.showTagPillIcons = value;
					void this.plugin.saveSettings();
					this.plugin.refreshManagers('tag');
				});
			});
		});

		// GROUP: Menus & dialogs
		const groupMenusAndDialogs = new SettingGroup(this.containerEl)
			.setHeading(STRINGS.settings.headingMenusAndDialogs);

		// SETTING: Show menu actions
		groupMenusAndDialogs.addSetting(setting => { setting
			.setName(STRINGS.settings.showMenuActions.name)
			.setDesc(STRINGS.settings.showMenuActions.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.showMenuActions)
				.onChange(value => {
					this.plugin.settings.showMenuActions = value;
					void this.plugin.saveSettings();
					this.plugin.refreshManagers();
				});
			});
		});

		// SETTING: Show suggestion icons
		groupMenusAndDialogs.addSetting(setting => { setting
			.setName(STRINGS.settings.showSuggestionIcons.name)
			.setDesc(STRINGS.settings.showSuggestionIcons.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.showSuggestionIcons)
				.onChange(value => {
					this.plugin.settings.showSuggestionIcons = value;
					void this.plugin.saveSettings();
				});
			});
		});

		// SETTING: Show quick switcher icons
		groupMenusAndDialogs.addSetting(setting => { setting
			.setName(STRINGS.settings.showQuickSwitcherIcons.name)
			.setDesc(STRINGS.settings.showQuickSwitcherIcons.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.showQuickSwitcherIcons)
				.onChange(value => {
					this.plugin.settings.showQuickSwitcherIcons = value;
					void this.plugin.saveSettings();
				});
			});
		});

		// SETTING: Show “Move file” dialog icons
		groupMenusAndDialogs.addSetting(setting => { setting
			.setName(STRINGS.settings.showMoveFileIcons.name)
			.setDesc(STRINGS.settings.showMoveFileIcons.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.showMoveFileIcons)
				.onChange(value => {
					this.plugin.settings.showMoveFileIcons = value;
					void this.plugin.saveSettings();
				});
			});
		});

		// GROUP: Icon picker
		const groupIconPicker = new SettingGroup(this.containerEl)
			.setHeading(STRINGS.settings.headingIconPicker);

		// SETTING: Show item name
		groupIconPicker.addSetting(setting => { setting
			.setName(STRINGS.settings.showItemName.name)
			.setDesc(STRINGS.settings.showItemName.desc)
			.addExtraButton(indicator => {
				indicator.extraSettingsEl.addClass('iconic-indicator');
				this.showItemNameIndicator = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOptions({ 
					on: STRINGS.settings.values.on,
					desktop: STRINGS.settings.values.desktop,
					mobile: STRINGS.settings.values.mobile,
					off: STRINGS.settings.values.off,
				})
				.setValue(this.plugin.settings.showItemName)
				.onChange(value => {
					this.refreshIndicator(this.showItemNameIndicator, value);
					this.plugin.settings.showItemName = value;
					void this.plugin.saveSettings();
				});
				this.refreshIndicator(this.showItemNameIndicator, dropdown.getValue());
			});
		});

		// SETTING: Use search keywords
		groupIconPicker.addSetting(setting => { setting
			.setName(STRINGS.settings.useSearchKeywords.name)
			.setDesc(STRINGS.settings.useSearchKeywords.desc)
			.addExtraButton(indicator => {
				indicator.extraSettingsEl.addClass('iconic-indicator');
				this.useSearchKeywordsIndicator = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOptions({ 
					on: STRINGS.settings.values.on,
					desktop: STRINGS.settings.values.desktop,
					mobile: STRINGS.settings.values.mobile,
					off: STRINGS.settings.values.off,
				})
				.setValue(this.plugin.settings.useSearchKeywords)
				.onChange(value => {
					this.refreshIndicator(this.useSearchKeywordsIndicator, value);
					this.plugin.settings.useSearchKeywords = value;
					void this.plugin.saveSettings();
					this.plugin.refreshBody();
				});
				this.refreshIndicator(this.useSearchKeywordsIndicator, dropdown.getValue());
			});
		});

		// SETTING: Maximum search results
		groupIconPicker.addSetting(setting => { setting
			.setName(STRINGS.settings.maxSearchResults.name)
			.setDesc(STRINGS.settings.maxSearchResults.desc)
			.addSlider(slider => { slider
				.setLimits(50, 500, 10)
				.setValue(this.plugin.settings.maxSearchResults)
				.onChange(value => {
					this.plugin.settings.maxSearchResults = value;
					void this.plugin.saveSettings();
				});
			});
		});

		// SETTING: Main color picker
		groupIconPicker.addSetting(setting => { setting
			.setName(STRINGS.settings.colorPicker1.name)
			.setDesc(Platform.isDesktop
				? STRINGS.settings.colorPicker1.descDesktop
				: STRINGS.settings.colorPicker1.descMobile
			)
			.addExtraButton(indicator => {
				indicator.extraSettingsEl.addClass('iconic-indicator');
				this.colorPickerIndicator1 = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOptions({
					list: STRINGS.settings.values.list,
					rgb: STRINGS.settings.values.rgb,
				})
				.setValue(this.plugin.settings.colorPicker1)
				.onChange(value => {
					this.refreshIndicator(this.colorPickerIndicator1, value);
					this.plugin.settings.colorPicker1 = value;
					void this.plugin.saveSettings();
				});
				this.refreshIndicator(this.colorPickerIndicator1, dropdown.getValue());
			});
		});

		// SETTING: Second color picker
		groupIconPicker.addSetting(setting => { setting
			.setName(STRINGS.settings.colorPicker2.name)
			.setDesc(Platform.isDesktop
				? STRINGS.settings.colorPicker2.descDesktop
				: STRINGS.settings.colorPicker2.descMobile
			)
			.addExtraButton(indicator => {
				indicator.extraSettingsEl.addClass('iconic-indicator');
				this.colorPickerIndicator2 = indicator;
			})
			.addDropdown(dropdown => { dropdown
				.addOptions({
					list: STRINGS.settings.values.list,
					rgb: STRINGS.settings.values.rgb,
				})
				.setValue(this.plugin.settings.colorPicker2)
				.onChange(value => {
					this.refreshIndicator(this.colorPickerIndicator2, value);
					this.plugin.settings.colorPicker2 = value;
					void this.plugin.saveSettings();
				});
				this.refreshIndicator(this.colorPickerIndicator2, dropdown.getValue());
			});
		});

		// GROUP: External libraries
		this.externalLibraryToggles = [];
		const groupExternalLibraries = new SettingGroup(this.containerEl)
			.setHeading(STRINGS.settings.headingExternalLibraries);

		// SETTING: Enable external libraries
		groupExternalLibraries.addSetting(setting => { setting
			.setName(STRINGS.settings.enableExternalLibraries.name)
			.setDesc(STRINGS.settings.enableExternalLibraries.desc)
			.addToggle(toggle => this.bindExternalLibrariesMasterToggle(toggle));
		});

		// SETTING: Imported libraries
		groupExternalLibraries.addSetting(setting => this.renderExternalLibraryGrid(setting));

		// GROUP: Advanced
		const groupAdvanced = new SettingGroup(this.containerEl)
			.setHeading(STRINGS.settings.headingAdvanced);

		// SETTING: Colorless hover
		groupAdvanced.addSetting(setting => { setting
			.setName(STRINGS.settings.uncolorHover.name)
			.setDesc(STRINGS.settings.uncolorHover.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.uncolorHover)
				.onChange(value => {
					this.plugin.settings.uncolorHover = value;
					void this.plugin.saveSettings();
					this.plugin.refreshBody();
				});
			});
		});

		// SETTING: Colorless drag
		groupAdvanced.addSetting(setting => { setting
			.setName(STRINGS.settings.uncolorDrag.name)
			.setDesc(STRINGS.settings.uncolorDrag.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.uncolorDrag)
				.onChange(value => {
					this.plugin.settings.uncolorDrag = value;
					void this.plugin.saveSettings();
					this.plugin.refreshBody();
				});
			});
		});

		// SETTING: Colorless selection
		groupAdvanced.addSetting(setting => { setting
			.setName(STRINGS.settings.uncolorSelect.name)
			.setDesc(STRINGS.settings.uncolorSelect.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.uncolorSelect)
				.onChange(value => {
					this.plugin.settings.uncolorSelect = value;
					void this.plugin.saveSettings();
					this.plugin.refreshBody();
				})
			});
		});

		// SETTING: Colorless ribbon button
		groupAdvanced.addSetting(setting => { setting
			.setName(STRINGS.settings.uncolorQuick.name)
			.setDesc(STRINGS.settings.uncolorQuick.desc)
			.addToggle(toggle => { toggle
				.setValue(this.plugin.settings.uncolorQuick)
				.onChange(value => {
					this.plugin.settings.uncolorQuick = value;
					void this.plugin.saveSettings();
					this.plugin.refreshManagers('ribbon');
				});
			});
		});

		// SETTING: View unused icons
		groupAdvanced.addSetting(setting => { setting
			.setName(STRINGS.settings.viewUnusedIcons.name)
			.setDesc(STRINGS.settings.viewUnusedIcons.desc)
			.addButton(button => { button
				.setButtonText(STRINGS.settings.manage)
				.onClick(async () => {
					const unusedIcons: FileItem[] = [];
					for (const fileId of Object.keys(this.plugin.settings.fileIcons)) {
						if (!await this.app.vault.adapter.exists(fileId)) {
							const file = this.plugin.getFileItem(fileId);
							unusedIcons.push(file);
						}
					}
					UsageChecker.open(this.plugin, unusedIcons);
				});
			});
		});

		// SETTING: Maximum automatic backups
		groupAdvanced.addSetting(setting => { setting
			.setName(STRINGS.settings.maxBackups.name)
			.setDesc(STRINGS.settings.maxBackups.desc)
			.then(setting => {
				if (Platform.isDesktop) setting.addExtraButton(button => { button
					.setIcon('lucide-folder-open')
					.setTooltip(STRINGS.settings.maxBackups.openPluginFolder)
					.onClick(() => {
						// @ts-expect-error (Private API)
						this.app.openWithDefaultApp(this.plugin.manifest.dir ?? '');
					});
				});
			})
			.addDropdown(dropdown => { dropdown
				.addOptions({
					0: STRINGS.settings.values.none,
					1: '1',
					2: '2',
					3: '3',
					4: '4',
					5: '5',
					6: '6',
					7: '7',
					8: '8',
					9: '9',
				})
				.setValue(this.plugin.settings.maxBackups.toString())
				.onChange(value => {
					this.plugin.settings.maxBackups = Number(value) || 0;
					void this.plugin.saveSettings();
				});
			});
		});
	}

	/**
	 * Change a dropdown indicator icon.
	 */
	private refreshIndicator(indicator: ExtraButtonComponent | undefined, value: string): void {
		if (!indicator) return;
		switch (value) {
			case 'desktop': indicator.setIcon('lucide-monitor'); break;
			case 'mobile': indicator.setIcon('lucide-tablet-smartphone'); break;
			case 'list': indicator.setIcon('lucide-paint-bucket'); break;
			case 'rgb': indicator.setIcon('lucide-pipette'); break;
			default: indicator.extraSettingsEl.hide(); return;
		}
		indicator.extraSettingsEl.show();
	}

	/**
	 * Render the list of supported external libraries as a grid of toggle
	 * cells, each cell holding a single library's name and enable toggle.
	 */
	private renderExternalLibraryGrid(setting: Setting): void {
		setting.setClass('iconic-library-row');
		setting.infoEl.hide();
		setting.controlEl.hide();
		const grid = setting.settingEl.createDiv({ cls: 'iconic-library-grid' });
		for (const library of ExternalLibraryManager.getLibraries()) {
			const cell = grid.createDiv({ cls: 'iconic-library-cell' });
			cell.createSpan({ cls: 'iconic-library-name', text: library.name });
			this.bindExternalLibraryToggle(new ToggleComponent(cell), library.id);
		}
	}

	/**
	 * Bind the master toggle for external libraries, which enables or
	 * disables support for all external libraries at once.
	 */
	private bindExternalLibrariesMasterToggle(toggle: ToggleComponent): void {
		toggle
			.setValue(this.plugin.settings.enableExternalLibraries)
			.onChange(value => {
				this.plugin.settings.enableExternalLibraries = value;
				void this.plugin.saveSettings();
				void ExternalLibraryManager.refresh(this.plugin);
				for (const libraryToggle of this.externalLibraryToggles) {
					libraryToggle.setDisabled(!value);
				}
			});
	}

	/**
	 * Bind the toggle of a single external library, which controls whether
	 * that library's icons are imported.
	 */
	private bindExternalLibraryToggle(toggle: ToggleComponent, libraryId: string): void {
		toggle
			.setValue(this.plugin.settings.externalLibraries.includes(libraryId))
			.setDisabled(!this.plugin.settings.enableExternalLibraries)
			.onChange(value => {
				if (value) {
					if (!this.plugin.settings.externalLibraries.includes(libraryId)) {
						this.plugin.settings.externalLibraries.push(libraryId);
					}
				} else {
					this.plugin.settings.externalLibraries = this.plugin.settings.externalLibraries.filter(id => id !== libraryId);
				}
				void this.plugin.saveSettings();
				void ExternalLibraryManager.refresh(this.plugin);
			});
		this.externalLibraryToggles.push(toggle);
	}
}
