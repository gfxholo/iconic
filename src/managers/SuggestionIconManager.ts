import { AbstractInputSuggest, EditorSuggest, TFile } from 'obsidian';
import IconicPlugin from 'src/IconicPlugin.js';
import IconManager from 'src/managers/IconManager.js';
import ObsidianUtils from 'src/utils/ObsidianUtils.js';

const FILE_SUGGESTION = 'file';
const TAG_SUGGESTION = 'tag';
const PROPERTY_SUGGESTION = 'property';

/**
 * Intercepts suggestion popovers to add custom icons.
 */
export default class SuggestionIconManager extends IconManager {
	private showAbstractSuggestionsOriginal: unknown = null;
	private showAbstractSuggestionsProxy: unknown = null;
	renderAbstractSuggestionProxy: ((this: void, value: any, el: HTMLElement) => void) | null = null;

	private showEditorSuggestionsOriginal: unknown = null;
	private showEditorSuggestionsProxy: unknown = null;
	renderEditorSuggestionProxy: ((this: void, value: any, el: HTMLElement) => void) | null = null;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.setupAbstractSuggestionProxies();
		this.setupEditorSuggestionProxies();
	}

	/**
	 * Intercept property key/value suggestion popovers.
	 */
	private setupAbstractSuggestionProxies(): void {
		// Store original method
		// @ts-expect-error (Private API)
		this.showAbstractSuggestionsOriginal = AbstractInputSuggest.prototype.showSuggestions;

		// Catch popovers before they open
		// @ts-expect-error (Private API)
		this.showAbstractSuggestionsProxy = new Proxy(AbstractInputSuggest.prototype.showSuggestions, new ShowAbstractSuggestionsProxyHandler(this));

		// @ts-expect-error (Private API)
		// Replace original method
		AbstractInputSuggest.prototype.showSuggestions = this.showAbstractSuggestionsProxy;
	}

	/**
	 * Intercept editor suggestion popovers.
	 */
	private setupEditorSuggestionProxies(): void {
		// Store original method
		// @ts-expect-error (Private API)
		this.showEditorSuggestionsOriginal = EditorSuggest.prototype.showSuggestions;

		// Catch popovers before they open
		// @ts-expect-error (Private API)
		this.showEditorSuggestionsProxy = new Proxy(EditorSuggest.prototype.showSuggestions, new ShowEditorSuggestionsProxyHandler(this));

		// @ts-expect-error (Private API)
		// Replace original method
		EditorSuggest.prototype.showSuggestions = this.showEditorSuggestionsProxy;
	}

	/**
	 * Determine which type of suggestion this is.
	 */
	getSuggestionType(value: unknown): string | null {
		if (!ObsidianUtils.isObject(value)) {
			return null;
		} else if (value.type === 'file' && value.file instanceof TFile) {
			return FILE_SUGGESTION;
		} else if (value.type === 'alias' && value.file instanceof TFile) {
			return FILE_SUGGESTION;
		} else if (value.tag) {
			return TAG_SUGGESTION;
		} else if (value.widget) {
			return PROPERTY_SUGGESTION;
		} else {
			return null;
		}
	}

	/**
	 * Refresh a file suggestion icon.
	 */
	refreshFileIcon(value: unknown, el: HTMLElement): void {
		if (!ObsidianUtils.isObject(value) || !(value.file instanceof TFile)) return;

		const fileId = value.file.path;
		const file = this.plugin.getFileItem(fileId);
		if (!file) return;
		const rule = this.plugin.ruleManager?.checkRuling('file', fileId) ?? file;

		el.addClass('iconic-item');
		const iconContainerEl = el.find(':scope > .suggestion-icon')
			?? createDiv({ cls: 'suggestion-icon' });
		const iconEl = iconContainerEl.find(':scope > .suggestion-flair')
			?? iconContainerEl.createSpan({ cls: 'suggestion-flair' });
		el.prepend(iconContainerEl);
		if (rule) {
			if (!rule.icon && !rule.color) iconEl.addClass('iconic-invisible');
			this.refreshIcon(rule, iconEl);
		}
	}

	/**
	 * Refresh a property suggestion icon.
	 */
	refreshPropertyIcon(value: unknown, el: HTMLElement): void {
		if (!ObsidianUtils.isObject(value)) return;
		switch (value.type) {
			// Property suggestions
			case 'text': {
				if (typeof value.text !== 'string') break;
				const propId = value.text;
				const prop = this.plugin.getPropertyItem(propId);
				const iconEl = el.find(':scope > .suggestion-icon > .suggestion-flair');
				if (prop && iconEl) this.refreshIcon(prop, iconEl);
				break;
			}
			// BASES: File attribute suggestions
			case 'file': break;
			// BASES: Formula suggestions
			case 'formula': break;
			// BASES: Property suggestions
			case 'note': {
				if (typeof value.name !== 'string') break;
				const propId = value.name;
				const prop = this.plugin.getPropertyItem(propId);
				const iconEl = el.find(':scope > .suggestion-icon > .suggestion-flair');
				if (prop && iconEl) this.refreshIcon(prop, iconEl);
				break;
			}
		}
	}

	/**
	 * Refresh a tag suggestion icon.
	 */
	refreshTagIcon(value: unknown, el: HTMLElement): void {
		if (!ObsidianUtils.isObject(value)) return;
		const tagId = value.tag;
		if (typeof tagId !== 'string') return;

		el.addClass('mod-complex', 'iconic-item');
		const tag = this.plugin.getTagItem(tagId);
		const iconContainerEl = el.find(':scope > .suggestion-icon')
			?? createDiv({ cls: 'suggestion-icon' });
		const iconEl = iconContainerEl.find(':scope > .suggestion-flair')
			?? iconContainerEl.createSpan({ cls: 'suggestion-flair' });
		el.prepend(iconContainerEl);
		if (tag) {
			tag.iconDefault = 'lucide-tag';
			if (!tag.icon && !tag.color) iconEl.addClass('iconic-invisible');
			this.refreshIcon(tag, iconEl);
		}
	}

	/**
	 * Check whether user has disabled suggestion icons.
	 */
	isDisabled(): boolean {
		return !this.plugin.settings.showSuggestionIcons;
	}

	/**
	 * @override
	 */
	unload(): void {
		// @ts-expect-error (Private API)
		if (AbstractInputSuggest.prototype.showSuggestions === this.showAbstractSuggestionsProxy) {
			// @ts-expect-error (Private API)
			AbstractInputSuggest.prototype.showSuggestions = this.showAbstractSuggestionsOriginal;
		}

		// @ts-expect-error (Private API)
		if (EditorSuggest.prototype.showSuggestions === this.showEditorSuggestionsProxy) {
			// @ts-expect-error (Private API)
			EditorSuggest.prototype.showSuggestions = this.showEditorSuggestionsOriginal;
		}
		super.unload();
	}
}

/**
 * Proxy handler for {@link AbstractInputSuggest.showSuggestions}.
 */
class ShowAbstractSuggestionsProxyHandler implements ProxyHandler<object> {
	private readonly iconManager: SuggestionIconManager;

	constructor(manager: SuggestionIconManager) {
		this.iconManager = manager;
	}

	apply(showSuggestions: (...args: unknown[]) => unknown, popover: AbstractInputSuggest<unknown>, args: unknown[]): unknown {
		if (this.iconManager.isDisabled()) {
			return showSuggestions.call(popover, ...args);
		}

		// Proxy renderSuggestion() for each instance
		if (popover.renderSuggestion !== this.iconManager.renderAbstractSuggestionProxy) {
			this.iconManager.renderAbstractSuggestionProxy = new Proxy(popover.renderSuggestion, {
				apply: (
					renderSuggestion: (value: unknown, el: HTMLElement) => void,
					popover: AbstractInputSuggest<unknown>,
					args: [value: unknown, el: HTMLElement],
				) => {
					// Call base method first to pre-populate elements
					const returnValue = renderSuggestion.call(popover, ...args);
					if (this.iconManager.isDisabled()) return returnValue;

					const [value, el] = args;
					switch (this.iconManager.getSuggestionType(value)) {
						case FILE_SUGGESTION: this.iconManager.refreshFileIcon(value, el); break;
						case TAG_SUGGESTION: this.iconManager.refreshTagIcon(value, el); break;
						case PROPERTY_SUGGESTION: this.iconManager.refreshPropertyIcon(value, el); break;
					}

					return returnValue;
				}
			}).bind(popover);

			// Replace original method
			popover.renderSuggestion = this.iconManager.renderAbstractSuggestionProxy;
		}

		return showSuggestions.call(popover, ...args);
	}
}

/**
 * Proxy handler for {@link EditorSuggest.showSuggestions}.
 */
class ShowEditorSuggestionsProxyHandler implements ProxyHandler<object> {
	private readonly iconManager: SuggestionIconManager;

	constructor(manager: SuggestionIconManager) {
		this.iconManager = manager;
	}

	apply(showSuggestions: (...args: unknown[]) => unknown, popover: EditorSuggest<unknown>, args: unknown[]): unknown {
		if (this.iconManager.isDisabled()) return showSuggestions.call(popover, ...args);

		// Proxy renderSuggestion() for each instance
		if (popover.renderSuggestion !== this.iconManager.renderEditorSuggestionProxy) {
			this.iconManager.renderEditorSuggestionProxy = new Proxy(popover.renderSuggestion, {
				apply: (
					renderSuggestion: (value: unknown, el: HTMLElement) => void,
					popover: EditorSuggest<unknown>,
					args: [value: unknown, el: HTMLElement],
				) => {
					// Call base method first to pre-populate elements
					const returnValue = renderSuggestion.call(popover, ...args);
					if (this.iconManager.isDisabled()) return returnValue;

					const [value, el] = args;
					switch (this.iconManager.getSuggestionType(value)) {
						case FILE_SUGGESTION: this.iconManager.refreshFileIcon(value, el); break;
						case TAG_SUGGESTION: this.iconManager.refreshTagIcon(value, el); break;
						case PROPERTY_SUGGESTION: this.iconManager.refreshPropertyIcon(value, el); break;
					}

					return returnValue;
				}
			}).bind(popover);

			// Replace original method
			popover.renderSuggestion = this.iconManager.renderEditorSuggestionProxy;
		}

		return showSuggestions.call(popover, ...args);
	}
}
