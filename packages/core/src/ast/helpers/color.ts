// Color values, encoded with their color space.
import type {
    ColorMixNode,
    ColorNode,
    ColorSpace,
    ColorValue,
    NumericValue,
} from "../nodes";
import { transparent } from "./keyword/color";
import { pct } from "./unit";

const color = (
    space: ColorSpace,
    components: number[],
    alpha?: number,
): ColorNode => ({
    type: "color",
    space,
    components,
    ...(alpha != null ? { alpha } : {}),
});

export const rgb = (r: number, g: number, b: number, a?: number): ColorNode =>
    color("srgb", [r, g, b], a);
export const hsl = (h: number, s: number, l: number, a?: number): ColorNode =>
    color("hsl", [h, s, l], a);
export const oklch = (l: number, c: number, h: number, a?: number): ColorNode =>
    color("oklch", [l, c, h], a);
/** Material HCT, `@pureform/material`' generation space. */
export const hct = (h: number, c: number, t: number, a?: number): ColorNode =>
    color("hct", [h, c, t], a);

/** Parse `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa` into sRGB channels (0..255) and an
 *  optional 0..1 alpha. */
const parseHex = (value: string): { rgb: number[]; alpha?: number } => {
    let hexDigits = value.startsWith("#") ? value.slice(1) : value;
    if (hexDigits.length === 3 || hexDigits.length === 4) {
        hexDigits = hexDigits
            .split("")
            .map((d) => d + d)
            .join("");
    }
    if (hexDigits.length !== 6 && hexDigits.length !== 8) {
        throw new Error(`Invalid hex color: ${value}`);
    }
    const r = Number.parseInt(hexDigits.slice(0, 2), 16);
    const g = Number.parseInt(hexDigits.slice(2, 4), 16);
    const b = Number.parseInt(hexDigits.slice(4, 6), 16);
    if (hexDigits.length === 8) {
        const a = Number.parseInt(hexDigits.slice(6, 8), 16) / 255;
        return { rgb: [r, g, b], alpha: a };
    }
    return { rgb: [r, g, b] };
};

/** sRGB hex sugar (`#rgb` or `#rrggbb[aa]`), parsed to channels at build time. */
export const hex = (value: string): ColorNode => {
    const { rgb: channels, alpha: a } = parseHex(value);
    return color("srgb", channels, a);
};

/** Composite `over` on top of `base` by `amount` in color `space` (CSS `color-mix`). It works
 *  over a dynamic base (a var) whose value is not known at build time, for example a hover or
 *  press scrim; `alpha()` over a non-concrete color is sugar that lowers to this. This is the
 *  generic primitive only. Design-system conveniences (Material's `stateLayer`, elevation
 *  steps) live upstream in a Material layer that emits a core config, not here. */
export const colorMix = (
    base: ColorValue,
    over: ColorValue,
    amount: NumericValue,
    space: ColorSpace = "srgb",
): ColorMixNode => ({ type: "colorMix", space, base, with: over, amount });

/** Opacity sugar. A concrete color just carries its `alpha` channel. A ref, keyword, or
 *  existing mix has no build-time channels, so it fades toward transparent through
 *  `color-mix` (`color-mix(in srgb, transparent, <c> <a*100>%)`), which works over a dynamic
 *  var whose value is not known until runtime, for example
 *  `alpha(alias("tokens", "colors", "x"), 0.3)`. `a` is the resulting opacity (0..1) in both
 *  forms. */
export function alpha(c: ColorNode, a: number): ColorNode;
export function alpha(
    c: Exclude<ColorValue, ColorNode>,
    a: number,
): ColorMixNode;
export function alpha(c: ColorValue, a: number): ColorNode | ColorMixNode {
    return c.type === "color"
        ? { ...c, alpha: a }
        : colorMix(transparent, c, pct(a * 100));
}
