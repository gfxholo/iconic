import IconicPlugin, { Item, STRINGS } from './IconicPlugin';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export type RulePage = 'file' | 'folder';

export interface RuleItem extends Item {
	category: 'rule';
	match: 'all' | 'any' | 'none';
	conditions: ConditionItem[];
	enabled: boolean;
}
export interface ConditionItem {
	source: string;
	operator: string;
	value: string;
}

/**
 * Handles core rule logic, and tracks which items are currently affected by a ruling.
 */
export default class RuleManager {
	private readonly plugin: IconicPlugin;

	constructor(plugin: IconicPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Get array of rule definitions from a given page.
	 */
	getRules(page: RulePage): RuleItem[] {
		switch (page) {
			case 'file': return this.plugin.settings.fileRules.map(ruleBase => this.defineRule(ruleBase));
			case 'folder': return this.plugin.settings.folderRules.map(ruleBase => this.defineRule(ruleBase));
		}
	}

	/**
	 * Get rule definition from a given page.
	 */
	getRule(page: RulePage, ruleId: string): RuleItem | null {
		let ruleBases: typeof this.plugin.settings.fileRules;
		switch (page) {
			case 'file': ruleBases = this.plugin.settings.fileRules; break;
			case 'folder': ruleBases = this.plugin.settings.folderRules; break;
		}
		const ruleBase = ruleBases.find(rule => rule.id === ruleId);
		return ruleBase ? this.defineRule(ruleBase) : null;
	}

	/**
	 * Get array of rule bases from a given page.
	 */
	private getRuleBases(page: RulePage): typeof this.plugin.settings.fileRules {
		switch (page) {
			default: return this.plugin.settings.fileRules;
			case 'file': return this.plugin.settings.fileRules;
			case 'folder': return this.plugin.settings.folderRules;
		}
	}

	/**
	 * Get default rule icon for a given page.
	 */
	getPageIcon(page: RulePage): string {
		switch (page) {
			case 'file': return 'lucide-file';
			case 'folder': return 'lucide-folder';
		}
	}

	/**
	 * Create rule definition.
	 */
	private defineRule(ruleBase: any): RuleItem {
		return {
			id: ruleBase.id ?? '0',
			name: ruleBase.name ?? '',
			category: 'rule',
			iconDefault: 'lucide-file',
			icon: ruleBase.icon ?? null,
			color: ruleBase.color ?? null,
			match: ruleBase.match ?? 'all',
			conditions: ruleBase.conditions ?? [],
			enabled: ruleBase.enabled ?? false,
		}
	}

	/**
	 * Generate a 5-character rule ID. 916,132,832 possible values.
	 */
	private newRuleId(page: RulePage): string {
		const ids = this.getRuleBases(page).map(ruleBase => ruleBase.id);
		let id: string;
		let collisions = 0;
		do { // Try to generate a unique ID (up to 10 times)
			id = BASE62.charAt(Math.floor(Math.random() * BASE62.length))
				+ BASE62.charAt(Math.floor(Math.random() * BASE62.length))
				+ BASE62.charAt(Math.floor(Math.random() * BASE62.length))
				+ BASE62.charAt(Math.floor(Math.random() * BASE62.length))
				+ BASE62.charAt(Math.floor(Math.random() * BASE62.length));
		} while (ids.includes(id) && ++collisions < 10);
		return id;
	}

	/**
	 * Create new rule on a given page.
	 */
	newRule(page: RulePage): RuleItem {
		const newRule: RuleItem = {
			id: this.newRuleId(page),
			name: STRINGS.rulePicker.untitledRule,
			category: 'rule',
			iconDefault: null,
			icon: null,
			color: null,
			match: 'all',
			conditions: [{ source: 'name', operator: 'contains', value: '' }],
			enabled: true,
		}
		this.saveRule(page, newRule);
		return newRule;
	}

	/**
	 * Save rule to a given page.
	 */
	saveRule(page: RulePage, newRule: RuleItem): void {
		const ruleBases = this.getRuleBases(page);
		let ruleBase = ruleBases.find(rule => rule.id === newRule.id);
		if (!ruleBase) {
			ruleBase = { id: newRule.id };
			ruleBases.push({ id: newRule.id });
		}

		if (newRule.name) ruleBase.name = newRule.name;
		else delete ruleBase.name;
		if (newRule.icon) ruleBase.icon = newRule.icon;
		else delete ruleBase.icon;
		if (newRule.color) ruleBase.color = newRule.color;
		else delete ruleBase.color;
		if (newRule.match) ruleBase.match = newRule.match;
		else delete ruleBase.match;
		if (newRule.conditions.length > 0) {
			ruleBase.conditions = newRule.conditions.map(({ source, operator, value }) => {
				const conditionBase: any = {};
				if (source) conditionBase.source = source;
				if (operator) conditionBase.operator = operator;
				if (value) conditionBase.value = value;
				return conditionBase;
			});
		}
		else delete ruleBase.conditions;
		if (typeof newRule.enabled === 'boolean') ruleBase.enabled = newRule.enabled;
		else delete ruleBase.enabled;

		this.plugin.saveSettings();
	}

	/**
	 * Delete rule from a given page.
	 */
	deleteRule(page: RulePage, ruleId: string): void {
		const ruleBases = this.getRuleBases(page);
		const index = ruleBases.findIndex(ruleBase => ruleBase.id === ruleId);
		if (index === -1) return;
		ruleBases.splice(index, 1);
		this.plugin.saveSettings();
	}
}
