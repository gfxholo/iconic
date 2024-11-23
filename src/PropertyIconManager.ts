import { WorkspaceLeaf } from 'obsidian';
import IconicPlugin, { PropertyItem, STRINGS } from './IconicPlugin';
import IconManager from './IconManager';
import IconPicker from './IconPicker';

/**
 * Handles icons in the Properties pane.
 */
export default class PropertyIconManager extends IconManager {
	private containerEl: HTMLElement;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => {
			if (activeDocument.contains(this.containerEl)) {
				return;
			} else {
				this.app.workspace.iterateAllLeaves(leaf => this.manageLeaf(leaf));
			}
		}));
		this.app.workspace.iterateAllLeaves(leaf => this.manageLeaf(leaf));
	}

	/**
	 * Start managing this leaf if has a matching type.
	 */
	private manageLeaf(leaf: WorkspaceLeaf): void {
		if (leaf.getViewState().type !== 'all-properties') return;

		this.stopMutationObserver(this.containerEl);
		this.containerEl = leaf.view.containerEl.find(':scope > .view-content > div');
		this.setMutationObserver(this.containerEl, {
			subtree: true,
			childList: true,
		}, mutation => {
			for (const addedNode of mutation.addedNodes) {
				if (addedNode instanceof HTMLElement && addedNode.hasClass('tree-item')) {
					this.refreshIcons();
					return;
				}
			}
		});
		this.refreshIcons();
	}

	/**
	 * Refresh all property icons.
	 */
	refreshIcons(unloading?: boolean): void {
		this.stopMutationObserver(this.containerEl);
		const props = this.plugin.getPropertyItems(unloading);
		const itemEls = this.containerEl?.findAll(':scope > .tree-item') ?? [];

		for (const itemEl of itemEls) {
			itemEl.addClass('iconic-item');

			const textEl = itemEl.find('.tree-item-self > .tree-item-inner > .tree-item-inner-text');
			const prop = props.find(prop => prop.id === textEl?.getText());
			if (!prop) continue;

			const iconEl = itemEl.find('.tree-item-self > .tree-item-icon');
			if (!iconEl) continue;

			if (this.plugin.isSettingEnabled('clickableIcons')) {
				this.refreshIcon(prop, iconEl, event => {
					IconPicker.openSingle(this.plugin, prop, (newIcon, newColor) => {
						this.plugin.savePropertyIcon(prop, newIcon, newColor);
						this.refreshIcons();
						this.plugin.editorIconManager?.refreshIcons();
					});
					event.stopPropagation();
				});
			} else {
				this.refreshIcon(prop, iconEl);
			}

			this.setEventListener(itemEl, 'contextmenu', () => this.onContextMenu(prop.id), { capture: true });
		}

		this.setMutationsObserver(this.containerEl, {
			subtree: true,
			childList: true,
		}, () => this.refreshIcons());
	}

	/**
	 * When user context-clicks a property, add custom items to the menu.
	 */
	private onContextMenu(clickedPropId: string): void {
		navigator?.vibrate(100); // Not supported on iOS
		this.plugin.menuManager.closeAndFlush();
		const clickedProp: PropertyItem = this.plugin.getPropertyItem(clickedPropId);
		const selectedProps: PropertyItem[] = [];

		for (const selfEl of this.containerEl?.findAll('.tree-item-self.is-selected') ?? []) {
			const textEl = selfEl.find(':scope > .tree-item-inner > .tree-item-inner-text');
			if (textEl?.textContent) {
				selectedProps.push(this.plugin.getPropertyItem(textEl.textContent));
			}
		}

		// If clicked property is not selected, ignore selected items
		if (!selectedProps.some(selectedFile => selectedFile.id === clickedProp.id)) {
			selectedProps.length = 0;
		}

		// Change icon(s)
		const changeTitle = selectedProps.length < 2
			? STRINGS.menu.changeIcon
			: STRINGS.menu.changeIcons.replace('{#}', selectedProps.length.toString());
		this.plugin.menuManager.addItemAfter(['action.changeType', 'action'], item => item
			.setTitle(changeTitle)
			.setIcon('lucide-image-plus')
			.setSection('icon')
			.onClick(() => {
				if (selectedProps.length < 2) {
					IconPicker.openSingle(this.plugin, clickedProp, (newIcon, newColor) => {
						this.plugin.savePropertyIcon(clickedProp, newIcon, newColor);
						this.refreshIcons();
						this.plugin.editorIconManager?.refreshIcons();
					});
				} else {
					IconPicker.openMulti(this.plugin, selectedProps, (newIcon, newColor) => {
						this.plugin.savePropertyIcons(selectedProps, newIcon, newColor);
						this.refreshIcons();
						this.plugin.editorIconManager?.refreshIcons();
					});
				}
			})
		);

		// Remove icon(s) / Reset color(s)
		const anySelectedIcons = selectedProps.some(file => file.icon);
		const anySelectedColors = selectedProps.some(file => file.color);
		const removeTitle = selectedProps.length < 2
			? clickedProp.icon
				? STRINGS.menu.removeIcon
				: STRINGS.menu.resetColor
			: anySelectedIcons
				? STRINGS.menu.removeIcons.replace('{#}', selectedProps.length.toString())
				: STRINGS.menu.resetColors.replace('{#}', selectedProps.length.toString())
		const removeIcon = clickedProp.icon || anySelectedIcons ? 'lucide-image-minus' : 'lucide-rotate-ccw';
		if (clickedProp.icon || clickedProp.color || anySelectedIcons || anySelectedColors) {
			this.plugin.menuManager.addItem(item => item
				.setTitle(removeTitle)
				.setIcon(removeIcon)
				.setSection('icon')
				.onClick(() => {
					if (selectedProps.length < 2) {
						this.plugin.savePropertyIcon(clickedProp, null, null);
					} else {
						this.plugin.savePropertyIcons(selectedProps, null, null);
					}
					this.refreshIcons();
					this.plugin.editorIconManager?.refreshIcons();
				})
			);
		}
	}
}
