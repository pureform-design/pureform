// Paths for the indicators that draw a shape rather than a box: a run of shapes redrawn so each
// can animate into the next (the loading indicator's morph, core's `morphSequence`), and wave
// bands to clip a progress indicator to (the wavy linear and circular progress).

import { clipShape, pct, px, min } from "@pureform/core/ast";
import type {
    ShapeNode,
    ShapePoint,
    UnitContour,
    Vec,
} from "@pureform/core/ast";

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

/** A band along a wave, to clip a horizontal bar to: `waves` waves of `wavelength` px from the
 *  box's start, ending at the box's end (a longer box ends flat), between `top` and `bottom` (in
 *  percent of the box's height, at the wave's middle) and moving up and down by `amplitude`
 *  percent. Points past the box's end fold onto it, so the band ends where the box does. */
export const waveBand = ({
    waves,
    wavelength,
    top,
    bottom,
    amplitude,
}: {
    waves: number;
    wavelength: number;
    top: number;
    bottom: number;
    amplitude: number;
}): ShapeNode => {
    const end = waves * wavelength;
    const x = (length: number) => min(px(round(length)), pct(100));
    const point =
        (middle: number) =>
        (t: number, s: number): ShapePoint => [
            x(t * wavelength),
            pct(round(middle - s * amplitude)),
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
                    { op: "line", to: [pct(100), pct(top)] },
                    { op: "line", to: [pct(100), pct(bottom)] },
                    { op: "line", to: [x(end), pct(bottom)] },
                    ...lower.map(curve),
                ],
            },
        ],
    };
};

/** A ring that waves in and out, to clip a circle's box to: `waves` waves around it, each edge
 *  `amplitude` in and out of its circle, the band `thickness` wide, its outer crests at the box's
 *  edge. All in fractions of the box's size. */
export const wavyRing = ({
    waves,
    thickness,
    amplitude,
}: {
    waves: number;
    thickness: number;
    amplitude: number;
}): ShapeNode => {
    const middle = 0.5 - amplitude - thickness / 2;
    const edge =
        (radius: number) =>
        (t: number, s: number): Vec => {
            // `t` waves around, so the angle is a share of the turn.
            const angle = (t / waves) * 2 * Math.PI - Math.PI / 2;
            const r = radius + s * amplitude;
            return [0.5 + r * Math.cos(angle), 0.5 + r * Math.sin(angle)];
        };
    // Sampled as straight runs between close points, which a circle's curvature makes simplest.
    const samples = waves * 8;
    const ring = (radius: number): UnitContour => {
        const at = edge(radius);
        const points = Array.from({ length: samples }, (_, i) => {
            const t = (i / samples) * waves;
            return at(t, Math.sin(t * 2 * Math.PI));
        });
        return {
            from: points[0]!,
            segments: points.slice(1).map((to) => ({ op: "line", to })),
        };
    };
    const shape = clipShape({
        contours: [ring(middle + thickness / 2), ring(middle - thickness / 2)],
        fit: { fit: "stretch" },
    });
    return { ...shape, fillRule: "evenodd" };
};

const round = (n: number) => Math.round(n * 1000) / 1000;
