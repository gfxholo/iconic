export const COLORS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gray'];

const REGEX_HEX_COLOR = /^#[0-9a-fA-F]{8}$|#[0-9a-fA-F]{6}$|#[0-9a-fA-F]{4}$|#[0-9a-fA-F]{3}$/;
const REGEX_RGB_COLOR = /^rgb\( *\d{1,3} *, *\d{1,3}, *\d{1,3} *\)$/;
const REGEX_HSL_COLOR = /^hsl\( *-?\d+ *, *\d{1,3}%, *\d{1,3}% *\)$/;

/**
 * Shared utility functions for setting icon colors.
 */
export default class ColorUtils {
	/**
	 * Check if color string is a recognized color name.
	 */
	static isNamedColor(color: string | null | undefined): boolean {
		return color ? COLORS.includes(color) : false;
	}

	/**
	 * Check if color string is a valid hex color.
	 */
	static isHexColor(color: string | null | undefined): boolean {
		return color ? REGEX_HEX_COLOR.test(color) : false;
	}

	/**
	 * Take a named color and return its value in the theme CSS.
	 */
	static getCssValue(namedColor: string | null | undefined): string {
		let cssProp;
		switch (namedColor) {
			case 'red': cssProp = '--color-red'; break;
			case 'orange': cssProp = '--color-orange'; break;
			case 'yellow': cssProp = '--color-yellow'; break;
			case 'green': cssProp = '--color-green'; break;
			case 'cyan': cssProp = '--color-cyan'; break;
			case 'blue': cssProp = '--color-blue'; break;
			case 'purple': cssProp = '--color-purple'; break;
			case 'pink': cssProp = '--color-pink'; break;
			case 'gray': cssProp = '--color-base-70'; break;
			default: cssProp = '--icon-color'; break;
		}
		return window.getComputedStyle(document.body).getPropertyValue(cssProp);
	}

	/**
	 * Take a color string (named or hex) and return a hex color, based on the theme CSS.
	 */
	static getColorHex(color: string | null | undefined): string {
		if (color && REGEX_HEX_COLOR.test(color)) return color;
		const cssValue = this.getCssValue(color);

		if (REGEX_HEX_COLOR.test(cssValue)) {
			return cssValue;
		} else if (REGEX_RGB_COLOR.test(cssValue)) {
			const [r, g, b] = cssValue
				.replaceAll(/\s/g, '')
				.slice(4, -1)
				.split(',')
				.map(str => parseInt(str).toString(16).padStart(2, '0'));
			return '#' + r + g + b;
		} else if (REGEX_HSL_COLOR.test(cssValue)) {
			const [h, s, l] = cssValue
				.replaceAll(/[\s%]/g, '')
				.slice(4, -1)
				.split(',')
				.map(str => parseInt(str));
			const [r, g, b] = this.hslToRgb(h, s, l)
				.map(int => int.toString(16).padStart(2, '0'));
			return '#' + r + g + b;
		} else {
			return '#000000';
		}
	}

	/**
	 * Take a named color and return a RGB color array, based on the theme CSS.
	 */
	static getColorRgb(namedColor: string | null): number[] {
		const cssValue = this.getCssValue(namedColor);

		if (REGEX_HEX_COLOR.test(cssValue)) {
			const rgb = cssValue.replace('#', '');
			const r = parseInt(rgb.slice(0, 2), 16);
			const g = parseInt(rgb.slice(2, 4), 16);
			const b = parseInt(rgb.slice(4, 6), 16);
			return [r, g, b];
		} else if (REGEX_RGB_COLOR.test(cssValue)) {
			const [r, g, b] = cssValue
				.replaceAll(/\s/g, '')
				.slice(4, -1)
				.split(',')
				.map(str => parseInt(str));
			return [r, g, b];
		} else if (REGEX_HSL_COLOR.test(cssValue)) {
			const [h, s, l] = cssValue
				.replaceAll(/[\s%]/g, '')
				.slice(4, -1)
				.split(',')
				.map(str => parseInt(str));
			return this.hslToRgb(h, s, l);
		} else {
			return [0, 0, 0];
		}
	}

	/**
	 * Convert hex color to HSL array.
	 */
	static hexToHsl(hexColor: string): number[] {
		hexColor = hexColor.replace('#', '');
		const r = parseInt(hexColor.slice(0, 2), 16);
		const g = parseInt(hexColor.slice(2, 4), 16);
		const b = parseInt(hexColor.slice(4, 6), 16);
		return this.rgbToHsl(r, g, b);
	}

	/**
	 * Convert RGB to HSL array.
	 * @see {@link https://en.wikipedia.org/wiki/HSL_and_HSV#From_RGB}
	 */
	static rgbToHsl(r: number, g: number, b: number): number[] {
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

	/**
	 * Convert HSL to RGB array.
	 * @see {@link https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB}
	 */
	static hslToRgb(h: number, s: number, l: number): number[] {
		h = ((h % 360 + 360) % 360) / 60; // Wrap any value outside 0-360
		s = Math.max(Math.min(s, 100), 0) / 100;
		l = Math.max(Math.min(l, 100), 0) / 100;

		const chroma = (1 - Math.abs(2 * l - 1)) * s;
		const x = chroma * (1 - Math.abs(h % 2 - 1));

		const [rr, gg, bb] =
			h < 1 ? [chroma, x, 0] :
			h < 2 ? [x, chroma, 0] :
			h < 3 ? [0, chroma, x] :
			h < 4 ? [0, x, chroma] :
			h < 5 ? [x, 0, chroma] :
			h < 6 ? [chroma, 0, x] : [0, 0, 0];

		const offset = l - chroma / 2;
		const [r, g, b] = [rr + offset, gg + offset, bb + offset];

		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}
}
