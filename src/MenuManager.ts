import { IconName, setIcon } from 'obsidian';
import IconicPlugin from './IconicPlugin';
import ColorUtils from './ColorUtils';

const SAFETY_MARGIN = 10; // px

/**
 * Intercepts context menus to add custom items.
 */
export default class MenuManager {
	private readonly plugin: IconicPlugin;
	private menuEl: HTMLElement;
	private readonly bodyObserver: MutationObserver;
	private readonly highlightListeners = new Map<HTMLElement, EventListener>();
	private queuedActions: (() => any)[] = [];

	constructor(plugin: IconicPlugin) {
		this.plugin = plugin;
		this.bodyObserver = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				for (const addedNode of mutation.addedNodes) {
					if (addedNode instanceof HTMLElement && addedNode.classList.contains('menu')) {
						this.menuEl = addedNode;
						for (const itemEl of this.getItemEls()) {
							this.setHighlightListener(itemEl);
						}
						if (this.queuedActions.length > 0) {
							this.runQueuedActions();
						}
					}
				}
			}
		});
		this.bodyObserver.observe(activeDocument.body, { childList: true });
	}

	/**
	 * Get all child menu items.
	 */
	private getItemEls(): HTMLElement[] {
		return this.menuEl.findAll(':scope > .menu-item');
	}

	/**
	 * Check if menu element is attached to document body.
	 */
	private isMenuOpen(): boolean {
		return activeDocument.body.contains(this.menuEl);
	}

	/**
	 * Run all actions in the queue.
	 */
	private runQueuedActions(): void {
		const actions = this.queuedActions;
		this.queuedActions = []; // Reassign property to avoid an infinite loop
		for (const action of actions) action();
	}

	/**
	 * Set listener to highlight this menu item on hover.
	 * Listener checks all open menus to enforce only one highlight at a time.
	 */
	private setHighlightListener(itemEl: HTMLElement) {
		if (this.highlightListeners.has(itemEl)) return;

		const listener = () => {
			for (const itemEl of this.highlightListeners.keys()) {
				itemEl.removeClass('selected');
			}
			itemEl.addClass('selected');
		}
		this.plugin.registerDomEvent(itemEl, 'pointerenter', listener);
		this.highlightListeners.set(itemEl, listener);
	}

	/**
	 * Add a menu item, appending it to any matching section.
	 */
	addItem(callback: (itemManager: MenuItemManager) => any): this {
		if (!this.isMenuOpen()) {
			this.queuedActions.push(() => this.addItem(callback));
			return this;
		} else if (this.queuedActions.length > 0) {
			this.runQueuedActions();
		}

		const itemEl = createDiv({ cls: 'menu-item' });
		const itemManager = new MenuItemManager(this.plugin, itemEl);
		callback(itemManager);

		const section = itemEl.dataset.section;
		if (section) {
			const targetEl = this.getItemEls().filter(itemEl => itemEl.dataset.section === section).last();
			if (targetEl) {
				targetEl.insertAdjacentElement('afterend', itemEl);
			} else {
				this.menuEl.append(itemEl);
			}
		}

		this.setHighlightListener(itemEl);
		this.preventClipping();
		return this;
	}

	/**
	 * Add a menu item between two existing sections, with a separator included.
	 * 
	 * 1. Adds item after headSection if it exists
	 * 2. Otherwise, adds item before tailSection if it exists
	 * 3. Otherwise, adds item on top of menu
	 */
	addItemBetween(headSection: string | null, tailSection: string | null, callback: (itemManager: MenuItemManager) => any): this {
		if (!this.isMenuOpen()) {
			this.queuedActions.push(() => this.addItemBetween(headSection, tailSection, callback));
			return this;
		} else if (this.queuedActions.length > 0) {
			this.runQueuedActions();
		}

		const separatorEl: HTMLElement = createDiv({ cls: 'menu-separator' });
		const itemEl = createDiv({ cls: 'menu-item', attr: { 'tabIndex': 0 } });
		const itemManager = new MenuItemManager(this.plugin, itemEl);
		callback(itemManager);

		const itemEls = this.getItemEls();
		let headItemEl, tailItemEl;

		for (const itemEl of itemEls) {
			if (itemEl.dataset.section === headSection) {
				headItemEl = itemEl;
			} else if (itemEl.dataset.section === tailSection) {
				tailItemEl = itemEl;
				break;
			} else {
				// Submenus have no section attribute, so check their siblings
				const prevEl = itemEl.previousElementSibling;
				const nextEl = itemEl.previousElementSibling;
				if (prevEl instanceof HTMLElement && prevEl.dataset.section === headSection) {
					headItemEl = itemEl;
				} else if (nextEl instanceof HTMLElement && nextEl.dataset.section === tailSection) {
					tailItemEl = itemEl;
					break;
				}
			}
		}

		const targetEl: HTMLElement = headItemEl ? headItemEl : tailItemEl ? tailItemEl : itemEls.first()!;
		const where: InsertPosition = headItemEl ? 'afterend' : tailItemEl ? 'beforebegin' : 'beforebegin';
		targetEl.insertAdjacentElement(where, itemEl);
		targetEl.insertAdjacentElement(where, separatorEl);
		
		this.setHighlightListener(itemEl);
		this.preventClipping();
		return this;
	}

	/**
	 * Add a separator.
	 */
	addSeparator() {
		if (!this.isMenuOpen()) {
			this.queuedActions.push(() => this.addSeparator());
			return this;
		} else if (this.queuedActions.length > 0) {
			this.runQueuedActions();
		}

		this.menuEl.createDiv({ cls: 'menu-separator' });
	}

	/**
	 * Reposition menu if the bottom has expanded beyond the window edge.
	 */
	private preventClipping(): void {
		const menuBottom = this.menuEl.getBoundingClientRect().bottom;
		if (menuBottom > window.innerHeight - SAFETY_MARGIN) {
			const menuTop: number = parseInt(this.menuEl.style.top);
			this.menuEl.style.top = menuTop - (menuBottom - window.innerHeight) - SAFETY_MARGIN + 'px';
		}
	}

	/**
	 * Close menu by removing it from the document body.
	 * Helps prevent race conditions when a menu is opened on the same element twice.
	 */
	close() {
		this.menuEl?.remove();
	}
}

/**
 * Utility class for building custom menu items.
 */
class MenuItemManager {
	private readonly plugin: IconicPlugin;
	private readonly itemEl: HTMLElement;
	private titleEl: HTMLElement | null = null;
	private iconEl: HTMLElement | null = null;
	private color: string | null = null;
	private checkedEl: HTMLElement | null = null;
	private clickListener: ((event: MouseEvent) => any) | null = null;
	private keydownListener: ((event: KeyboardEvent) => any) | null = null;

	constructor(plugin: IconicPlugin, itemEl: HTMLElement) {
		this.plugin = plugin;
		this.itemEl = itemEl;
	}

	/**
	 * Set title of menu item.
	 */
	setTitle(title: string | DocumentFragment): this {
		if (this.titleEl) {
			this.titleEl.setText(title);
		} else {
			this.titleEl = createDiv({ cls: 'menu-item-title', text: title });
			this.itemEl.append(this.titleEl);
		}
		return this;
	}

	/**
	 * Set icon of menu item.
	 */
	setIcon(icon: IconName | null): this {
		if (icon) {
			if (!this.iconEl) {
				this.iconEl = createDiv({ cls: 'menu-item-icon' });
				this.itemEl.prepend(this.iconEl);
			}
			setIcon(this.iconEl, icon);
			this.iconEl.find('.svg-icon')?.setAttr('stroke', this.color ? ColorUtils.getColorHex(this.color) : 'currentColor');
		} else {
			this.iconEl?.remove();
			this.iconEl = null;
		}
		return this;
	}

	/**
	 * Set icon color of menu item.
	 */
	setIconColor(color: string | null): this {
		this.color = color;
		this.iconEl?.find('.svg-icon').setAttr('stroke', color ? ColorUtils.getColorHex(color) : 'currentColor');
		return this;
	}

	/**
	 * Set whether menu item is checked.
	 */
	setChecked(checked: boolean | null): this {
		this.itemEl.toggleClass('mod-checked', checked ? true : false);
		if (checked && !this.checkedEl) {
			this.checkedEl = createDiv({ cls: ['menu-item-icon', 'mod-checked']});
			this.itemEl.append(this.checkedEl);
			setIcon(this.checkedEl, 'lucide-check');
		} else {
			this.checkedEl?.remove();
			this.checkedEl = null;
		}
		return this;
	}

	/**
	 * Set whether menu item has 'is-warning' class.
	 */
	setWarning(warning: boolean): this {
		this.itemEl.toggleClass('is-warning', warning);
		return this;
	}

	/**
	 * Set whether menu item has 'is-disabled' class.
	 */
	setDisabled(disabled: boolean): this {
		this.itemEl.toggleClass('is-disabled', disabled);
		if (this.clickListener && this.keydownListener) {
			if (disabled) {
				this.itemEl.removeEventListener('click', this.clickListener);
				this.itemEl.removeEventListener('keydown', this.keydownListener);
			} else {
				this.itemEl.addEventListener('click', this.clickListener);
				this.itemEl.addEventListener('keydown', this.keydownListener);
			}
		}
		return this;
	}

	/**
	 * Set whether menu item has 'is-label' class.
	 */
	setIsLabel(isLabel: boolean): this {
		this.itemEl.toggleClass('is-label', isLabel);
		return this;
	}

	/**
	 * Set click and keydown listeners for menu item.
	 */
	onClick(callback: (event: MouseEvent | KeyboardEvent) => any): this {
		this.clickListener = callback;
		this.keydownListener = event => {
			if (event.key === 'Enter') callback(event);
		};
		if (!this.itemEl.hasClass('is-disabled')) {
			this.plugin.registerDomEvent(this.itemEl, 'click', this.clickListener);
			this.plugin.registerDomEvent(this.itemEl, 'keydown', this.keydownListener);
		}
		return this;
	}

	/**
	 * Set which section should contain this menu item.
	 */
	setSection(section: string): this {
		this.itemEl.dataset.section = section;
		return this;
	}
}
