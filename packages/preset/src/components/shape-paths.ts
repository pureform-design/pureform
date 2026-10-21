// Paths for the indicators that draw a shape rather than a box: a run of shapes redrawn so each
// can animate into the next (the loading indicator's morph), and wave bands to clip a progress
// indicator to (the wavy linear and circular progress).
//
// Shape morphs in CSS (`shape()`) and on React Native's SVG need every shape of a run to have
// the same structure: the same number of cubic curves, running the same way, starting at
// matching points. Core's `morph()` does that for two shapes; `morphSequence` does it for a
// cycle of them.

import { clipShape, pct, px, min } from "@pureform/core/ast";
import type {
    ShapeGeometry,
    ShapeNode,
    ShapePoint,
    UnitContour,
    Vec,
} from "@pureform/core/ast";

type Curve = { from: Vec; c1: Vec; c2: Vec; to: Vec };

const lerp = (a: Vec, b: Vec, t: number): Vec => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
];
const distance = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// A line as a cubic with its handles on the line.
const straight = (from: Vec, to: Vec): Curve => ({
    from,
    c1: lerp(from, to, 1 / 3),
    c2: lerp(from, to, 2 / 3),
    to,
});

// Every segment as a cubic, the closing line included.
const toCurves = (contour: UnitContour): Curve[] => {
    let last = contour.from;
    const curves = contour.segments.map((segment) => {
        const curve =
            segment.op === "curve"
                ? { from: last, c1: segment.c1, c2: segment.c2, to: segment.to }
                : straight(last, segment.to);
        last = segment.to;
        return curve;
    });
    return distance(last, contour.from) > 1e-9
        ? [...curves, straight(last, contour.from)]
        : curves;
};

// Split a cubic at its middle (de Casteljau).
const halve = ({ from, c1, c2, to }: Curve): [Curve, Curve] => {
    const ab = lerp(from, c1, 0.5);
    const bc = lerp(c1, c2, 0.5);
    const cd = lerp(c2, to, 0.5);
    const abc = lerp(ab, bc, 0.5);
    const bcd = lerp(bc, cd, 0.5);
    const mid = lerp(abc, bcd, 0.5);
    return [
        { from, c1: ab, c2: abc, to: mid },
        { from: mid, c1: bcd, c2: cd, to },
    ];
};

const span = ({ from, c1, c2, to }: Curve) =>
    distance(c1, from) + distance(c2, c1) + distance(to, c2);

// Split the longest curves until there are `count`.
const splitTo = (curves: Curve[], count: number): Curve[] => {
    const result = [...curves];
    while (result.length < count) {
        let longest = 0;
        result.forEach((curve, i) => {
            if (span(curve) > span(result[longest]!)) longest = i;
        });
        result.splice(longest, 1, ...halve(result[longest]!));
    }
    return result;
};

// Twice the signed area: its sign is the way the contour runs.
const area = (curves: Curve[]) =>
    curves.reduce(
        (sum, { from, to }) => sum + from[0] * to[1] - to[0] * from[1],
        0,
    );

const reversed = (curves: Curve[]): Curve[] =>
    [...curves].reverse().map(({ from, c1, c2, to }) => ({
        from: to,
        c1: c2,
        c2: c1,
        to: from,
    }));

const fromCurves = (curves: Curve[]): UnitContour => ({
    from: curves[0]!.from,
    segments: curves.map(({ c1, c2, to }) => ({ op: "curve", c1, c2, to })),
});

/** Shapes redrawn so each animates into the next, and the last back into the first: all as the
 *  same number of cubic curves, running the same way, each starting at the point closest to
 *  where the one before it starts. Only single-contour shapes morph. Each keeps its own fit. */
export const morphSequence = (
    shapes: readonly ShapeGeometry[],
): ShapeGeometry[] => {
    const runs = shapes.map((shape) => {
        if (shape.contours.length !== 1) {
            throw new Error(
                "morphSequence() takes shapes with one contour each",
            );
        }
        return toCurves(shape.contours[0]!);
    });
    const count = Math.max(...runs.map((run) => run.length));
    const sign = Math.sign(area(runs[0]!));
    let previous: Curve[] | undefined;
    return runs.map((run, i) => {
        let curves = splitTo(
            Math.sign(area(run)) === sign ? run : reversed(run),
            count,
        );
        if (previous) {
            const start = previous[0]!.from;
            let offset = 0;
            curves.forEach((curve, j) => {
                if (
                    distance(curve.from, start) <
                    distance(curves[offset]!.from, start)
                ) {
                    offset = j;
                }
            });
            curves = [...curves.slice(offset), ...curves.slice(0, offset)];
        }
        previous = curves;
        return { ...shapes[i]!, contours: [fromCurves(curves)] };
    });
};

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
