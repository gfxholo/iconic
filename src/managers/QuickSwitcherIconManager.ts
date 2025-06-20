import { Plugin, SuggestModal, TFile, WorkspaceLeaf } from 'obsidian';
import IconicPlugin, { FILE_TAB_TYPES } from 'src/IconicPlugin';
import IconManager from 'src/managers/IconManager';

type PluginModal = SuggestModal<any> & { plugin: Plugin };

/**
 * Allow type-safe access to a modal.plugin property.
 */
function isPluginModal(modal: SuggestModal<any>): modal is PluginModal {
	return (modal as SuggestModal<any> & { plugin: unknown }).plugin instanceof Plugin;
}

const QUICK_SWITCHER = 'qs';
const QUICK_SWITCHER_PP = 'qs++';
const ANOTHER_QUICK_SWITCHER = 'aqs';

/**
 * Intercepts quick switchers to add custom icons.
 */
export default class QuickSwitcherIconManager extends IconManager {
	private onOpenOriginal: typeof SuggestModal.prototype.onOpen;
	private onOpenProxy: typeof SuggestModal.prototype.onOpen;
	private setInstructionsOriginal: typeof SuggestModal.prototype.setInstructions;
	private setInstructionsProxy: typeof SuggestModal.prototype.setInstructions;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		const manager = this;
		this.onOpenOriginal = SuggestModal.prototype.onOpen;
		this.setInstructionsOriginal = SuggestModal.prototype.setInstructions;

		// Catch Quick Switcher and Quick Switcher++ modals
		this.onOpenProxy = new Proxy(SuggestModal.prototype.onOpen, {
			apply(onOpen, modal, args) {
				if (manager.isDisabled()) {
					return onOpen.call(modal, ...args);
				}

				const modalType = manager.getModalType(modal);
				if (!modalType) {
					return onOpen.call(modal, ...args);
				}

				// Proxy renderSuggestion() for each instance
				modal.renderSuggestion = new Proxy(modal.renderSuggestion, {
					apply(renderSuggestion, modal, args) {
						const [value, el] = args;
						switch (modalType) {
							case QUICK_SWITCHER: {
								modal.modalEl.addClass('iconic-quick-switcher');
								manager.refreshSuggestionIcon(value, el);
								break;
							}
							case QUICK_SWITCHER_PP: {
								modal.modalEl.addClass('iconic-quick-switcher');
								manager.refreshSuggestionIconQSPP(value, el);
								break;
							}
						}
						return renderSuggestion.call(modal, ...args);;
					}
				});

				return onOpen.call(modal, ...args);
			}
		});

		// Catch Another Quick Switcher modals, which never call super.onOpen()
		this.setInstructionsProxy = new Proxy(SuggestModal.prototype.setInstructions, {
			apply(setInstructions, modal, args) {
				if (manager.isDisabled()) {
					return setInstructions.call(modal, ...args);
				}

				const modalType = manager.getModalType(modal);
				if (modalType !== ANOTHER_QUICK_SWITCHER) {
					return setInstructions.call(modal, ...args);
				}

				// Proxy renderSuggestion() for every instance
				modal.renderSuggestion = new Proxy(modal.renderSuggestion, {
					apply(renderSuggestion, modal, args) {
						if (manager.isDisabled()) {
							return renderSuggestion.call(modal, ...args);
						}
						const [value, el] = args;
						// Call the base method first so custom elements are available
						const returnValue = renderSuggestion.call(modal, ...args);
						modal.modalEl.addClass('iconic-another-quick-switcher');
						// Refresh s
						manager.refreshSuggestionIconAQS(value, el);
						return returnValue;
					}
				});

				return setInstructions.call(modal, ...args);
			}
		});

		// Replace original methods
		SuggestModal.prototype.onOpen = this.onOpenProxy;
		SuggestModal.prototype.setInstructions = this.setInstructionsProxy;
	}

	/**
	 * Determine which type of modal this is.
	 */
	private getModalType(modal: SuggestModal<any>): string | null {
		// Check for Another Quick Switcher
		if (modal.modalEl.hasClass('another-quick-switcher__modal-prompt')) {
			return ANOTHER_QUICK_SWITCHER;
		}

		// Check for Quick Switcher++
		if (isPluginModal(modal) && modal.plugin.manifest.id === 'darlal-switcher-plus') {
			return QUICK_SWITCHER_PP;
		}

		// Check for Quick Switcher
		if ('shouldShowMarkdown' in modal) {
			return QUICK_SWITCHER;
		}

		return null;
	}

	/**
	 * Refresh icon of a Quick Switcher suggestion.
	 */
	private refreshSuggestionIcon(value: any, el: HTMLElement): void {
		switch (value?.type) {
			case 'file': {
				if (value.file instanceof TFile) {
					const file = this.plugin.getFileItem(value.file.path);
					const rule = this.plugin.ruleManager.checkRuling('file', file.id) ?? file;
					if (rule.icon || rule.color) {
						const iconEl = el.find('.iconic-icon') ?? el.createDiv();
						this.refreshIcon(rule, iconEl);
					}
				}
				break;
			}
			case 'bookmark': {
				const bmarkBase = value.item;
				if (bmarkBase.type === 'file') {
					const file = this.plugin.getFileItem(bmarkBase.path);
					const rule = this.plugin.ruleManager.checkRuling('file', file.id) ?? file;
					if (rule.icon || rule.color) {
						const iconEl = el.find('.iconic-icon') ?? el.createDiv();
						this.refreshIcon(rule, iconEl);
					}
				}
				break;
			}
		}
	}

	/**
	 * Refresh icon of a Quick Switcher++ suggestion.
	 */
	private refreshSuggestionIconQSPP(value: any, el: HTMLElement): void {
		switch (value?.type) {
			case 'file': {
				if (value.file instanceof TFile) {
					const file = this.plugin.getFileItem(value.file.path);
					const rule = this.plugin.ruleManager.checkRuling('file', file.id) ?? file;
					if (rule.icon || rule.color) {
						const iconEl = el.find('.iconic-icon') ?? el.createDiv();
						this.refreshIcon(rule, iconEl);
					}
				}
				break;
			}
			case 'bookmark': {
				const bmarkBase = value.item;
				if (bmarkBase.type === 'file' || bmarkBase.type === 'folder') {
					const file = this.plugin.getFileItem(bmarkBase.path);
					const rule = this.plugin.ruleManager.checkRuling(bmarkBase.type, file.id) ?? file;
					if (rule.icon || rule.color) {
						const iconEl = el.find('.iconic-icon') ?? el.createDiv();
						this.refreshIcon(rule, iconEl);
					}
				}
				break;
			}
			case 'editorList': { // Represents an open tab in Editor Mode
				if (!(value.item instanceof WorkspaceLeaf)) break;
				const tabType = value.item.view.getViewType();
				const iconDefault = value.item.view.getIcon();

				// Distinguish between file tabs and plugin tabs
				if (FILE_TAB_TYPES.includes(tabType) && value.file instanceof TFile) {
					const file = this.plugin.getFileItem(value.file.path);
					const rule = this.plugin.ruleManager.checkRuling('file', file.id) ?? file;
					if (rule.icon || rule.color) {
						const iconEl = el.find('.iconic-icon') ?? el.createDiv();
						this.refreshIcon(rule, iconEl);
					}
				} else {
					const tab = this.plugin.getTabItem(tabType);
					if (tab) {
						tab.iconDefault = iconDefault;
						const iconEl = el.find('.iconic-icon') ?? el.createDiv();
						this.refreshIcon(tab, iconEl);
					}
				}
				break;
			}
		}
	}

	/**
	 * Refresh icon of Another Quick Switcher suggestion.
	 */
	private refreshSuggestionIconAQS(value: any, el: HTMLElement): void {
		const tFile = value.file;
		if (tFile instanceof TFile) {
			const itemEl = el.find('.another-quick-switcher__item');
			const file = this.plugin.getFileItem(tFile.path);
			if (file.icon || file.color) {
				const iconEl = itemEl.find('.iconic-icon') ?? itemEl.createDiv();
				itemEl.prepend(iconEl);
				this.refreshIcon(file, iconEl);
			}
		}
	}

	/**
	 * Check whether user has disabled quick switcher icons.
	 */
	private isDisabled(): boolean {
		return !this.plugin.settings.showQuickSwitcherIcons;
	}

	/**
	 * @override
	 */
	unload(): void {
		super.unload();
		if (SuggestModal.prototype.onOpen === this.onOpenProxy) {
			SuggestModal.prototype.onOpen = this.onOpenOriginal;
		}
		if (SuggestModal.prototype.setInstructions === this.setInstructionsProxy) {
			SuggestModal.prototype.setInstructions = this.setInstructionsOriginal;
		}
	}
}
