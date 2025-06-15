import { ButtonComponent, Hotkey, Modal, Setting } from 'obsidian';
import IconicPlugin, { FileItem, STRINGS } from 'src/IconicPlugin';
import { RulePage } from 'src/managers/RuleManager';

/**
 * Dialog for previewing the items matched by a rule.
 */
export default class RuleChecker extends Modal {
	private readonly plugin: IconicPlugin;
	private readonly page: RulePage;
	private readonly matches: FileItem[];

	private constructor(plugin: IconicPlugin, page: RulePage, matches: FileItem[]) {
		super(plugin.app);
		this.plugin = plugin;
		this.page = page;
		this.matches = matches;

		// Allow hotkeys in rule checker
		for (const command of this.plugin.commands) if (command.callback) {
			const hotkeys: Hotkey[] = this.app.hotkeyManager.customKeys[command.id] ?? [];
			for (const hotkey of hotkeys) {
				this.scope.register(hotkey.modifiers, hotkey.key, command.callback);
			}
		}
	}

	/**
	 * Open a dialog to preview a list of matches.
	 */
	static open(plugin: IconicPlugin, page: RulePage, matches: FileItem[]): void {
		new RuleChecker(plugin, page, matches).open();
	}

	/**
	 * @override
	 */
	onOpen(): void {
		switch (this.page) {
			case 'file': {
				this.setTitle(this.matches.length === 1
					? STRINGS.ruleChecker.fileMatch
					: STRINGS.ruleChecker.filesMatch.replace('{#}', this.matches.length.toString())
				);
				break;
			}
			case 'folder': {
				this.setTitle(this.matches.length === 1
					? STRINGS.ruleChecker.folderMatch
					: STRINGS.ruleChecker.foldersMatch.replace('{#}', this.matches.length.toString())
				);
			}
		}
		this.containerEl.addClass('mod-confirmation');
		this.contentEl.addClass('iconic-highlight-tree');

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
				.setDisabled(this.page !== 'file')
				.onClick(() => {
					buttons.forEach(button => button.buttonEl.removeClass('iconic-button-selected'));
					button.buttonEl.addClass('iconic-button-selected');
					this.contentEl.removeClasses(['iconic-highlight-tree', 'iconic-highlight-name']);
					this.contentEl.addClass('iconic-highlight-extension');
				});
				buttons.push(button);
			});

		// HEADING: Matches
		new Setting(this.contentEl).setHeading().setName(STRINGS.ruleChecker.headingMatches);

		// LIST: Matches
		const listEl = this.contentEl.createEl('ol', { cls: 'iconic-matches' });
		for (const match of this.matches) {
			const { tree, basename, extension } = this.plugin.splitFilePath(match.id);
			const liEl = listEl.createEl('li', { cls: 'iconic-match' });
			if (tree) liEl.createSpan({ cls: 'iconic-match-tree', text: tree });
			if (basename) liEl.createSpan({ cls: 'iconic-match-name', text: basename });
			if (extension) {
				liEl.createSpan({ text: '.' });
				liEl.createSpan({ cls: 'iconic-match-extension', text: extension });
			}
		}
	}
}