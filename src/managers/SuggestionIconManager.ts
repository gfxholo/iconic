import { AbstractInputSuggest } from 'obsidian';
import IconicPlugin from 'src/IconicPlugin';
import IconManager from 'src/managers/IconManager';

const PROPERTY_SUGGESTIONS = 'properties';
const TAG_SUGGESTIONS = 'tags';

/**
 * Intercepts suggestion popovers to add custom icons.
 */
export default class SuggestionIconManager extends IconManager {
	// @ts-expect-error (Private API)
	private showSuggestionsOriginal: typeof AbstractInputSuggest.prototype.showSuggestions;
	// @ts-expect-error (Private API)
	private showSuggestionsProxy: typeof AbstractInputSuggest.prototype.showSuggestions;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		const manager = this;

		// Store original method
		// @ts-expect-error (Private API)
		this.showSuggestionsOriginal = AbstractInputSuggest.prototype.showSuggestions;

		// Catch popovers before they open
		// @ts-expect-error (Private API)
		this.showSuggestionsProxy = new Proxy(AbstractInputSuggest.prototype.showSuggestions, {
			apply(showSuggestions, popover: AbstractInputSuggest<any>, args) {
				if (manager.isDisabled()) {
					return showSuggestions.call(popover, ...args);
				}

				// Proxy renderSuggestion() for each instance
				popover.renderSuggestion = new Proxy(popover.renderSuggestion, {
					apply(renderSuggestion, popover: AbstractInputSuggest<any>, args: [any, HTMLElement]) {
						// Call base method first to pre-populate elements
						const returnValue = renderSuggestion.call(popover, ...args);
						if (manager.isDisabled()) return returnValue;

						switch (manager.getPopoverType(popover)) {
							case PROPERTY_SUGGESTIONS: manager.refreshPropertyIcon(...args); break;
							case TAG_SUGGESTIONS: manager.refreshTagIcon(...args); break;
						}

						return returnValue;
					}
				});

				return showSuggestions.call(popover, ...args);
			}
		});

		// @ts-expect-error (Private API)
		// Replace original method
		AbstractInputSuggest.prototype.showSuggestions = this.showSuggestionsProxy;
	}

	/**
	 * Determine which type of popover this is.
	 */
	private getPopoverType(popover: AbstractInputSuggest<any>): string | null {
		// @ts-expect-error (Private API)
		const { suggestEl, textInputEl } = popover;

		if (!(suggestEl instanceof HTMLElement)) return null;
		if (suggestEl.hasClass('mod-property-key')) {
			return PROPERTY_SUGGESTIONS;
		}

		if (!(textInputEl instanceof HTMLElement)) return null;
		if (suggestEl.hasClass('mod-property-value') && textInputEl.closest('.metadata-property[data-property-key="tags"]')) {
			return TAG_SUGGESTIONS;
		}

		return null;
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
		if (AbstractInputSuggest.prototype.showSuggestions === this.showSuggestionsProxy) {
			// @ts-expect-error (Private API)
			AbstractInputSuggest.prototype.showSuggestions = this.showSuggestionsOriginal;
		}
	}
}
