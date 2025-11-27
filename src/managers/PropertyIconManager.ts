import { WorkspaceLeaf } from 'obsidian';
import IconicPlugin, { PropertyItem, STRINGS } from 'src/IconicPlugin';
import IconManager from 'src/managers/IconManager';
import IconPicker from 'src/dialogs/IconPicker';

/**
 * Handles icons in the Properties pane.
 */
export default class PropertyIconManager extends IconManager {
	private containerEl: HTMLElement | null = null;
	private propertyViewContainerEl: HTMLElement | null = null;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => {
			if (this.containerEl && activeDocument.contains(this.containerEl)) {
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
		// Check if this is a Properties pane (note editor) by looking for the properties container
		const propertiesContainer = leaf.view.containerEl.find('.metadata-properties');
		if (propertiesContainer) {
			if (this.containerEl) {
				this.stopMutationObserver(this.containerEl);
			}
			this.containerEl = propertiesContainer;
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

		// Check if this is a PropertyView (core plugin) by looking for view-content with tree-items
		const viewContent = leaf.view.containerEl.find('.view-content');
		if (viewContent && viewContent.find('.tree-item')) {
			if (this.propertyViewContainerEl) {
				this.stopMutationObserver(this.propertyViewContainerEl);
			}
			this.propertyViewContainerEl = viewContent;
			this.setMutationObserver(this.propertyViewContainerEl, {
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
	}

	/**
	 * @override
	 * Refresh all property icons.
	 */
	refreshIcons(unloading?: boolean): void {
		if (this.containerEl) {
			this.stopMutationObserver(this.containerEl);
		}
		if (this.propertyViewContainerEl) {
			this.stopMutationObserver(this.propertyViewContainerEl);
		}
		
		// Handle note editor properties (metadata-property elements)
		const metadataItemEls = this.containerEl?.findAll('.metadata-property') ?? [];
		for (const itemEl of metadataItemEls) {
			itemEl.addClass('iconic-item');

			const domPropertyName = itemEl.dataset.propertyKey;
			
			// Use user's settings as the single source of truth
			// This ensures we only show icons for properties the user actually configured
			const settingsKeys = Object.keys(this.plugin.settings.propertyIcons);
			const matchingKey = settingsKeys.find(key => key.toLowerCase() === domPropertyName?.toLowerCase());
			
			if (!matchingKey) continue; // Skip properties user hasn't configured icons for
			
			// Create property item using user's actual casing from settings
			const prop: PropertyItem = {
				id: matchingKey,
				name: matchingKey,
				category: 'property' as const,
				iconDefault: 'lucide-file-question',
				icon: unloading ? null : this.plugin.settings.propertyIcons[matchingKey]?.icon ?? null,
				color: unloading ? null : this.plugin.settings.propertyIcons[matchingKey]?.color ?? null,
				type: null
			};

			const iconEl = itemEl.find('.metadata-property-icon');
			if (!iconEl) continue;

			if (prop) {
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

				if (this.plugin.settings.showMenuActions) {
					this.setEventListener(itemEl, 'contextmenu', () => this.onContextMenu(prop!.id), { capture: true });
				} else {
					this.stopEventListener(itemEl, 'contextmenu');
				}
			}
		}

		// Handle PropertyView tree items (core plugin's property view)
		const treeItemEls = this.propertyViewContainerEl?.findAll('.tree-item') ?? [];
		for (const itemEl of treeItemEls) {
			itemEl.addClass('iconic-item');

			// Get property name from tree-item-inner-text
			const textEl = itemEl.find('.tree-item-inner-text');
			const domPropertyName = textEl?.textContent?.trim();
			
			if (!domPropertyName) continue;
			
			// Use user's settings as the single source of truth
			const settingsKeys = Object.keys(this.plugin.settings.propertyIcons);
			const matchingKey = settingsKeys.find(key => key.toLowerCase() === domPropertyName.toLowerCase());
			
			if (!matchingKey) continue; // Skip properties user hasn't configured icons for
			
			// Create property item using user's actual casing from settings
			const prop: PropertyItem = {
				id: matchingKey,
				name: matchingKey,
				category: 'property' as const,
				iconDefault: 'lucide-file-question',
				icon: unloading ? null : this.plugin.settings.propertyIcons[matchingKey]?.icon ?? null,
				color: unloading ? null : this.plugin.settings.propertyIcons[matchingKey]?.color ?? null,
				type: null
			};

			const iconEl = itemEl.find('.tree-item-icon');
			if (!iconEl) continue;

			if (prop) {
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

				if (this.plugin.settings.showMenuActions) {
					this.setEventListener(itemEl, 'contextmenu', () => this.onContextMenu(prop!.id), { capture: true });
				} else {
					this.stopEventListener(itemEl, 'contextmenu');
				}
			}
		}

		
		if (this.containerEl) {
			this.setMutationsObserver(this.containerEl, {
				subtree: true,
				childList: true,
			}, () => this.refreshIcons());
		}
		
		if (this.propertyViewContainerEl) {
			this.setMutationsObserver(this.propertyViewContainerEl, {
				subtree: true,
				childList: true,
			}, () => this.refreshIcons());
		}
	}

	/**
	 * When user context-clicks a property, add custom items to the menu.
	 */
	private onContextMenu(clickedPropId: string): void {
		navigator.vibrate?.(100); // Not supported on iOS
		this.plugin.menuManager.closeAndFlush();
		const clickedProp: PropertyItem = this.plugin.getPropertyItem(clickedPropId);
		const selectedProps: PropertyItem[] = [];

		for (const selfEl of (this.containerEl?.findAll('.tree-item-self.is-selected') ?? []).concat(this.propertyViewContainerEl?.findAll('.tree-item-self.is-selected') ?? [])) {
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
