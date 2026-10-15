// Values in React Native style templates, and their evaluation against a theme.
//
// A template value is concrete (a number or a string) or an expression left for when the theme
// is known: a token reference, a component token, a color mix, arithmetic, or a shadow. Plain
// arrays and objects (a transform list) hold values too. Everything is JSON, so templates and
// precomputed styles can be written to a module.

import { formatColor, parseColor } from "./rgba";
import { mixIn } from "./spaces";
import type { MixSpace } from "./spaces";

export type Concrete = number | string;

/** A color layered over the background color, which selection composites into it: React
 *  Native's stand-in for a one-color background image. */
export const TINT = "backgroundTint";

/** A style's transitions, which selection returns beside the style rather than in it. */
export const TRANSITION = "transition";

/** How one property moves to a new value: React Native's name for it, milliseconds, and a
 *  `cubic-bezier(...)` or `linear` curve. */
export interface Transition {
    property: string;
    duration: number;
    easing: string;
    delay: number;
}

/** A style's keyframe animation, which selection returns beside the style. */
export const ANIMATION = "animation";

/** A looping or one-off keyframe animation: milliseconds, a curve as for transitions, how many
 *  times it runs (`-1` for ever), its direction, and its frames, each a style at an offset
 *  from 0 to 1. */
export interface Animation {
    name: string;
    duration: number;
    easing: string;
    delay: number;
    iterations: number;
    direction: "normal" | "reverse" | "alternate" | "alternateReverse";
    frames: {
        offset: number;
        style: Record<string, Concrete | Concrete[] | object>;
    }[];
}

/** A slot's clip shape, which selection returns beside its style for an SVG to draw. */
export const SHAPE = "clipPath";

/** A point of a shape: its coordinates, which may mix pixels and percentages of the box. */
export type ShapePoint = [x: Value, y: Value];

/** A shape's closed contours, as the core's shape nodes give them. */
export interface ShapeValue {
    fillRule?: "evenodd";
    contours: {
        from: ShapePoint;
        segments: (
            | { op: "line"; to: ShapePoint }
            | { op: "curve"; to: ShapePoint; c1: ShapePoint; c2: ShapePoint }
        )[];
    }[];
}

/** A linear or radial gradient. A stop's position may mix pixels and percentages of the
 *  gradient's length, so it's placed once the box's size is known. */
export interface GradientValue {
    kind: "linear" | "radial";
    /** A linear gradient's direction, in degrees: 180 runs top to bottom, as in CSS. */
    angle?: Value;
    /** How far a radial gradient reaches. */
    extent?:
        | "closest-side"
        | "closest-corner"
        | "farthest-side"
        | "farthest-corner";
    stops: { color: Value; at?: Value }[];
}

export type Expr =
    | { $ref: string }
    | { $dyn: string; default?: Value }
    | { $mix: [base: Value, over: Value, amount: Value]; space?: MixSpace }
    | { $calc: "+" | "-" | "*" | "/"; args: Value[] }
    | { $math: "min" | "max" | "clamp"; args: Value[] }
    | { $shadow: ShadowLayer[] }
    | { $shape: ShapeValue }
    | { $gradient: GradientValue };

export interface ShadowLayer {
    x: Value;
    y: Value;
    blur: Value;
    spread?: Value;
    color: Value;
    inset?: boolean;
}

export type Value = Concrete | Expr | Value[] | { [key: string]: Value };

/** Token values by reference (`colors.primary`) and component token values by path
 *  (`components.button.container`), for one scheme and named theme. */
export type ThemeValues = Record<string, Concrete>;

export const isExpr = (value: unknown): value is Expr =>
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).some((key) => key.startsWith("$"));

const number = (value: Concrete, what: string): number => {
    if (typeof value === "number") return value;
    throw new Error(`${what} needs a number, got "${value}"`);
};

// A share for a mix: a percentage or a number from 0 to 1.
const share = (value: Concrete): number =>
    typeof value === "string" && value.endsWith("%")
        ? Number.parseFloat(value) / 100
        : number(value, "a mix amount");

const px = (value: Concrete): string =>
    typeof value === "number" ? `${value}px` : value;

// A number with its unit, `""` for React Native's plain numbers (pixels, or none).
interface Quantity {
    n: number;
    unit: string;
    /** Pixels added to a percentage, which React Native can't sum before layout. */
    offset?: number;
}

/** A percentage plus pixels, which selection splits for an inset: the percentage on the inset
 *  and the pixels on its margin, as Yoga adds a margin to an absolute position. */
export interface PercentOffset {
    percent: number;
    offset: number;
}

export const isPercentOffset = (value: unknown): value is PercentOffset =>
    typeof value === "object" &&
    value !== null &&
    "percent" in value &&
    "offset" in value;

const quantity = (value: Value, what: string): Quantity => {
    if (typeof value === "number") return { n: value, unit: "" };
    if (isPercentOffset(value))
        return { n: value.percent, unit: "%", offset: value.offset };
    const match =
        typeof value === "string"
            ? /^(-?\d*\.?\d+(?:e[-+]?\d+)?)([a-z%]*)$/i.exec(value.trim())
            : null;
    if (!match)
        throw new Error(
            `${what} needs a number, got "${JSON.stringify(value)}"`,
        );
    return { n: Number(match[1]), unit: match[2]! };
};

const written = ({ n, unit, offset }: Quantity): Value =>
    offset ? { percent: n, offset } : unit ? `${n}${unit}` : n;

const shown = (q: Quantity) => JSON.stringify(written(q));

// Comparisons take one unit; a product takes at most one, and a divisor none, as in CSS. A
// sum takes one unit, or a percentage and pixels, kept apart for selection to place.
const sameUnit = (a: Quantity, b: Quantity, what: string): string => {
    if (a.unit === b.unit && !a.offset && !b.offset) return a.unit;
    throw new Error(`${what} can't combine ${shown(a)} and ${shown(b)}`);
};

const sum = (a: Quantity, b: Quantity): Quantity => {
    if (a.unit === b.unit) {
        const offset = (a.offset ?? 0) + (b.offset ?? 0);
        return { n: a.n + b.n, unit: a.unit, ...(offset ? { offset } : {}) };
    }
    const [percent, pixels] = a.unit === "%" ? [a, b] : [b, a];
    if (percent.unit !== "%" || pixels.unit !== "" || pixels.offset) {
        throw new Error(`calc can't combine ${shown(a)} and ${shown(b)}`);
    }
    const offset = (percent.offset ?? 0) + pixels.n;
    return { n: percent.n, unit: "%", ...(offset ? { offset } : {}) };
};

const scale = (q: Quantity, by: number): Quantity => ({
    n: q.n * by,
    unit: q.unit,
    ...(q.offset ? { offset: q.offset * by } : {}),
});

const ARITHMETIC: Record<
    "+" | "-" | "*" | "/",
    (a: Quantity, b: Quantity) => Quantity
> = {
    "+": sum,
    "-": (a, b) => sum(a, scale(b, -1)),
    "*": (a, b) => {
        if ((a.unit || a.offset) && (b.unit || b.offset)) {
            throw new Error(`calc can't multiply ${shown(a)} by ${shown(b)}`);
        }
        return a.unit || a.offset ? scale(a, b.n) : scale(b, a.n);
    },
    "/": (a, b) => {
        if (b.unit || b.offset)
            throw new Error(`calc can't divide by ${shown(b)}`);
        return scale(a, 1 / b.n);
    },
};

/** Evaluate a value against a theme. */
export const evaluate = (value: Value, theme: ThemeValues): Value => {
    if (typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map((v) => evaluate(v, theme));
    if (!isExpr(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, v]) => [key, evaluate(v, theme)]),
        );
    }
    const concrete = (v: Value) => evaluate(v, theme) as Concrete;
    // Shapes and gradients keep their arithmetic, since percentages wait for the box: only
    // their tokens are read, and the result is a plain object, no longer an expression.
    if ("$shape" in value)
        return tokensIn(value.$shape as unknown as Value, theme);
    if ("$gradient" in value) {
        const { stops, angle, ...rest } = value.$gradient;
        return {
            ...rest,
            ...(angle === undefined ? {} : { angle: concrete(angle) }),
            stops: stops.map(({ color, at }) => ({
                color: deferred(color, theme),
                ...(at === undefined ? {} : { at: tokensIn(at, theme) }),
            })),
        } as Value;
    }
    if ("$ref" in value) {
        const found = theme[value.$ref];
        if (found === undefined)
            throw new Error(`unknown token "${value.$ref}"`);
        return found;
    }
    if ("$dyn" in value) {
        const found = theme[value.$dyn];
        if (found !== undefined) return found;
        if (value.default === undefined) {
            throw new Error(`"${value.$dyn}" has no value and no default`);
        }
        return evaluate(value.default, theme);
    }
    if ("$mix" in value) {
        const [base, over, amount] = value.$mix;
        return formatColor(
            mixIn(
                value.space ?? "srgb",
                parseColor(String(concrete(base))),
                parseColor(String(concrete(over))),
                share(concrete(amount)),
            ),
        );
    }
    if ("$calc" in value) {
        const args = value.args.map((a) =>
            quantity(evaluate(a, theme), "calc"),
        );
        return written(args.slice(1).reduce(ARITHMETIC[value.$calc], args[0]!));
    }
    if ("$math" in value) {
        const what = value.$math;
        const args = value.args.map((a) => quantity(concrete(a), what));
        const unit = args.reduce(
            (u, a) => sameUnit({ n: 0, unit: u }, a, what),
            args[0]!.unit,
        );
        const ns = args.map((a) => a.n);
        const n =
            what === "min"
                ? Math.min(...ns)
                : what === "max"
                  ? Math.max(...ns)
                  : Math.min(Math.max(ns[1]!, ns[0]!), ns[2]!);
        return written({ n, unit });
    }
    return value.$shadow
        .map((layer) =>
            [
                layer.inset ? "inset" : undefined,
                px(concrete(layer.x)),
                px(concrete(layer.y)),
                px(concrete(layer.blur)),
                layer.spread === undefined
                    ? undefined
                    : px(concrete(layer.spread)),
                concrete(layer.color),
            ]
                .filter((part) => part !== undefined)
                .join(" "),
        )
        .join(", ");
};

const CURRENT = "currentColor";

const mentions = (value: Value, what: string): boolean =>
    value === what ||
    (typeof value === "object" &&
        Object.values(value).some((v) => mentions(v as Value, what)));

// A color, or, where it mixes with the current color, the mix with its tokens read, for
// `colorWith` to finish where the current color is known.
const deferred = (value: Value, theme: ThemeValues): Value => {
    const read = tokensIn(value, theme);
    return mentions(read, CURRENT) ? read : evaluate(read, theme);
};

/** A color that may mix with the current color, given it. */
export const colorWith = (value: Value, current: string): string => {
    const swap = (v: Value): Value =>
        v === CURRENT
            ? current
            : typeof v !== "object"
              ? v
              : Array.isArray(v)
                ? v.map(swap)
                : Object.fromEntries(
                      Object.entries(v).map(([key, inner]) => [
                          key,
                          swap(inner),
                      ]),
                  );
    return String(evaluate(swap(value), {}));
};

// A value with its tokens read and its arithmetic kept.
const tokensIn = (value: Value, theme: ThemeValues): Value => {
    if (typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map((v) => tokensIn(v, theme));
    if ("$ref" in value || "$dyn" in value) return evaluate(value, theme);
    return Object.fromEntries(
        Object.entries(value).map(([key, v]) => [key, tokensIn(v, theme)]),
    );
};

/** A length that may mix pixels and percentages (of `size`), in pixels. */
export const pixels = (value: Value, size: number): number => {
    const sized = (v: Value): Value => {
        if (typeof v === "string" && v.endsWith("%")) {
            return (Number.parseFloat(v) / 100) * size;
        }
        if (isPercentOffset(v)) return (v.percent / 100) * size + v.offset;
        if (typeof v !== "object") return v;
        if (Array.isArray(v)) return v.map(sized);
        return Object.fromEntries(
            Object.entries(v).map(([key, inner]) => [key, sized(inner)]),
        );
    };
    const out = evaluate(sized(value), {});
    const n = typeof out === "number" ? out : Number.parseFloat(String(out));
    if (Number.isNaN(n))
        throw new Error(`not a length: ${JSON.stringify(value)}`);
    return n;
};

/** The tokens and component tokens a value reads. */
export const dependencies = (
    value: Value,
    into = new Set<string>(),
): Set<string> => {
    if (typeof value !== "object") return into;
    if (Array.isArray(value)) {
        for (const v of value) dependencies(v, into);
        return into;
    }
    if ("$ref" in value && typeof value.$ref === "string") into.add(value.$ref);
    if ("$dyn" in value && typeof value.$dyn === "string") into.add(value.$dyn);
    for (const v of Object.values(value)) {
        if (typeof v === "object") dependencies(v as Value, into);
    }
    return into;
};
