import { AbstractInputSuggest, TextComponent, prepareFuzzySearch } from 'obsidian';
import IconicPlugin, { Category } from 'src/IconicPlugin';

/**
 * Popover that suggests names for a rule.
 */
export default class RuleNameSuggest extends AbstractInputSuggest<any> {
	private readonly plugin: IconicPlugin;
	private readonly page: Category;
	private readonly inputComponent: TextComponent;

	constructor(plugin: IconicPlugin, page: Category, inputComponent: TextComponent) {
		super(plugin.app, inputComponent.inputEl);
		this.plugin = plugin;
		this.page = page;
		this.inputComponent = inputComponent;
	}

	/**
	 * @override
	 */
	protected getSuggestions(query: string): any[] | Promise<any[]> {
		const currentName = this.inputComponent.getValue();
		const suggestions: any[] = [];
		const fuzzySearch = prepareFuzzySearch(query);
		const rules = this.plugin.ruleManager.getRules(this.page);
		const names = new Set(rules.map(rule => rule.name));

		for (const name of names) {
			// Skip suggestions that already match the current name
			if (name === currentName) continue;
			const result = fuzzySearch(name);
			if (result) suggestions.push({
				type: 'rule',
				matches: result.matches,
				score: result.score,
				text: name,
			});
		}

		// Sort by relevance, or else alphabetically
		suggestions.sort((a, b) => {
			if (a.score !== b.score) {
				return b.score - a.score; // Descending
			} else {
				return a.text.localeCompare(b.text); // Ascending
			}
		});

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
