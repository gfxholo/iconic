import IconicPlugin, { TagItem } from 'src/IconicPlugin';
import IconManager from 'src/managers/IconManager';
import IconPicker from 'src/dialogs/IconPicker';
import ColorUtils from 'src/ColorUtils';

/**
 * Handles icons in Bases views (tables, cards, lists).
 */
export default class BaseIconManager extends IconManager {
	private containerEls: HTMLElement[] = [];
	private isRefreshing = false;
	private refreshTimerId: number;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => {
			this.findAndManageLeaves();
		}));
		this.findAndManageLeaves();
	}

	/**
	 * Find all bases leaves and start managing them.
	 */
	private findAndManageLeaves(): void {
		const newContainerEls: HTMLElement[] = [];
		this.app.workspace.iterateAllLeaves(leaf => {
			if (leaf.getViewState().type === 'bases') {
				const containerEl = leaf.view.containerEl.find(':scope > .view-content');
				if (containerEl) {
					newContainerEls.push(containerEl);
					if (!this.containerEls.includes(containerEl)) {
						this.manageContainer(containerEl);
					}
				}
			}
		});
		// Stop observing containers that are no longer in the DOM
		for (const el of this.containerEls) {
			if (!newContainerEls.includes(el)) {
				this.stopMutationObserver(el);
			}
		}
		this.containerEls = newContainerEls;
	}

	/**
	 * Start managing a bases view container.
	 */
	private manageContainer(containerEl: HTMLElement): void {
		this.setMutationsObserver(containerEl, {
			subtree: true,
			childList: true,
		}, mutations => {
			// Skip mutations caused by our own icon injection
			if (this.isRefreshing) return;
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node instanceof HTMLElement && node.hasClass('iconic-icon')) return;
				}
			}
			this.debouncedRefresh(containerEl);
		});
		this.refreshContainerIcons(containerEl);
	}

	/**
	 * Debounced refresh to prevent rapid successive updates.
	 */
	private debouncedRefresh(containerEl: HTMLElement): void {
		window.clearTimeout(this.refreshTimerId);
		this.refreshTimerId = window.setTimeout(() => {
			this.refreshContainerIcons(containerEl);
		}, 100);
	}

	/**
	 * @override
	 * Refresh all icons in all bases views.
	 */
	refreshIcons(unloading?: boolean): void {
		for (const containerEl of this.containerEls) {
			this.refreshContainerIcons(containerEl, unloading);
		}
	}

	/**
	 * Refresh all icons within a single bases container.
	 */
	private refreshContainerIcons(containerEl: HTMLElement, unloading?: boolean): void {
		this.isRefreshing = true;
		try {
			this.refreshFileIcons(containerEl, unloading);
			this.refreshTagIcons(containerEl, unloading);
		} finally {
			this.isRefreshing = false;
		}
	}

	/**
	 * Refresh file icons in file.name cells.
	 */
	private refreshFileIcons(containerEl: HTMLElement, unloading?: boolean): void {
		const fileNameCells = containerEl.findAll('.bases-td[data-property="file.name"] .internal-link');

		for (const linkEl of fileNameCells) {
			const filePath = linkEl.getAttr('data-href');
			if (!filePath) continue;

			if (unloading) {
				linkEl.find(':scope > .iconic-icon')?.remove();
				continue;
			}

			const file = this.plugin.getFileItem(filePath);
			const rule = this.plugin.ruleManager.checkRuling('file', file.id) ?? file;

			if (!rule.icon && !rule.iconDefault && !rule.color) {
				linkEl.find(':scope > .iconic-icon')?.remove();
				continue;
			}

			let iconEl = linkEl.find(':scope > .iconic-icon');
			if (!iconEl) {
				iconEl = createSpan();
				linkEl.prepend(iconEl);
			}

			if (this.plugin.isSettingEnabled('clickableIcons')) {
				this.refreshIcon(rule, iconEl, event => {
					IconPicker.openSingle(this.plugin, file, (newIcon, newColor) => {
						this.plugin.saveFileIcon(file, newIcon, newColor);
						this.plugin.refreshManagers('file');
					});
					event.stopPropagation();
				});
			} else {
				this.refreshIcon(rule, iconEl);
			}
		}
	}

	/**
	 * Refresh tag icons in tag pill cells.
	 */
	private refreshTagIcons(containerEl: HTMLElement, unloading?: boolean): void {
		if (!this.plugin.settings.showTagPillIcons) return;

		const tags = this.plugin.getTagItems(unloading);
		const tagPills = containerEl.findAll('.bases-td[data-property="note.tags"] .multi-select-pill');

		for (const pillEl of tagPills) {
			const tagId = pillEl.find(':scope > .multi-select-pill-content')?.getText();
			if (!tagId) continue;
			const tag = tags.find(t => t.id === tagId) ?? null;

			this.refreshTag(pillEl, tag, unloading);
		}
	}

	/**
	 * Refresh a tag pill element with its icon and color.
	 */
	private refreshTag(pillEl: HTMLElement, tag: TagItem | null, unloading?: boolean): void {
		if (!tag || unloading) {
			pillEl.find(':scope > .iconic-icon')?.remove();
			this.setTagColor(pillEl, null);
			return;
		}

		// Set icon
		if (tag.icon) {
			let iconEl = pillEl.find(':scope > .iconic-icon');
			if (!iconEl) {
				iconEl = createSpan();
				pillEl.prepend(iconEl);
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
			pillEl.find(':scope > .iconic-icon')?.remove();
		}

		// Set color
		this.setTagColor(pillEl, tag.color ?? null);
	}

	/**
	 * Apply tag color styling to a pill element.
	 */
	private setTagColor(pillEl: HTMLElement, color: string | null): void {
		if (color) {
			const cssRgb = ColorUtils.toRgb(color);
			const cssRgba = cssRgb.replace('rgb(', 'rgba(').replace(')', '');
			pillEl.style.setProperty('--tag-color', cssRgb);
			pillEl.style.setProperty('--tag-color-hover', cssRgb);
			pillEl.style.setProperty('--tag-color-remove-hover', cssRgb);
			pillEl.style.setProperty('--tag-background', cssRgba + ', 0.1)');
			pillEl.style.setProperty('--tag-background-hover', cssRgba + ', 0.1)');
			pillEl.style.setProperty('--tag-border-color', cssRgba + ', 0.25)');
			pillEl.style.setProperty('--tag-border-color-hover', cssRgba + ', 0.5)');
		} else {
			pillEl.style.removeProperty('--tag-color');
			pillEl.style.removeProperty('--tag-color-hover');
			pillEl.style.removeProperty('--tag-color-remove-hover');
			pillEl.style.removeProperty('--tag-background');
			pillEl.style.removeProperty('--tag-background-hover');
			pillEl.style.removeProperty('--tag-border-color');
			pillEl.style.removeProperty('--tag-border-color-hover');
		}
	}

	/**
	 * @override
	 */
	unload(): void {
		window.clearTimeout(this.refreshTimerId);
		this.refreshIcons(true);
		super.unload();
	}
}
