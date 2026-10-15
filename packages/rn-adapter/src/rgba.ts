// sRGB colors as the runtime handles them: parsing the rgba() strings the adapter writes,
// mixing as CSS's color-mix() does, and compositing a layer over another. No color library,
// so apps that mix or override colors at runtime ship only this.

/** Channels from 0 to 255, and alpha from 0 to 1. */
export type Rgba = [r: number, g: number, b: number, a: number];

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/** A color as `rgba(r, g, b, a)`, channels rounded and clipped to sRGB. */
export const formatColor = ([r, g, b, a]: Rgba): string =>
    `rgba(${[r, g, b].map((c) => Math.round(clamp(c, 255))).join(", ")}, ${
        Math.round(clamp(a, 1) * 1000) / 1000
    })`;

const HEX = /^#([0-9a-f]{3,8})$/i;

/** Parse `rgb()`/`rgba()` (comma or space separated), hex, or `transparent`. */
export const parseColor = (value: string): Rgba => {
    const text = value.trim().toLowerCase();
    if (text === "transparent") return [0, 0, 0, 0];
    const hex = HEX.exec(text)?.[1];
    if (hex) {
        const full =
            hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex;
        const n = (i: number) => Number.parseInt(full.slice(i, i + 2), 16);
        return [n(0), n(2), n(4), full.length === 8 ? n(6) / 255 : 1];
    }
    const rgb = /^rgba?\(([^)]*)\)$/.exec(text)?.[1];
    if (rgb) {
        const parts = rgb.split(/[\s,/]+/).filter(Boolean);
        const channel = (part: string, scale: number) =>
            part.endsWith("%")
                ? (Number.parseFloat(part) / 100) * scale
                : Number.parseFloat(part);
        return [
            channel(parts[0]!, 255),
            channel(parts[1]!, 255),
            channel(parts[2]!, 255),
            parts[3] === undefined ? 1 : channel(parts[3], 1),
        ];
    }
    throw new Error(`can't read the color "${value}"`);
};

/** `color-mix(in srgb, base, over amount)`: premultiplied channels, interpolated, then
 *  divided by the mixed alpha. */
export const mixSrgb = (base: Rgba, over: Rgba, amount: number): Rgba => {
    const p1 = 1 - amount;
    const p2 = amount;
    const alpha = base[3] * p1 + over[3] * p2;
    if (alpha === 0) return [0, 0, 0, 0];
    const channel = (i: 0 | 1 | 2) =>
        (base[i] * base[3] * p1 + over[i] * over[3] * p2) / alpha;
    return [channel(0), channel(1), channel(2), alpha];
};

/** `layer` painted over `below`, as a background image over a background color. */
export const compositeOver = (layer: Rgba, below: Rgba): Rgba => {
    const alpha = layer[3] + below[3] * (1 - layer[3]);
    if (alpha === 0) return [0, 0, 0, 0];
    const channel = (i: 0 | 1 | 2) =>
        (layer[i] * layer[3] + below[i] * below[3] * (1 - layer[3])) / alpha;
    return [channel(0), channel(1), channel(2), alpha];
};
