import { Editor, MarkdownView, Menu } from 'obsidian';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import IconicPlugin, { TagItem, PropertyItem, STRINGS } from 'src/IconicPlugin';
import ColorUtils from 'src/ColorUtils';
import IconManager from 'src/managers/IconManager';
import RuleEditor from 'src/dialogs/RuleEditor';
import IconPicker from 'src/dialogs/IconPicker';

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

		const manager = this;
		plugin.registerEditorExtension(ViewPlugin.fromClass(class {
			update(update: ViewUpdate): void {
				let viewport = update.view.viewport;
				let tree = syntaxTree(update.view.state);

				tree.iterate({ from: viewport.from, to: viewport.to, enter: (nodeRef) => {
					if (!nodeRef.name.includes('hashtag-begin')) return;

					// Get both tag elements
					const beginEl = update.view.domAtPos(nodeRef.to).node.parentElement;
					if (!(beginEl instanceof HTMLElement)) return;
					const endEl = beginEl?.nextElementSibling;
					if (!(endEl instanceof HTMLElement) || !endEl.hasClass('cm-hashtag-end')) return;

					// Get tag
					const tagId = endEl.getText();
					const tag = manager.plugin.getTagItem(tagId);

					// Refresh tag
					const onContextMenu = () => {
						if (tag) manager.onTagContextMenu(tag.id, true);
					};
					manager.refreshTag(beginEl, tag, onContextMenu);
					if (tag) tag.icon = null;
					manager.refreshTag(endEl, tag, onContextMenu);
				}})
			}
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
		this.observeProperties(propsEl, view);

		// `tags` property
		const tagsEl: HTMLElement = propsEl.find('.metadata-property[data-property-key="tags"] .multi-select-container');
		if (!tagsEl) return;
		this.observeTagsProperty(tagsEl, view);
	}

	/**
	 * Refresh whenever a given properties list needs to redraw its icons.
	 */
	private observeProperties(propsEl: HTMLElement, view: MarkdownView): void {
		this.setMutationObserver(propsEl, {
			childList: true,
			subtree: true,
		}, mutation => {
			if (mutation.target instanceof HTMLElement && mutation.target.hasClass('metadata-property-icon')) {
				this.refreshViewIcons(view);
				return;
			}
			for (const addedNode of mutation.addedNodes) {
				if (addedNode instanceof HTMLElement && addedNode.hasClass('tree-item')) {
					this.refreshViewIcons(view);
					return;
				}
			}
		});

		this.setEventListener(propsEl, 'click', event => {
			const pointEls = event.doc.elementsFromPoint(event.x, event.y);
			const iconEl = pointEls.find(el => el.hasClass('metadata-property-icon'));
			const propEl = pointEls.find(el => el.hasClass('metadata-property'));
			if (iconEl && propEl instanceof HTMLElement) {
				const prop = propEl.dataset.propertyKey
					? this.plugin.getPropertyItem(propEl.dataset.propertyKey) : null;
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
				if (iconEl && propEl instanceof HTMLElement) {
					const prop = propEl.dataset.propertyKey
						? this.plugin.getPropertyItem(propEl.dataset.propertyKey)
						: null;
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
		const props = this.plugin.getPropertyItems(unloading);
		this.refreshPropertyIcons(props, view);

		// Refresh `tags` property
		const tags = this.plugin.getTagItems(unloading);
		this.refreshTagsPropertyIcons(tags, view, unloading);

		// Refresh hashtags
		const tagEls = view.containerEl.findAll('a.tag');
		this.refreshReadingModeHashtags(tags, tagEls, unloading);
		this.refreshLivePreviewMode(view.editor);
	}

	/**
	 * Refresh inline title icon.
	 */
	private refreshTitleIcon(view: MarkdownView, unloading?: boolean): void {
		if (!view.file) return;
		// @ts-expect-error (Private API)
		const titleEl = view.inlineTitleEl;
		if (!(titleEl instanceof HTMLElement)) return;
		const headerEl = titleEl.closest('.mod-header, .cm-sizer');
		if (!(headerEl instanceof HTMLElement)) return;

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
			?? createDiv({ cls: 'iconic-icon' });;
		wrapperEl.append(iconEl, titleEl);
		headerEl.prepend(wrapperEl);

		// Get file and/or rule icon
		const file = this.plugin.getFileItem(view.file.path);
		const rule = this.plugin.ruleManager.checkRuling('file', file.id) ?? file;
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
				navigator?.vibrate(100); // Not supported on iOS
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
				const rule = this.plugin.ruleManager.checkRuling('file', file.id);
				if (rule) menu.addItem(item => { item
					.setTitle('Edit rule...')
					.setIcon('lucide-image-play')
					.setSection('icon')
					.onClick(() => RuleEditor.open(this.plugin, 'file', rule, newRule => {
						const isRulingChanged = newRule
							? this.plugin.ruleManager.saveRule('file', newRule)
							: this.plugin.ruleManager.deleteRule('file', rule.id);
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
			const prop = props.find(prop => prop.id === propEl.dataset.propertyKey);
			if (!prop) return;

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
	 * Refresh the entire live preview editor.
	 */
	private refreshLivePreviewMode(editor: Editor): void {
		// @ts-expect-error (Private API)
		const cm = editor.cm;
		if (cm instanceof EditorView) cm.dispatch();
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
		navigator?.vibrate(100); // Not supported on iOS
		this.plugin.menuManager.closeAndFlush();
		const prop = this.plugin.getPropertyItem(propId);

		// Change icon
		this.plugin.menuManager.addItemAfter(['action.changeType', 'action'], item => item
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
			this.plugin.menuManager.addItem(item => item
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
		this.plugin.menuManager.closeAndFlush();
		const tag = this.plugin.getTagItem(tagId);
		if (!tag) return;

		// Change icon
		this.plugin.menuManager.addItemAfter(isEditingMode ? [] : 'selection', menuItem => menuItem
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
			this.plugin.menuManager.addItem(menuItem => menuItem
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
		navigator?.vibrate(100); // Not supported on iOS
		this.plugin.tagIconManager?.onContextMenu(tagId, event);
	}

	/**
	 * @override
	 */
	unload(): void {
		this.refreshIcons(true);
		this.stopMutationObservers();
		super.unload();
	}
}
