import { ExtraButtonComponent, TooltipOptions, displayTooltip, setIcon } from 'obsidian';
import ColorUtils from 'src/utils/ColorUtils.js';
import { ICONS, EMOJIS } from 'src/IconicPlugin.js';
import ExternalLibraryManager from 'src/managers/ExternalLibraryManager.js';

const DEFAULT_ICON = 'lucide-file';

/**
 * Component that displays a clickable icon or emoji.
 */
export default class IconButtonComponent extends ExtraButtonComponent {
	private color: string | null = null;
	private secondaryClickCallback: ((event: MouseEvent) => void) | null = null;

	// Components
	private iconEl: HTMLElement | null = null;
	private emojiEl: HTMLElement | null = null;

	constructor(containerEl: HTMLElement) {
		super(containerEl);
		super.setIcon(DEFAULT_ICON);
	}

	/**
	 * Display a tooltip immediately.
	 */
	displayTooltip(tooltip: string, options?: TooltipOptions): this {
		displayTooltip(this.extraSettingsEl, tooltip, options);
		return this;
	}

	/**
	 * Set the icon or emoji to display.
	 */
	setIcon(iconId: string | null): this {
		iconId ??= DEFAULT_ICON;
		if (ICONS.has(iconId)) {
			this.emojiEl = null;
			setIcon(this.extraSettingsEl, iconId);
			this.iconEl = this.extraSettingsEl.find('.svg-icon');
		} else if (EMOJIS.has(iconId)) {
			this.iconEl = null;
			this.extraSettingsEl.empty();
			this.emojiEl = this.extraSettingsEl.createDiv({ cls: 'iconic-emoji', text: iconId });
		} else if (ExternalLibraryManager.isExternalIcon(iconId)) {
			this.emojiEl = null;
			if (ExternalLibraryManager.setIcon(this.extraSettingsEl, iconId)) {
				this.iconEl = this.extraSettingsEl.find('.svg-icon');
			} else {
				this.iconEl = null;
			}
		}
		if (this.color) this.setColor(this.color);
		return this;
	}

	/**
	 * Set the icon color.
	 */
	setColor(color: string | null): this {
		this.color = color;
		if (this.iconEl) {
			if (color) {
				this.extraSettingsEl.setCssStyles({ color: ColorUtils.toRgb(color) });
			} else {
				this.extraSettingsEl.style.removeProperty('color');
			}
		} else if (this.emojiEl) {
			if (color) {
				const [h, s] = ColorUtils.toHslArray(color);
				this.emojiEl.setCssStyles({ filter: `grayscale() sepia() hue-rotate(${h - 50}deg) saturate(${s * 5}%)` });
			} else {
				this.emojiEl.style.removeProperty('filter');
			}
		}
		return this;
	}

	/**
	 * Set the secondary-click (or long-touch) listener.
	 */
	onSecondaryClick(callback: (event: MouseEvent) => void): this {
		if (!this.secondaryClickCallback) {
			this.extraSettingsEl?.addEventListener('contextmenu', event => this.secondaryClickCallback?.(event));
		}
		this.secondaryClickCallback = callback;
		return this;
	}

	/**
	 * Add a class to the button element.
	 */
	setClass(cls: string): this {
		this.extraSettingsEl.addClass(cls);
		return this;
	}
}
