// What the animated binding needs to know about values, kept free of React Native so it can
// be tested on its own: easing curves, which value pairs interpolate, and the value partway
// between two, for a change that interrupts another.

import { valueTypeMoves } from "@pureform/core";

import { formatColor, mixSrgb, parseColor } from "./rgba";
import { TOKEN } from "./values";
import type { Concrete, ThemeValues, Transition } from "./values";

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

/** Whether two values can move smoothly into each other through Animated: numbers, colors,
 *  or strings of the same shape with numbers in them but no colors. Anything else changes at
 *  once, as CSS does for discrete properties. */
export const interpolates = (from: Concrete, to: Concrete): boolean => {
    if (typeof from === "number" && typeof to === "number") return true;
    if (typeof from !== "string" || typeof to !== "string") return false;
    if (isColor(from) && isColor(to)) return true;
    // Animated reads any string holding a color as a color, so a shadow would come out as its
    // color alone. Those change at once.
    if (/rgba?\(|#[0-9a-f]{3}/i.test(from + to)) return false;
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

/** One value a keyframe animation moves: a style property, or one step of a transform, with
 *  its value at each frame's offset. */
export interface Channel {
    property: string;
    /** The transform step's index and key, for a transform. */
    step?: [index: number, key: string];
    inputRange: number[];
    outputRange: Concrete[];
}

type Frame = { offset: number; style: Record<string, unknown> };

/** The channels a keyframe animation moves. A frame without a property takes the style's own
 *  value, as CSS fills in a missing keyframe, and only what interpolates moves. */
export const channels = (
    frames: readonly Frame[],
    base: Record<string, unknown>,
): Channel[] => {
    const all = [...frames];
    if (all[0]?.offset !== 0) all.unshift({ offset: 0, style: {} });
    if (all.at(-1)?.offset !== 1) all.push({ offset: 1, style: {} });
    const inputRange = all.map((f) => f.offset);
    const properties = new Set(frames.flatMap((f) => Object.keys(f.style)));
    const out: Channel[] = [];
    for (const property of properties) {
        const at = (f: Frame) => f.style[property] ?? base[property];
        if (property === "transform") {
            const lists = all.map(
                (f) => at(f) as Record<string, Concrete>[] | undefined,
            );
            const shape = lists.find(Boolean);
            if (!shape || lists.some((l) => !l || l.length !== shape.length))
                continue;
            shape.forEach((op, index) => {
                const key = Object.keys(op)[0]!;
                const outputRange = lists.map(
                    (l) => l![index]![key] as Concrete,
                );
                if (
                    outputRange.every(
                        (v, i) => i === 0 || interpolates(outputRange[0]!, v),
                    )
                ) {
                    out.push({
                        property,
                        step: [index, key],
                        inputRange,
                        outputRange,
                    });
                }
            });
            continue;
        }
        const outputRange = all.map((f) => animatable(at(f) as Concrete));
        if (
            outputRange.every(
                (v) => v !== undefined && interpolates(outputRange[0]!, v),
            )
        ) {
            out.push({ property, inputRange, outputRange });
        }
    }
    return out;
};

// The properties whose percentages are of the parent's height; the rest are of its width.
const VERTICAL = new Set(["top", "bottom", "height", "minHeight", "maxHeight"]);

const PERCENT = /^(-?[\d.]+)%$/;

/** The two ends of a move in one unit, where one is a percentage and the other pixels: the
 *  percentage resolved against the parent's size when it's known, as CSS does, or a zero
 *  read as `0%`. Animated can't move between the two otherwise, and the value would jump. */
export const sameUnits = (
    property: string,
    from: Concrete,
    to: Concrete,
    parent: { width?: unknown; height?: unknown } | undefined,
): [Concrete, Concrete] => {
    const percent = (v: Concrete) =>
        typeof v === "string" ? PERCENT.exec(v) : null;
    const [a, b] = [percent(from), percent(to)];
    if (!a === !b || (a ? typeof to !== "number" : typeof from !== "number")) {
        return [from, to];
    }
    const base = VERTICAL.has(property) ? parent?.height : parent?.width;
    const resolve = (v: Concrete) => {
        const match = percent(v);
        return match && typeof base === "number"
            ? (Number(match[1]) / 100) * base
            : v;
    };
    if (typeof base === "number") return [resolve(from), resolve(to)];
    if (from === 0) return ["0%", to];
    if (to === 0) return [from, "0%"];
    return [from, to];
};

/** The tokens whose own values transition, by key, from a selection's transitions. Under
 *  reduced motion a token that moves something (a length, angle, number, or percentage)
 *  changes at once, and a color still fades. */
export const tokenTransitions = (
    transitions: Record<string, readonly Transition[]>,
    reducedMotion: boolean,
): Map<string, Transition> => {
    const out = new Map<string, Transition>();
    for (const list of Object.values(transitions)) {
        for (const t of list) {
            if (!t.property.startsWith(TOKEN)) continue;
            if (reducedMotion && valueTypeMoves(t.valueType)) continue;
            out.set(t.property.slice(TOKEN.length), t);
        }
    }
    return out;
};

/** The tokens that changed to a value they can move to over their transitions: a number, a
 *  color, or a length, angle, percentage or time in the unit it was in. Any other change
 *  happens at once, as CSS's does between units it can't mix. */
export const movingTokens = (
    from: ThemeValues | undefined,
    to: ThemeValues | undefined,
    transitions: ReadonlyMap<string, Transition>,
): [string, Transition][] =>
    [...transitions].filter(([token]) => {
        const [a, b] = [from?.[token], to?.[token]];
        return (
            a !== undefined &&
            b !== undefined &&
            a !== b &&
            interpolates(animatable(a), animatable(b))
        );
    });

/** The tokens `t` of the way from `from` to `to`, for those moving; the rest as `to` has
 *  them. */
export const tokensAt = (
    from: ThemeValues,
    to: ThemeValues,
    moving: readonly [string, Transition][],
    t: number,
): ThemeValues => {
    const next = { ...to };
    for (const [token] of moving) {
        next[token] = blend(
            animatable(from[token]!),
            animatable(to[token]!),
            t,
        );
    }
    return next;
};
