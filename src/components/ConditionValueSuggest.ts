import { AbstractInputSuggest, TextComponent, prepareFuzzySearch } from 'obsidian';
import IconicPlugin, { Category } from 'src/IconicPlugin';
import { ConditionItem } from 'src/managers/RuleManager';

const SUGGEST_FILE_NAMES = 'file-name';
const SUGGEST_FILE_FILENAMES = 'file-filename';
const SUGGEST_FILE_EXTENSIONS = 'file-extension';
const SUGGEST_FILE_PATHS = 'file-path';

const SUGGEST_FOLDER_NAMES = 'folder-name';
const SUGGEST_FOLDER_PATHS = 'folder-path';

/**
 * Popover that suggests values for a rule condition.
 */
export default class ConditionValueSuggest extends AbstractInputSuggest<any> {
	private readonly page: Category;
	private readonly condition: ConditionItem;
	private readonly inputComponent: TextComponent;

	constructor(plugin: IconicPlugin, page: Category, condition: ConditionItem, inputComponent: TextComponent) {
		super(plugin.app, inputComponent.inputEl);
		this.page = page;
		this.condition = condition;
		this.inputComponent = inputComponent;
	}

	/**
	 * Determine which type of suggestions should appear.
	 */
	getSuggestionType(): string | null {
		switch (this.page) {
			case 'file': {
				switch (this.condition.source) {
					case 'name': return SUGGEST_FILE_NAMES;
					case 'filename': return SUGGEST_FILE_FILENAMES;
					case 'extension': return SUGGEST_FILE_EXTENSIONS;
					case 'tree': return SUGGEST_FOLDER_PATHS;
					case 'path': return SUGGEST_FILE_PATHS;
				}
				break;
			}
			case 'folder': {
				switch (this.condition.source) {
					case 'name': return SUGGEST_FOLDER_NAMES;
					case 'tree': return SUGGEST_FOLDER_NAMES;
					case 'path': return SUGGEST_FOLDER_PATHS;
				}
				break;
			}
		}
		return null;
	}

	/**
	 * @override
	 */
	protected getSuggestions(query: string): any[] | Promise<any[]> {
		const currentValue = this.inputComponent.getValue();
		const suggestions: any[] = [];
		const fuzzySearch = prepareFuzzySearch(query);

		switch (this.getSuggestionType()) {
			case SUGGEST_FILE_NAMES: {
				const unsortedFiles = this.app.vault.getFiles();
				const unsortedNames = new Set(unsortedFiles.map(file => file.basename));
				const names = Array.from(unsortedNames).sort((a, b) => a.localeCompare(b));

				for (const name of names) {
					if (name === currentValue) continue;
					const result = fuzzySearch(name);
					if (result) suggestions.push({
						type: 'file',
						matches: result.matches,
						score: result.score,
						text: name,
					});
				}
				break;
			}
			case SUGGEST_FILE_FILENAMES: {
				const unsortedFiles = this.app.vault.getFiles();
				const unsortedFilenames = new Set(unsortedFiles.map(file => file.name));
				const filenames = Array.from(unsortedFilenames).sort((a, b) => a.localeCompare(b));

				for (const filename of filenames) {
					if (filename === currentValue) continue;
					const result = fuzzySearch(filename);
					if (result) suggestions.push({
						type: 'file',
						matches: result.matches,
						score: result.score,
						text: filename,
					});
				}
				break;
			}
			case SUGGEST_FILE_EXTENSIONS: {
				const unsortedFiles = this.app.vault.getFiles();
				const unsortedExtensions = new Set(unsortedFiles.map(file => file.extension));
				const extensions = Array.from(unsortedExtensions).sort((a, b) => a.localeCompare(b));

				for (const extension of extensions) {
					if (extension === currentValue) continue;
					const result = fuzzySearch(extension);
					if (result) suggestions.push({
						type: 'file',
						matches: result.matches,
						score: result.score,
						text: extension,
					});
				}
				break;
			}
			case SUGGEST_FILE_PATHS: {
				const unsortedFiles = this.app.vault.getFiles();
				const unsortedPaths = new Set(unsortedFiles.map(file => file.path));
				const paths = Array.from(unsortedPaths).sort((a, b) => a.localeCompare(b));

				for (const path of paths) {
					if (path === currentValue) continue;
					const result = fuzzySearch(path);
					if (result) suggestions.push({
						type: 'file',
						matches: result.matches,
						score: result.score,
						text: path,
					});
				}
				break;
			}
			case SUGGEST_FOLDER_NAMES: {
				const unsortedFolders = this.app.vault.getAllFolders();
				const unsortedNames = new Set(unsortedFolders.map(folder => folder.name));
				const names = Array.from(unsortedNames).sort((a, b) => a.localeCompare(b));

				for (const name of names) {
					if (name === currentValue) continue;
					const result = fuzzySearch(name);
					if (result) suggestions.push({
						type: 'folder',
						matches: result.matches,
						score: result.score,
						text: name,
					});
				}
				break;
			}
			case SUGGEST_FOLDER_PATHS: {
				const unsortedFolders = this.app.vault.getAllFolders();
				const unsortedPaths = new Set(unsortedFolders.map(folder => folder.path));
				const paths = Array.from(unsortedPaths).sort((a, b) => a.localeCompare(b));

				for (const path of paths) {
					if (path === currentValue) continue;
					const result = fuzzySearch(path);
					if (result) suggestions.push({
						type: 'folder',
						matches: result.matches,
						score: result.score,
						text: path,
					});
				}
				break;
			}
		}

		return suggestions;
	}

	/**
	 * @override
	 */
	renderSuggestion(suggestion: any, el: HTMLElement): void {
		el.setText(suggestion.text);
	}

	/**
	 * @override
	 */
	selectSuggestion(suggestion: any): void {
		this.inputComponent.setValue(suggestion.text);
		this.inputComponent.onChanged();
		this.close();
	}
}
