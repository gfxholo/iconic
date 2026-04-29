import { BaseComponent } from 'obsidian';
import PathComponent from 'src/components/PathComponent.js';

/**
 * Component that displays a vertical list of file paths.
 */
export default class PathListComponent extends BaseComponent {
	// Components
	private readonly listEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		super();
		this.listEl = containerEl.createDiv({ cls: 'iconic-paths' });
	}

	/**
	 * Add a path to the list.
	 */
	addPath(cb: (path: PathComponent) => unknown): this {
		cb(new PathComponent(this.listEl));
		return this;
	}
}
