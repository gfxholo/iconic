import { WorkspaceLeaf } from 'obsidian';
import IconicPlugin, { PropertyItem, STRINGS } from 'src/IconicPlugin';
import IconManager from 'src/managers/IconManager';
import IconPicker from 'src/dialogs/IconPicker';

/**
 * Handles icons in the All Properties and File Properties panes.
 */
export default class PropertyIconManager extends IconManager {
	private allPropsContainerEl: HTMLElement | null = null;
	private filePropsContainerEl: HTMLElement | null = null;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => {
			this.app.workspace.iterateAllLeaves(leaf => this.manageLeaf(leaf));
		}));
		this.app.workspace.iterateAllLeaves(leaf => this.manageLeaf(leaf));
	}

	/**
	 * Start managing this leaf if has a matching type.
	 */
	private manageLeaf(leaf: WorkspaceLeaf): void {
		if (leaf.getViewState().type === 'all-properties') {
			this.stopMutationObserver(this.allPropsContainerEl);
			this.allPropsContainerEl = leaf.view.containerEl.find('.view-content > div');
			this.setMutationObserver(this.allPropsContainerEl, {
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

		if (leaf.getViewState().type === 'file-properties') {
			this.stopMutationObserver(this.filePropsContainerEl);
			this.filePropsContainerEl = leaf.view.containerEl.find('.metadata-properties');
			this.setMutationObserver(this.filePropsContainerEl, {
				subtree: true,
				childList: true,
			}, mutation => {
				for (const addedNode of mutation.addedNodes) {
					if (addedNode instanceof HTMLElement && addedNode.hasClass('metadata-property')) {
						this.refreshIcons();
						return;
					}
				}
			});
			this.refreshIcons();
		}
	}

	/**
	 * @override
	 * Refresh all property icons.
	 */
	refreshIcons(unloading?: boolean): void {
		const props = this.plugin.getPropertyItems(unloading);

		// Stop observers while DOM icons are refreshed
		this.stopMutationObserver(this.allPropsContainerEl);
		this.stopMutationObserver(this.filePropsContainerEl);

		// All Properties pane
		const itemEls = this.allPropsContainerEl?.findAll(':scope > .tree-item') ?? [];
		for (const itemEl of itemEls) {
			itemEl.addClass('iconic-item');

			const textEl = itemEl.find('.tree-item-self > .tree-item-inner > .tree-item-inner-text');
			const prop = props.find(prop => prop.id === textEl?.getText());
			if (!prop) continue;

			const iconEl = itemEl.find('.tree-item-self > .tree-item-icon');
			if (!iconEl) continue;

			// Refresh icon
			if (this.plugin.isSettingEnabled('clickableIcons')) {
				this.refreshIcon(prop, iconEl, event => {
					IconPicker.openSingle(this.plugin, prop, (newIcon, newColor) => {
						this.plugin.savePropertyIcon(prop, newIcon, newColor);
						this.plugin.refreshManagers('property');
					});
					event.stopPropagation();
				});
			} else {
				this.refreshIcon(prop, iconEl);
			}

			// Add menu items
			if (this.plugin.settings.showMenuActions) {
				this.setEventListener(itemEl, 'contextmenu', () => {
					this.onContextMenu(prop.id);
				}, { capture: true });
			} else {
				this.stopEventListener(itemEl, 'contextmenu');
			}
		}

		// File Properties pane
		const propEls = this.filePropsContainerEl?.findAll('.metadata-property') ?? [];
		for (const propEl of propEls) {
			const propInputEl = propEl.find('.metadata-property-key-input');
			if (!(propInputEl instanceof HTMLInputElement)) continue;

			const propId = propInputEl.value;
			if (!propId) continue;
			
			const prop = this.plugin.getPropertyItem(propId);
			if (!prop) continue;
			const iconEl = propEl.find('.metadata-property-icon');
			if (!iconEl) continue;

			// Refresh icon
			if (this.plugin.isSettingEnabled('clickableIcons')) {
				this.refreshIcon(prop, iconEl, event => {
					IconPicker.openSingle(this.plugin, prop!, (newIcon, newColor) => {
						this.plugin.savePropertyIcon(prop!, newIcon, newColor);
						this.plugin.refreshManagers('property');
					});
					event.stopPropagation();
				});
			} else {
				this.refreshIcon(prop, iconEl);
			}

			// Add menu items
			if (this.plugin.settings.showMenuActions) {
				this.setEventListener(propEl, 'contextmenu', () => {
					this.onContextMenu(prop.id);
				}, { capture: true });
			} else {
				this.stopEventListener(propEl, 'contextmenu');
			}
		}

		// Restart observers
		this.setMutationsObserver(this.allPropsContainerEl, {
			subtree: true,
			childList: true,
		}, () => this.refreshIcons());
		this.setMutationsObserver(this.filePropsContainerEl, {
			subtree: true,
			childList: true,
		}, () => this.refreshIcons());
	}

	/**
	 * When user context-clicks a property, add custom items to the menu.
	 */
	private onContextMenu(clickedPropId: string): void {
		navigator.vibrate?.(100); // Not supported on iOS
		this.plugin.menuManager.closeAndFlush();
		const clickedProp: PropertyItem = this.plugin.getPropertyItem(clickedPropId);
		const selectedProps: PropertyItem[] = [];

		for (const selfEl of this.allPropsContainerEl?.findAll('.tree-item-self.is-selected') ?? []) {
			const textEl = selfEl.find(':scope > .tree-item-inner > .tree-item-inner-text');
			if (textEl?.textContent) {
				selectedProps.push(this.plugin.getPropertyItem(textEl.textContent));
			}
		}

		// If clicked property is not selected, ignore selected items
		if (!selectedProps.some(selectedProp => selectedProp.id === clickedProp.id)) {
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
						this.plugin.refreshManagers('property');
					});
				} else {
					IconPicker.openMulti(this.plugin, selectedProps, (newIcon, newColor) => {
						this.plugin.savePropertyIcons(selectedProps, newIcon, newColor);
						this.plugin.refreshManagers('property');
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
					this.plugin.refreshManagers('property');
				})
			);
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
