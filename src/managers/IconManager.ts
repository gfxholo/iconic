import { App, setIcon } from 'obsidian';
import IconicPlugin, { Item, Icon, ICONS, EMOJIS } from 'src/IconicPlugin.js';
import ColorUtils from 'src/utils/ColorUtils.js';
import ExternalLibraryManager from 'src/managers/ExternalLibraryManager.js';

/**
 * Base class for all icon managers.
 */
export default abstract class IconManager {
	protected readonly app: App;
	protected readonly plugin: IconicPlugin;
	private readonly eventListeners = new WeakMap<HTMLElement, Map<string, {
		listener: EventListener,
		options?: boolean | AddEventListenerOptions
	}>>();
	private readonly mutationObservers = new WeakMap<HTMLElement, MutationObserver>();
	/** All observers created by this manager, for cleanup on unload. */
	private readonly allObservers = new Set<MutationObserver>();

	constructor(plugin: IconicPlugin) {
		this.app = plugin.app;
		this.plugin = plugin;
	}

	/**
	 * Refresh all icons controlled by this icon manager. Should be overridden.
	 */
	refreshIcons(): void {
		return;
	}

	/**
	 * Refresh icon inside a given element.
	 */
	protected refreshIcon(item: Item | Icon, iconEl: HTMLElement, onClick?: (event: MouseEvent) => void): void {
		iconEl.addClass('iconic-icon');

		if (item.icon) {
			if (ICONS.has(item.icon)) {
				setIcon(iconEl, item.icon);
				iconEl.show();
			} else if (EMOJIS.has(item.icon)) {
				iconEl.empty();
				const emojiEl = iconEl.createDiv({ cls: 'iconic-emoji', text: item.icon });
				if (item.color) IconManager.colorFilter(emojiEl, item.color);
				iconEl.show();
			} else if (ExternalLibraryManager.isExternalIcon(item.icon)) {
				if (ExternalLibraryManager.setIcon(iconEl, item.icon)) {
					iconEl.show();
				} else {
					// The icon's library is disabled or not yet loaded; show the default icon instead
					this.setDefaultIcon(item, iconEl);
				}
			} else {
				// The icon is no longer supported; show the default icon instead
				this.setDefaultIcon(item, iconEl);
			}
		} else {
			this.setDefaultIcon(item, iconEl);
		}

		const svgEl = iconEl.find('.svg-icon');
		if (svgEl) {
			if (item.color) {
				svgEl.style.setProperty('color', ColorUtils.toRgb(item.color));
			} else {
				svgEl.style.removeProperty('color');
			}
		}

		if (onClick) {
			this.setEventListener(iconEl, 'click', onClick, { capture: true });
		} else {
			this.stopEventListener(iconEl, 'click');
		}
	}

	/**
	 * Refresh a given element with its default icon.
	 */
	private setDefaultIcon(item: Item | Icon, iconEl: HTMLElement): void {
		if (iconEl.hasClass('collapse-icon')) {
			if (this.plugin.settings.showAllFolderIcons && 'iconDefault' in item && item.iconDefault) {
				setIcon(iconEl, item.iconDefault);
			} else {
				setIcon(iconEl, 'right-triangle');
				iconEl.removeClass('iconic-icon');
			}
			iconEl.show();
		} else if ('iconDefault' in item && item.iconDefault) {
			setIcon(iconEl, item.iconDefault);
			iconEl.show();
		} else {
			iconEl.removeClass('iconic-icon');
			iconEl.hide();
		}
	}

	/**
	 * Set an inline color filter on an element.
	 */
	private static colorFilter(element: HTMLElement, color: string): void {
		const [h, s] = ColorUtils.toHslArray(color);
		element.style.filter = `grayscale() sepia() hue-rotate(${h - 50}deg) saturate(${s * 5}%)`;
	}

	/**
	 * Set an event listener which will be removed when plugin unloads.
	 * Replaces any listener (of the same element & type) set by this {@link IconManager}.
	 */
	protected setEventListener<K extends keyof HTMLElementEventMap>(element: HTMLElement, type: K, listener: (this: HTMLElement, event: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void {
		if (!this.eventListeners.has(element)) {
			this.eventListeners.set(element, new Map());
		}
		const listenerMap = this.eventListeners.get(element)!;
		if (listenerMap.has(type)) {
			const { listener, options } = listenerMap.get(type)!;
			element.removeEventListener(type, listener, options);
		}
		element.addEventListener(type, listener, options);
		listenerMap.set(type, { listener: listener as EventListener, options });
	}

	/**
	 * Stop an event listener (of the given element & type) set by this {@link IconManager}.
	 */
	protected stopEventListener(element: HTMLElement | null, type: keyof HTMLElementEventMap): void {
		if (!element) return;
		const listenerMap = this.eventListeners.get(element);
		if (listenerMap?.has(type)) {
			const { listener, options } = listenerMap.get(type)!;
			element.removeEventListener(type, listener, options);
			listenerMap.delete(type);
		}
	}

	/**
	 * Set a mutation observer which will be removed when plugin unloads.
	 * Replaces any observer (of the same element) set by this {@link IconManager}.
	 * 
	 * Callback runs once per mutation.
	 */
	protected setMutationObserver(element: HTMLElement | null, options: MutationObserverInit, callback: (mutation: MutationRecord) => void): void {
		this.setMutationsObserver(element, options, mutations => {
			for (const mutation of mutations) callback(mutation);
		});
	}

	/**
	 * Set a mutation observer which will be removed when plugin unloads.
	 * Replaces any observer (of the same element) set by this {@link IconManager}.
	 * 
	 * Callback runs once per batch of mutations.
	 */
	protected setMutationsObserver(element: HTMLElement | null, options: MutationObserverInit, callback: MutationCallback): void {
		if (!element) return;
		const observer = new MutationObserver(callback);
		if (this.mutationObservers.has(element)) {
			const oldObserver = this.mutationObservers.get(element);
			oldObserver?.disconnect();
			if (oldObserver) this.allObservers.delete(oldObserver);
		}
		observer.observe(element, options);
		this.mutationObservers.set(element, observer);
		this.allObservers.add(observer);
	}

	/**
	 * Stop a mutation observer (of the given element) set by this {@link IconManager}.
	 */
	protected stopMutationObserver(element: HTMLElement | null): void {
		if (!element) return;
		const observer = this.mutationObservers.get(element);
		observer?.disconnect();
		this.mutationObservers.delete(element);
		if (observer) this.allObservers.delete(observer);
	}

	/**
	 * Disconnect all mutation observers set by this {@link IconManager}.
	 * Call `super.unload()` after any subclass cleanup, so stale observers
	 * can't react to the unloading refresh or ping-pong with a re-enabled
	 * plugin instance.
	 */
	unload(): void {
		for (const observer of this.allObservers) {
			observer.disconnect();
		}
		this.allObservers.clear();
	}
}
