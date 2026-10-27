// What the animated binding needs to know about values, kept free of React Native so it can
// be tested on its own: easing curves, which value pairs interpolate, and the value partway
// between two, for a change that interrupts another.

import { springState, valueTypeMoves } from "@pureform/core";

import { formatColor, mixSrgb, parseColor } from "./rgba";
import { SHAPE, TOKEN } from "./values";
import type {
    Concrete,
    Easing,
    Spring,
    ThemeValues,
    Transition,
} from "./values";

const EASINGS = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
} satisfies Record<string, [number, number, number, number]>;

/** Bézier control points, or linear for sampled curves and Native's steps fallback. */
export const easingPoints = (
    easing: Easing,
): [number, number, number, number] | "linear" => {
    if (easing.kind === "cubicBezier") return easing.points;
    return easing.kind === "keyword" ? EASINGS[easing.name] : "linear";
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
        // A frame's shape is the drawing's to morph, not a style's.
        if (property === SHAPE) continue;
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
            typeof a !== "object" &&
            typeof b !== "object" &&
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
            animatable(from[token]! as Concrete),
            animatable(to[token]! as Concrete),
            t,
        );
    }
    return next;
};

/** How fast an instance token is moving as its transition starts, in its units per second, by
 *  key: a released drag's speed, which a spring carries on. */
export type TokenVelocities = Readonly<Record<string, number>>;

/** The progress per second the moving tokens' one clock starts at: the first moving numeric
 *  token's velocity over the distance it moves, or 0. */
export const startVelocity = (
    from: ThemeValues,
    to: ThemeValues,
    moving: readonly [string, Transition][],
    velocities: TokenVelocities | undefined,
): number => {
    if (!velocities) return 0;
    for (const [token] of moving) {
        const [v, a, b] = [velocities[token], from[token], to[token]];
        if (v === undefined || typeof a !== "number" || typeof b !== "number")
            continue;
        return a === b ? 0 : v / (b - a);
    }
    return 0;
};

/** Where an overlay is at one end of its enter or exit: how opaque, and how far it's scaled
 *  and moved across and down (in pixels). A move it leaves out is none. */
export interface PresenceFrame {
    readonly opacity: number;
    readonly scale?: number;
    readonly translateX?: number;
    readonly translateY?: number;
}

/** How long a step takes: milliseconds, on a structured curve, after an optional delay.
 *  A spring also carries its physics, which
 *  an engine with springs runs in place of the sampled duration and curve. */
export interface PresenceTiming {
    readonly duration: number;
    readonly easing: Easing;
    readonly spring?: Spring | undefined;
    /** Milliseconds to wait first, showing the step's first frame meanwhile. */
    readonly delay?: number | undefined;
}

/** One way in or out: from one frame to another on a timing. With `fade`, the opacity runs on
 *  that timing instead, alongside the movement (a movement on a spring, its fade on a tween),
 *  and the step ends when both have. */
export interface PresenceStep extends PresenceTiming {
    readonly from: PresenceFrame;
    readonly to: PresenceFrame;
    readonly fade?: PresenceTiming | undefined;
}

/** A spring `by` times as slow: its stiffness over by², its damping coefficient over by. At
 *  no time at all (`by` 0) there is no spring, so the change is instant. */
export const slowSpring = (spring: Spring, by: number): Spring | undefined =>
    by > 0
        ? {
              ...spring,
              stiffness: spring.stiffness / (by * by),
              damping: spring.damping / by,
          }
        : undefined;

/** How an overlay enters and leaves. The exit holds its last frame until the overlay goes. */
export interface PresenceMotion {
    readonly enter: PresenceStep;
    readonly exit: PresenceStep;
}

export type PresencePhase = keyof PresenceMotion;

/** What an engine gives an overlay's moving view for one step. */
export interface PresenceView {
    readonly style: Record<string, unknown>;
    /** Props for the engine's view, such as an end callback it reports through. */
    readonly props: Record<string, unknown>;
}

/** Runs one overlay's enter and exit on an engine. `done` hears a step that ran to its end,
 *  not one cut short. */
export interface PresenceDriver {
    /** The moving view's style and props for a step. */
    view(
        phase: PresencePhase,
        motion: PresenceMotion,
        done: (phase: PresencePhase) => void,
    ): PresenceView;
    /** Starts a step once the render commits, where the engine drives it from JavaScript, and
     *  returns what stops it. */
    run(
        phase: PresencePhase,
        motion: PresenceMotion,
        done: (phase: PresencePhase) => void,
    ): (() => void) | undefined;
}

/** A step's two ends as styles: the opacity, and a transform where either end moves, with the
 *  same steps at both ends so they interpolate. */
export const presenceFrames = (
    step: PresenceStep,
): [from: Record<string, unknown>, to: Record<string, unknown>] => {
    const ends = [step.from, step.to];
    const across = ends.some((frame) => (frame.translateX ?? 0) !== 0);
    const moves =
        across ||
        ends.some(
            (frame) =>
                (frame.scale ?? 1) !== 1 || (frame.translateY ?? 0) !== 0,
        );
    const style = (frame: PresenceFrame) => ({
        opacity: frame.opacity,
        ...(moves
            ? {
                  transform: [
                      ...(across
                          ? [{ translateX: frame.translateX ?? 0 }]
                          : []),
                      { translateY: frame.translateY ?? 0 },
                      { scale: frame.scale ?? 1 },
                  ],
              }
            : {}),
    });
    return [style(step.from), style(step.to)];
};

/** A view's box along a row, in pixels: where it starts and how wide it is. */
export interface Span {
    readonly x: number;
    readonly width: number;
}

/** Where a sliding view starts, against its own place: moved by `translateX` and scaled by
 *  `scaleX` about its center. */
export interface SlideOffset {
    readonly translateX: number;
    readonly scaleX: number;
}

/** An active indicator sliding into its place: from an offset to none, over milliseconds, on a
 *  curve as transitions take it. A new object is a new slide. */
export interface SlideMotion {
    readonly from: SlideOffset;
    readonly duration: number;
    readonly delay: number;
    readonly easing: Easing;
    /** The spring the slide runs on, for an engine with springs (it runs it in place of
     *  `duration` and `easing`); the slide's progress goes from 0 to 1 on it. */
    readonly spring?: Spring | undefined;
    /** How fast the slide's progress starts, per second: the speed an interrupted slide had. */
    readonly velocity?: number | undefined;
}

/** Where a spring heading for 1 is after `seconds`, and how fast (per second), from 0 at
 *  `velocity` per second: core's `springState`, for a spring whose damping is its coefficient
 *  `c` (the ratio is `c / 2√(k·m)`). */
export const springProgress = (
    spring: Spring,
    velocity: number,
    seconds: number,
): { progress: number; velocity: number } => {
    const { stiffness: k, damping: c, mass: m } = spring;
    return springState(
        {
            type: "spring",
            stiffness: k,
            damping: c / (2 * Math.sqrt(k * m)),
            mass: m,
        },
        velocity,
        Math.max(0, seconds),
    );
};

/** The offset that draws a view laid out at `to` over `from`: its center on `from`'s, its width
 *  `from`'s. `undefined` when either has no width. */
export const slideOffset = (from: Span, to: Span): SlideOffset | undefined =>
    from.width > 0 && to.width > 0
        ? {
              translateX: from.x + from.width / 2 - (to.x + to.width / 2),
              scaleX: from.width / to.width,
          }
        : undefined;

/** Where a slide has got to, `progress` (its curve's output, 0 to 1) of the way: its offset. */
export const slideAt = (from: SlideOffset, progress: number): SlideOffset => ({
    translateX: from.translateX - from.translateX * progress,
    scaleX: from.scaleX + (1 - from.scaleX) * progress,
});

/** A view drawn at `span` with `offset`: the box it covers. */
export const offsetSpan = (span: Span, offset: SlideOffset): Span => {
    const width = span.width * offset.scaleX;
    return {
        x: span.x + span.width / 2 + offset.translateX - width / 2,
        width,
    };
};

/** A slide's two ends as styles, a transform of the same steps at both. */
export const slideFrames = (
    motion: SlideMotion,
): [from: Record<string, unknown>, to: Record<string, unknown>] => [
    {
        transform: [
            { translateX: motion.from.translateX },
            { scaleX: motion.from.scaleX },
        ],
    },
    { transform: [{ translateX: 0 }, { scaleX: 1 }] },
];

/** The old fill's opacity `t` of the way through a cross-fade to a fill of opacity `alpha`, the
 *  new one's being `t`: together they cover as much as the colors' blend does, `(1 - t)` of the
 *  old and `t` of the new. An opaque new fill covers it whole, so the old stays until it's gone;
 *  a translucent one lets it through, so the old fades out as the new fades in. */
export const fadeOutOpacity = (alpha: number, t: number): number =>
    t >= 1 ? 0 : alpha >= 1 ? 1 : (1 - t) / (1 - alpha * t);
