import { App, setIcon } from 'obsidian';
import IconicPlugin, { Item, Icon, ICONS, EMOJIS } from './IconicPlugin';
import ColorUtils from './ColorUtils';

/**
 * Base class for all icon managers.
 */
export default abstract class IconManager {
	protected readonly app: App;
	protected readonly plugin: IconicPlugin;
	private readonly eventListeners = new Map<string, Map<HTMLElement, {
		listener: EventListener, options?: boolean | AddEventListenerOptions
	}>>();
	private readonly mutationObservers = new Map<HTMLElement, MutationObserver>();

	constructor(plugin: IconicPlugin) {
		this.app = plugin.app;
		this.plugin = plugin;
	}

	/**
	 * Refresh icon inside a given element.
	 */
	protected refreshIcon(item: Item | Icon, iconEl: HTMLElement, onClick?: (event: MouseEvent) => void): void {
		iconEl.addClass('iconic-icon');

		if (item.icon) {
			if (ICONS.has(item.icon)) {
				setIcon(iconEl, item.icon);
			} else if (EMOJIS.has(item.icon)) {
				iconEl.empty();
				const emojiEl = iconEl.createDiv({ cls: 'iconic-emoji', text: item.icon });
				if (item.color) IconManager.colorFilter(emojiEl, item.color);
			}
			iconEl.show();
		} else if (iconEl.hasClass('collapse-icon')) {
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
	 * Refresh all icon elements controlled by this {@link IconManager}.
	 * @param unloading Revert to default icons if true
	 */
	abstract refreshIcons(unloading?: boolean): void;

	/**
	 * Set an inline color filter on an element.
	 */
	private static colorFilter(element: HTMLElement, color: string) {
		const [h, s] = ColorUtils.toHslArray(color);
		element.style.filter = `grayscale() sepia() hue-rotate(${h - 50}deg) saturate(${s * 5}%)`;
	}

	/**
	 * Set an event listener which will be removed when plugin unloads.
	 * Replaces any previous listener of the same element & type.
	 */
	protected setEventListener<K extends keyof HTMLElementEventMap>(element: HTMLElement, type: K, listener: (this: HTMLElement, event: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void {
		if (!this.eventListeners.has(type)) {
			this.eventListeners.set(type, new Map());
		}
		const map = this.eventListeners.get(type)!;
		if (map.has(element)) {
			const { listener, options } = map.get(element)!;
			element.removeEventListener(type, listener, options);
		}
		this.plugin.registerDomEvent(element, type, listener, options);
		map.set(element, { listener, options });
	}

	/**
	 * Stop event listener of the given element & type.
	 */
	protected stopEventListener(element: HTMLElement, type: keyof HTMLElementEventMap): void {
		const listenerMap = this.eventListeners.get(type);
		if (listenerMap?.has(element)) {
			const { listener, options } = listenerMap.get(element)!;
			element.removeEventListener(type, listener, options);
			listenerMap.delete(element);
		}
	}

	/**
	 * Stop all event listeners set by this {@link IconManager}.
	 */
	protected stopEventListeners(): void {
		for (const [type, listenerMap] of this.eventListeners) {
			for (const [element, { listener, options }] of listenerMap) {
				element.removeEventListener(type, listener, options);
				listenerMap.delete(element);
			}
		}
	}

	/**
	 * Set a mutation observer which will be removed when plugin unloads.
	 * Replaces any previous observer of the same element.
	 */
	protected setMutationObserver(element: HTMLElement, options: MutationObserverInit, callback: MutationCallback): MutationObserver {
		const observer = new MutationObserver(callback);
		if (this.mutationObservers.has(element)) {
			this.mutationObservers.get(element)?.disconnect();
		}
		observer.observe(element, options);
		this.mutationObservers.set(element, observer);
		return observer;
	}

	/**
	 * Stop mutation observer of the given element.
	 */
	protected stopMutationObserver(element: HTMLElement): void {
		this.mutationObservers.get(element)?.disconnect();
		this.mutationObservers.delete(element);
	}

	/**
	 * Stop all mutation observers set by this {@link IconManager}.
	 */
	protected stopMutationObservers(): void {
		for (const [element, observer] of this.mutationObservers) {
			observer.disconnect();
			this.mutationObservers.delete(element);
		}
	}

	/**
	 * Revert all DOM changes when plugin unloads.
	 */
	unload(): void {
		this.refreshIcons(true);
		this.stopEventListeners();
		this.stopMutationObservers();
	}
}
