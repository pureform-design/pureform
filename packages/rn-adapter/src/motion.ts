// What the animated binding needs to know about values, kept free of React Native so it can
// be tested on its own: easing curves, which value pairs interpolate, and the value partway
// between two, for a change that interrupts another.

import { formatColor, mixSrgb, parseColor } from "./rgba";
import type { Concrete } from "./values";

/** A transition's curve as Bézier points, or `linear`. */
export const easingPoints = (
    easing: string,
): [number, number, number, number] | "linear" => {
    const inner = /^cubic-bezier\(([^)]*)\)$/.exec(easing.trim())?.[1];
    if (!inner) return "linear";
    const points = inner.split(",").map(Number.parseFloat);
    return points.length === 4 && points.every(Number.isFinite)
        ? (points as [number, number, number, number])
        : "linear";
};

const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
const isColor = (value: string) =>
    /^(rgba?\(|#)/i.test(value.trim()) || value === "transparent";

/** Whether two values can move smoothly into each other: numbers, colors, or strings of the
 *  same shape with numbers in them (a shadow with as many layers). Anything else changes at
 *  once, as CSS does for discrete properties. */
export const interpolates = (from: Concrete, to: Concrete): boolean => {
    if (typeof from === "number" && typeof to === "number") return true;
    if (typeof from !== "string" || typeof to !== "string") return false;
    if (isColor(from) && isColor(to)) return true;
    return (
        from.replace(NUMBER, "#") === to.replace(NUMBER, "#") && /\d/.test(from)
    );
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The value `t` of the way from one to the other. Colors blend with alpha premultiplied, as
 *  CSS transitions them, so a fade between a dark faint color and a light opaque one doesn't
 *  dip through gray. */
export const blend = (from: Concrete, to: Concrete, t: number): Concrete => {
    if (typeof from === "number" && typeof to === "number")
        return lerp(from, to, t);
    if (typeof from !== "string" || typeof to !== "string")
        return t < 1 ? from : to;
    if (isColor(from) && isColor(to)) {
        const [a, b] = [parseColor(from), parseColor(to)];
        const mixed = mixSrgb(a, b, t);
        // Fully transparent keeps the other end's channels, so the stop beside it doesn't
        // darken toward black.
        if (mixed[3] === 0) {
            const [r, g, bl] = a[3] === 0 ? b : a;
            return formatColor([r, g, bl, 0]);
        }
        return formatColor(mixed);
    }
    if (!interpolates(from, to)) return t < 1 ? from : to;
    const ends = to.match(NUMBER) ?? [];
    let i = 0;
    return from.replace(NUMBER, (n) =>
        String(lerp(Number(n), Number(ends[i++]), t)),
    );
};

// Animated interpolates colors channel by channel, so a premultiplied blend runs through
// this many straight pieces.
const COLOR_PIECES = 8;

/** The stops for Animated to interpolate through from one value to the other: the two ends,
 *  or for colors, points along their premultiplied blend. */
export const stops = (
    from: Concrete,
    to: Concrete,
): { inputRange: number[]; outputRange: Concrete[] } => {
    if (
        typeof from !== "string" ||
        typeof to !== "string" ||
        !isColor(from) ||
        !isColor(to)
    ) {
        return { inputRange: [0, 1], outputRange: [from, to] };
    }
    const inputRange = Array.from(
        { length: COLOR_PIECES + 1 },
        (_, i) => i / COLOR_PIECES,
    );
    return {
        inputRange,
        outputRange: inputRange.map((t) => blend(from, to, t)),
    };
};

/** The same value in the form `Animated` interpolates: colors as `rgba()`. */
export const animatable = (value: Concrete): Concrete =>
    typeof value === "string" && isColor(value)
        ? formatColor(parseColor(value))
        : value;
