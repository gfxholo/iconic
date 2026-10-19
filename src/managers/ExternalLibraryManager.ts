import { Notice, requestUrl } from 'obsidian';
import type IconicPlugin from 'src/IconicPlugin.js';
import { STRINGS } from 'src/IconicPlugin.js';

/**
 * Rendering options applied to every icon in a library. Defaults match
 * Lucide's look (24×24, stroked with rounded caps); set these to render
 * packs that use different proportions or filled icons.
 */
export interface ExternalLibraryStyle {
	/** SVG `viewBox` of each icon, e.g. `0 0 24 24`. */
	viewBox?: string;
	/** SVG `fill` attribute, e.g. `none` (stroked) or `currentColor` (filled). */
	fill?: string;
	/** SVG `stroke` attribute, e.g. `currentColor` (stroked) or `none` (filled). */
	stroke?: string;
	/** SVG `stroke-width` attribute. */
	strokeWidth?: number;
	/** SVG `stroke-linecap` attribute. */
	strokeLinecap?: string;
	/** SVG `stroke-linejoin` attribute. */
	strokeLinejoin?: string;
}

/**
 * A single icon's renderable data after parsing.
 */
export interface ExternalIconData {
	/** Inner SVG markup (the elements inside the `<svg>` wrapper). */
	markup: string;
	/** Search keywords. */
	tags?: string[];
}

/**
 * An external icon library: a third-party collection of icons that can be
 * imported alongside the built-in Lucide icons.
 */
export interface ExternalLibrary {
	/** Unique identifier. Icon IDs are namespaced as `{id}:{iconName}`. */
	id: string;
	/** Display name. */
	name: string;
	/**
	 * URLs of JSON files listing the library's icons, tried in order.
	 */
	sources: string[];
	/**
	 * Rendering options for this library's icons. Defaults to Lucide's look,
	 * so stroked packs need no configuration; filled packs or packs with a
	 * different viewBox should set the matching options.
	 */
	style?: ExternalLibraryStyle;
	/**
	 * Optional adapter converting the fetched data into icon entries, keyed
	 * by icon name. The default parser understands Lucide icon node arrays,
	 * `{ iconNode, tags }` objects, and raw SVG markup; provide `parse` to
	 * support a different source format.
	 */
	parse?: (data: unknown) => Record<string, ExternalIconData | string>;
}

/**
 * Parse an Iconify icon set into icon entries. Iconify stores each icon's inner
 * SVG markup in `icons[name].body`. Sets that ship several weights or styles
 * store them as name suffixes (such as Phosphor's `-thin`, `-light`, `-bold`,
 * `-fill`, and `-duotone`); the set's `suffixes` field lists them.
 * @param regularWeightOnly Keep only the suffix-less "regular" variants.
 */
function parseIconify(data: unknown, regularWeightOnly = false): Record<string, ExternalIconData | string> {
	const icons: Record<string, ExternalIconData | string> = {};
	const set = typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
	const setIcons = set.icons;
	if (typeof setIcons !== 'object' || setIcons === null) return icons;
	const suffixes = regularWeightOnly && typeof set.suffixes === 'object' && set.suffixes !== null
		? Object.keys(set.suffixes as Record<string, unknown>).filter(suffix => suffix !== '')
		: [];
	for (const [iconName, rawIcon] of Object.entries(setIcons as Record<string, unknown>)) {
		if (typeof rawIcon !== 'object' || rawIcon === null) continue;
		const icon = rawIcon as Record<string, unknown>;
		if (icon.hidden === true) continue;
		if (typeof icon.body !== 'string') continue;
		if (suffixes.some(suffix => iconName.endsWith('-' + suffix))) continue;
		icons[iconName] = { markup: icon.body };
	}
	return icons;
}

/**
 * The catalog of supported external libraries. The mechanism is data-driven:
 * adding a new entry here is enough to make it selectable in the settings.
 *
 * Example of a filled pack with a different viewBox:
 * ```ts
 * {
 *   id: 'my-pack',
 *   name: 'My Pack',
 *   style: { viewBox: '0 0 24 24', fill: 'currentColor', stroke: 'none' },
 *   sources: ['https://example.com/icons.json'],
 *   parse: data => ({ ... }), // custom adapter for the pack's format
 * }
 * ```
 */
export const EXTERNAL_LIBRARIES: ExternalLibrary[] = [
	{
		id: 'lab',
		name: 'Lab',
		// The primary source mirrors the endpoint used by lucide.dev's icon search.
		// The fallback is the official npm package data.
		sources: [
			'https://lucide.dev/api/lab/icon-details',
			'https://unpkg.com/@lucide/lab@latest/icon-nodes.json',
		],
	},
	{
		id: 'phosphor',
		name: 'Phosphor',
		// Phosphor publishes six weights (thin, light, regular, bold, fill,
		// duotone); Iconify bundles them as name suffixes in a single set, and
		// only the regular (suffix-less) variants are imported.
		style: {
			viewBox: '0 0 256 256',
			fill: 'currentColor',
			stroke: 'none',
		},
		sources: [
			'https://cdn.jsdelivr.net/gh/iconify/icon-sets@master/json/ph.json',
			'https://raw.githubusercontent.com/iconify/icon-sets/master/json/ph.json',
		],
		parse: data => parseIconify(data, true),
	},
];

/**
 * Default rendering style, matching Lucide.
 */
const DEFAULT_STYLE: Required<ExternalLibraryStyle> = {
	viewBox: '0 0 24 24',
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 2,
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
};

/**
 * Manages icons imported from external libraries: fetches their data,
 * exposes them to search, and renders them as inline SVGs.
 */
export default class ExternalLibraryManager {
	/** Loaded external icons, keyed by their namespaced ID (`{libraryId}:{iconName}`). */
	private static icons = new Map<string, [string, string[]]>();
	/** Keywords ("tags") of all loaded external icons. */
	private static keywords = new Set<string>();
	/** Inner SVG markup for rendering, keyed by namespaced ID. */
	private static iconSvg = new Map<string, string>();
	/** Libraries whose data is currently loaded. */
	private static loaded = new Set<string>();

	/**
	 * Get the catalog of supported external libraries.
	 */
	static getLibraries(): ExternalLibrary[] {
		return EXTERNAL_LIBRARIES;
	}

	/**
	 * Get a catalog entry by its ID.
	 */
	static getLibrary(libraryId: string): ExternalLibrary | null {
		return EXTERNAL_LIBRARIES.find(library => library.id === libraryId) ?? null;
	}

	/**
	 * Check whether a stored icon ID belongs to a known external library.
	 */
	static isExternalIcon(iconId: string): boolean {
		const [libraryId] = iconId.split(':');
		return this.getLibrary(libraryId ?? '') !== null;
	}

	/**
	 * Get the display name of a loaded external icon.
	 */
	static getName(iconId: string): string | null {
		return this.icons.get(iconId)?.[0] ?? null;
	}

	/**
	 * Get a Map of all loaded external icons, in the same shape as {@link ICONS}.
	 */
	static getIcons(): Map<string, [string, string[]]> {
		return this.icons;
	}

	/**
	 * Get a Set of all keywords from loaded external icons.
	 */
	static getKeywords(): Set<string> {
		return this.keywords;
	}

	/**
	 * Fetch data for every library enabled in the settings, and drop data for
	 * any library that is no longer enabled. Refreshes all icon managers
	 * afterwards so icons react to the change.
	 */
	static async refresh(plugin: IconicPlugin): Promise<void> {
		for (const libraryId of Array.from(this.loaded)) {
			const library = this.getLibrary(libraryId);
			if (!library || !this.isEnabled(plugin, libraryId)) {
				this.unloadLibrary(libraryId);
			}
		}

		for (const library of EXTERNAL_LIBRARIES) {
			if (this.isEnabled(plugin, library.id) && !this.loaded.has(library.id)) {
				try {
					await this.loadLibrary(library);
				} catch (error) {
					console.error(error);
					new Notice(STRINGS.externalLibraries.loadFailed.replace('{#}', library.name));
				}
			}
		}

		plugin.refreshManagers();
	}

	/**
	 * Check whether a library is enabled in the plugin settings.
	 */
	private static isEnabled(plugin: IconicPlugin, libraryId: string): boolean {
		return plugin.settings.enableExternalLibraries
			&& Array.isArray(plugin.settings.externalLibraries)
			&& plugin.settings.externalLibraries.includes(libraryId);
	}

	/**
	 * Fetch and store the icon data of a single library.
	 */
	private static async loadLibrary(library: ExternalLibrary): Promise<void> {
		let data: unknown = null;
		for (const source of library.sources) {
			try {
				const response = await requestUrl({ url: source });
				const json: unknown = response.json;
				if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
					data = json;
					break;
				}
			} catch (error) {
				console.error(`Iconic: failed to fetch external library "${library.name}" from ${source}`, error);
			}
		}
		if (data === null) throw new Error(`Iconic: failed to load external library "${library.name}"`);

		// Parse the source data into icon entries
		const parse = library.parse ?? ExternalLibraryManager.parseDefault;
		const icons = parse(data);

		for (const [iconName, value] of Object.entries(icons)) {
			const icon: ExternalIconData = typeof value === 'string' ? { markup: value } : value;
			const iconId = library.id + ':' + iconName;
			const tags = icon.tags?.sort() ?? [];
			this.icons.set(iconId, [this.iconIdToName(iconName), tags]);
			for (const keyword of tags) this.keywords.add(keyword);
			this.iconSvg.set(iconId, icon.markup);
		}

		// Keep keywords sorted for predictable search behaviour
		this.keywords = new Set(Array.from(this.keywords).sort());
		this.loaded.add(library.id);
	}

	/**
	 * Default parser for Lucide-style sources: understands icon node arrays,
	 * `{ iconNode, tags }` objects, and raw SVG markup.
	 */
	private static parseDefault(data: unknown): Record<string, ExternalIconData | string> {
		const icons: Record<string, ExternalIconData | string> = {};
		const dataObject = typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
		for (const [iconName, raw] of Object.entries(dataObject)) {
			if (Array.isArray(raw)) {
				icons[iconName] = { markup: ExternalLibraryManager.iconNodeToMarkup(raw as unknown[][]) };
			} else if (typeof raw === 'object' && raw !== null) {
				const entry = raw as Record<string, unknown>;
				if (Array.isArray(entry.iconNode)) {
					icons[iconName] = {
						markup: ExternalLibraryManager.iconNodeToMarkup(entry.iconNode as unknown[][]),
						tags: Array.isArray(entry.tags) ? entry.tags.map(String) : undefined,
					};
				} else if (typeof entry.svg === 'string') {
					icons[iconName] = { markup: ExternalLibraryManager.svgToMarkup(entry.svg) };
				}
			} else if (typeof raw === 'string') {
				icons[iconName] = { markup: ExternalLibraryManager.svgToMarkup(raw) };
			}
		}
		return icons;
	}

	/**
	 * Convert a Lucide icon node array (`[[tag, attrs], ...]`) into inner SVG markup.
	 */
	static iconNodeToMarkup(node: unknown[][]): string {
		let markup = '';
		for (const nodeEntry of node) {
			const [tag, attrs] = nodeEntry;
			if (typeof tag !== 'string' || typeof attrs !== 'object' || attrs === null) continue;
			let attrString = '';
			for (const [attr, value] of Object.entries(attrs)) {
				if (attr === 'key') continue; // React key, not a real attribute
				attrString += ` ${attr}="${String(value).replaceAll('"', '&quot;')}"`;
			}
			markup += `<${tag}${attrString}/>`;
		}
		return markup;
	}

	/**
	 * Normalize an SVG string into inner SVG markup, stripping the outer
	 * `<svg>` wrapper if one is present (ignoring any leading XML comments).
	 */
	static svgToMarkup(svg: string): string {
		const svgStart = svg.indexOf('<svg');
		const svgEnd = svg.lastIndexOf('</svg>');
		if (svgStart > -1 && svgEnd > svgStart) {
			const wrapper = svg.slice(svgStart, svgEnd + 6);
			return wrapper.replace(/^<svg[^>]*>/i, '').replace(/<\/svg>\s*$/i, '');
		}
		return svg.trim();
	}

	/**
	 * Remove a library's icon data from memory.
	 */
	private static unloadLibrary(libraryId: string): void {
		const prefix = libraryId + ':';
		for (const iconId of Array.from(this.icons.keys())) {
			if (iconId.startsWith(prefix)) {
				this.icons.delete(iconId);
				this.iconSvg.delete(iconId);
			}
		}
		this.keywords = new Set();
		for (const [, [, keywords]] of this.icons) {
			for (const keyword of keywords) this.keywords.add(keyword);
		}
		this.loaded.delete(libraryId);
	}

	/**
	 * Render a loaded external icon inside a given element.
	 * @returns Whether the icon was found and rendered.
	 */
	static setIcon(iconEl: HTMLElement, iconId: string): boolean {
		const markup = this.iconSvg.get(iconId);
		if (!markup) return false;
		const [libraryId, iconName = ''] = iconId.split(':');
		const style = { ...DEFAULT_STYLE, ...this.getLibrary(libraryId ?? '')?.style };

		iconEl.empty();
		const svgEl = iconEl.createSvg('svg', {
			cls: ['svg-icon', 'lucide', 'lucide-' + iconName],
			attr: {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: style.viewBox,
				fill: style.fill,
				stroke: style.stroke,
				'stroke-width': style.strokeWidth,
				'stroke-linecap': style.strokeLinecap,
				'stroke-linejoin': style.strokeLinejoin,
				'aria-hidden': 'true',
			},
		});
		svgEl.innerHTML = markup;
		return true;
	}

	/**
	 * Generate a readable name for an icon name:
	 * 1) Replace hyphens with spaces
	 * 2) Use sentence case
	 */
	private static iconIdToName(iconId: string): string {
		if (!iconId) return '';
		const replacedName = iconId.replaceAll('-', ' ');
		const capitalizedName = replacedName[0]?.toUpperCase() + replacedName.slice(1);
		return capitalizedName;
	}
}