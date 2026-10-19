import { prepareFuzzySearch, SearchComponent } from 'obsidian';
import { ICONS, ICON_KEYWORDS, EMOJIS, EMOJI_KEYWORDS, STRINGS } from 'src/IconicPlugin.js';
import ExternalLibraryManager from 'src/managers/ExternalLibraryManager.js';

type IconSearchModes = { iconMode?: boolean, emojiMode?: boolean, keywordMode?: boolean };
export type IconSearchResult = [id: string, name: string, keywords: string[], score: number];

/**
 * Search field that searches the icon list and passes the results to a callback.
 */
export default class IconSearchComponent extends SearchComponent {
	private iconMode = true;
	private emojiMode = false;
	private keywordMode = true;
	private searchCallback: ((query: string, results: IconSearchResult[]) => void) | null = null;

	constructor(containerEl: HTMLElement) {
		super(containerEl);
		this.onChange(() => void this.dispatchResults());
	}

	/**
	 * Enable or disable icon & emoji results.
	 */
	setModes(modes: IconSearchModes): this {
		const { iconMode, emojiMode, keywordMode } = modes;
		if (iconMode !== undefined) this.iconMode = iconMode;
		if (emojiMode !== undefined) this.emojiMode = emojiMode;
		if (keywordMode !== undefined) this.keywordMode = keywordMode;
		this.updatePlaceholder();
		void this.dispatchResults();
		return this;
	}

	/**
	 * Set a callback to receive search results.
	 */
	onSearch(callback: (query: string, results: IconSearchResult[]) => void): this {
		this.searchCallback = callback;
		return this;
	}

	/**
	 * Update placeholder text based on current icon & emoji modes.
	 */
	private updatePlaceholder(): void {
		if (this.iconMode && this.emojiMode) {
			this.setPlaceholder(STRINGS.iconPicker.searchMix);
		} else if (this.emojiMode) {
			this.setPlaceholder(STRINGS.iconPicker.searchEmojis);
		} else {
			this.setPlaceholder(STRINGS.iconPicker.searchIcons);
		}
	}

	private async dispatchResults(): Promise<void> {
		if (!this.searchCallback) return;

		const query = this.getValue();
		if (!query) {
			this.searchCallback(query, []);
			return;
		}
		
		const queryLower = query.toLowerCase();
		const fuzzySearch = prepareFuzzySearch(query);
		const allIconEntries = [
			...(this.iconMode ? ICONS : []),
			...(this.iconMode ? ExternalLibraryManager.getIcons() : []),
			...(this.emojiMode ? EMOJIS : []),
		];
		const allKeywords = new Set<string>([
			...(this.iconMode ? ICON_KEYWORDS : []),
			...(this.iconMode ? ExternalLibraryManager.getKeywords() : []),
			...(this.emojiMode ? EMOJI_KEYWORDS : []),
		]);
		const allKeywordScores = new Map<string, number>();
		const results: IconSearchResult[] = [];

		if (this.keywordMode) {
			for (const keyword of allKeywords) {
				const score = fuzzySearch(keyword)?.score;
				if (score) allKeywordScores.set(keyword, score);
			}
		}

		for (const [id, [name, keywords]] of allIconEntries) {
			const idLower = id.toLowerCase();
			const nameLower = name.toLowerCase();

			// Check for an exact ID or name match
			if (queryLower === idLower || queryLower === nameLower) {
				results.push([id, name, [], 1]);
				continue;
			}

			// Check for a start-of-name match
			if (nameLower.startsWith(queryLower)) {
				results.push([id, name, [], 0]);
				continue;
			}

			// Check for a fuzzy name match
			const nameScore = fuzzySearch(name)?.score;
			if (!this.keywordMode) {
				if (nameScore) results.push([id, name, [], nameScore]);
				continue;
			}

			// Check for a fuzzy keyword match
			const keywordScores: [string, number][] = [];
			for (const keyword of keywords) {
				const score = allKeywordScores.get(keyword);
				if (score) keywordScores.push([keyword, score]);
			}

			// Sort keywords by score
			keywordScores.sort(([, scoreA], [, scoreB]) => scoreA < scoreB ? 1 : -1);
			const topKeywordScore = keywordScores[0]?.[1];

			// Skip icon if nothing matched
			if (nameScore === undefined && topKeywordScore === undefined) continue;

			// Use the best possible score
			const topKeywords = keywordScores.map(([keyword]) => keyword);
			const topScore = Math.max(nameScore ?? -Infinity, topKeywordScore ?? -Infinity);
			results.push([id, name, topKeywords, topScore]);
		}

		// Sort results by score
		results.sort(([, nameA,, scoreA], [, nameB,, scoreB]) => {
			if (scoreA === scoreB) {
				return nameA.localeCompare(nameB);
			} else {
				return scoreA < scoreB ? 1 : -1
			}
		});

		// Send results to callback
		this.searchCallback(query, results);
	}
}
