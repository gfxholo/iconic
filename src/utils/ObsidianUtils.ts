import { App } from 'obsidian';
import { Category } from 'src/IconicPlugin.js';

/**
 * Utility for safely accessing untyped objects from the private Obsidian API.
 */
export default class ObsidianUtils {
	/**
	 * Check whether something is an object.
	 */
	static isObject(obj: unknown): obj is Record<string, unknown> {
		return obj !== null && typeof obj === 'object';
	}

	/**
	 * Check whether something is an array.
	 * Casts to unknown[], unlike {@link Array.isArray} which casts to any[].
	 */
	static isArray(obj: unknown): obj is unknown[] {
		return Array.isArray(obj);
	}

	/**
	 * Check whether something is an Obsidian bookmark.
	 */
	static isObsidianBookmark(obj: unknown): obj is ObsidianBookmark {
		if (!this.isObject(obj)) return false;

		return typeof obj.type === 'string'
			&& typeof obj.ctime === 'number'
			&& typeof obj.title === 'string' || obj.title === undefined
			&& typeof obj.path === 'string' || obj.path === undefined
			&& typeof obj.subpath === 'string' || obj.subpath === undefined
			&& typeof obj.query === 'string' || obj.query === undefined
			&& typeof obj.url === 'string' || obj.url === undefined
			&& (Array.isArray(obj.items) && obj.items.every(item => this.isObsidianBookmark(item))) || obj.items === undefined;
	}

	/**
	 * Check whether something is an Obsidian tag.
	 */
	static isObsidianTag(obj: unknown): obj is ObsidianTag {
		if (!Array.isArray(obj) || obj.length !== 2) return false;
		const [hashtag, count] = obj;

		return typeof hashtag === 'string' && typeof count === 'number';
	}

	/**
	 * Check whether something is an Obsidian property.
	 */
	static isObsidianProperty(obj: unknown): obj is ObsidianProperty {
		if (!Array.isArray(obj) || obj.length !== 2) return false;
		const [nameLowercase, property] = obj;

		return typeof nameLowercase === 'string'
			&& this.isObject(property)
			&& typeof property.name === 'string'
			&& typeof property.widget === 'string';
	}

	/**
	 * Check whether something is an Obsidian ribbon item.
	 */
	static isObsidianRibbonItems(obj: unknown): obj is ObsidianRibbonItem {
		if (!this.isObject(obj)) return false;

		return typeof obj.id === 'string'
			&& typeof obj.title === 'string'
			&& typeof obj.icon === 'string'
			&& obj.buttonEl instanceof HTMLElement
			&& typeof obj.hidden === 'boolean';
	}

	/**
	 * Get an array of Obsidian bookmarks.
	 */
	static getObsidianBookmarks(app: App): ObsidianBookmark[] {
		// @ts-expect-error (Private API)
		const oBmarks: unknown = app.internalPlugins?.plugins?.bookmarks?.instance?.items;
		if (!this.isArray(oBmarks)) return [];

		return oBmarks.filter(oBmark => this.isObsidianBookmark(oBmark));
	}

	/**
	 * Get the Obsidian bookmark that matches a given category and ID.
	 */
	static getObsidianBookmark(app: App, bmarkCategory: Category, bmarkId: string): ObsidianBookmark | null {
		// @ts-expect-error (Private API)
		const oBmarks: unknown = app.internalPlugins?.plugins?.bookmarks?.instance?.getBookmarks?.();
		if (!this.isArray(oBmarks)) return null;

		for (const oBmark of oBmarks) {
			if (!this.isObsidianBookmark(oBmark) || oBmark.type !== bmarkCategory) continue;
			switch (bmarkCategory) {
				case 'file': if ((oBmark.path ?? '') + (oBmark.subpath ?? '') === bmarkId) return oBmark; break;
				case 'folder': if (oBmark.path === bmarkId) return oBmark; break;
				default: if (oBmark.ctime.toString() === bmarkId) return oBmark; break;
			}
		}
		return null;
	}

	/**
	 * Get an array of Obsidian tags.
	 */
	static getObsidianTags(app: App): ObsidianTag[] {
		// @ts-expect-error (Private API)
		const oTags: unknown = app.metadataCache.getTags?.();
		if (!this.isObject(oTags)) return [];

		return Object.entries(oTags).filter(oTag => this.isObsidianTag(oTag));
	}

	/**
	 * Get the Obsidian tag that matches a given ID.
	 */
	static getObsidianTag(app: App, tagId: string): ObsidianTag | null {
		// @ts-expect-error (Private API)
		const oTags: unknown = app.metadataCache.getTags?.();
		if (!this.isObject(oTags)) return null;

		for (const oTag of Object.entries(oTags)) {
			if (this.isObsidianTag(oTag) && oTag[0].replace('#', '') === tagId) {
				return oTag;
			}
		}
		return null;
	}

	/**
	 * Get an array of Obsidian properties.
	 */
	static getObsidianProperties(app: App): ObsidianProperty[] {
		// @ts-expect-error (Private API)
		const oProps: unknown = app.metadataTypeManager?.getAllProperties?.();
		if (!this.isObject(oProps)) return [];

		return Object.entries(oProps).filter(oProp => this.isObsidianProperty(oProp));
	}

	/**
	 * Get the Obsidian property that matches a given ID.
	 * @param propId Case-insensitive property ID
	 */
	static getObsidianProperty(app: App, propId: string): ObsidianProperty | null {
		// @ts-expect-error (Private API)
		const oProps: unknown = app.metadataTypeManager?.getAllProperties?.();
		if (!this.isObject(oProps)) return null;

		for (const oProp of Object.entries(oProps)) {
			if (this.isObsidianProperty(oProp) && oProp[0].toLowerCase() === propId.toLowerCase()) {
				return oProp;
			}
		}
		return null;
	}

	/**
	 * Get the default property icon for a given widget type.
	 */
	static getDefaultPropertyIcon(app: App, widget: string): string {
		// @ts-expect-error (Private API)
		const icon: unknown = app.metadataTypeManager?.getWidget?.(widget)?.icon;
		return typeof icon === 'string' ? icon : 'lucide-file-question';
	}

	/**
	 * Get an array of Obsidian ribbon items.
	 */
	static getObsidianRibbonItems(app: App): ObsidianRibbonItem[] {
		// @ts-expect-error (Private API)
		const oRibbonItems: unknown = app.workspace.leftRibbon.items;
		if (!this.isArray(oRibbonItems)) return [];

		return oRibbonItems.filter(oRibbonItem => this.isObsidianRibbonItems(oRibbonItem));
	}

	/**
	 * Get the Obsidian ribbon item that matches a given ID.
	 */
	static getObsidianRibbonItem(app: App, itemId: string): ObsidianRibbonItem | null {
		// @ts-expect-error (Private API)
		const oRibbonItems: unknown = app.workspace.leftRibbon.items;
		if (!this.isArray(oRibbonItems)) return null;

		for (const oRibbonItem of oRibbonItems) {
			if (this.isObsidianRibbonItems(oRibbonItem) && oRibbonItem.id === itemId) {
				return oRibbonItem;
			}
		}
		return null;
	}
}

export type ObsidianBookmark = {
	type: string;
	ctime: number;
	title?: string;
	path?: string;
	subpath?: string;
	query?: string;
	url?: string;
	items?: ObsidianBookmark[];
}

export type ObsidianTag = [
	hashtag: string,
	count: number,
];

export type ObsidianProperty = [
	nameLowercase: string,
	property: {
		name: string;
		widget: string;
	}
];

export type ObsidianRibbonItem = {
	id: string;
	title: string;
	icon: string;
	buttonEl: HTMLElement;
	hidden: boolean;
}
