import { TFile } from 'obsidian';
import IconicPlugin, { Item, FileItem, ICONS, EMOJIS, STRINGS } from './IconicPlugin';

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

	/**
	 * Judge how many files match a given rule.
	 * @param ignoreEnabled Ignore whether the rule is enabled.
	 */
	judgeFiles(rule: RuleItem, now: Date, ignoreEnabled?: true): FileItem[] {
		const files = this.plugin.getFileItems().filter(file => !file.items);
		const matches: FileItem[] = [];
		for (const file of files) {
			if (this.judgeFile(file, rule, now, ignoreEnabled)) {
				matches.push(file);
			}
		}
		return matches;
	}

	/**
	 * Judge how many folders match a given rule.
	 * @param ignoreEnabled Ignore whether the rule is enabled.
	 */
	judgeFolders(rule: RuleItem, now: Date, ignoreEnabled?: true): FileItem[] {
		const folders = this.plugin.getFileItems().filter(file => file.items);
		const matches: FileItem[] = [];
		for (const folder of folders) {
			if (this.judgeFile(folder, rule, now, ignoreEnabled)) {
				matches.push(folder);
			}
		}
		return matches;
	}

	/**
	 * Judge whether a given file matches a given rule.
	 * @param ignoreEnabled Ignore whether the rule is enabled.
	 */
	judgeFile(file: FileItem, rule: RuleItem, now: Date, ignoreEnabled?: true): boolean {
		if (!file.id || rule.conditions.length === 0) return false;
		if (!rule.enabled && !ignoreEnabled) return false;
		const { basename, filename, extension, path, tree } = this.plugin.splitFilePath(file.id);
		const tAbstractFile = this.plugin.app.vault.getAbstractFileByPath(path);
		if (!tAbstractFile) return false;
		const metadata = tAbstractFile instanceof TFile
			? this.plugin.app.metadataCache.getFileCache(tAbstractFile)
			: null;

		for (const condition of rule.conditions) {
			let isConditionMatched = false;
			let source: boolean | number | string | string[] | null | undefined = undefined;
			const isNegated = condition.operator.startsWith('!');
			const operator = condition.operator.replace('!', '');
			const value = condition.value;

			// Resolve the source
			if (condition.source.startsWith('property:')) {
				const propId = condition.source.replace('property:', '');
				source = metadata?.frontmatter?.hasOwnProperty(propId)
					? metadata.frontmatter[propId] ?? null
					: undefined;
			} else switch (condition.source) {
				case 'icon': {
					if (!file.icon || operator === 'iconIs' || operator === 'hasValue') {
						source = file.icon;
					} else if (ICONS.has(file.icon)) {
						source = ICONS.get(file.icon) ?? null;
					} else if (EMOJIS.get(file.icon)) {
						source = EMOJIS.get(file.icon) ?? null;
					}
					break;
				}
				case 'color': source = file.color; break;
				case 'name': source = basename; break;
				case 'filename': source = filename; break;
				case 'extension': source = extension; break;
				case 'tree': source = tree; break;
				case 'path': source = path; break;
				case 'headings': source = metadata?.headings?.map(heading => heading.heading) ?? []; break;
				case 'links': source = metadata?.links?.map(link => link.link) ?? []; break;
				case 'tags': {
					source = [];
					const propTags = metadata?.frontmatter?.tags ?? [];
					const inlineTags = metadata?.tags?.map(tag => tag.tag.replace('#', '')) ?? [];
					for (const tag of [...propTags, ...inlineTags]) {
						if (!source.includes(tag)) source.push(tag);
					}
					break;
				}
				case 'created': if (tAbstractFile instanceof TFile) source = tAbstractFile.stat.ctime; break;
				case 'modified': if (tAbstractFile instanceof TFile) source = tAbstractFile.stat.mtime; break;
				case 'clock': source = now.getTime(); break;
			}

			// Prepare case-insensitive strings
			const sourceLower = String.isString(source) ? source.toLowerCase() : '';
			const sourceLowers = Array.isArray(source) ? source.map(item => item.toLowerCase()) : [];
			const valueLower = String.isString(value) ? value.toLowerCase() : '';

			// Check if condition is true
			if (operator === 'hasValue') {
				isConditionMatched = source !== null && source !== undefined;
			} else if (operator === 'hasProperty') {
				isConditionMatched = source !== undefined;
			} else if (isBoolean(source)) switch (operator) {
				case 'isTrue': isConditionMatched = source === true; break;
				case 'isFalse': isConditionMatched = source === false; break;
			} else if (String.isString(source)) switch (operator) {
				case 'is': isConditionMatched = sourceLower === valueLower; break;
				case 'contains': isConditionMatched = valueLower !== '' && sourceLower.includes(valueLower); break;
				case 'startsWith': isConditionMatched = valueLower !== '' && sourceLower.startsWith(valueLower); break;
				case 'endsWith': isConditionMatched = valueLower !== '' && sourceLower.endsWith(valueLower); break;
				case 'matches': {
					try {
						isConditionMatched = value !== '' && RuleManager.unwrapRegex(value).test(source);
					} catch { /* Catch invalid regex */ };
					break;
				}
				case 'datetimeIs': isConditionMatched = RuleManager.compareDatetimes(source, operator, value); break;
				case 'datetimeIsBefore': isConditionMatched = RuleManager.compareDatetimes(source, operator, value); break;
				case 'datetimeIsAfter': isConditionMatched = RuleManager.compareDatetimes(source, operator, value); break;
				case 'isNow': isConditionMatched = RuleManager.compareDatetimes(source, 'datetimeIs', now); break;
				case 'isBeforeNow': isConditionMatched = RuleManager.compareDatetimes(source, 'datetimeIsBefore', value); break;
				case 'isAfterNow': isConditionMatched = RuleManager.compareDatetimes(source, 'datetimeIsAfter', value); break;
				case 'timeIs': isConditionMatched = RuleManager.compareTimes(source, operator, value); break;
				case 'timeIsBefore': isConditionMatched = RuleManager.compareTimes(source, operator, value); break;
				case 'timeIsAfter': isConditionMatched = RuleManager.compareTimes(source, operator, value); break;
				case 'timeIsNow': isConditionMatched = RuleManager.compareTimes(source, 'timeIs', now); break;
				case 'timeIsBeforeNow': isConditionMatched = RuleManager.compareTimes(source, 'timeIsBefore', now); break;
				case 'timeIsAfterNow': isConditionMatched = RuleManager.compareTimes(source, 'timeIsAfter', now); break;
				case 'dateIs': isConditionMatched = RuleManager.compareDates(source, operator, value); break;
				case 'dateIsBefore': isConditionMatched = RuleManager.compareDates(source, operator, value); break;
				case 'dateIsAfter': isConditionMatched = RuleManager.compareDates(source, operator, value); break;
				case 'isToday': isConditionMatched = RuleManager.compareDates(source, 'dateIs', now); break;
				case 'isBeforeToday': isConditionMatched = RuleManager.compareDates(source, 'dateIsBefore', now); break;
				case 'isAfterToday': isConditionMatched = RuleManager.compareDates(source, 'dateIsAfter', now); break;
				case 'isLessDaysAgo': isConditionMatched = RuleManager.compareRelativeDates(source, operator, value, now); break;
				case 'isLessDaysAway': isConditionMatched = RuleManager.compareRelativeDates(source, operator, value, now); break;
				case 'isMoreDaysAgo': isConditionMatched = RuleManager.compareRelativeDates(source, operator, value, now); break;
				case 'isMoreDaysAway': isConditionMatched = RuleManager.compareRelativeDates(source, operator, value, now); break;
				case 'weekdayIs': isConditionMatched = RuleManager.compareWeekdays(source, operator, value); break;
				case 'weekdayIsBefore': isConditionMatched = RuleManager.compareWeekdays(source, operator, value); break;
				case 'weekdayIsAfter': isConditionMatched = RuleManager.compareWeekdays(source, operator, value); break;
				case 'monthdayIs': isConditionMatched = RuleManager.compareMonthdays(source, operator, value); break;
				case 'monthdayIsBefore': isConditionMatched = RuleManager.compareMonthdays(source, operator, value); break;
				case 'monthdayIsAfter': isConditionMatched = RuleManager.compareMonthdays(source, operator, value); break;
				case 'monthIs': isConditionMatched = RuleManager.compareMonths(source, operator, value); break;
				case 'monthIsBefore': isConditionMatched = RuleManager.compareMonths(source, operator, value); break;
				case 'monthIsAfter': isConditionMatched = RuleManager.compareMonths(source, operator, value); break;
				case 'yearIs': isConditionMatched = RuleManager.compareYears(source, operator, value); break;
				case 'yearIsBefore': isConditionMatched = RuleManager.compareYears(source, operator, value); break;
				case 'yearIsAfter': isConditionMatched = RuleManager.compareYears(source, operator, value); break;
				case 'iconIs': isConditionMatched = sourceLower === valueLower; break;
				case 'nameIs': isConditionMatched = sourceLower === valueLower; break;
				case 'nameContains': isConditionMatched = valueLower !== '' && sourceLower.includes(valueLower); break;
				case 'nameStartsWith': isConditionMatched = valueLower !== '' && sourceLower.startsWith(valueLower); break;
				case 'nameEndsWith': isConditionMatched = valueLower !== '' && sourceLower.endsWith(valueLower); break;
				case 'nameMatches': {
					try {
						isConditionMatched = value !== '' && RuleManager.unwrapRegex(value).test(source);
					} catch { /* Catch invalid regex */ };
					break;
				}
				case 'colorIs': isConditionMatched = sourceLower === valueLower; break;
				case 'hexIs': isConditionMatched = sourceLower === valueLower; break;
			} else if (Number.isNumber(source)) switch (operator) {
				case 'equals': isConditionMatched = source === Number(value); break;
				case 'isLess': isConditionMatched = source < Number(value); break;
				case 'isMore': isConditionMatched = source > Number(value); break;
				case 'isDivisible': isConditionMatched = source / Number(value) % 1 === 0; break;
				case 'datetimeIs': isConditionMatched = RuleManager.compareDatetimes(source, operator, value); break;
				case 'datetimeIsBefore': isConditionMatched = RuleManager.compareDatetimes(source, operator, value); break;
				case 'datetimeIsAfter': isConditionMatched = RuleManager.compareDatetimes(source, operator, value); break;
				case 'timeIs': isConditionMatched = RuleManager.compareTimes(source, operator, value); break;
				case 'timeIsBefore': isConditionMatched = RuleManager.compareTimes(source, operator, value); break;
				case 'timeIsAfter': isConditionMatched = RuleManager.compareTimes(source, operator, value); break;
				case 'dateIs': isConditionMatched = RuleManager.compareDates(source, operator, value); break;
				case 'dateIsBefore': isConditionMatched = RuleManager.compareDates(source, operator, value); break;
				case 'dateIsAfter': isConditionMatched = RuleManager.compareDates(source, operator, value); break;
				case 'isToday': isConditionMatched = RuleManager.compareDates(source, 'dateIs', now); break;
				case 'isLessDaysAgo': isConditionMatched = RuleManager.compareRelativeDates(source, operator, value, now); break;
				case 'isMoreDaysAgo': isConditionMatched = RuleManager.compareRelativeDates(source, operator, value, now); break;
				case 'weekdayIs': isConditionMatched = RuleManager.compareWeekdays(source, operator, value); break;
				case 'weekdayIsBefore': isConditionMatched = RuleManager.compareWeekdays(source, operator, value); break;
				case 'weekdayIsAfter': isConditionMatched = RuleManager.compareWeekdays(source, operator, value); break;
				case 'monthdayIs': isConditionMatched = RuleManager.compareMonthdays(source, operator, value); break;
				case 'monthdayIsBefore': isConditionMatched = RuleManager.compareMonthdays(source, operator, value); break;
				case 'monthdayIsAfter': isConditionMatched = RuleManager.compareMonthdays(source, operator, value); break;
				case 'monthIs': isConditionMatched = RuleManager.compareMonths(source, operator, value); break;
				case 'monthIsBefore': isConditionMatched = RuleManager.compareMonths(source, operator, value); break;
				case 'monthIsAfter': isConditionMatched = RuleManager.compareMonths(source, operator, value); break;
				case 'yearIs': isConditionMatched = RuleManager.compareYears(source, operator, value); break;
				case 'yearIsBefore': isConditionMatched = RuleManager.compareYears(source, operator, value); break;
				case 'yearIsAfter': isConditionMatched = RuleManager.compareYears(source, operator, value); break;
			} else if (Array.isArray(source)) switch (operator) {
				case 'includes': isConditionMatched = sourceLowers.includes(valueLower); break;
				case 'allAre': isConditionMatched = RuleManager.all(sourceLowers, 'are', valueLower); break;
				case 'allContain': isConditionMatched = RuleManager.all(sourceLowers, 'contain', valueLower); break;
				case 'allStartWith': isConditionMatched = RuleManager.all(sourceLowers, 'startWith', valueLower); break;
				case 'allEndWith': isConditionMatched = RuleManager.all(sourceLowers, 'endWith', valueLower); break;
				case 'allMatch': isConditionMatched = RuleManager.all(source, 'match', value); break;
				case 'anyContain': isConditionMatched = RuleManager.any(sourceLowers, 'contain', valueLower); break;
				case 'anyStartWith': isConditionMatched = RuleManager.any(sourceLowers, 'startWith', valueLower); break;
				case 'anyEndWith': isConditionMatched = RuleManager.any(sourceLowers, 'endWith', valueLower); break;
				case 'anyMatch': isConditionMatched = RuleManager.any(source, 'match', value); break;
				case 'noneContain': isConditionMatched = RuleManager.none(source, 'contain', value); break;
				case 'noneStartWith': isConditionMatched = RuleManager.none(source, 'startWith', value); break;
				case 'noneEndWith': isConditionMatched = RuleManager.none(source, 'endWith', value); break;
				case 'noneMatch': isConditionMatched = RuleManager.none(source, 'match', value); break;
				case 'countIs': isConditionMatched = value !== '' && source.length === Number(value); break;
				case 'countIsLess': isConditionMatched = value !== '' && source.length < Number(value); break;
				case 'countIsMore': isConditionMatched = value !== '' && source.length > Number(value); break;
			}

			// Flip negated operators
			isConditionMatched = isConditionMatched !== isNegated;

			// Return if remaining conditions are now redundant
			if (rule.match === 'all' && !isConditionMatched) {
				return false;
			} else if (rule.match === 'any' && isConditionMatched) {
				return true;
			} else if (rule.match === 'none' && isConditionMatched) {
				return false;
			}
		}

		// If no condition returned early, check the match mode
		return rule.match !== 'any';
	}

	/**
	 * Remove forwardslash delimiters from regex if present.
	 */
	private static unwrapRegex(value: string): RegExp {
		return value.startsWith('/') && value.endsWith('/')
			? new RegExp(value.slice(1, -1))
			: new RegExp(value);
	}

	/**
	 * Compare the date & time of two timestamps.
	 */
	private static compareDatetimes(source: string | number, operator: 'datetimeIs' | 'datetimeIsBefore' | 'datetimeIsAfter', value: string | Date): boolean {
		if (value === '') return false;
		const srcDate = new Date(source);
		const valDate = new Date(value);

		srcDate.setSeconds(0);
		valDate.setSeconds(0);
		srcDate.setMilliseconds(0);
		valDate.setMilliseconds(0);

		switch (operator) {
			case 'datetimeIs': return srcDate.getTime() === valDate.getTime();
			case 'datetimeIsBefore': return srcDate < valDate;
			case 'datetimeIsAfter': return srcDate > valDate;
		}
	}

	/**
	 * Compare the times of two timestamps.
	 */
	private static compareTimes(source: string | number, operator: 'timeIs' | 'timeIsBefore' | 'timeIsAfter', value: string | Date): boolean {
		if (value === '') return false;
		const srcDate = new Date(source);
		const valDate = String.isString(value) ? new Date('1970T' + value) : new Date(value);

		srcDate.setFullYear(1970, 0, 1);
		valDate.setFullYear(1970, 0, 1);
		srcDate.setSeconds(0);
		valDate.setSeconds(0);
		srcDate.setMilliseconds(0);
		valDate.setMilliseconds(0);

		switch (operator) {
			case 'timeIs': return srcDate.getTime() === valDate.getTime();
			case 'timeIsBefore': return srcDate < valDate;
			case 'timeIsAfter': return srcDate > valDate;
		}
	}

	/**
	 * Compare the dates of two timestamps.
	 */
	private static compareDates(source: string | number, operator: 'dateIs' | 'dateIsBefore' | 'dateIsAfter', value: string | Date): boolean {
		if (value === '') return false;
		const srcDate = new Date(source);
		const valDate = new Date(value);

		srcDate.setHours(0, 0, 0, 0);
		valDate.setHours(0, 0, 0, 0);

		switch (operator) {
			case 'dateIs': return srcDate.getTime() === valDate.getTime();
			case 'dateIsBefore': return srcDate < valDate;
			case 'dateIsAfter': return srcDate > valDate;
		}
	}

	private static compareRelativeDates(source: string | number, operator: 'isLessDaysAgo' | 'isLessDaysAway' | 'isMoreDaysAgo' | 'isMoreDaysAway', value: string, now: Date): boolean {
		if (value === '') return false;
		const srcDate = new Date(source);
		const valDate = new Date(now);

		srcDate.setHours(0, 0, 0, 0);
		valDate.setHours(0, 0, 0, 0);
		valDate.setDate(operator === 'isLessDaysAgo' || operator === 'isMoreDaysAgo'
			? valDate.getDate() - Number(value)
			: valDate.getDate() + Number(value)
		);

		switch (operator) {
			case 'isLessDaysAgo': return srcDate > valDate;
			case 'isLessDaysAway': return srcDate < valDate;
			case 'isMoreDaysAgo': return srcDate < valDate;
			case 'isMoreDaysAway': return srcDate > valDate;
		}
	}

	/**
	 * Compare a timestamp source against a day-of-week value.
	 * Converts srcWeekday to ISO 8601 (1 = Monday ... 7 = Sunday).
	 */
	private static compareWeekdays(source: string | number, operator: 'weekdayIs' | 'weekdayIsBefore' | 'weekdayIsAfter', value: string): boolean {
		if (value === '') return false;
		const srcDate = new Date(source);
		const srcWeekday = srcDate.getDay() !== 0 ? srcDate.getDay() : 7;
		const valWeekday = Number(value);

		switch (operator) {
			case 'weekdayIs': return srcWeekday === valWeekday;
			case 'weekdayIsBefore': return srcWeekday < valWeekday;
			case 'weekdayIsAfter': return srcWeekday > valWeekday;
		}
	}

	/**
	 * Compare a timestamp source against a day-of-month value.
	 */
	private static compareMonthdays(source: string | number, operator: 'monthdayIs' | 'monthdayIsBefore' | 'monthdayIsAfter', value: string): boolean {
		if (value === '') return false;
		const srcMonthday = new Date(source).getDate();
		const valMonthday = Number(value);

		switch (operator) {
			case 'monthdayIs': return srcMonthday === valMonthday;
			case 'monthdayIsBefore': return srcMonthday < valMonthday;
			case 'monthdayIsAfter': return srcMonthday > valMonthday;
		}
	}

	/**
	 * Compare a timestamp source against a month value.
	 * Converts srcMonth to ISO 8601 (1 = January ... 12 = December).
	 */
	private static compareMonths(source: string | number, operator: 'monthIs' | 'monthIsBefore' | 'monthIsAfter', value: string): boolean {
		if (value === '') return false;
		const srcMonth = new Date(source).getMonth() + 1;
		const valMonth = Number(value);

		switch (operator) {
			case 'monthIs': return srcMonth === valMonth;
			case 'monthIsBefore': return srcMonth < valMonth;
			case 'monthIsAfter': return srcMonth > valMonth;
		}
	}

	/**
	 * Compare a timestamp source against a year value.
	 */
	private static compareYears(source: string | number, operator: 'yearIs' | 'yearIsBefore' | 'yearIsAfter', value: string): boolean {
		if (value === '') return false;
		const srcYear = new Date(source).getFullYear();
		const valYear = Number(value);

		switch (operator) {
			case 'yearIs': return srcYear === valYear;
			case 'yearIsBefore': return srcYear < valYear;
			case 'yearIsAfter': return srcYear > valYear;
		}
	}

	/**
	 * Check whether all items match a given operator & value.
	 */
	private static all(items: string[], operator: 'are' | 'contain' | 'startWith' | 'endWith' | 'match', value: string): boolean {
		if (items.length === 0 || value === '') return false;

		switch (operator) {
			case 'are': for (const item of items) if (item !== value) return false; break;
			case 'contain': for (const item of items) if (!item.includes(value)) return false; break;
			case 'startWith': for (const item of items) if (!item.startsWith(value)) return false; break;
			case 'endWith': for (const item of items) if (!item.endsWith(value)) return false; break;
			case 'match': {
				try {
					const regex = RuleManager.unwrapRegex(value);
					for (const item of items) {
						if (!regex.test(item)) return false;
					}
				} catch { /* Catch invalid regex */ };
				break;
			}
		}
		return true;
	}

	/**
	 * Check whether any items match a given operator & value.
	 */
	private static any(items: string[], operator: 'are' | 'contain' | 'startWith' | 'endWith' | 'match', value: string): boolean {
		if (value === '') return false;

		switch (operator) {
			case 'are': for (const item of items) if (item === value) return true; break;
			case 'contain': for (const item of items) if (item.includes(value)) return true; break;
			case 'startWith': for (const item of items) if (item.startsWith(value)) return true; break;
			case 'endWith': for (const item of items) if (item.endsWith(value)) return true; break;
			case 'match': {
				try {
					const regex = RuleManager.unwrapRegex(value);
					for (const item of items) {
						if (regex.test(item)) return true;
					}
				} catch { /* Catch invalid regex */ };
				break;
			}
		}
		return false;
	}

	/**
	 * Check whether no items match a given operator & value.
	 */
	private static none(items: string[], operator: 'are' | 'contain' | 'startWith' | 'endWith' | 'match', value: string): boolean {
		if (value === '') return false;

		switch (operator) {
			case 'are': for (const item of items) if (item === value) return false; break;
			case 'contain': for (const item of items) if (item.includes(value)) return false; break;
			case 'startWith': for (const item of items) if (item.startsWith(value)) return false; break;
			case 'endWith': for (const item of items) if (item.endsWith(value)) return false; break;
			case 'match': {
				try {
					const regex = RuleManager.unwrapRegex(value);
					for (const item of items) {
						if (regex.test(item)) return false;
					}
				} catch { /* Catch invalid regex */ };
				break;
			}
		}
		return true;
	}
}
