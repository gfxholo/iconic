import { RGB } from 'obsidian';

export const COLORS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gray'];

/**
 * Shared utility functions for setting icon colors.
 */
export default class ColorUtils {
	private static readonly convertEl = document.createElement('div');

	/**
	 * Convert color into rgb/rgba() string.
	 * @param color a color name, or a specific CSS color
	 */
	static toRgb(color: string | null | undefined): string {
		let rawValue: string;
		if (!color || COLORS.includes(color)) {
			switch (color) {
				default: rawValue = '--icon-color'; break;
				case 'red': rawValue = '--color-red'; break;
				case 'orange': rawValue = '--color-orange'; break;
				case 'yellow': rawValue = '--color-yellow'; break;
				case 'green': rawValue = '--color-green'; break;
				case 'cyan': rawValue = '--color-cyan'; break;
				case 'blue': rawValue = '--color-blue'; break;
				case 'purple': rawValue = '--color-purple'; break;
				case 'pink': rawValue = '--color-pink'; break;
				case 'gray': rawValue = '--color-base-70'; break;
			}
			rawValue = window.getComputedStyle(document.body).getPropertyValue(rawValue);
		} else if (CSS.supports('color', color)) {
			rawValue = color;
		} else {
			return 'rgb(0, 0, 0)';
		}

		// Color properties are converted into rgb/rgba()
		this.convertEl.style.color = rawValue;
		return this.convertEl.style.color;
	}

	/**
	 * Convert color into RGB object.
	 * @param color a color name, or a specific CSS color
	 */
	static toRgbObject(color: string | null | undefined): RGB {
		const [r, g, b] = this.toRgb(color)
			.replaceAll(/[^\d.,]/g, '')
			.split(',')
			.map(Number);
		return { r, g, b };
	}

	/**
	 * Convert color into HSL array.
	 * @param color a color name, or a specific CSS color
	 * @see {@link https://en.wikipedia.org/wiki/HSL_and_HSV#From_RGB}
	 */
	static toHslArray(color: string | null | undefined): [h: number, s: number, l: number] {
		let [r, g, b] = this.toRgb(color)
			.replaceAll(/[^\d.,]/g, '')
			.split(',')
			.map(Number);

		r = Math.max(Math.min(r, 255), 0) / 255;
		g = Math.max(Math.min(g, 255), 0) / 255;
		b = Math.max(Math.min(b, 255), 0) / 255;

		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const chroma = max - min;
		const l = (max + min) / 2;
		const s = Number.isInteger(l) ? 0 : (max - l) / Math.min(l, 1 - l);
		let h = 0;

		if (chroma > 0) switch (max) {
			case r: h = (g - b) / chroma % 6; break;
			case g: h = (b - r) / chroma + 2; break;
			case b: h = (r - g) / chroma + 4; break;
		}

		return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
	}
}
