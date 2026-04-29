import { ButtonComponent, Modal, Setting } from 'obsidian';
import IconicPlugin, { FileItem, STRINGS } from 'src/IconicPlugin.js';
import PathListComponent from 'src/components/PathListComponent.js';
import IconPicker from 'src/dialogs/IconPicker.js';

/**
 * Dialog for viewing unused icons found in the data file.
 */
export default class UsageChecker extends Modal {
	private readonly plugin: IconicPlugin;
	private readonly unusedIcons: Set<FileItem>;

	// Components
	private pathList!: PathListComponent;

	private constructor(plugin: IconicPlugin, unusedIcons: FileItem[]) {
		super(plugin.app);
		this.plugin = plugin;
		this.unusedIcons = new Set(unusedIcons);

		// Allow hotkeys in dialog
		for (const command of this.plugin.dialogCommands) if (command.callback) {
			// @ts-expect-error (Private API)
			const hotkeys: Hotkey[] = this.app.hotkeyManager?.customKeys?.[command.id] ?? [];
			for (const hotkey of hotkeys) {
				this.scope.register(hotkey.modifiers, hotkey.key, command.callback);
			}
		}
	}

	/**
	 * Open a dialog to view a list of unused icons.
	 */
	static open(plugin: IconicPlugin, unusedIcons: FileItem[]): void {
		new UsageChecker(plugin, unusedIcons).open();
	}

	/**
	 * @override
	 */
	async onOpen(): Promise<void> {
		this.containerEl.addClass('mod-confirmation');
		this.modalEl.addClass('iconic-rule-checker');
		this.contentEl.addClass('iconic-highlight-tree');
		this.setTitle(STRINGS.usageChecker.unusedIcons);

		// BUTTONS: Highlight
		const buttons: ButtonComponent[] = [];
		new Setting(this.contentEl).setName(STRINGS.ruleChecker.highlight)
			.addButton(button => { button
				.setButtonText(STRINGS.ruleEditor.source.tree)
				.onClick(() => {
					buttons.forEach(button => button.buttonEl.removeClass('iconic-button-selected'));
					button.buttonEl.addClass('iconic-button-selected');
					this.contentEl.addClass('iconic-highlight-tree');
					this.contentEl.removeClasses(['iconic-highlight-name', 'iconic-highlight-extension']);
				});
				button.buttonEl.addClass('iconic-button-selected');
				buttons.push(button);
			})
			.addButton(button => { button
				.setButtonText(STRINGS.ruleEditor.source.name)
				.onClick(() => {
					buttons.forEach(button => button.buttonEl.removeClass('iconic-button-selected'));
					button.buttonEl.addClass('iconic-button-selected');
					this.contentEl.removeClasses(['iconic-highlight-tree', 'iconic-highlight-extension']);
					this.contentEl.addClass('iconic-highlight-name');
				});
				buttons.push(button);
			})
			.addButton(button => { button
				.setButtonText(STRINGS.ruleEditor.source.extension)
				.onClick(() => {
					buttons.forEach(button => button.buttonEl.removeClass('iconic-button-selected'));
					button.buttonEl.addClass('iconic-button-selected');
					this.contentEl.removeClasses(['iconic-highlight-tree', 'iconic-highlight-name']);
					this.contentEl.addClass('iconic-highlight-extension');
				});
				buttons.push(button);
			});

		// LIST: Unused icons
		this.pathList = new PathListComponent(this.contentEl);
		for (const file of this.unusedIcons) {
			const { tree, basename, extension } = this.plugin.splitFilePath(file.id);
			this.pathList.addPath(path => path
				.setIcon(file.icon ?? null)
				.setIconColor(file.color ?? null)
				.setIconTooltip(STRINGS.iconPicker.changeIcon)
				.onIconClick(() => IconPicker.openSingle(this.plugin, file, (newIcon, newColor) => {
					this.plugin.saveFileIcon(file, newIcon, newColor);
					file.icon = newIcon;
					file.color = newColor;
					path.setIcon(newIcon);
					path.setIconColor(newColor);
				}))
				.setPathText(tree, basename, extension)
				.setRemoveTooltip(STRINGS.menu.removeIcon)
				.onRemoveClick(() => {
					this.plugin.saveFileIcon(file, null, null);
					this.unusedIcons.delete(file);
					path.pathEl.remove();
					if (this.unusedIcons.size === 0) this.addPlaceholderItem();
				})
			);
		}

		if (this.unusedIcons.size === 0) this.addPlaceholderItem();
	}

	private addPlaceholderItem(): void {
		this.pathList.addPath(path => path
			.setIcon('lucide-check')
			.setPathText('', STRINGS.usageChecker.noUnusedIconsFound)
			.setClass('iconic-placeholder')
		);
	}
}
