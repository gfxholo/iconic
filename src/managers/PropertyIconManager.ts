import { WorkspaceLeaf } from 'obsidian';
import IconicPlugin, { PropertyItem, STRINGS } from 'src/IconicPlugin';
import IconManager from 'src/managers/IconManager';
import IconPicker from 'src/dialogs/IconPicker';

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
		// Check if this is a Properties pane by looking for the properties container
		const propertiesContainer = leaf.view.containerEl.find('.metadata-properties');
		if (!propertiesContainer) return;
		

		this.stopMutationObserver(this.containerEl);
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

	/**
	 * @override
	 * Refresh all property icons.
	 */
	refreshIcons(unloading?: boolean): void {
		this.stopMutationObserver(this.containerEl);
		const props = this.plugin.getPropertyItems(unloading);
		const itemEls = this.containerEl?.findAll('.metadata-property') ?? [];

		const foundPropertyNames = [];
		for (const itemEl of itemEls) {
			itemEl.addClass('iconic-item');

			const propertyName = itemEl.dataset.propertyKey;
			foundPropertyNames.push(propertyName);
			
			// Try multiple variations of the property name to handle different cases
			const variations = [
				propertyName, // Original name
				propertyName?.toLowerCase(), // lowercase
				propertyName?.toUpperCase(), // UPPERCASE
				propertyName ? propertyName.charAt(0).toLowerCase() + propertyName.slice(1) : null, // camelCase
				// Handle specific known conversions
				propertyName === 'imagealt' ? 'imageAlt' : null,
				propertyName === 'imageog' ? 'imageOG' : null,
				propertyName === 'hidecoverimage' ? 'hideCoverImage' : null,
				propertyName === 'targetkeyword' ? 'targetKeyword' : null,
			].filter(Boolean) as string[]; // Remove null values and type as string array
			
			// Try to find a matching property using any of the variations
			let prop: PropertyItem | undefined = undefined;
			for (const variation of variations) {
				prop = props.find(p => p.id === variation);
				if (prop) break;
			}
			
			if (!prop) {
				// Create a fallback property for undefined names
				if (propertyName === 'undefined' || !propertyName) {
					prop = {
						id: 'undefined',
						name: 'undefined',
						category: 'property' as const,
						iconDefault: 'lucide-file-question',
						icon: this.plugin.settings.propertyIcons['undefined']?.icon ?? null,
						color: this.plugin.settings.propertyIcons['undefined']?.color ?? null,
						type: null
					};
				} else {
					continue;
				}
			}

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

		
		this.setMutationsObserver(this.containerEl, {
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
