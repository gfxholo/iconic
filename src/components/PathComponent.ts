import { BaseComponent, ExtraButtonComponent, TooltipOptions } from 'obsidian';
import IconButtonComponent from 'src/components/IconButtonComponent.js';

/**
 * Component that displays a file path in a horizontal row, used inside {@link PathListComponent}.
 */
export default class PathComponent extends BaseComponent {
	// Components
	readonly pathEl: HTMLElement;
	private readonly pathInnerEl: HTMLElement;
	private readonly iconButton: IconButtonComponent;
	private removeButton?: ExtraButtonComponent;

	constructor(containerEl: HTMLElement) {
		super();
		this.pathEl = containerEl.createDiv({ cls: 'iconic-path' });
		this.iconButton = new IconButtonComponent(this.pathEl).setIcon('lucide-file');
		this.pathInnerEl = this.pathEl.createDiv({ cls: 'iconic-path-inner'});
	}

	/**
	 * Set the icon or emoji to display.
	 */
	setIcon(iconId: string | null): this {
		this.iconButton.setIcon(iconId);
		return this;
	}

	/**
	 * Set the icon color.
	 */
	setIconColor(color: string | null): this {
		this.iconButton.setColor(color);
		return this;
	}

	/**
	 * Set tooltip for the icon button.
	 */
	setIconTooltip(tooltip: string, options?: TooltipOptions): this {
		this.iconButton.setTooltip(tooltip, options);
		return this;
	}

	/**
	 * Set tooltip for the remove button.
	 */
	setRemoveTooltip(tooltip: string, options?: TooltipOptions): this {
		if (!this.removeButton) {
			this.removeButton = new ExtraButtonComponent(this.pathEl).setIcon('lucide-x');
		}
		this.removeButton.setTooltip(tooltip, options);
		return this;
	}

	/**
	 * Set 2-3 segments of text representing a path.
	 */
	setPathText(tree: string, basename: string, extension?: string): this {
		this.pathInnerEl.empty();
		this.pathInnerEl.createSpan({ cls: 'iconic-path-tree', text: tree });
		this.pathInnerEl.createSpan({ cls: 'iconic-path-name', text: basename });
		if (extension) {
			this.pathInnerEl.createSpan({ text: '.' });
			this.pathInnerEl.createSpan({ cls: 'iconic-path-extension', text: extension });
		}
		return this;
	}

	/**
	 * Set click behavior for the icon button.
	 */
	onIconClick(callback: () => unknown | Promise<unknown>): this {
		this.iconButton.onClick(() => callback());
		return this;
	}

	/**
	 * Set click behavior for the remove button.
	 */
	onRemoveClick(callback: () => unknown | Promise<unknown>): this {
		if (!this.removeButton) {
			this.removeButton = new ExtraButtonComponent(this.pathEl).setIcon('lucide-x');
		}
		this.removeButton.onClick(() => callback());
		return this;
	}

	/**
	 * Add a class to the path element.
	 */
	setClass(cls: string): this {
		this.pathEl.addClass(cls);
		return this;
	}
}
