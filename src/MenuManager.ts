import { Menu, MenuItem } from 'obsidian';

/**
 * Intercepts context menus to add custom items.
 */
export default class MenuManager {
	private menu: Menu | null;
	private queuedActions: (() => void)[] = [];

	constructor() {
		const manager = this;
		Menu.prototype.showAtPosition = new Proxy(Menu.prototype.showAtPosition, {
			apply(showAtPosition, menu, args) {
				manager.menu = menu;
				if (manager.queuedActions.length > 0) {
					manager.runQueuedActions.call(manager); // Menu is unhappy with your customer service
				}
				return showAtPosition.call(menu, ...args);
			}
		});
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
	 * Add a menu item.
	 */
	addItem(callback: (item: MenuItem) => void): this {
		if (this.menu) {
			this.menu.addItem(callback);
		} else {
			this.queuedActions.push(() => this.addItem(callback));
		}
		return this;
	}

	/**
	 * Add a menu item after the given sections, prioritized by array order.
	 */
	addItemAfter(preSections: string | string[], callback: (item: MenuItem) => void): this {
		if (this.menu) {
			let item: MenuItem;
			this.menu.addItem(addedItem => { item = addedItem, callback(addedItem) });

			// @ts-expect-error (Private API)
			const section: string = item.section;
			// @ts-expect-error (Private API)
			const sections: string[] = this.menu.sections ?? [];
			let index = 0;

			if (typeof preSections === 'string') preSections = [preSections];
			for (const preSection of preSections) {
				if (sections.includes(preSection)) {
					index = sections.lastIndexOf(preSection) + 1;
					break;
				}
			}
			sections.remove(section);
			sections.splice(index, 0, section);
		} else {
			this.queuedActions.push(() => this.addItemAfter(preSections, callback));
		}
		return this;
	}

	/**
	 * Add a separator.
	 */
	addSeparator(): this {
		if (this.menu) {
			this.menu.addSeparator();
		} else {
			this.queuedActions.push(() => this.addSeparator());
		}
		return this;
	}

	/**
	 * Iterate menu items of a given section.
	 */
	forSection(section: string, callback: (item: MenuItem, index: number) => void): this {
		if (this.menu) {
			// @ts-expect-error <Private API>
			const items = (this.menu.items as MenuItem[]).filter(item => item.section === section);
			for (let i = 0; i < items.length; i++) {
				callback(items[i], i);
			}
		} else {
			this.queuedActions.push(() => this.forSection(section, callback));
		}
		return this;
	}

	/**
	 * Close menu and discard the object.
	 */
	close(): void {
		this.menu?.close();
		this.menu = null;
	}
}
