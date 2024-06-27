import { MarkdownView } from 'obsidian';
import IconicPlugin, { PropertyItem, STRINGS } from './IconicPlugin';
import IconManager from './IconManager';
import IconPicker from './IconPicker';

/**
 * Handles icons in the editor window of Markdown tabs.
 */
export default class EditorIconManager extends IconManager {
	constructor(plugin: IconicPlugin) {
		super(plugin);

		// Watch for property suggestion menus
		this.setMutationObserver(activeDocument.body, { childList: true }, mutations => {
			if (!activeDocument.activeElement?.hasClass('metadata-property-key-input')) return;
			for (const mutation of mutations) {
				for (const addedNode of mutation.addedNodes) {
					if (addedNode instanceof HTMLElement && addedNode.hasClass('suggestion-container')) {
						this.onSuggestionMenu(addedNode);
					}
				}
			}
		});

		this.plugin.registerEvent(this.app.workspace.on('active-leaf-change', leaf => {
			if (leaf?.view instanceof MarkdownView) {
				const props = this.plugin.getPropertyItems();
				this.refreshViewIcons(props, leaf.view);
				// @ts-expect-error (Private API)
				const propListEl = leaf.view.metadataEditor?.propertyListEl;
				if (propListEl) this.observeProperties(propListEl);
			}
		}));

		const props = plugin.getPropertyItems();
		const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
		for (const leaf of markdownLeaves) {
			if (leaf.view instanceof MarkdownView) this.refreshViewIcons(props, leaf.view);
		}
	}

	/**
	 * Refresh whenever a property changes.
	 * @param propsEl Element with class 'metadata-properties'
	 */
	private observeProperties(propsEl: HTMLElement) {
		this.setMutationObserver(propsEl, { subtree: true, childList: true }, mutations => {
			for (const mutation of mutations) {
				if (mutation.target instanceof HTMLElement && mutation.target.hasClass('metadata-property-icon')) {
					this.refreshIcons();
					return;
				}
				for (const addedNode of mutation.addedNodes) {
					if (addedNode instanceof HTMLElement && addedNode.hasClass('tree-item')) {
						this.refreshIcons();
						return;
					}
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
						this.refreshIcons();
						this.plugin.propertyIconManager?.refreshIcons();
					});
					event.stopPropagation();
				} else {
					this.onContextMenu(prop.id);
				}
			}
		}, { capture: true });
		this.setEventListener(propsEl, 'contextmenu', event => {
			const pointEls = activeDocument.elementsFromPoint(event.x, event.y);
			const iconEl = pointEls.find(el => el.hasClass('metadata-property-icon'));
			const propEl = pointEls.find(el => el.hasClass('metadata-property'));
			if (iconEl && propEl instanceof HTMLElement) {
				const prop = propEl.dataset.propertyKey
					? this.plugin.getPropertyItem(propEl.dataset.propertyKey)
					: null;
				if (prop) this.onContextMenu(prop.id);
			}
		}, { capture: true });
	}

	/**
	 * Refresh all property icons in all MarkdownViews.
	 */
	refreshIcons(unloadings?: boolean): void {
		const props = this.plugin.getPropertyItems(unloadings);
		const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');

		for (const leaf of markdownLeaves) {
			if (leaf.view instanceof MarkdownView) {
				this.refreshViewIcons(props, leaf.view);
				// @ts-expect-error (Private API)
				const propListEl = leaf.view.metadataEditor?.propertyListEl;
				if (propListEl) this.observeProperties(propListEl);
			}
		}
	}

	/**
	 * Refresh all property icons in a single MarkdownView.
	*/
	private refreshViewIcons(props: PropertyItem[], view: MarkdownView) {
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
	 * When user context-clicks a property, add custom items to the menu.
	 */
	private onContextMenu(propId: string): void {
		this.plugin.menuManager.close();
		const prop = this.plugin.getPropertyItem(propId);

		// Change icon
		this.plugin.menuManager.addItemAfter(['action.changeType', 'action'], item => item
			.setTitle(STRINGS.menu.changeIcon)
			.setIcon('lucide-image-plus')
			.setSection('icon')
			.onClick(() => IconPicker.openSingle(this.plugin, prop, (newIcon, newColor) => {
				this.plugin.savePropertyIcon(prop, newIcon, newColor);
				this.refreshIcons();
				this.plugin.propertyIconManager?.refreshIcons();
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
					this.refreshIcons();
					this.plugin.propertyIconManager?.refreshIcons();
				})
			);
		}
	}

	/**
	 * Refresh all property icons in the current suggestions menu.
	 */
	private onSuggestionMenu(suggestMenuEl: HTMLElement): void {
		this.stopMutationObserver(suggestMenuEl);

		const propEls = suggestMenuEl.findAll(':scope > .suggestion > .suggestion-item');
		for (const propEl of propEls) {
			const propId = propEl.find(':scope > .suggestion-content > .suggestion-title')?.getText();
			if (propId) {
				const prop = this.plugin.getPropertyItem(propId);
				const iconEl = propEl.find(':scope > .suggestion-icon > .suggestion-flair');
				if (iconEl) this.refreshIcon(prop, iconEl);
			}
		}

		this.setMutationObserver(suggestMenuEl, { subtree: true, childList: true }, () => {
			this.onSuggestionMenu(suggestMenuEl);
		});
	}
}
