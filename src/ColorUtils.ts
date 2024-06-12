export const COLORS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gray'];

const REGEX_HEX_COLOR = /^#[0-9a-fA-F]{8}$|#[0-9a-fA-F]{6}$|#[0-9a-fA-F]{4}$|#[0-9a-fA-F]{3}$/;
const REGEX_RGB_COLOR = /^rgb\( *\d{1,3} *, *\d{1,3}, *\d{1,3} *\)$/;
const REGEX_HSL_COLOR = /^hsl\( *\d{1,3} *, *\d{1,3}%, *\d{1,3}% *\)$/;

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
				.replace(' ', '')
				.slice(4, -1)
				.split(',')
				.map(str => parseInt(str).toString(16).padStart(2, '0'));
			return '#' + r + g + b;
		} else if (REGEX_HSL_COLOR.test(cssValue)) {
			let [h, s, l] = cssValue
				.replace(' ', '')
				.replace('%', '')
				.slice(4, -1)
				.split(',')
				.map(str => parseInt(str));
			const [r, g, b] = this.hslToRgb(h / 360, s / 100, l / 100)
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
				.replace(' ', '')
				.slice(4, -1)
				.split(',')
				.map(str => parseInt(str));
			return [r, g, b];
		} else if (REGEX_HSL_COLOR.test(cssValue)) {
			let [h, s, l] = cssValue
				.replace(' ', '')
				.replace('%', '')
				.slice(4, -1)
				.split(',')
				.map(str => parseInt(str));
			return this.hslToRgb(h / 360, s / 100, l / 100);
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
	 * @author: mjackson
	 * @link https://gist.github.com/mjackson/5311256
	 */
	static rgbToHsl(r: number, g: number, b: number): number[] {
		r /= 255, g /= 255, b /= 255;
		const max = Math.max(r, g, b), min = Math.min(r, g, b);
		let h: number, s: number;
		const l = (max + min) / 2;

		if (max == min) {
			h = s = 0; // Monochrome
		} else {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch (max) {
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h! /= 6;
		}

		return [Math.floor(h! * 360), Math.floor(s * 100), Math.floor(l * 100)];
	}

	/**
	 * Convert HSL to RGB array.
	 * @author: mjackson
	 * @link https://gist.github.com/mjackson/5311256
	 */
	static hslToRgb(h: number, s: number, l: number): number[] {
		let r, g, b;
		if (s == 0) {
			r = g = b = l; // Monochrome
		} else {
			function hueToRgb(p: number, q: number, t: number) {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1 / 6) return p + (q - p) * 6 * t;
				if (t < 1 / 2) return q;
				if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
				return p;
			}

			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;

			r = hueToRgb(p, q, h + 1 / 3);
			g = hueToRgb(p, q, h);
			b = hueToRgb(p, q, h - 1 / 3);
		}

		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}
}
