import { WorkspaceLeaf } from 'obsidian';
import IconicPlugin, { FileItem, STRINGS, Item } from 'src/IconicPlugin';
import IconManager from 'src/managers/IconManager';
import RuleEditor from 'src/dialogs/RuleEditor';
import IconPicker from 'src/dialogs/IconPicker';

/**
 * Handles icons in the Files pane.
 */
export default class FileIconManager extends IconManager {
	private containerEl: HTMLElement;
	/**
	 * Tracks pending refresh operations to prevent multiple rapid refreshes when expanding folders.
	 */
	private refreshTimerId: number;
	/**
	 * Cache for folder → folder-note file path mappings.
	 */
	private folderNoteCache = new Map<string, string | null>();

	constructor(plugin: IconicPlugin) {
		super(plugin);
		this.plugin.registerEvent(this.app.workspace.on('file-menu', (menu, tFile) => {
			if (this.plugin.settings.showMenuActions) {
				this.onContextMenu(tFile.path);
			}
		}));
		this.plugin.registerEvent(this.app.workspace.on('files-menu', (menu, tFiles) => {
			if (this.plugin.settings.showMenuActions) {
				this.onContextMenu(...tFiles.map(tFile => tFile.path));
			}
		}));
		this.plugin.registerEvent(this.app.workspace.on('layout-change', () => {
			if (activeDocument.contains(this.containerEl)) return;
			this.app.workspace.iterateAllLeaves(leaf => this.manageLeaf(leaf));
		}));
		this.app.workspace.iterateAllLeaves(leaf => this.manageLeaf(leaf));
	}

	/**
	 * Start managing the given leaf if has a matching type.
	 */
	private manageLeaf(leaf: WorkspaceLeaf) {
		if (leaf.getViewState().type !== 'file-explorer') return;

		this.stopMutationObserver(this.containerEl);
		this.containerEl = leaf.view.containerEl.find(':scope > .nav-files-container > div');
		this.setMutationsObserver(this.containerEl, {
			subtree: true,
			childList: true,
			attributeFilter: ['data-path'],
		}, mutations => {
			for (const mutation of mutations) {
				if (mutation.attributeName === 'data-path') {
					this.refreshIcons();
					return;
				} else for (const addedNode of mutation.addedNodes) {
					if (addedNode instanceof HTMLElement && addedNode.hasClass('tree-item')) {
						this.refreshIcons();
						return;
					}
				}
			}
		});
		this.refreshIcons();
	}

	/**
	 * Clear the folder note cache.
	 * Call this when the Folder Notes plugin settings might have changed.
	 */
	private clearFolderNoteCache(): void {
		this.folderNoteCache.clear();
	}

	/**
	 * Get the path of the folder note for a given folder path.
	 * Returns null if no folder note exists or Folder Notes plugin is not enabled.
	 */
	private getFolderNotePath(folderPath: string): string | null {
		if (!this.plugin.settings.integrateFolderNotes) return null;

		// Check cache first
		if (this.folderNoteCache.has(folderPath)) {
			return this.folderNoteCache.get(folderPath) ?? null;
		}

		// Get Folder Notes plugin instance
		// @ts-expect-error accessing other plugin via ID
		const folderNotes = this.app.plugins.getPlugin('folder-notes');
		if (!folderNotes) {
			this.folderNoteCache.set(folderPath, null);
			return null;
		}

		let folderNotePath: string | null = null;

		// Check for detached folder note first
		// Access Folder Notes plugin internals via any type
		const excludedFolders = (folderNotes as any)?.settings?.excludeFolders ?? [];
		const detachedFolder = excludedFolders.find((f: any) => f.path === folderPath && f.detached && f.detachedFilePath);
		if (detachedFolder) {
			const tFile = this.app.vault.getAbstractFileByPath(detachedFolder.detachedFilePath);
			if (tFile) {
				folderNotePath = tFile.path;
			}
		}

		// If not detached, compute attached folder note path
		if (!folderNotePath) {
			// Access Folder Notes plugin internals via any type
			const settings = (folderNotes as any)?.settings;
			if (settings) {
				const folderNoteName = settings.folderNoteName ?? '{{folder_name}}';
				const folderNoteType = settings.folderNoteType ?? '.md';
				const storageLocation = settings.storageLocation ?? 'insideFolder';
				const supportedFileTypes = settings.supportedFileTypes ?? [];

				const folderName = folderPath.split('/').pop() ?? '';
				const fileName = folderNoteName.replace('{{folder_name}}', folderName);
				const noteType = folderNoteType === '.excalidraw' ? '.md' : folderNoteType;

				const possiblePaths: string[] = [];

				if (storageLocation === 'insideFolder') {
					possiblePaths.push(`${folderPath}/${fileName}${noteType}`);
				} else if (storageLocation === 'parentFolder') {
					const parentPath = folderPath.split('/').slice(0, -1).join('/') || '';
					if (parentPath) {
						possiblePaths.push(`${parentPath}/${fileName}${noteType}`);
					} else {
						possiblePaths.push(`${fileName}${noteType}`);
					}
				} else if (storageLocation === 'vaultFolder') {
					possiblePaths.push(`${fileName}${noteType}`);
				}

				// Try primary type first, then fallback to supported types
				for (const path of possiblePaths) {
					const tFile = this.app.vault.getAbstractFileByPath(path);
					if (tFile) {
						folderNotePath = tFile.path;
						break;
					}
				}

				// If no primary type found, try supported file types
				if (!folderNotePath && supportedFileTypes.length > 0) {
					for (const type of supportedFileTypes) {
						if (type === 'excalidraw') continue; // handled as .md
						const ext = type.startsWith('.') ? type : `.${type}`;
						for (const basePath of possiblePaths) {
							const path = basePath.slice(0, -noteType.length) + ext;
							const tFile = this.app.vault.getAbstractFileByPath(path);
							if (tFile) {
								folderNotePath = tFile.path;
								break;
							}
						}
						if (folderNotePath) break;
					}
				}
			}
		}

		this.folderNoteCache.set(folderPath, folderNotePath);
		return folderNotePath;
	}

	/**
	 * @override
	 * Refresh all file icons.
	 */
	refreshIcons(unloading?: boolean): void {
		this.clearFolderNoteCache();
		const files = this.plugin.getFileItems(unloading);
		const itemEls = this.containerEl?.findAll(':scope > .tree-item');
		if (itemEls) this.refreshChildIcons(files, itemEls, unloading);
	}

	/**
	 * Refresh an array of file icons, including any subitems.
	 */
	private refreshChildIcons(files: FileItem[], itemEls: HTMLElement[], unloading?: boolean): void {
		for (const itemEl of itemEls) {
			itemEl.addClass('iconic-item');

			const selfEl = itemEl.find(':scope > .tree-item-self');
			const file = files.find(file => file.id === selfEl?.dataset.path);
			if (!file) continue;

			// Check for an icon ruling
			const page = file.items ? 'folder' : 'file';
			let rule: Item | null = this.plugin.ruleManager.checkRuling(page, file.id, unloading);

			// For folders, also check folder-note file rulings if no folder rule exists
			if (file.items && !rule && this.plugin.settings.integrateFolderNotes) {
				const folderNotePath = this.getFolderNotePath(file.id);
				if (folderNotePath) {
					const noteRule = this.plugin.ruleManager.checkRuling('file', folderNotePath, unloading);
					if (noteRule) {
						// Use the folder-note rule's icon and color
						// If noteRule has no icon but has color, synthesize a folder icon
						if (!noteRule.icon && noteRule.color) {
							rule = { ...noteRule, iconDefault: 'lucide-folder' };
						} else {
							rule = noteRule;
						}
					}
				}
			}

			// Fall back to file's own icon settings if no rule applies
			// Precedence: Folder rule > Folder-note rule > Manual folder icon
			if (!rule) {
				rule = file;
			}

			if (file.items) {
				// Refresh children immediately if folder is expanded
				if (!itemEl.hasClass('is-collapsed')) {
					const childItemEls = itemEl.findAll(':scope > .tree-item-children > .tree-item');
					if (childItemEls) this.refreshChildIcons(file.items, childItemEls, unloading);
				}

				// Set up mutation observer with performance optimizations:
				// 1. Only refresh children on expand (not collapse) to reduce unnecessary updates
				// 2. Use debouncing to prevent multiple rapid refreshes
				this.setMutationsObserver(itemEl, {
					subtree: true,
					attributeFilter: ['class', 'data-path'],
					attributeOldValue: true,
				}, mutations => {
					let shouldRefreshChildren = false;
					let shouldRefreshSelf = false;

					for (const mutation of mutations) {
						if (mutation.attributeName === 'data-path') {
							shouldRefreshSelf = true;
							break;
						}

						// Refresh on folder collapse/expand
						if (mutation.attributeName === 'class' && mutation.target instanceof HTMLElement) {
							const wasCollapsed = mutation.oldValue?.includes('is-collapsed');
							const isCollapsed = mutation.target.hasClass('is-collapsed');

							// Only refresh children if expanding, not collapsing
							if (wasCollapsed && !isCollapsed) {
								shouldRefreshChildren = true;
								shouldRefreshSelf = true;
							} else if (!wasCollapsed && isCollapsed) {
								shouldRefreshSelf = true;
							}
						}
					}

					if (shouldRefreshSelf) {
						this.refreshChildIcons([file], [itemEl]);
					}
					if (shouldRefreshChildren) {
						const childItemEls = itemEl.findAll(':scope > .tree-item-children > .tree-item');
						if (file.items && childItemEls) {
							this.debouncedRefresh(file.items, childItemEls);
						}
					}
				});
			}
			// rule is guaranteed to be non-null here
			const nonNullRule = rule!;

			// Declare display rule (will be set below)
			let displayRule: Item = nonNullRule;

			// Ensure icon element positioned before filename
			let iconEl = selfEl.find(':scope > .tree-item-icon') ?? selfEl.createDiv({ cls: 'tree-item-icon' });
			const innerEl = selfEl.find('.tree-item-inner');
			if (iconEl !== innerEl?.previousElementSibling) {
				innerEl?.insertAdjacentElement('beforebegin', iconEl);
			}

			if (file.items) {
				// Toggle default icon based on expand/collapse state
				// If rule is from folder-note and has iconDefault (color-only case),
				// use a folder icon based on collapse state
				let iconDefault = nonNullRule.iconDefault;
				if (iconDefault === 'lucide-folder') {
					iconDefault = iconEl.hasClass('is-collapsed')
						? 'lucide-folder-closed'
						: 'lucide-folder-open';
				}
			// Use file.iconDefault for manual folder icons if rule doesn't provide one
			if (!iconDefault && file.iconDefault) {
				iconDefault = iconEl.hasClass('is-collapsed')
					? 'lucide-folder-closed'
					: 'lucide-folder-open';
			}
			// Create a display rule with the correct iconDefault
			displayRule = { ...nonNullRule, iconDefault };
		} else {
			displayRule = nonNullRule;
		}

			let folderIconEl = selfEl.find(':scope > .iconic-sidekick:not(.tree-item-icon)');
			if (this.plugin.settings.minimalFolderIcons || !this.plugin.settings.showAllFolderIcons && !displayRule.icon && !displayRule.iconDefault) {
				folderIconEl?.remove();
			} else {
				const arrowColor = displayRule.icon || displayRule.iconDefault ? null : displayRule.color;
				this.refreshIcon({ icon: null, color: arrowColor }, iconEl);
				folderIconEl = folderIconEl ?? selfEl.createDiv({ cls: 'iconic-sidekick' });
				if (iconEl.nextElementSibling !== folderIconEl) {
					iconEl.insertAdjacentElement('afterend', folderIconEl);
				}
				iconEl = folderIconEl;
			}

			if (iconEl.hasClass('collapse-icon') && !displayRule.icon && !displayRule.iconDefault) {
				this.refreshIcon(displayRule, iconEl); // Skip click listener if icon will be a collapse arrow
			} else if (this.plugin.isSettingEnabled('clickableIcons')) {
				this.refreshIcon(displayRule, iconEl, event => {
					IconPicker.openSingle(this.plugin, file, (newIcon, newColor) => {
						this.plugin.saveFileIcon(file, newIcon, newColor);
						this.plugin.refreshManagers('file', 'folder');
					});
					event.stopPropagation();
				});
			} else {
				this.refreshIcon(displayRule, iconEl);
			}

			// Update ghost icon when dragging
			this.setEventListener(selfEl, 'dragstart', () => {
				if (displayRule.icon || displayRule.iconDefault || displayRule.color) {
					const ghostEl = selfEl.doc.body.find(':scope > .drag-ghost > .drag-ghost-self');
					if (ghostEl) {
						const spanEl = ghostEl.find('span');
						const ghostIcon = (file.category === 'folder' && displayRule.icon === null)
							? 'lucide-folder-open'
							: displayRule.icon || displayRule.iconDefault;
						this.refreshIcon({ icon: ghostIcon, color: displayRule.color }, ghostEl);
						ghostEl.appendChild(spanEl);
					}
				}
			});
		}
	}

	/**
	 * Debounced version of refreshChildIcons that prevents multiple rapid refreshes.
	 * Waits for 100ms of no new refresh requests before executing.
	 */
	private debouncedRefresh(files: FileItem[], itemEls: HTMLElement[]): void {
		window.clearTimeout(this.refreshTimerId);
		this.refreshTimerId = window.setTimeout(() => {
			this.refreshChildIcons(files, itemEls);
		}, 100);
	}

	/**
	 * When user context-clicks a file, or opens a file pane menu, add custom items to the menu.
	 */
	private onContextMenu(...fileIds: string[]): void {
		this.plugin.menuManager.closeAndFlush();
		const files: FileItem[] = [];
		for (const fileId of fileIds) {
			files.push(this.plugin.getFileItem(fileId));
		}

		// Change icon(s)
		const changeTitle = files.length === 1
			? STRINGS.menu.changeIcon
			: STRINGS.menu.changeIcons.replace('{#}', files.length.toString());
		this.plugin.menuManager.addItemAfter(['action-primary', 'close', 'open'], item => item
			.setTitle(changeTitle)
			.setIcon('lucide-image-plus')
			.setSection('icon')
			.onClick(() => {
				if (files.length === 1) {
					IconPicker.openSingle(this.plugin, files[0], (newIcon, newColor) => {
						this.plugin.saveFileIcon(files[0], newIcon, newColor);
						this.plugin.refreshManagers('file', 'folder');
					});
				} else {
					IconPicker.openMulti(this.plugin, files, (newIcon, newColor) => {
						this.plugin.saveFileIcons(files, newIcon, newColor);
						this.plugin.refreshManagers('file', 'folder');
					});
				}
			})
		);

		// Remove icon(s) / Reset color(s)
		const anyIcons = files.some(file => file.icon);
		const anyColors = files.some(file => file.color);
		const removalTitle = files.length === 1
			? files[0].icon
				? STRINGS.menu.removeIcon
				: STRINGS.menu.resetColor
			: anyIcons
				? STRINGS.menu.removeIcons.replace('{#}', files.length.toString())
				: STRINGS.menu.resetColors.replace('{#}', files.length.toString())
		const removalIcon = anyIcons ? 'lucide-image-minus' : 'lucide-rotate-ccw';
		if (anyIcons || anyColors) {
			this.plugin.menuManager.addItem(item => item
				.setTitle(removalTitle)
				.setIcon(removalIcon)
				.setSection('icon')
				.onClick(() => {
					if (files.length === 1) {
						this.plugin.saveFileIcon(files[0], null, null);
					} else {
						this.plugin.saveFileIcons(files, null, null);
					}
					this.plugin.refreshManagers('file', 'folder');
				})
			);
		}

		// Edit rule
		if (files.length === 1) {
			const page = files[0].items ? 'folder' : 'file';
			const rule = this.plugin.ruleManager.checkRuling(page, files[0].id);
			if (rule) {
				this.plugin.menuManager.addItem(item => { item
					.setTitle(STRINGS.menu.editRule)
					.setIcon('lucide-image-play')
					.setSection('icon')
					.onClick(() => RuleEditor.open(this.plugin, page, rule, newRule => {
						const isRulingChanged = newRule
							? this.plugin.ruleManager.saveRule(page, newRule)
							: this.plugin.ruleManager.deleteRule(page, rule.id);
						if (isRulingChanged) {
							this.refreshIcons();
							this.plugin.refreshManagers(page);
						}
					}));
				});
			}
		}
	}

	/**
	 * @override
	 * Clear refresh timer in addition to standard cleanup.
	 */
	unload(): void {
		window.clearTimeout(this.refreshTimerId);
		this.refreshIcons(true);
		super.unload();
	}
}
