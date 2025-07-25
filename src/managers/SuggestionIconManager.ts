import { AbstractInputSuggest, EditorSuggest } from 'obsidian';
import IconicPlugin from 'src/IconicPlugin';
import IconManager from 'src/managers/IconManager';

const PROPERTY_SUGGESTION = 'property';
const TAG_SUGGESTION = 'tag';
const UNKNOWN_SUGGESTION = null;

/**
 * Intercepts suggestion popovers to add custom icons.
 */
export default class SuggestionIconManager extends IconManager {
	// @ts-expect-error (Private API)
	private showAbstractSuggestionsOriginal: typeof AbstractInputSuggest.prototype.showSuggestions;
	// @ts-expect-error (Private API)
	private showAbstractSuggestionsProxy: typeof AbstractInputSuggest.prototype.showSuggestions;
	private renderAbstractSuggestionProxy: typeof AbstractInputSuggest.prototype.renderSuggestion;

	// @ts-expect-error (Private API)
	private showEditorSuggestionsOriginal: typeof AbstractInputSuggest.prototype.showSuggestions;
	// @ts-expect-error (Private API)
	private showEditorSuggestionsProxy: typeof AbstractInputSuggest.prototype.showSuggestions;
	private renderEditorSuggestionProxy: typeof AbstractInputSuggest.prototype.renderSuggestion;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.setupAbstractSuggestionProxies();
		this.setupEditorSuggestionProxies();
	}

	/**
	 * Intercept property key/value suggestion popovers.
	 */
	private setupAbstractSuggestionProxies(): void {
		const manager = this;

		// Store original method
		// @ts-expect-error (Private API)
		this.showAbstractSuggestionsOriginal = AbstractInputSuggest.prototype.showSuggestions;

		// Catch popovers before they open
		// @ts-expect-error (Private API)
		this.showAbstractSuggestionsProxy = new Proxy(AbstractInputSuggest.prototype.showSuggestions, {
			apply(showSuggestions, popover: AbstractInputSuggest<any>, args) {
				if (manager.isDisabled()) {
					return showSuggestions.call(popover, ...args);
				}

				// Proxy renderSuggestion() for each instance
				if (popover.renderSuggestion !== manager.renderAbstractSuggestionProxy) {
					manager.renderAbstractSuggestionProxy = new Proxy(popover.renderSuggestion, {
						apply(renderSuggestion, popover: AbstractInputSuggest<any>, args: [any, HTMLElement]) {
							// Call base method first to pre-populate elements
							const returnValue = renderSuggestion.call(popover, ...args);
							if (manager.isDisabled()) return returnValue;

							const [value, el] = args;
							if (!value || !(el instanceof HTMLElement)) return;

							switch (manager.getSuggestionType(value)) {
								case PROPERTY_SUGGESTION: manager.refreshPropertyIcon(value, el); break;
								case TAG_SUGGESTION: manager.refreshTagIcon(value, el); break;
							}

							return returnValue;
						}
					});

					// Replace original method
					popover.renderSuggestion = manager.renderAbstractSuggestionProxy;
				}

				return showSuggestions.call(popover, ...args);
			}
		});

		// @ts-expect-error (Private API)
		// Replace original method
		AbstractInputSuggest.prototype.showSuggestions = this.showAbstractSuggestionsProxy;
	}

	/**
	 * Intercept editor suggestion popovers.
	 */
	private setupEditorSuggestionProxies(): void {
		const manager = this;

		// Store original method
		// @ts-expect-error (Private API)
		this.showEditorSuggestionsOriginal = EditorSuggest.prototype.showSuggestions;

		// Catch popovers before they open
		// @ts-expect-error (Private API)
		this.showEditorSuggestionsProxy = new Proxy(EditorSuggest.prototype.showSuggestions, {
			apply(showSuggestions, popover: EditorSuggest<any>, args) {
				if (manager.isDisabled()) {
					return showSuggestions.call(popover, ...args);
				}

				// Proxy renderSuggestion() for each instance
				if (popover.renderSuggestion !== manager.renderEditorSuggestionProxy) {
					manager.renderEditorSuggestionProxy = new Proxy(popover.renderSuggestion, {
						apply(renderSuggestion, popover: EditorSuggest<any>, args: [any, HTMLElement]) {
							// Call base method first to pre-populate elements
							const returnValue = renderSuggestion.call(popover, ...args);
							if (manager.isDisabled()) return returnValue;

							const [value, el] = args;
							if (!value || !(el instanceof HTMLElement)) return;

							switch (manager.getSuggestionType(value)) {
								case PROPERTY_SUGGESTION: manager.refreshPropertyIcon(value, el); break;
								case TAG_SUGGESTION: manager.refreshTagIcon(value, el); break;
							}

							return returnValue;
						}
					});

					// Replace original method
					popover.renderSuggestion = manager.renderEditorSuggestionProxy;
				}

				return showSuggestions.call(popover, ...args);
			}
		});

		// @ts-expect-error (Private API)
		// Replace original method
		EditorSuggest.prototype.showSuggestions = this.showEditorSuggestionsProxy;
	}

	/**
	 * Determine which type of suggestion this is.
	 */
	private getSuggestionType(value: any): string | null {
		if (!value || typeof value !== 'object') {
			return UNKNOWN_SUGGESTION;
		} else if ('tag' in value) {
			return TAG_SUGGESTION;
		} else if ('text' in value && 'type' in value) {
			return PROPERTY_SUGGESTION;
		} else {
			return UNKNOWN_SUGGESTION;
		}
	}

	/**
	 * Refresh a property suggestion icon.
	 */
	private refreshPropertyIcon(value: any, el: HTMLElement): void {
		switch (value?.type) {
			// Property suggestions
			case 'text': {
				const propId = value?.text;
				if (propId) {
					const prop = this.plugin.getPropertyItem(propId);
					const iconEl = el.find(':scope > .suggestion-icon > .suggestion-flair');
					if (iconEl) this.refreshIcon(prop, iconEl);
				}
				break;
			}
			// BASES: File attribute suggestions
			case 'file': break;
			// BASES: Formula suggestions
			case 'formula': break;
			// BASES: Property suggestions
			case 'note': {
				const propId = value?.name;
				if (propId) {
					const prop = this.plugin.getPropertyItem(propId);
					const iconEl = el.find(':scope > .suggestion-icon > .suggestion-flair');
					if (iconEl) this.refreshIcon(prop, iconEl);
				}
				break;
			}
		}
	}

	/**
	 * Refresh a tag suggestion icon.
	 */
	private refreshTagIcon(value: any, el: HTMLElement): void {
		const tagId = value?.tag;
		if (tagId) {
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
	}

	/**
	 * Check whether user has disabled suggestion icons.
	 */
	private isDisabled(): boolean {
		return !this.plugin.settings.showSuggestionIcons;
	}

	/**
	 * @override
	 */
	unload(): void {
		super.unload();

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
	}
}
