import { TFile } from 'obsidian';
import IconicPlugin, { Category, ICONS, EMOJIS } from 'src/IconicPlugin.js';
import { CONCEPT_ICONS, EXTENSION_ICONS, GENERIC_ICONS, NEUTRAL_EXTENSIONS, STOPWORDS, SYNONYMS, TYPE_DOMINANT_EXTENSIONS } from 'src/utils/AutoIconVocab.js';

/** Score awarded when a token matches a word from an icon's display name. */
const NAME_WEIGHT = 42;
/** Score awarded when a token matches one of an icon's search keywords. */
const KEYWORD_WEIGHT = 26;
/** Score awarded when a token is *identical* to a full icon name, e.g. `rocket`. */
const EXACT_NAME_BONUS = 64;
/**
 * Score awarded when a token is identical to a whole keyword. Scaled by how
 * few icons share that keyword, so a keyword pointing at a single icon (like
 * `coffee` naming exactly one emoji) counts as a deliberate match.
 */
const EXACT_KEYWORD_BONUS = 60;
/** Score awarded when the whole item name is identical to an icon name. */
const FULL_NAME_BONUS = 150;
/** Score awarded by a {@link CONCEPT_ICONS} hit. */
const CONCEPT_BONUS = 155;
/**
 * Score awarded by an {@link EXTENSION_ICONS} hit for a document, where the
 * name describes the contents. Beats a vague word but loses to a deliberate
 * one, so `Invoice.pdf` stays a receipt. Extensions in
 * {@link TYPE_DOMINANT_EXTENSIONS} bypass scoring altogether.
 */
const EXTENSION_BONUS = 90;
/** Multiplier applied per additional distinct token that matched the same icon. */
const MULTI_HIT_BONUS = 0.2;

/** Minimum score an icon must reach, per accuracy setting. */
const THRESHOLDS: Record<string, number> = {
	loose: 20,
	balanced: 40,
	strict: 70,
};

/** Token weights by where the token came from. */
const SOURCE_WEIGHTS = {
	name: 1,
	tag: 1.15,
	parent: 0.4,
	synonym: 0.95,
};

type IconIndex = {
	/** Token to a list of `[iconId, score]` pairs. */
	tokens: Map<string, [string, number][]>;
	/** Whole normalized icon name to icon ID. */
	names: Map<string, string>;
	/** Whole normalized keyword to every icon ID carrying it. */
	exactKeywords: Map<string, string[]>;
};

/**
 * Infers an icon for a file or folder from its name, tags, and parent folder,
 * by scoring the words it contains against the display names and search
 * keywords of every icon and emoji bundled with the plugin.
 *
 * The inference is fully local and deterministic. No network requests, no
 * model, no telemetry — it is a weighted keyword search running in reverse.
 *
 * Auto icons are purely visual. They are never written into settings, they
 * never replace an icon the user chose, and they always yield to a matching
 * rule from the rulebook.
 */
export default class AutoIconManager {
	private readonly plugin: IconicPlugin;
	private iconIndex: IconIndex | null = null;
	private emojiIndex: IconIndex | null = null;
	/** Maps `page:itemId` to a resolved icon ID, or null when nothing matched. */
	private readonly cache = new Map<string, string | null>();

	constructor(plugin: IconicPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Check whether auto icons are currently active for a given page.
	 */
	isEnabled(page: Category): boolean {
		const { settings } = this.plugin;
		if (!settings.autoIcons) return false;
		if (page === 'file') return settings.autoIconFiles;
		if (page === 'folder') return settings.autoIconFolders;
		return false;
	}

	/**
	 * Infer an icon ID for a given file or folder, or null if nothing is
	 * confident enough. Results are cached until {@link clearCache} is called.
	 */
	checkAutoIcon(page: Category, itemId: string): string | null {
		if (!this.isEnabled(page)) return null;

		const cacheKey = page + ':' + itemId;
		const cached = this.cache.get(cacheKey);
		if (cached !== undefined) return cached;

		let iconId: string | null = null;
		try {
			iconId = this.inferIcon(page, itemId);
		} catch (e) {
			console.error(e);
		}
		this.cache.set(cacheKey, iconId);
		return iconId;
	}

	/**
	 * Forget cached results. Pass an item ID to forget a single file or folder.
	 */
	clearCache(itemId?: string): void {
		if (itemId === undefined) {
			this.cache.clear();
			return;
		}
		this.cache.delete('file:' + itemId);
		this.cache.delete('folder:' + itemId);
		// Also forget any cached tab IDs that carry a subpath
		for (const key of this.cache.keys()) {
			if (key.startsWith('file:' + itemId + '#')) this.cache.delete(key);
		}
	}

	/**
	 * Discard cached results *and* the keyword indexes. Used when a setting
	 * changes which icon sources are searched.
	 */
	reset(): void {
		this.cache.clear();
		this.iconIndex = null;
		this.emojiIndex = null;
	}

	/**
	 * Infer an icon for a file or folder.
	 *
	 * In `type` mode this is a plain lookup: a folder is a folder, a `.md` is a
	 * document, a `.py` is code. In `smart` mode the name, tags, and parent
	 * folder are scored against every icon and emoji as well.
	 */
	private inferIcon(page: Category, itemId: string): string | null {
		const isFolder = page === 'folder';
		if (this.plugin.settings.autoIconMode !== 'smart') {
			return this.inferByType(itemId, isFolder);
		}
		return this.inferByName(itemId, isFolder);
	}

	/**
	 * Resolve an icon from the file type alone, the way a code editor does.
	 */
	private inferByType(itemId: string, isFolder: boolean): string | null {
		if (isFolder) {
			return AutoIconManager.resolveLucideId(GENERIC_ICONS.folderClosed);
		}
		const { extension } = this.plugin.splitFilePath(itemId);
		const mapped = EXTENSION_ICONS[extension.toLowerCase()];
		return AutoIconManager.resolveLucideId(mapped ?? GENERIC_ICONS.file);
	}

	/**
	 * Score every candidate icon for an item, and return the best one above the
	 * configured threshold.
	 */
	private inferByName(itemId: string, isFolder: boolean): string | null {
		const { settings } = this.plugin;
		const { path, filename, basename, extension } = this.plugin.splitFilePath(itemId);
		const useExtension = !isFolder && settings.autoIconExtensions && extension !== ''
			// A `.md` in a vault of notes carries no information
			&& !NEUTRAL_EXTENSIONS.has(extension.toLowerCase())
			// Emoji-only mode has no equivalent glyphs for file types
			&& settings.autoIconSource !== 'emojis';
		const extensionKey = extension.toLowerCase();
		const extensionIcon = useExtension
			? AutoIconManager.resolveLucideId(EXTENSION_ICONS[extensionKey])
			: null;

		// For artefacts like source code the type *is* the meaning, so the name
		// never competes. This keeps a source tree legible instead of scattering
		// unrelated icons across it.
		if (extensionIcon && TYPE_DOMINANT_EXTENSIONS.has(extensionKey)) {
			return extensionIcon;
		}

		// Folders have no extension, so their whole name is meaningful
		const itemName = isFolder ? filename : basename;
		if (!itemName) return extensionIcon;

		const tokens = this.collectTokens(path, itemName, isFolder);
		const threshold = THRESHOLDS[settings.autoIconAccuracy] ?? THRESHOLDS.balanced ?? 40;

		let bestIcon: string | null = null;
		let bestScore = 0;

		// Search each enabled icon source, and let the strongest match win
		if (settings.autoIconSource !== 'emojis') {
			const [icon, score] = this.scoreCandidates(this.getIconIndex(), tokens, itemName, true);
			if (icon && score > bestScore) [bestIcon, bestScore] = [icon, score];
		}
		if (settings.autoIconSource !== 'icons') {
			const [emoji, score] = this.scoreCandidates(this.getEmojiIndex(), tokens, itemName, false);
			if (emoji && score > bestScore) [bestIcon, bestScore] = [emoji, score];
		}

		// A document's name describes its contents, so the file type only
		// competes here rather than overriding.
		if (extensionIcon && EXTENSION_BONUS > bestScore) {
			[bestIcon, bestScore] = [extensionIcon, EXTENSION_BONUS];
		}

		return bestIcon && bestScore >= threshold ? bestIcon : null;
	}

	/**
	 * Build the weighted token list describing an item.
	 */
	private collectTokens(path: string, itemName: string, isFolder: boolean): Map<string, number> {
		const { settings } = this.plugin;
		const tokens = new Map<string, number>();

		/** Record a token, keeping the highest weight seen. */
		const add = (token: string, weight: number): void => {
			if (token.length < 3 || STOPWORDS.has(token)) return;
			if (/^\d+$/.test(token)) return; // Pure numbers carry no icon meaning
			tokens.set(token, Math.max(tokens.get(token) ?? 0, weight));
			// Expand into English concepts so non-English names still match
			for (const synonym of SYNONYMS[token] ?? []) {
				const synonymWeight = weight * SOURCE_WEIGHTS.synonym;
				tokens.set(synonym, Math.max(tokens.get(synonym) ?? 0, synonymWeight));
			}
		};

		// Words from the item's own name, weighted slightly toward the front
		const nameTokens = AutoIconManager.tokenize(itemName);
		nameTokens.forEach((token, index) => {
			add(token, SOURCE_WEIGHTS.name * Math.max(0.7, 1 - index * 0.08));
			const singular = AutoIconManager.singularize(token);
			if (singular !== token) add(singular, SOURCE_WEIGHTS.name * 0.9);
		});

		// Tags are deliberate signals, so they outweigh the filename
		if (settings.autoIconTags && !isFolder) {
			for (const tag of this.getTags(path)) {
				// Only use the last segment of nested tags, e.g. `type/recipe`
				const leaf = tag.split('/').pop() ?? tag;
				for (const token of AutoIconManager.tokenize(leaf)) {
					add(token, SOURCE_WEIGHTS.tag);
					const singular = AutoIconManager.singularize(token);
					if (singular !== token) add(singular, SOURCE_WEIGHTS.tag * 0.9);
				}
			}
		}

		// The parent folder gives weak context, e.g. `Recipes/Pasta.md`
		if (settings.autoIconParent) {
			const parentName = path.split('/').slice(0, -1).pop();
			if (parentName) {
				for (const token of AutoIconManager.tokenize(parentName)) {
					add(token, SOURCE_WEIGHTS.parent);
				}
			}
		}

		return tokens;
	}

	/**
	 * Score all icons reachable from a token list, and return the winner.
	 * @param useConcepts Apply {@link CONCEPT_ICONS}, which only names Lucide icons.
	 */
	private scoreCandidates(index: IconIndex, tokens: Map<string, number>, itemName: string, useConcepts: boolean): [string | null, number] {
		// Strong signals (a literal name or a mapped concept) are decisive, so
		// only the best one counts. Summing them would let a name like
		// "Meeting Notes" outvote itself twice over with weaker words.
		const strongScores = new Map<string, number>();
		// Weak signals accumulate, since agreement between them is meaningful.
		const softScores = new Map<string, number>();
		const hits = new Map<string, number>();

		/** Record the strongest decisive signal for a candidate. */
		const awardStrong = (iconId: string, score: number): void => {
			strongScores.set(iconId, Math.max(strongScores.get(iconId) ?? 0, score));
			hits.set(iconId, Math.max(hits.get(iconId) ?? 0, 1));
		};

		/** Add a keyword-level signal to a candidate. */
		const awardSoft = (iconId: string, score: number): void => {
			softScores.set(iconId, (softScores.get(iconId) ?? 0) + score);
			hits.set(iconId, (hits.get(iconId) ?? 0) + 1);
		};

		/** Award an exact keyword hit, scaled by how few icons share it. */
		const awardKeyword = (keyword: string, weight: number): void => {
			const carriers = index.exactKeywords.get(keyword);
			if (!carriers) return;
			const specificity = 1 / (1 + Math.log10(carriers.length));
			for (const iconId of carriers) {
				awardStrong(iconId, EXACT_KEYWORD_BONUS * weight * specificity);
			}
		};

		// A name identical to an icon name is as literal as intent gets
		const fullName = AutoIconManager.tokenize(itemName).join(' ');
		const fullMatch = index.names.get(fullName);
		if (fullMatch) awardStrong(fullMatch, FULL_NAME_BONUS);
		// A name identical to a whole keyword, e.g. "Hot Beverage"
		awardKeyword(fullName, 1);

		for (const [token, weight] of tokens) {
			// Strong concept mapping, e.g. `meeting` to `users`
			if (useConcepts) {
				const conceptId = AutoIconManager.resolveLucideId(CONCEPT_ICONS[token]);
				if (conceptId) awardStrong(conceptId, CONCEPT_BONUS * weight);
			}

			// A token that is itself a complete icon name
			const exactId = index.names.get(token);
			if (exactId) awardStrong(exactId, EXACT_NAME_BONUS * weight);

			// A token that is itself a complete keyword
			awardKeyword(token, weight);

			const entries = index.tokens.get(token);
			if (!entries) continue;

			// Dampen tokens that match many icons, since they say little
			const specificity = 1 / (1 + Math.log10(entries.length));
			for (const [iconId, baseScore] of entries) {
				awardSoft(iconId, baseScore * weight * specificity);
			}
		}

		let bestIcon: string | null = null;
		let bestScore = 0;

		for (const iconId of new Set([...strongScores.keys(), ...softScores.keys()])) {
			const rawScore = (strongScores.get(iconId) ?? 0) + (softScores.get(iconId) ?? 0);
			// Reward icons corroborated by several independent tokens
			const score = rawScore * (1 + MULTI_HIT_BONUS * Math.max(0, (hits.get(iconId) ?? 1) - 1));
			if (score > bestScore) {
				[bestIcon, bestScore] = [iconId, score];
			} else if (score === bestScore && bestIcon) {
				// Break ties deterministically, preferring simpler icon names
				if (iconId.length < bestIcon.length || iconId.length === bestIcon.length && iconId < bestIcon) {
					bestIcon = iconId;
				}
			}
		}

		return [bestIcon, bestScore];
	}

	/**
	 * Read the tags of a note, from both frontmatter and inline hashtags.
	 */
	private getTags(path: string): string[] {
		const tFile = this.plugin.app.vault.getAbstractFileByPath(path);
		if (!(tFile instanceof TFile)) return [];
		const metadata = this.plugin.app.metadataCache.getFileCache(tFile);
		if (!metadata) return [];

		const tags: string[] = [];
		const propTags: unknown = metadata.frontmatter?.tags;
		if (typeof propTags === 'string') {
			tags.push(propTags);
		} else if (Array.isArray(propTags)) {
			for (const tag of propTags) {
				if (typeof tag === 'string') tags.push(tag);
			}
		}
		for (const tag of metadata.tags ?? []) {
			tags.push(tag.tag.replace('#', ''));
		}
		return tags;
	}

	/**
	 * Get (or lazily build) the searchable index of Lucide icons.
	 */
	private getIconIndex(): IconIndex {
		this.iconIndex = this.iconIndex ?? AutoIconManager.buildIndex(ICONS);
		return this.iconIndex;
	}

	/**
	 * Get (or lazily build) the searchable index of emojis.
	 */
	private getEmojiIndex(): IconIndex {
		this.emojiIndex = this.emojiIndex ?? AutoIconManager.buildIndex(EMOJIS);
		return this.emojiIndex;
	}

	/**
	 * Invert an icon collection into a token index, so a word can be resolved
	 * into candidate icons in constant time.
	 */
	private static buildIndex(source: Map<string, [string, string[]]>): IconIndex {
		const tokens = new Map<string, [string, number][]>();
		const names = new Map<string, string>();
		const exactKeywords = new Map<string, string[]>();

		/** Index one token for one icon, keeping the highest score. */
		const index = (token: string, iconId: string, score: number): void => {
			if (token.length < 3 || STOPWORDS.has(token)) return;
			const entries = tokens.get(token);
			if (!entries) {
				tokens.set(token, [[iconId, score]]);
				return;
			}
			const existing = entries.find(([id]) => id === iconId);
			if (existing) {
				existing[1] = Math.max(existing[1], score);
			} else {
				entries.push([iconId, score]);
			}
		};

		for (const [iconId, [name, keywords]] of source) {
			const nameTokens = AutoIconManager.tokenize(name);
			const fullName = nameTokens.join(' ');
			// Earlier icons win a name collision, matching search result order
			if (fullName && !names.has(fullName)) names.set(fullName, iconId);

			for (const token of nameTokens) {
				index(token, iconId, NAME_WEIGHT);
			}
			for (const keyword of keywords) {
				const keywordTokens = AutoIconManager.tokenize(keyword);
				const fullKeyword = keywordTokens.join(' ');
				if (fullKeyword && !STOPWORDS.has(fullKeyword)) {
					const carriers = exactKeywords.get(fullKeyword);
					if (carriers) {
						if (!carriers.includes(iconId)) carriers.push(iconId);
					} else {
						exactKeywords.set(fullKeyword, [iconId]);
					}
				}
				for (const token of keywordTokens) {
					index(token, iconId, KEYWORD_WEIGHT);
				}
			}
		}

		return { tokens, names, exactKeywords };
	}

	/**
	 * Split text into lowercase words, separating camelCase and any non-letter
	 * delimiters. Diacritics are folded so `Réunion` matches `reunion`.
	 */
	private static tokenize(text: string): string[] {
		return text
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
			.replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
			.toLowerCase()
			.split(/[^\p{L}\p{N}]+/u)
			.filter(token => token.length > 0);
	}

	/**
	 * Strip a trailing English plural, so `Recipes` can match `recipe`.
	 */
	private static singularize(token: string): string {
		if (token.length > 4 && token.endsWith('ies')) return token.slice(0, -3) + 'y';
		if (token.length > 4 && token.endsWith('ses')) return token.slice(0, -2);
		if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
		return token;
	}

	/**
	 * Convert a bare Lucide ID into a plugin icon ID, and drop it if the
	 * current Obsidian client doesn't ship that icon.
	 */
	private static resolveLucideId(id: string | undefined): string | null {
		if (!id) return null;
		const iconId = 'lucide-' + id;
		return ICONS.has(iconId) ? iconId : null;
	}
}
