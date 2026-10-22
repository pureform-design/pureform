// Springs and sampled curves: the closed-form motion of a damped spring, its settle time, and
// `linear()` easings sampled from it or from a cubic path. Web targets have no spring, so every
// web adapter runs a spring as the duration and `linear()` curve sampled here; one sampler keeps
// them in agreement.

import type {
    LinearEasingNode,
    LinearEasingPoint,
    SpringNode,
} from "./ast/nodes";

/** Where a spring released from rest at 0 is after `t` seconds, heading for 1: the closed-form
 *  solution of `m·x'' + c·x' + k·x = 0` with `c = 2ζ√(k·m)`, as 1 minus the displacement. */
export const springAt = (spring: SpringNode, t: number): number =>
    springState(spring, 0, t).progress;

/** Where a spring heading for 1 is after `t` seconds, and how fast (per second), from 0 at
 *  `velocity` per second: `springAt`'s motion with a starting speed, as an interrupted motion
 *  carries on. */
export const springState = (
    spring: SpringNode,
    velocity: number,
    t: number,
): { progress: number; velocity: number } => {
    const { stiffness: k, damping: zeta, mass: m } = spring;
    const w = Math.sqrt(k / m);
    const x0 = -1;
    if (zeta < 1) {
        const wd = w * Math.sqrt(1 - zeta * zeta);
        const a = zeta * w;
        const b = (velocity + a * x0) / wd;
        const decay = Math.exp(-a * t);
        const [cos, sin] = [Math.cos(wd * t), Math.sin(wd * t)];
        return {
            progress: 1 + decay * (x0 * cos + b * sin),
            velocity:
                decay *
                (-a * (x0 * cos + b * sin) + wd * (-x0 * sin + b * cos)),
        };
    }
    if (zeta === 1) {
        const b = velocity + w * x0;
        const decay = Math.exp(-w * t);
        return {
            progress: 1 + decay * (x0 + b * t),
            velocity: decay * (b - w * (x0 + b * t)),
        };
    }
    const root = Math.sqrt(zeta * zeta - 1);
    const [r1, r2] = [-w * (zeta - root), -w * (zeta + root)];
    const c2 = (velocity - r1 * x0) / (r2 - r1);
    const c1 = x0 - c2;
    const [e1, e2] = [Math.exp(r1 * t), Math.exp(r2 * t)];
    return {
        progress: 1 + c1 * e1 + c2 * e2,
        velocity: c1 * r1 * e1 + c2 * r2 * e2,
    };
};

/** The damping coefficient `c = 2ζ√(k·m)` a native spring takes, from the damping ratio. */
export const dampingCoefficient = (spring: SpringNode): number =>
    2 * spring.damping * Math.sqrt(spring.stiffness * spring.mass);

/** Whether a spring's values can run: stiffness and mass above 0, damping 0 or more, all
 *  finite. The reason it can't, or `undefined`. */
export const springProblem = (spring: SpringNode): string | undefined => {
    const { stiffness, damping, mass } = spring;
    if (!(Number.isFinite(stiffness) && stiffness > 0))
        return `stiffness must be above 0, not ${stiffness}`;
    if (!(Number.isFinite(mass) && mass > 0))
        return `mass must be above 0, not ${mass}`;
    if (!(Number.isFinite(damping) && damping >= 0))
        return `damping must be 0 or more, not ${damping}`;
    return undefined;
};

export interface SampleOptions {
    /** How close to its target (as a fraction of the distance) a spring stays from the moment it
     *  counts as settled. Default 0.001. */
    tolerance?: number;
    /** The most a sampled curve strays from the true one, as a fraction of the distance.
     *  Default 0.002. */
    precision?: number;
    /** The most points a sampled curve keeps; past it, the precision loosens. Default 48. */
    maxPoints?: number;
    /** The longest a spring may take, in ms; one with no damping never settles. Default 10000. */
    maxDuration?: number;
}

/** A spring sampled for a target with no springs: how long it takes to settle, in whole ms, and
 *  the `linear()` points it follows over that time. */
export interface SampledSpring {
    duration: number;
    points: LinearEasingPoint[];
}

const round = (value: number, places: number) => {
    const f = 10 ** places;
    const r = Math.round(value * f) / f;
    return Object.is(r, -0) ? 0 : r;
};

/** How long, in seconds, a spring takes to stay within `tolerance` of its target. */
export const settleTime = (
    spring: SpringNode,
    tolerance = 0.001,
    maxDuration = 10000,
): number => {
    const { stiffness: k, damping: zeta, mass: m } = spring;
    const w0 = Math.sqrt(k / m);
    const limit = maxDuration / 1000;
    // After this the envelope of the motion is within tolerance, so nothing later leaves it.
    let bound: number;
    if (zeta === 0) bound = limit;
    else if (zeta < 1) {
        const wd = w0 * Math.sqrt(1 - zeta * zeta);
        const amplitude = Math.hypot(1, (zeta * w0) / wd);
        bound = Math.log(amplitude / tolerance) / (zeta * w0);
    } else {
        // Critical and over-damped springs never pass the target: the slowest exponential with
        // its largest factor bounds them.
        const slow = zeta === 1 ? w0 : w0 * (zeta - Math.sqrt(zeta * zeta - 1));
        bound = Math.log(2 / tolerance) / slow;
        if (zeta === 1) {
            // e^(-w0·t)(1 + w0·t) needs a little longer than e^(-w0·t).
            while (Math.exp(-w0 * bound) * (1 + w0 * bound) > tolerance)
                bound *= 1.1;
        }
    }
    bound = Math.min(Math.max(bound, 0), limit);
    // The last moment, scanning back from the bound, the spring is out of tolerance.
    const step = Math.max(bound / 4000, 1e-5);
    for (let t = bound; t > 0; t -= step) {
        if (Math.abs(1 - springAt(spring, t)) > tolerance)
            return Math.min(t + step, limit);
    }
    return 0;
};

// Ramer–Douglas–Peucker: the fewest of `points` (x, y) that stay within `epsilon` of the rest,
// measured vertically, as an easing's error is.
const simplify = (points: [number, number][], epsilon: number) => {
    const keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;
    const stack: [number, number][] = [[0, points.length - 1]];
    while (stack.length > 0) {
        const [a, b] = stack.pop()!;
        const [x0, y0] = points[a]!;
        const [x1, y1] = points[b]!;
        let worst = -1;
        let at = -1;
        for (let i = a + 1; i < b; i++) {
            const [x, y] = points[i]!;
            const line =
                x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
            const error = Math.abs(y - line);
            if (error > worst) {
                worst = error;
                at = i;
            }
        }
        if (worst > epsilon) {
            keep[at] = 1;
            stack.push([a, at], [at, b]);
        }
    }
    return points.filter((_, i) => keep[i]);
};

// Dense (x, y) samples to as few `linear()` points as the precision allows, within `maxPoints`.
const toLinearPoints = (
    dense: [number, number][],
    precision: number,
    maxPoints: number,
): LinearEasingPoint[] => {
    let epsilon = precision;
    let kept = simplify(dense, epsilon);
    while (kept.length > maxPoints) {
        epsilon *= 1.25;
        kept = simplify(dense, epsilon);
    }
    return kept.map(([x, y], i) =>
        i === 0 || i === kept.length - 1
            ? [round(y, 4)]
            : [round(y, 4), round(x * 100, 2)],
    );
};

/** A spring as a duration and a `linear()` curve: it runs until it stays within `tolerance` of
 *  its target, and the curve, sampled densely and simplified to within `precision` (and at most
 *  `maxPoints` points), follows the closed-form motion over that time, ending exactly at 1. */
export const sampleSpring = (
    spring: SpringNode,
    options: SampleOptions = {},
): SampledSpring => {
    const problem = springProblem(spring);
    if (problem) throw new Error(`spring: ${problem}`);
    const {
        tolerance = 0.001,
        precision = 0.002,
        maxPoints = 48,
        maxDuration = 10000,
    } = options;
    const settle = settleTime(spring, tolerance, maxDuration);
    const duration = Math.max(1, Math.ceil(settle * 1000));
    const seconds = duration / 1000;
    const count = 1000;
    const dense: [number, number][] = Array.from(
        { length: count + 1 },
        (_, i) => {
            const x = i / count;
            return [x, i === count ? 1 : springAt(spring, x * seconds)];
        },
    );
    return { duration, points: toLinearPoints(dense, precision, maxPoints) };
};

/** A cubic Bézier segment of an easing path: its start, two control points, and end, each
 *  `[x, y]`, as an SVG path's `C` command takes them. */
export type CubicSegment = [
    from: [number, number],
    c1: [number, number],
    c2: [number, number],
    to: [number, number],
];

/** An easing path of cubic segments (Android's `PathInterpolator`), from (0, 0) to (1, 1) with x
 *  never decreasing, as a `linear()` easing: each segment sampled densely and the whole
 *  simplified to within `precision` of the path (default 0.001), at most `maxPoints` points
 *  (default 64). */
export const sampleCubicPath = (
    segments: readonly CubicSegment[],
    options: { precision?: number; maxPoints?: number } = {},
): LinearEasingNode => {
    const { precision = 0.001, maxPoints = 64 } = options;
    const perSegment = 400;
    const dense: [number, number][] = [];
    for (const [p0, p1, p2, p3] of segments) {
        const start = dense.length === 0 ? 0 : 1;
        for (let i = start; i <= perSegment; i++) {
            const t = i / perSegment;
            const u = 1 - t;
            const at = (axis: 0 | 1) =>
                u * u * u * p0[axis] +
                3 * u * u * t * p1[axis] +
                3 * u * t * t * p2[axis] +
                t * t * t * p3[axis];
            dense.push([at(0), at(1)]);
        }
    }
    return {
        type: "easing",
        kind: "linear",
        points: toLinearPoints(dense, precision, maxPoints),
    };
};

/** Why `linear()` points can't run, or `undefined`: at least two, finite outputs, and inputs
 *  (where given) finite, from 0 to 100, never decreasing. */
export const linearPointsProblem = (
    points: readonly LinearEasingPoint[],
): string | undefined => {
    if (!Array.isArray(points) || points.length < 2)
        return "linear() needs at least two points";
    let last = -Infinity;
    for (const [output, input] of points) {
        if (!Number.isFinite(output))
            return `linear() output ${output} is not a number`;
        if (input === undefined) continue;
        if (!Number.isFinite(input) || input < 0 || input > 100)
            return `linear() input ${input}% is not between 0% and 100%`;
        if (input < last)
            return `linear() inputs must not decrease (${input}% after ${last}%)`;
        last = input;
    }
    return undefined;
};

/** The points with every input filled in, as CSS places them: the first at 0%, the last at
 *  100%, an input below an earlier one raised to it, and a run without inputs spread evenly. */
export const linearStops = (
    points: readonly LinearEasingPoint[],
): [output: number, input: number][] => {
    const inputs: (number | undefined)[] = points.map(([, input]) => input);
    if (inputs[0] === undefined) inputs[0] = 0;
    if (inputs.at(-1) === undefined) inputs[inputs.length - 1] = 100;
    let max = -Infinity;
    for (let i = 0; i < inputs.length; i++) {
        if (inputs[i] !== undefined) {
            max = Math.max(max, inputs[i]!);
            inputs[i] = max;
        }
    }
    for (let i = 0; i < inputs.length; i++) {
        if (inputs[i] !== undefined) continue;
        let j = i;
        while (inputs[j] === undefined) j++;
        const a = inputs[i - 1]!;
        const b = inputs[j]!;
        for (let n = i; n < j; n++)
            inputs[n] = a + ((b - a) * (n - i + 1)) / (j - i + 1);
        i = j;
    }
    return points.map(([output], i) => [output, inputs[i]! / 100]);
};

/** A `linear()` easing's output at progress `x` (0 to 1), as CSS evaluates it. */
export const linearEasingAt = (
    points: readonly LinearEasingPoint[],
    x: number,
): number => {
    const stops = linearStops(points);
    if (x <= stops[0]![1]) return stops[0]![0];
    for (let i = 1; i < stops.length; i++) {
        const [y1, x1] = stops[i]!;
        const [y0, x0] = stops[i - 1]!;
        if (x <= x1) {
            return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
        }
    }
    return stops.at(-1)![0];
};

/** `linear()` points as CSS writes them: `linear(0, 0.5 20%, 1)`. */
export const formatLinearEasing = (
    points: readonly LinearEasingPoint[],
): string =>
    `linear(${points
        .map(([output, input]) =>
            input === undefined ? `${output}` : `${output} ${input}%`,
        )
        .join(", ")})`;

/** The points of a CSS `linear(...)` string, or `undefined` if it isn't one. Each stop is an
 *  output with up to two inputs (CSS's shorthand for a flat run, read as two stops). */
export const parseLinearEasing = (
    text: string,
): LinearEasingPoint[] | undefined => {
    const inner = /^linear\((.*)\)$/s.exec(text.trim())?.[1];
    if (inner === undefined) return undefined;
    const points: LinearEasingPoint[] = [];
    for (const stop of inner.split(",")) {
        const [output, ...inputs] = stop.trim().split(/\s+/);
        const value = Number(output);
        if (!Number.isFinite(value)) return undefined;
        if (inputs.length === 0) points.push([value]);
        for (const input of inputs) {
            const percent = /^(-?[\d.]+)%$/.exec(input)?.[1];
            if (percent === undefined) return undefined;
            points.push([value, Number(percent)]);
        }
    }
    return linearPointsProblem(points) ? undefined : points;
};
