// What the animated binding needs to know about values, kept free of React Native so it can
// be tested on its own: easing curves, which value pairs interpolate, and the value partway
// between two, for a change that interrupts another.

import { formatColor, parseColor } from "./rgba";
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

/** The two ends of a move, with a fully transparent color taking the other end's channels.
 *  Animated blends each channel on its own, so a fade to `transparent` (black at no alpha)
 *  would pass through a dark gray; CSS blends with alpha premultiplied, which only fades. */
export const colorEnds = (
    from: Concrete,
    to: Concrete,
): [Concrete, Concrete] => {
    if (typeof from !== "string" || typeof to !== "string") return [from, to];
    if (!isColor(from) || !isColor(to)) return [from, to];
    const [a, b] = [parseColor(from), parseColor(to)];
    if (a[3] === 0) return [formatColor([b[0], b[1], b[2], 0]), to];
    if (b[3] === 0) return [from, formatColor([a[0], a[1], a[2], 0])];
    return [from, to];
};

/** The value `t` of the way from one to the other, channel by channel for colors, as
 *  `Animated` interpolates them. */
export const blend = (from: Concrete, to: Concrete, t: number): Concrete => {
    if (typeof from === "number" && typeof to === "number")
        return lerp(from, to, t);
    if (typeof from !== "string" || typeof to !== "string")
        return t < 1 ? from : to;
    if (isColor(from) && isColor(to)) {
        const [x, y] = colorEnds(from, to) as [string, string];
        const [a, b] = [parseColor(x), parseColor(y)];
        return formatColor(
            [0, 1, 2, 3].map((i) => lerp(a[i]!, b[i]!, t)) as never,
        );
    }
    if (!interpolates(from, to)) return t < 1 ? from : to;
    const ends = to.match(NUMBER) ?? [];
    let i = 0;
    return from.replace(NUMBER, (n) =>
        String(lerp(Number(n), Number(ends[i++]), t)),
    );
};

/** The same value in the form `Animated` interpolates: colors as `rgba()`. */
export const animatable = (value: Concrete): Concrete =>
    typeof value === "string" && isColor(value)
        ? formatColor(parseColor(value))
        : value;
