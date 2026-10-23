import { Editor, MarkdownView, Menu, editorInfoField, editorLivePreviewField, getLinkpath } from 'obsidian';
import { Range, StateEffect } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import IconicPlugin, { Icon, TagItem, PropertyItem, STRINGS } from 'src/IconicPlugin.js';
import ColorUtils from 'src/utils/ColorUtils.js';
import IconManager from 'src/managers/IconManager.js';
import RuleEditor from 'src/dialogs/RuleEditor.js';
import IconPicker from 'src/dialogs/IconPicker.js';

/**
 * Tells a live preview editor to redraw its link icons.
 */
const refreshLinkIconsEffect = StateEffect.define<null>();

/**
 * Get linktext from the destination of a Markdown link, unless it's an external link.
 */
function getMarkdownLinktext(destination: string): string | null {
	const linktext = destination.replace(/^<(.*)>$/, '$1');
	if (/^[a-z][a-z\d+.-]*:/i.test(linktext)) return null;
	try {
		return decodeURIComponent(linktext);
	} catch (_) {
		return linktext;
	}
}

/**
 * Icon displayed in front of an internal link in live preview.
 */
class LinkIconWidget extends WidgetType {
	constructor(
		private readonly icon: Icon,
		private readonly refreshIcon: (icon: Icon, iconEl: HTMLElement) => void,
	) {
		super();
	}

	/**
	 * @override
	 */
	eq(widget: LinkIconWidget): boolean {
		return widget.icon.icon === this.icon.icon && widget.icon.color === this.icon.color;
	}

	/**
	 * @override
	 */
	toDOM(): HTMLElement {
		const iconEl = createSpan({ cls: 'iconic-link-icon' });
		this.refreshIcon(this.icon, iconEl);
		return iconEl;
	}
}

/**
 * Handles icons in the editor window of Markdown tabs.
 */
export default class EditorIconManager extends IconManager {
	constructor(plugin: IconicPlugin) {
		super(plugin);

		// Style hashtags in reading mode
		this.plugin.registerMarkdownPostProcessor(sectionEl => {
			const tags = this.plugin.getTagItems();
			const tagEls = sectionEl.findAll('a.tag');
			this.refreshReadingModeHashtags(tags, tagEls);
		});

		// Show icons beside links in reading mode
		this.plugin.registerMarkdownPostProcessor((sectionEl, context) => {
			const linkEls = sectionEl.findAll('a.internal-link');
			this.refreshReadingModeLinks(linkEls, context.sourcePath);
		});

		// Make methods accessible inside ViewPlugin
		const onTagContextMenu = this.onTagContextMenu.bind(this);
		const refreshTag = this.refreshTag.bind(this);

		this.plugin.registerEditorExtension(ViewPlugin.fromClass(class {
			update(update: ViewUpdate): void {
				let viewport = update.view.viewport;
				let tree = syntaxTree(update.view.state);

				tree.iterate({ from: viewport.from, to: viewport.to, enter: (nodeRef) => {
					if (!nodeRef.name.includes('hashtag-begin')) return;

					// Get both tag elements
					const beginEl = update.view.domAtPos(nodeRef.to).node.parentElement;
					if (!beginEl?.instanceOf(HTMLElement)) return;
					const endEl = beginEl?.nextElementSibling;
					if (!endEl?.instanceOf(HTMLElement) || !endEl.hasClass('cm-hashtag-end')) return;

					// Get tag
					const tagId = endEl.getText();
					const tag = plugin.getTagItem(tagId);

					// Refresh tag
					const onContextMenu = () => {
						if (tag) onTagContextMenu(tag.id, true);
					};
					refreshTag(beginEl, tag, onContextMenu);
					if (tag) tag.icon = null;
					refreshTag(endEl, tag, onContextMenu);
				}})
			}
		}));

		// Make methods accessible inside ViewPlugin
		const getLinkIcon = this.getLinkIcon.bind(this);
		const refreshIcon = this.refreshIcon.bind(this);

		// Show icons beside links in live preview
		this.plugin.registerEditorExtension(ViewPlugin.fromClass(class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.getDecorations(view);
			}

			update(update: ViewUpdate): void {
				if (update.docChanged
					|| update.viewportChanged
					|| syntaxTree(update.startState) !== syntaxTree(update.state)
					|| update.startState.field(editorLivePreviewField, false) !== update.state.field(editorLivePreviewField, false)
					|| update.transactions.some(tr => tr.effects.some(effect => effect.is(refreshLinkIconsEffect)))
				) {
					this.decorations = this.getDecorations(update.view);
				}
			}

			getDecorations(view: EditorView): DecorationSet {
				const { state } = view;
				if (!plugin.settings.showLinkIcons || !state.field(editorLivePreviewField, false)) {
					return Decoration.none;
				}
				const sourcePath = state.field(editorInfoField, false)?.file?.path ?? '';
				const tree = syntaxTree(state);
				const widgets: Range<Decoration>[] = [];
				const linkPositions = new Set<number>();

				for (const { from, to } of view.visibleRanges) {
					tree.iterate({ from, to, enter: (nodeRef) => {
						const isWikilink = nodeRef.name.includes('hmd-internal-link');
						const isDestination = nodeRef.name.includes('url') && !nodeRef.name.includes('formatting');
						if (!isWikilink && !isDestination) return;

						const line = state.doc.lineAt(nodeRef.from);
						const nodeStart = nodeRef.from - line.from;
						let linkStart: number;
						let linktext: string | null;

						if (isWikilink) {
							// [[Wikilink]]: Find the brackets around this node, and drop the alias
							linkStart = line.text.lastIndexOf('[[', nodeStart);
							const linkEnd = line.text.indexOf(']]', nodeStart);
							if (linkStart < 0 || linkEnd < 0) return;
							linktext = line.text.substring(linkStart + 2, linkEnd).split(/\\?\|/)[0] ?? null;
						} else {
							// [Markdown link](destination): This node is the destination
							if (line.text.substring(nodeStart - 2, nodeStart) !== '](') return;
							linkStart = line.text.lastIndexOf('[', nodeStart - 2);
							if (linkStart < 0) return;
							linktext = getMarkdownLinktext(state.sliceDoc(nodeRef.from, nodeRef.to));
						}

						// A wikilink with an alias has several nodes, but only needs one icon
						const linkPos = line.from + linkStart;
						if (linkPositions.has(linkPos)) return;
						linkPositions.add(linkPos);

						// Embeds display the file itself
						if (!linktext || line.text[linkStart - 1] === '!') return;

						const icon = getLinkIcon(linktext, sourcePath);
						if (!icon) return;

						widgets.push(Decoration.widget({
							widget: new LinkIconWidget(icon, refreshIcon),
							side: -1,
						}).range(linkPos));
					}});
				}

				return Decoration.set(widgets, true);
			}
		}, {
			decorations: viewPlugin => viewPlugin.decorations,
		}));

		// Initialize MarkdownViews as they open
		this.plugin.registerEvent(this.app.workspace.on('active-leaf-change', leaf => {
			if (leaf?.view instanceof MarkdownView) {
				this.observeViewIcons(leaf.view);
				this.refreshViewIcons(leaf.view);
			}
		}));

		// Initialize any current MarkdownViews
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			if (leaf.view instanceof MarkdownView) {
				this.observeViewIcons(leaf.view);
				this.refreshViewIcons(leaf.view);
			}
		}

		// If we add a new property to a file, refresh property icons
		this.plugin.registerEvent(this.app.vault.on('modify', () => {
			this.refreshIcons();
		}));
	}

	/**
	 * Refresh title icon whenever editing mode changes.
	 */
	private observeEditingMode(view: MarkdownView): void {
		this.setMutationObserver(view.containerEl, { attributes: true }, mutation => {
			if (mutation.attributeName === 'data-mode') {
				this.refreshTitleIcon(view);
			}
		});
	}

	/**
	 * Refresh whenever a given MarkdownView needs to redraw its icons.
	 */
	private observeViewIcons(view: MarkdownView): void {
		// Editing mode
		this.observeEditingMode(view);

		// Properties list
		// @ts-expect-error (Private API)
		const propsEl: HTMLElement = view.metadataEditor?.propertyListEl;
		if (!propsEl) return;
		this.observeProperties(propsEl, view, true);

		// `tags` property
		const tagsEl: HTMLElement = propsEl.find('.metadata-property[data-property-key="tags"] .multi-select-container');
		if (!tagsEl) return;
		this.observeTagsProperty(tagsEl, view);
	}

	/**
	 * Refresh whenever a given properties list needs to redraw its icons.
	 */
	private observeProperties(propsEl: HTMLElement, view: MarkdownView, shouldObserve: boolean): void {
		if (!shouldObserve) {
			this.stopMutationObserver(propsEl);
			this.stopEventListener(propsEl, 'click');
			this.stopEventListener(propsEl, 'contextmenu');
			return;
		}

		this.setMutationObserver(propsEl, {
			childList: true,
			subtree: true,
		}, mutation => {
			if (mutation.target.instanceOf(HTMLElement) && mutation.target.hasClass('metadata-property-icon')) {
				this.refreshViewIcons(view);
				return;
			}
			for (const addedNode of mutation.addedNodes) {
				if (addedNode.instanceOf(HTMLElement) && addedNode.hasClass('tree-item')) {
					this.refreshViewIcons(view);
					return;
				}
			}
		});

		this.setEventListener(propsEl, 'click', event => {
			const pointEls = event.doc.elementsFromPoint(event.x, event.y);
			const iconEl = pointEls.find(el => el.hasClass('metadata-property-icon'));
			const propEl = pointEls.find(el => el.hasClass('metadata-property'));
			if (iconEl && propEl?.instanceOf(HTMLElement)) {
				const domPropId = propEl.dataset.propertyKey; // Lowercase
				const prop = domPropId ? this.plugin.getPropertyItem(domPropId) : null;
				if (!prop) return;
				if (this.plugin.isSettingEnabled('clickableIcons')) {
					IconPicker.openSingle(this.plugin, prop, (newIcon, newColor) => {
						this.plugin.savePropertyIcon(prop, newIcon, newColor);
						this.plugin.refreshManagers('property');
					});
					event.stopPropagation();
				} else {
					this.onPropertyContextMenu(prop.id);
				}
			}
		}, { capture: true });

		if (this.plugin.settings.showMenuActions) {
			this.setEventListener(propsEl, 'contextmenu', event => {
				const pointEls = event.doc.elementsFromPoint(event.x, event.y);
				const iconEl = pointEls.find(el => el.hasClass('metadata-property-icon'));
				const propEl = pointEls.find(el => el.hasClass('metadata-property'));
				if (iconEl && propEl?.instanceOf(HTMLElement)) {
					const domPropId = propEl.dataset.propertyKey; // Lowercase
					const prop = domPropId ? this.plugin.getPropertyItem(domPropId) : null;
					if (prop) this.onPropertyContextMenu(prop.id);
				}
			}, { capture: true });
		} else {
			this.stopEventListener(propsEl, 'contextmenu');
		}
	}

	/**
	 * Refresh whenever the `tags` property changes.
	 */
	private observeTagsProperty(tagsEl: HTMLElement, view: MarkdownView): void {
		this.setMutationsObserver(tagsEl, { childList: true }, () => this.refreshViewIcons(view));
	}

	/**
	 * @override
	 * Refresh all icons in all MarkdownViews.
	 */
	refreshIcons(unloading?: boolean): void {
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			if (leaf.view instanceof MarkdownView) {
				this.refreshViewIcons(leaf.view, unloading);
			}
		}
	}

	/**
	 * Refresh all icons in a single MarkdownView.
	 */
	refreshViewIcons(view: MarkdownView, unloading?: boolean): void {
		// Refresh title icon
		this.refreshTitleIcon(view, unloading);

		// Refresh property icons
		// @ts-expect-error
		const propsEl: HTMLElement = view.metadataEditor?.propertyListEl;
		const props = this.plugin.getPropertyItems(unloading);
		this.observeProperties(propsEl, view, false);
		this.refreshPropertyIcons(props, view);
		this.observeProperties(propsEl, view, true);

		// Refresh `tags` property
		const tags = this.plugin.getTagItems(unloading);
		this.refreshTagsPropertyIcons(tags, view, unloading);

		// Refresh hashtags
		const tagEls = view.containerEl.findAll('a.tag');
		this.refreshReadingModeHashtags(tags, tagEls, unloading);

		// Refresh links
		const linkEls = view.containerEl.findAll('a.internal-link');
		this.refreshReadingModeLinks(linkEls, view.file?.path ?? '', unloading);

		this.refreshLivePreviewMode(view.editor);
	}

	/**
	 * Refresh inline title icon.
	 */
	private refreshTitleIcon(view: MarkdownView, unloading?: boolean): void {
		if (!view.file) return;
		// @ts-expect-error (Private API)
		const titleEl: unknown = view.inlineTitleEl;
		if (!(titleEl instanceof HTMLElement)) return;
		const headerEl = titleEl.closest('.mod-header, .cm-sizer');
		if (!(headerEl instanceof HTMLElement)) return;

		// Check whether title is highlighted
		const selection = titleEl.win.getSelection();
		const isSelected = selection?.rangeCount
			&& titleEl.contains(selection?.getRangeAt(0).startContainer);

		// Remove wrapper if necessary
		if (!this.plugin.settings.showTitleIcons || unloading) {
			const wrapperEl = titleEl.closest('.iconic-title-wrapper');
			if (wrapperEl) {
				headerEl.prepend(titleEl);
				wrapperEl.remove();
			}
			return;
		}

		// Set up title wrapper
		const wrapperEl = headerEl.find(':scope > .iconic-title-wrapper')
			?? createDiv({ cls: 'iconic-title-wrapper' });
		const iconEl = wrapperEl.find(':scope > .iconic-icon')
			?? createDiv({ cls: 'iconic-icon' });
		wrapperEl.append(iconEl, titleEl);
		headerEl.prepend(wrapperEl);

		// Re-select title if necessary
		if (isSelected) {
			const range = titleEl.doc.createRange();
			const selection = titleEl.win.getSelection();
			range.selectNodeContents(titleEl);
			selection?.removeAllRanges();
			selection?.addRange(range);
		}

		// Get file and/or rule icon
		const file = this.plugin.getFileItem(view.file.path);
		const rule = this.plugin.ruleManager?.checkRuling('file', file.id) ?? file;
		if (!rule.icon && !rule.color) file.iconDefault = null;

		// Refresh icon
		if (this.plugin.isSettingEnabled('clickableIcons')) {
			this.refreshIcon(rule, iconEl, () => {
				IconPicker.openSingle(this.plugin, file, (newIcon, newColor) => {
					this.plugin.saveFileIcon(file, newIcon, newColor);
					this.plugin.refreshManagers('file');
				});
			});
		} else {
			this.refreshIcon(rule, iconEl);
		}
		iconEl.addClass('iconic-icon');

		// Add menu actions
		if (this.plugin.settings.showMenuActions) {
			this.setEventListener(iconEl, 'contextmenu', event => {
				navigator.vibrate?.(100); // Not supported on iOS
				const menu = new Menu();
				menu.addItem(item => item
					.setTitle(STRINGS.menu.changeIcon)
					.setIcon('lucide-image-plus')
					.setSection('icon')
					.onClick(() => {
						IconPicker.openSingle(this.plugin, file, (newIcon, newColor) => {
							this.plugin.saveFileIcon(file, newIcon, newColor);
							this.plugin.refreshManagers('file', 'folder');
						});
					})
				);
				if (file.icon || file.color) menu.addItem(item => item
					.setTitle(STRINGS.menu.removeIcon)
					.setIcon('lucide-image-minus')
					.setSection('icon')
					.onClick(() => {
						this.plugin.saveFileIcon(file, null, null);
						this.plugin.refreshManagers('file');
					})
				);
				const rule = this.plugin.ruleManager?.checkRuling('file', file.id);
				if (rule) menu.addItem(item => { item
					.setTitle('Edit rule...')
					.setIcon('lucide-image-play')
					.setSection('icon')
					.onClick(() => RuleEditor.open(this.plugin, 'file', rule, newRule => {
						const isRulingChanged = newRule
							? this.plugin.ruleManager?.saveRule('file', newRule)
							: this.plugin.ruleManager?.deleteRule('file', rule.id);
						if (isRulingChanged) {
							this.refreshIcons();
							this.plugin.refreshManagers('file');
						}
					}));
				});
				menu.showAtPosition(event);
			});
		} else {
			this.stopEventListener(iconEl, 'contextmenu');
		}
	}

	/**
	 * Refresh all property icons in a single MarkdownView.
	 */
	private refreshPropertyIcons(props: PropertyItem[], view: MarkdownView): void {
		// @ts-expect-error (Private API)
		const propListEl: HTMLElement = view.metadataEditor?.propertyListEl;
		if (!propListEl) return;
		const propEls = propListEl.findAll(':scope > .metadata-property');

		for (const propEl of propEls) {
			const domPropId = propEl.dataset.propertyKey; // Lowercase
			if (!domPropId) continue;

			// Use case-insensitive matching to find the property
			const prop = props.find(prop => prop.id.toLowerCase() === domPropId.toLowerCase());

			if (!prop) continue;

			const keyEl = propEl.find(':scope > .metadata-property-key');
			const iconEl = keyEl?.find(':scope > .metadata-property-icon');
			if (iconEl) this.refreshIcon(prop, iconEl);
		}
	}

	/**
	 * Refresh all tag icons in the `tags` property.
	 */
	private refreshTagsPropertyIcons(tags: TagItem[], view: MarkdownView, unloading?: boolean): void {
		// @ts-expect-error (Private API)
		const propListEl: HTMLElement = view.metadataEditor?.propertyListEl;
		if (!propListEl) return;
		const propTagEls = view.contentEl.findAll('.metadata-property[data-property-key="tags"] .multi-select-pill');
		if (!propTagEls) return;

		// Refresh each tag pill
		for (const propTagEl of propTagEls) {
			const tagId = propTagEl.find(':scope > .multi-select-pill-content')?.getText();
			if (!tagId) continue;
			const tag = tags.find(tag => tag.id === tagId) ?? null;
			this.refreshTag(propTagEl, tag, () => {
				if (tag) this.onTagContextMenu(tag.id);
			}, unloading);
		}
	}

	/**
	 * Refresh all hashtag elements in reading mode.
	 */
	private refreshReadingModeHashtags(tags: TagItem[], tagEls: HTMLElement[], unloading?: boolean): void {
		for (const tagEl of tagEls) {
			const tagId = tagEl.getAttribute('href')?.replace('#', '');
			if (!tagId) continue;
			const tag = tags.find(tag => tag.id === tagId) ?? null;
			this.refreshTag(tagEl, tag, event => {
				if (tag) this.onCreateTagContextMenu(tag.id, event);
			}, unloading);
		}
	}

	/**
	 * Refresh all link elements in reading mode.
	 */
	private refreshReadingModeLinks(linkEls: HTMLElement[], sourcePath: string, unloading?: boolean): void {
		for (const linkEl of linkEls) {
			const linktext = linkEl.getAttribute('data-href') ?? linkEl.getAttribute('href');
			const icon = linktext ? this.getLinkIcon(linktext, sourcePath) : null;
			this.refreshLink(linkEl, icon, unloading);
		}
	}

	/**
	 * Refresh the entire live preview editor.
	 */
	private refreshLivePreviewMode(editor: Editor): void {
		// @ts-expect-error (Private API)
		const cm = editor.cm;
		if (cm instanceof EditorView) cm.dispatch({ effects: refreshLinkIconsEffect.of(null) });
	}

	/**
	 * Get the icon of the file that a given link points to, if it has one.
	 */
	private getLinkIcon(linktext: string, sourcePath: string): Icon | null {
		const tFile = this.app.metadataCache.getFirstLinkpathDest(getLinkpath(linktext), sourcePath);
		if (!tFile) return null;

		// Get file and/or rule icon
		const file = this.plugin.getFileItem(tFile.path);
		const rule = this.plugin.ruleManager?.checkRuling('file', file.id) ?? file;
		return rule.icon ? rule : null;
	}

	/**
	 * Refresh a given link element.
	 */
	private refreshLink(linkEl: HTMLElement, icon: Icon | null, unloading?: boolean): void {
		// Remove icon if necessary
		if (!this.plugin.settings.showLinkIcons || !icon || unloading) {
			linkEl.find(':scope > .iconic-link-icon')?.remove();
			return;
		}

		const iconEl = linkEl.find(':scope > .iconic-link-icon')
			?? linkEl.createSpan({ cls: 'iconic-link-icon', prepend: true });

		// Links are refreshed whenever a file is modified, so skip any icon that's
		// already displayed. Colors are always refreshed, in case the theme changed.
		const iconState = `${icon.icon} ${icon.color ?? ''}`;
		if (iconEl.dataset.icon === iconState && !icon.color) return;
		iconEl.dataset.icon = iconState;

		// Set icon
		this.refreshIcon(icon, iconEl);
	}

	/**
	 * Refresh a given tag pill element.
	 */
	private refreshTag(tagEl: HTMLElement, tag: TagItem | null, onContextMenu: (event: MouseEvent) => void, unloading?: boolean): void {
		// Remove styling if necessary
		if (!this.plugin.settings.showTagPillIcons || !tag || unloading) {
			tagEl.find('.iconic-icon')?.remove();
			this.setTagColor(tagEl, null);
			this.stopEventListener(tagEl, 'contextmenu');
			return;
		}

		// Set icon & color
		if (tag.icon) {
			const iconEl = tagEl.find('.iconic-icon') ?? createSpan();
			tagEl.prepend(iconEl);
			if (tag && this.plugin.isSettingEnabled('clickableIcons')) {
				this.refreshIcon(tag, iconEl, event => {
					IconPicker.openSingle(this.plugin, tag, (newIcon, newColor) => {
						this.plugin.saveTagIcon(tag, newIcon, newColor);
						this.plugin.refreshManagers('tag');
					});
					event.stopPropagation();
				});
			} else {
				this.refreshIcon(tag, iconEl);
			}
		} else {
			const iconEl = tagEl.find('.iconic-icon');
			iconEl?.remove();
		}
		this.setTagColor(tagEl, tag?.color ?? null);

		// Set menu actions
		if (this.plugin.settings.showMenuActions) {
			this.setEventListener(tagEl, 'contextmenu', event => onContextMenu(event));
		} else {
			this.stopEventListener(tagEl, 'contextmenu');
		}
	}

	/**
	 * Apply a tag color to a tag pill element.
	 */
	private setTagColor(tagEl: HTMLElement, color: string | null): void {
		if (color) {
			const cssRgb = ColorUtils.toRgb(color);
			const cssRgba = cssRgb.replace('rgb(', 'rgba(').replace(')', '');
			tagEl.style.setProperty('--tag-color', cssRgb);
			tagEl.style.setProperty('--tag-color-hover', cssRgb);
			tagEl.style.setProperty('--tag-color-remove-hover', cssRgb);
			tagEl.style.setProperty('--tag-background', cssRgba + ', 0.1)');
			tagEl.style.setProperty('--tag-background-hover', cssRgba + ', 0.1)');
			tagEl.style.setProperty(`--tag-border-color`, cssRgba + ', 0.25)');
			tagEl.style.setProperty(`--tag-border-color-hover`, cssRgba + ', 0.5)');
		} else {
			tagEl.style.removeProperty('--tag-color');
			tagEl.style.removeProperty('--tag-color-hover');
			tagEl.style.removeProperty('--tag-color-remove-hover');
			tagEl.style.removeProperty('--tag-background');
			tagEl.style.removeProperty('--tag-background-hover');
			tagEl.style.removeProperty(`--tag-border-color`);
			tagEl.style.removeProperty(`--tag-border-color-hover`);
		}
	}

	/**
	 * When user context-clicks a property, add custom items to the menu.
	 */
	private onPropertyContextMenu(propId: string): void {
		navigator.vibrate?.(100); // Not supported on iOS
		this.plugin.menuManager?.closeAndFlush();
		const prop = this.plugin.getPropertyItem(propId);
		if (!prop) return;

		// Change icon
		this.plugin.menuManager?.addItemAfter(['action.changeType', 'action'], item => item
			.setTitle(STRINGS.menu.changeIcon)
			.setIcon('lucide-image-plus')
			.setSection('icon')
			.onClick(() => IconPicker.openSingle(this.plugin, prop, (newIcon, newColor) => {
				this.plugin.savePropertyIcon(prop, newIcon, newColor);
				this.plugin.refreshManagers('property');
			}))
		);

		// Remove icon / Reset color
		if (prop.icon || prop.color) {
			this.plugin.menuManager?.addItem(item => item
				.setTitle(prop.icon ? STRINGS.menu.removeIcon : STRINGS.menu.resetColor)
				.setIcon(prop.icon ? 'lucide-image-minus' : 'lucide-rotate-ccw')
				.setSection('icon')
				.onClick(() => {
					this.plugin.savePropertyIcon(prop, null, null);
					this.plugin.refreshManagers('property');
				})
			);
		}
	}

	/**
	 * When user context-clicks a tag, add custom items to the menu.
	 */
	private onTagContextMenu(tagId: string, isEditingMode?: boolean): void {
		this.plugin.menuManager?.closeAndFlush();
		const tag = this.plugin.getTagItem(tagId);
		if (!tag) return;

		// Change icon
		this.plugin.menuManager?.addItemAfter(isEditingMode ? [] : 'selection', menuItem => menuItem
			.setTitle(STRINGS.menu.changeIcon)
			.setIcon('lucide-image-plus')
			.setSection('icon')
			.onClick(() => IconPicker.openSingle(this.plugin, tag, (newIcon, newColor) => {
				this.plugin.saveTagIcon(tag, newIcon, newColor);
				this.plugin.refreshManagers('tag');
			}))
		);

		// Remove icon / Reset color
		if (tag.icon || tag.color) {
			this.plugin.menuManager?.addItem(menuItem => menuItem
				.setTitle(tag.icon ? STRINGS.menu.removeIcon : STRINGS.menu.resetColor)
				.setIcon(tag.icon ? 'lucide-image-minus' : 'lucide-rotate-ccw')
				.setSection('icon')
				.onClick(() => {
					this.plugin.saveTagIcon(tag, null, null);
					this.plugin.refreshManagers('tag');
				})
			);
		}
	}

	/**
	 * When user context-clicks a tag without a menu, create a new one.
	 */
	private onCreateTagContextMenu(tagId: string, event: MouseEvent): void {
		navigator.vibrate?.(100); // Not supported on iOS
		this.plugin.tagIconManager?.onContextMenu(tagId, event);
	}

	/**
	 * @override
	 */
	unload(): void {
		this.refreshIcons(true);
	}
}
