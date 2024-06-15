import { Menu, MenuItem } from 'obsidian';

/**
 * Intercepts context menus to add custom items.
 */
export default class MenuManager {
	private menu: Menu | null;
	private queuedActions: (() => any)[] = [];

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
	addItem(callback: (item: MenuItem) => any): this {
		if (this.menu) {
			this.menu.addItem(callback);
		} else {
			this.queuedActions.push(() => this.addItem(callback));
		}
		return this;
	}

	/**
	 * Add a menu item between two existing sections.
	 */
	addItemBetween(preSection: string | null, postSection: string | null, callback: (item: MenuItem) => any): this {
		if (this.menu) {
			let item: MenuItem;
			this.menu.addItem(callbackItem => {
				item = callbackItem;
				callback(callbackItem);
			});
			if (preSection || postSection) {
				// @ts-expect-error (Private API)
				const section: string = item.section;
				// @ts-expect-error (Private API)
				const sections: string[] = this.menu.sections ?? [];
				const lastIndex = sections.length - 1;
				const preIndex = preSection ? sections.lastIndexOf(preSection) : lastIndex;
				const postIndex = postSection ? sections.indexOf(postSection) : lastIndex;
				sections.remove(section);
				sections.splice(Math.max(preIndex, postIndex), 0, section);
			}
		} else {
			this.queuedActions.push(() => this.addItemBetween(preSection, postSection, callback));
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
	 * Close menu and discard the object.
	 */
	close(): void {
		this.menu?.close();
		this.menu = null;
	}
}
