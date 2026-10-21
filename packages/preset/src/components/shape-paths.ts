// Paths for the indicators that draw a shape rather than a box: a run of shapes redrawn so each
// can animate into the next (the loading indicator's morph, core's `morphSequence`), and wave
// bands to clip a progress indicator to (the wavy linear and circular progress).

import { add, min, mul, pct, px, unitless } from "@pureform/core/ast";
import type { NumericValue, ShapeNode, ShapePoint } from "@pureform/core/ast";

export { morphSequence } from "@pureform/core/ast";

// A quarter of a sine wave as a cubic, from its zero to its crest: the handles follow the
// curve's slope at each end (Hermite), which keeps it within 2% of the sine.
const QUARTER_HANDLE = Math.PI / 6;

/** A sine wave along a run as cubic curves, a quarter wave each: `at(t, s)` places the point
 *  `t` waves along whose wave height is `s` (from -1 to 1). Each curve continues from the end of
 *  the one before; the first starts at `at(0, 0)`. */
const waveCurves = <P>(waves: number, at: (t: number, s: number) => P) => {
    const value = (k: number) => [0, 1, 0, -1][k % 4]!;
    const slope = (k: number) => [1, 0, -1, 0][k % 4]!;
    return Array.from({ length: waves * 4 }, (_, k) => ({
        from: at(k / 4, value(k)),
        c1: at((k + 1 / 3) / 4, value(k) + slope(k) * QUARTER_HANDLE),
        c2: at((k + 2 / 3) / 4, value(k + 1) - slope(k + 1) * QUARTER_HANDLE),
        to: at((k + 1) / 4, value(k + 1)),
    }));
};

/** A length moved by `amount` times `by` (left as is when `amount` is 0). */
const shifted = (
    length: NumericValue,
    by: NumericValue,
    amount: number,
): NumericValue =>
    round(amount) === 0
        ? length
        : add(length, mul(by, unitless(round(amount))));

/** A band along a wave, to clip a horizontal bar to: `waves` waves of `wavelength` px from the
 *  box's start, ending at the box's end (a longer box ends flat), between `top` and `bottom` (the
 *  band's edges at the wave's middle, from the box's top) and moving up and down by `amplitude`.
 *  The lengths may read tokens, so the band follows them. Points past the box's end fold onto
 *  it, so the band ends where the box does. */
export const waveBand = ({
    waves,
    wavelength,
    top,
    bottom,
    amplitude,
}: {
    waves: number;
    wavelength: number;
    top: NumericValue;
    bottom: NumericValue;
    amplitude: NumericValue;
}): ShapeNode => {
    const end = waves * wavelength;
    const x = (length: number) => min(px(round(length)), pct(100));
    const point =
        (middle: NumericValue) =>
        (t: number, s: number): ShapePoint => [
            x(t * wavelength),
            shifted(middle, amplitude, -s),
        ];
    const curve = (c: { c1: ShapePoint; c2: ShapePoint; to: ShapePoint }) => ({
        op: "curve" as const,
        c1: c.c1,
        c2: c.c2,
        to: c.to,
    });
    const upper = waveCurves(waves, point(top));
    // The lower edge runs back, so each of its curves is turned around.
    const lower = waveCurves(waves, point(bottom))
        .reverse()
        .map((c) => ({ c1: c.c2, c2: c.c1, to: c.from }));
    return {
        type: "shape",
        contours: [
            {
                from: point(top)(0, 0),
                segments: [
                    ...upper.map(curve),
                    { op: "line", to: [pct(100), top] },
                    { op: "line", to: [pct(100), bottom] },
                    { op: "line", to: [x(end), bottom] },
                    ...lower.map(curve),
                ],
            },
        ],
    };
};

/** A ring that waves in and out, to clip a square box to: `waves` waves around it, each edge
 *  `amplitude` in and out of its circle, the band `thickness` wide, its outer crests at the box's
 *  edge. The lengths may read tokens, so the ring follows them at any box size. */
export const wavyRing = ({
    waves,
    thickness,
    amplitude,
}: {
    waves: number;
    thickness: NumericValue;
    amplitude: NumericValue;
}): ShapeNode => {
    // A point at `angle` on a circle of radius 50% less (1 - s) amplitudes, and less the
    // thickness on the inner edge: 50% + cos × (50% − (1 − s) × amplitude [− thickness]).
    const coordinate = (c: number, s: number, inner: boolean) =>
        shifted(
            shifted(pct(round(50 + 50 * c)), amplitude, -c * (1 - s)),
            thickness,
            inner ? -c : 0,
        );
    // Sampled as straight runs between close points, which a circle's curvature makes simplest.
    const samples = waves * 8;
    const ring = (inner: boolean) => {
        const points = Array.from({ length: samples }, (_, i): ShapePoint => {
            const t = (i / samples) * waves;
            // `t` waves around, so the angle is a share of the turn.
            const angle = (t / waves) * 2 * Math.PI - Math.PI / 2;
            const s = Math.sin(t * 2 * Math.PI);
            return [
                coordinate(Math.cos(angle), s, inner),
                coordinate(Math.sin(angle), s, inner),
            ];
        });
        return {
            from: points[0]!,
            segments: points
                .slice(1)
                .map((to) => ({ op: "line" as const, to })),
        };
    };
    return {
        type: "shape",
        fillRule: "evenodd",
        contours: [ring(false), ring(true)],
    };
};

const round = (n: number) => Math.round(n * 1000) / 1000;
