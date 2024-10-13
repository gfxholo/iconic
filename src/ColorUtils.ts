import { RGB } from 'obsidian';

/**
 * 9 basic colors and their Obsidian CSS variables.
 * @see {@link https://docs.obsidian.md/Reference/CSS+variables/Foundations/Colors}
 */
export const COLORS = new Map<string, string>([
	['red', '--color-red'],
	['orange', '--color-orange'],
	['yellow', '--color-yellow'],
	['green', '--color-green'],
	['cyan', '--color-cyan'],
	['blue', '--color-blue'],
	['purple', '--color-purple'],
	['pink', '--color-pink'],
	['gray', '--color-base-70'],
]);

/**
 * 149 named CSS colors and their hexcodes.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/named-color}
 */
const CSS_COLORS = new Map<string, string>([
	['aliceblue', '#f0f8ff'],
	['antiquewhite', '#faebd7'],
	['aqua', '#00ffff'],
	['aquamarine', '#7fffd4'],
	['azure', '#f0ffff'],
	['beige', '#f5f5dc'],
	['bisque', '#ffe4c4'],
	['black', '#000000'],
	['blanchedalmond', '#ffebcd'],
	['blue', '#0000ff'],
	['blueviolet', '#8a2be2'],
	['brown', '#a52a2a'],
	['burlywood', '#deb887'],
	['cadetblue', '#5f9ea0'],
	['chartreuse', '#7fff00'],
	['chocolate', '#d2691e'],
	['coral', '#ff7f50'],
	['cornflowerblue', '#6495ed'],
	['cornsilk', '#fff8dc'],
	['crimson', '#dc143c'],
	['cyan', '#00ffff'],
	['darkblue', '#00008b'],
	['darkcyan', '#008b8b'],
	['darkgoldenrod', '#b8860b'],
	['darkgray', '#a9a9a9'],
	['darkgreen', '#006400'],
	['darkgrey', '#a9a9a9'],
	['darkkhaki', '#bdb76b'],
	['darkmagenta', '#8b008b'],
	['darkolivegreen', '#556b2f'],
	['darkorange', '#ff8c00'],
	['darkorchid', '#9932cc'],
	['darkred', '#8b0000'],
	['darksalmon', '#e9967a'],
	['darkseagreen', '#8fbc8f'],
	['darkslateblue', '#483d8b'],
	['darkslategray', '#2f4f4f'],
	['darkslategrey', '#2f4f4f'],
	['darkturquoise', '#00ced1'],
	['darkviolet', '#9400d3'],
	['deeppink', '#ff1493'],
	['deepskyblue', '#00bfff'],
	['dimgray', '#696969'],
	['dimgrey', '#696969'],
	['dodgerblue', '#1e90ff'],
	['firebrick', '#b22222'],
	['floralwhite', '#fffaf0'],
	['forestgreen', '#228b22'],
	['fuchsia', '#ff00ff'],
	['gainsboro', '#dcdcdc'],
	['ghostwhite', '#f8f8ff'],
	['gold', '#ffd700'],
	['goldenrod', '#daa520'],
	['gray', '#808080'],
	['green', '#008000'],
	['greenyellow', '#adff2f'],
	['grey', '#808080'],
	['honeydew', '#f0fff0'],
	['hotpink', '#ff69b4'],
	['indianred', '#cd5c5c'],
	['indigo', '#4b0082'],
	['ivory', '#fffff0'],
	['khaki', '#f0e68c'],
	['lavender', '#e6e6fa'],
	['lavenderblush', '#fff0f5'],
	['lawngreen', '#7cfc00'],
	['lemonchiffon', '#fffacd'],
	['lightblue', '#add8e6'],
	['lightcoral', '#f08080'],
	['lightcyan', '#e0ffff'],
	['lightgoldenrodyellow', '#fafad2'],
	['lightgray', '#d3d3d3'],
	['lightgreen', '#90ee90'],
	['lightgrey', '#d3d3d3'],
	['lightpink', '#ffb6c1'],
	['lightsalmon', '#ffa07a'],
	['lightseagreen', '#20b2aa'],
	['lightskyblue', '#87cefa'],
	['lightslategray', '#778899'],
	['lightslategrey', '#778899'],
	['lightsteelblue', '#b0c4de'],
	['lightyellow', '#ffffe0'],
	['lime', '#00ff00'],
	['limegreen', '#32cd32'],
	['linen', '#faf0e6'],
	['magenta', '#ff00ff'],
	['maroon', '#800000'],
	['mediumaquamarine', '#66cdaa'],
	['mediumblue', '#0000cd'],
	['mediumorchid', '#ba55d3'],
	['mediumpurple', '#9370db'],
	['mediumseagreen', '#3cb371'],
	['mediumslateblue', '#7b68ee'],
	['mediumspringgreen', '#00fa9a'],
	['mediumturquoise', '#48d1cc'],
	['mediumvioletred', '#c71585'],
	['midnightblue', '#191970'],
	['mintcream', '#f5fffa'],
	['mistyrose', '#ffe4e1'],
	['moccasin', '#ffe4b5'],
	['navajowhite', '#ffdead'],
	['navy', '#000080'],
	['oldlace', '#fdf5e6'],
	['olive', '#808000'],
	['olivedrab', '#6b8e23'],
	['orange', '#ffa500'],
	['orangered', '#ff4500'],
	['orchid', '#da70d6'],
	['palegoldenrod', '#eee8aa'],
	['palegreen', '#98fb98'],
	['paleturquoise', '#afeeee'],
	['palevioletred', '#db7093'],
	['papayawhip', '#ffefd5'],
	['peachpuff', '#ffdab9'],
	['peru', '#cd853f'],
	['pink', '#ffc0cb'],
	['plum', '#dda0dd'],
	['powderblue', '#b0e0e6'],
	['purple', '#800080'],
	['rebeccapurple', '#663399'], // https://meyerweb.com/eric/thoughts/2014/06/19/rebeccapurple/
	['red', '#ff0000'],
	['rosybrown', '#bc8f8f'],
	['royalblue', '#4169e1'],
	['saddlebrown', '#8b4513'],
	['salmon', '#fa8072'],
	['sandybrown', '#f4a460'],
	['seagreen', '#2e8b57'],
	['seashell', '#fff5ee'],
	['sienna', '#a0522d'],
	['silver', '#c0c0c0'],
	['skyblue', '#87ceeb'],
	['slateblue', '#6a5acd'],
	['slategray', '#708090'],
	['slategrey', '#708090'],
	['snow', '#fffafa'],
	['springgreen', '#00ff7f'],
	['steelblue', '#4682b4'],
	['tan', '#d2b48c'],
	['teal', '#008080'],
	['thistle', '#d8bfd8'],
	['tomato', '#ff6347'],
	['transparent', '#00000000'],
	['turquoise', '#40e0d0'],
	['violet', '#ee82ee'],
	['wheat', '#f5deb3'],
	['white', '#ffffff'],
	['whitesmoke', '#f5f5f5'],
	['yellow', '#ffff00'],
	['yellowgreen', '#9acd32'],
]);

const RGB_FALLBACK = 'rgb(128, 128, 128)';
const REGEX_COLOR_MIX = /color-mix\(in srgb, rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)(?: (\d+)%)?, rgba?\((\d+), (\d+), ([\d.]+)(?:, ([\d.]+))?\)(?: ([\d.]+)%)?\)/;

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
		let cssVar = '--icon-color';
		let cssColor = RGB_FALLBACK;
		if (!color) {
			cssColor = getComputedStyle(document.body).getPropertyValue(cssVar);
		} else if (COLORS.has(color)) {
			cssVar = COLORS.get(color) ?? cssVar;
			cssColor = window.getComputedStyle(document.body).getPropertyValue(cssVar);
		} else if (CSS_COLORS.has(color)) {
			cssColor = CSS_COLORS.get(color) ?? cssColor;
		} else if (CSS.supports('color', color)) {
			cssColor = color;
		} else {
			return RGB_FALLBACK;
		}

		// Color properties are converted into rgb/rgba()
		this.convertEl.style.color = cssColor;
		const rgbValue = this.convertEl.style.color;

		// Value might still be wrapped in color-mix()
		if (rgbValue.startsWith('color-mix')) {
			return this.mixToRgb(rgbValue);
		} else if (rgbValue.startsWith('rgb')) {
			return rgbValue;
		} else {
			return RGB_FALLBACK;
		}
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

	/**
	 * Convert color-mix() string into rgb/rgba() string.
	 * @param color a color-mix() string with rgb/rgba() components
	 */
	private static mixToRgb(colorMix: string): string {
		const matches = colorMix.match(REGEX_COLOR_MIX);
		if (!matches) return 'rgb(0, 0, 0)';

		let [, r1, g1, b1, a1, p1, r2, g2, b2, a2, p2] = matches.map(Number);

		// Normalize any missing percentages
		p1 = isNaN(p1) ? (isNaN(p2) ? 50 : 100 - p2) : p1;
		p2 = isNaN(p2) ? 100 - p1 : p2;

		// Scale percentages if they don't total 100
		const total = p1 + p2;
		if (total !== 100) {
			p1 = (p1 / total) * 100;
			p2 = (p2 / total) * 100;
		}

		// Mix RGB components
		const r = Math.round((r1 * p1 + r2 * p2) / 100);
		const g = Math.round((g1 * p1 + g2 * p2) / 100);
		const b = Math.round((b1 * p1 + b2 * p2) / 100);

		// Mix alpha components
		a1 = isNaN(a1) ? 1 : a1;
		a2 = isNaN(a2) ? 1 : a2;
		const a = (a1 * p1 + a2 * p2) / 100;

		return a !== 1
			? `rgba(${r}, ${g}, ${b}, ${a})`
			: `rgb(${r}, ${g}, ${b})`;
	}
}
