import { MarkdownPreviewView, MarkdownView, Platform } from 'obsidian';
import IconicPlugin, { TagItem, PropertyItem, STRINGS } from 'src/IconicPlugin';
import ColorUtils from 'src/ColorUtils';
import IconManager from 'src/managers/IconManager';
import IconPicker from 'src/dialogs/IconPicker';

/**
 * Handles icons in the editor window of Markdown tabs.
 */
export default class EditorIconManager extends IconManager {
	constructor(plugin: IconicPlugin) {
		super(plugin);

		// Markdown post-processor for hashtags (reading mode)
		this.plugin.registerMarkdownPostProcessor(sectionEl => {
			const tags = this.plugin.getTagItems();
			if (tags.length === 0) return;
			const tagEls = sectionEl.findAll('a.tag');
			for (const tagEl of tagEls) {
				const tagId = tagEl.getAttribute('href')?.replace('#', '');
				if (!tagId) continue;
				const tag = tags.find(tag => tag.id === tagId);
				if (!tag) continue;
				EditorIconManager.setTagColor(tag, tagEl);
				const iconEl = tagEl.find('.iconic-icon') ?? createSpan();
				tagEl.prepend(iconEl);
				if (this.plugin.isSettingEnabled('clickableIcons')) {
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
				if (this.plugin.settings.showMenuActions) {
					this.setEventListener(tagEl, 'contextmenu', event => {
						this.onTagNewContextMenu(tag.id, event);
					});
				} else {
					this.stopEventListener(tagEl, 'contextmenu');
				}
			}
		});

		// Initialize any open MarkdownViews
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			if (leaf.view instanceof MarkdownView) {
				this.observeViewIcons(leaf.view);
				this.refreshViewIcons(leaf.view);
			}
		}

		// Refresh icons in the active leaf
		this.plugin.registerEvent(this.app.workspace.on('active-leaf-change', () => {
			this.refreshIcons();
		}));

		// If we add a new property to a file, refresh property icons
		this.plugin.registerEvent(this.app.vault.on('modify', () => {
			this.refreshIcons();
		}));
	}

	/**
	 * Refresh whenever a given MarkdownView needs to redraw its icons.
	 */
	private observeViewIcons(view: MarkdownView): void {
		// Note container
		this.observeContainer(view.containerEl, view);

		// Properties list
		// @ts-expect-error (Private API)
		const propsEl: HTMLElement = view.metadataEditor?.propertyListEl;
		if (!propsEl) return;
		this.observeProperties(propsEl, view);

		// "Tags" property
		const tagsEl: HTMLElement = propsEl.find('.metadata-property[data-property-key="tags"] .multi-select-container');
		if (!tagsEl) return;
		this.observeTagsProperty(tagsEl, view);
	}

	/**
	 * Refresh whenever a given container switches edit modes.
	 */
	private observeContainer(containerEl: HTMLElement, view: MarkdownView): void {
		this.setMutationsObserver(containerEl, { attributeFilter: ['data-mode'] }, () => {
			this.refreshViewIcons(view);
		});
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
			const pointEls = activeDocument.elementsFromPoint(event.x, event.y);
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
				const pointEls = activeDocument.elementsFromPoint(event.x, event.y);
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
	 * Refresh whenever the "tags" property changes.
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
		// Trigger markdown post-processor
		if (view.currentMode instanceof MarkdownPreviewView) {
			view.currentMode.rerender(true);
		}
		const props = this.plugin.getPropertyItems(unloading);
		const tags = this.plugin.getTagItems(unloading);
		this.refreshPropertyIcons(props, view);
		this.refreshTagIcons(tags, view);
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
	 * Refresh all tag icons in a single MarkdownView.
	*/
	private refreshTagIcons(tags: TagItem[], view: MarkdownView): void {
		// @ts-expect-error (Private API)
		const propListEl: HTMLElement = view.metadataEditor?.propertyListEl;
		if (!propListEl) return;
		const propTagEls = view.contentEl.findAll('.metadata-property[data-property-key="tags"] .multi-select-pill');
		if (!propTagEls) return;

		// "Tags" property
		for (const propTagEl of propTagEls) {
			const tagId = propTagEl.find(':scope > .multi-select-pill-content')?.getText();
			if (!tagId) continue;
			const tag = tags.find(tag => tag.id === tagId);
			if (!tag) continue;
			if (tag.icon) {
				const iconEl = propTagEl.find('.iconic-icon') ?? createSpan();
				if (iconEl !== propTagEl.firstChild) {
					propTagEl.insertBefore(iconEl, propTagEl.firstChild);
				}
				if (this.plugin.isSettingEnabled('clickableIcons')) {
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
				const iconEl = propTagEl.find('.iconic-icon');
				iconEl?.remove();
			}
			EditorIconManager.setTagColor(tag, propTagEl);
			if (this.plugin.settings.showMenuActions) {
				this.setEventListener(propTagEl, 'contextmenu', () => this.onTagContextMenu(tag.id));
			} else {
				this.stopEventListener(propTagEl, 'contextmenu');
			}
		}

		// Hashtags (editing mode)
		if (view.getMode() === 'source') {
			let editingViewEl: HTMLElement | undefined;
			for (const childEl of view.contentEl.children) {
				if (childEl instanceof HTMLElement && childEl.hasClass('markdown-source-view')) {
					editingViewEl = childEl;
					break;
				}
			}
			const tagEndEls = editingViewEl?.findAll('.cm-hashtag-end') ?? [];
			for (const tagEndEl of tagEndEls) {
				const tagId = tagEndEl.getText();
				if (!tagId) continue;
				const tag = tags.find(tag => tag.id === tagId);
				if (!tag) continue;
				// Decorate 1st half of tag
				const tagBeginEl = tagEndEl.previousElementSibling;
				if (tagBeginEl instanceof HTMLElement && tagBeginEl.hasClass('cm-hashtag-begin')) {
					EditorIconManager.setTagColor(tag, tagBeginEl);
					if (this.plugin.settings.showMenuActions) {
						this.setEventListener(tagBeginEl, 'contextmenu', event => {
							if (Platform.isDesktop) this.onTagContextMenu(tag.id, true);
							if (Platform.isMobile) this.onTagNewContextMenu(tag.id, event);
						});
					} else {
						this.stopEventListener(tagBeginEl, 'contextmenu');
					}
				}
				// Decorate 2nd half of tag
				EditorIconManager.setTagColor(tag, tagEndEl);
				if (this.plugin.settings.showMenuActions) {
					this.setEventListener(tagEndEl, 'contextmenu', event => {
						if (Platform.isDesktop) this.onTagContextMenu(tag.id, true);
						if (Platform.isMobile) this.onTagNewContextMenu(tag.id, event);
					});
				} else {
					this.stopEventListener(tagEndEl, 'contextmenu');
				}
			}
		}
	}

	/**
	 * When user context-clicks a property, add custom items to the menu.
	 */
	private onPropertyContextMenu(propId: string): void {
		navigator?.vibrate(100); // Might not be supported on iOS
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
		navigator?.vibrate(100); // Not supported on iOS
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
	 * When user context-clicks a tag, open a menu.
	 */
	private onTagNewContextMenu(tagId: string, event: MouseEvent): void {
		this.plugin.tagIconManager?.onContextMenu(tagId, event);
	}

	private static setTagColor(tag: TagItem, tagEl: HTMLElement): void {
		if (tag.color) {
			const cssRgb = ColorUtils.toRgb(tag.color);
			const cssRgba = cssRgb.replace('rgb(', 'rgba(').replace(')', '');
			tagEl.style.setProperty('color', cssRgb);
			tagEl.style.setProperty('background-color', cssRgba + ', 0.1)');
			tagEl.style.setProperty(`--tag-border-color`, cssRgba + ', 0.25)');
			tagEl.style.setProperty(`--tag-border-color-hover`, cssRgba + ', 0.5)');
			if (tagEl.hasClass('multi-select-pill')) tagEl.style.setProperty(`--pill-color-remove`, cssRgb);
		} else {
			tagEl.style.removeProperty('color');
			tagEl.style.removeProperty('background-color');
			tagEl.style.removeProperty(`--tag-border-color`);
			tagEl.style.removeProperty(`--tag-border-color-hover`);
			if (tagEl.hasClass('multi-select-pill')) tagEl.style.removeProperty(`--pill-color-remove`);
		}
	}

	/**
	 * @override
	 */
	unload(): void {
		this.refreshIcons(true);
		super.unload();
	}
}
