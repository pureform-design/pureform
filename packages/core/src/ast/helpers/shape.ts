// Shapes: geometry in a unit square, and fitting it to an element's box.
//
// A shape is drawn once as plain numbers, in a 1 by 1 square, and fitted to a box when it is
// used, so the same drawing can stretch with the box, keep its aspect ratio, or keep its
// features at a fixed size. The geometry is plain data with no units or target syntax, so any
// adapter can draw it.
import type {
    NumericValue,
    ShapeContour,
    ShapeNode,
    ShapePoint,
    ShapeSegment,
} from "../nodes";
import { add, min, mul, sub } from "./math";
import { pct, unitless } from "./unit";

/** A point in a shape's unit square. */
export type Vec = readonly [number, number];

/** A contour in unit-square coordinates. */
export interface UnitContour {
    from: Vec;
    segments: (
        | { op: "line"; to: Vec }
        | { op: "curve"; to: Vec; c1: Vec; c2: Vec }
    )[];
}

/** How a shape fits its box.
 *  - `stretch`: the unit square becomes the box, so the shape follows the box's aspect ratio.
 *  - `contain`: the shape keeps its aspect ratio at `size`, centered in the box.
 *  - `fixed`: points near an edge stay their distance from it at `size`, and the middle
 *    stretches, like a 9-slice, so corners and features keep their size on a wide box. A box
 *    smaller than `size` stretches instead, so the shape never folds over itself. */
export type ShapeFit =
    | { fit: "stretch" }
    | { fit: "contain"; size: NumericValue }
    | { fit: "fixed"; size: NumericValue };

/** A shape: contours in a unit square, and how it fits its box. */
export interface ShapeGeometry {
    contours: UnitContour[];
    fit: ShapeFit;
}

/** A shape from contours in a unit square. It stretches with its box unless `fit` says
 *  otherwise. */
export const defineShape = (
    contours: UnitContour | UnitContour[],
    fit: ShapeFit = { fit: "stretch" },
): ShapeGeometry => ({
    contours: Array.isArray(contours) ? contours : [contours],
    fit,
});

/** The same shape, fitted another way. */
export const fitted = (shape: ShapeGeometry, fit: ShapeFit): ShapeGeometry => ({
    ...shape,
    fit,
});

/* Polygons with rounded corners, the model Material's shapes are drawn in. */

/** A polygon corner: where it is, and the radius to round it by (0 for a sharp corner). */
export interface Vertex {
    at: Vec;
    rounding?: number | undefined;
}

const minus = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const plus = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const times = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k];
const length = (a: Vec) => Math.hypot(a[0], a[1]);
const unit = (a: Vec): Vec => times(a, 1 / (length(a) || 1));

/** A closed polygon through the vertices, each corner rounded by a circular arc of its
 *  radius. Where two roundings would overlap on an edge, both shrink to fit it. */
export const roundedPolygon = (vertices: Vertex[]): UnitContour => {
    const count = vertices.length;
    const at = (i: number) => vertices[(i + count) % count]!.at;
    const corners = vertices.map(({ at: point, rounding = 0 }, i) => {
        const toPrev = unit(minus(at(i - 1), point));
        const toNext = unit(minus(at(i + 1), point));
        const dot = toPrev[0] * toNext[0] + toPrev[1] * toNext[1];
        const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
        const cut =
            rounding > 0 && angle > 1e-6 && angle < Math.PI - 1e-6
                ? rounding / Math.tan(angle / 2)
                : 0;
        return { point, toPrev, toNext, angle, cut, scale: 1 };
    });
    // Shrink the roundings on an edge too short for both.
    corners.forEach((corner, i) => {
        const next = corners[(i + 1) % count]!;
        const edge = length(minus(next.point, corner.point));
        const total = corner.cut + next.cut;
        if (total > edge) {
            const scale = edge / total;
            corner.scale = Math.min(corner.scale, scale);
            next.scale = Math.min(next.scale, scale);
        }
    });
    const rounded = corners.map(
        ({ point, toPrev, toNext, angle, cut, scale }) => {
            const c = cut * scale;
            const start = plus(point, times(toPrev, c));
            const end = plus(point, times(toNext, c));
            // A circular arc as a cubic: each handle runs from the tangent point toward the corner.
            const radius = c * Math.tan(angle / 2);
            const handle =
                (4 / 3) * Math.tan((Math.PI - angle) / 4) * radius || 0;
            return {
                start,
                end,
                c1: minus(start, times(toPrev, handle)),
                c2: minus(end, times(toNext, handle)),
                sharp: c === 0,
            };
        },
    );
    const segments: UnitContour["segments"] = [];
    for (let i = 1; i <= count; i++) {
        const corner = rounded[i % count]!;
        segments.push({ op: "line", to: corner.start });
        if (!corner.sharp) {
            segments.push({
                op: "curve",
                to: corner.end,
                c1: corner.c1,
                c2: corner.c2,
            });
        }
    }
    return { from: rounded[0]!.end, segments };
};

const around = (count: number, radius: number, offset = 0): Vec[] =>
    Array.from({ length: count }, (_, i) => {
        const angle = ((i + offset) * 2 * Math.PI) / count;
        return [radius * Math.cos(angle), radius * Math.sin(angle)];
    });

/** A regular polygon of radius 1 around the origin, its first corner at 3 o'clock, each
 *  corner rounded by `rounding` (or per corner). */
export const regularPolygon = (
    count: number,
    rounding: number | number[] = 0,
): UnitContour =>
    roundedPolygon(
        around(count, 1).map((at, i) => ({
            at,
            rounding: Array.isArray(rounding) ? rounding[i] : rounding,
        })),
    );

/** A star with `count` points of radius 1 around the origin, its valleys at `inner`. */
export const star = (
    count: number,
    inner: number,
    rounding = 0,
    innerRounding = rounding,
): UnitContour => {
    const outer = around(count, 1);
    const valleys = around(count, inner, 0.5);
    return roundedPolygon(
        outer.flatMap((at, i) => [
            { at, rounding },
            { at: valleys[i]!, rounding: innerRounding },
        ]),
    );
};

/** A circle of radius 1 around the origin: a polygon whose corners round into one arc. */
export const circle = (count = 8): UnitContour => {
    const radius = 1 / Math.cos(Math.PI / count);
    return roundedPolygon(
        around(count, radius).map((at) => ({ at, rounding: 1 })),
    );
};

/** A rectangle centered on the origin, corners from bottom right clockwise in screen terms:
 *  bottom right, bottom left, top left, top right. */
export const rectangle = (
    width: number,
    height: number,
    rounding: number | [number, number, number, number] = 0,
): UnitContour => {
    const [x, y] = [width / 2, height / 2];
    const corners: Vec[] = [
        [x, y],
        [-x, y],
        [-x, -y],
        [x, -y],
    ];
    return roundedPolygon(
        corners.map((at, i) => ({
            at,
            rounding: Array.isArray(rounding) ? rounding[i] : rounding,
        })),
    );
};

/* Transforms. */

const mapContour = (
    contour: UnitContour,
    map: (point: Vec) => Vec,
): UnitContour => ({
    from: map(contour.from),
    segments: contour.segments.map((segment) =>
        segment.op === "line"
            ? { op: "line", to: map(segment.to) }
            : {
                  op: "curve",
                  to: map(segment.to),
                  c1: map(segment.c1),
                  c2: map(segment.c2),
              },
    ),
});

/** Rotate a contour around the origin, clockwise on screen. */
export const rotateContour = (
    contour: UnitContour,
    degrees: number,
): UnitContour => {
    const a = (degrees * Math.PI) / 180;
    const [cos, sin] = [Math.cos(a), Math.sin(a)];
    return mapContour(contour, ([x, y]) => [
        x * cos - y * sin,
        x * sin + y * cos,
    ]);
};

/** Scale a contour from the origin. */
export const scaleContour = (
    contour: UnitContour,
    x: number,
    y = x,
): UnitContour => mapContour(contour, ([px, py]) => [px * x, py * y]);

const cubicAt = (p0: Vec, c1: Vec, c2: Vec, p1: Vec, t: number): Vec => {
    const u = 1 - t;
    return [0, 1].map(
        (k) =>
            u * u * u * p0[k]! +
            3 * u * u * t * c1[k]! +
            3 * u * t * t * c2[k]! +
            t * t * t * p1[k]!,
    ) as unknown as Vec;
};

/** Scale and move contours to fit the unit square, centered, keeping their aspect ratio. */
export const normalize = (contours: UnitContour[]): UnitContour[] => {
    const points: Vec[] = [];
    for (const contour of contours) {
        let last = contour.from;
        points.push(last);
        for (const segment of contour.segments) {
            if (segment.op === "curve") {
                for (let t = 0.05; t < 1; t += 0.05) {
                    points.push(
                        cubicAt(last, segment.c1, segment.c2, segment.to, t),
                    );
                }
            }
            points.push(segment.to);
            last = segment.to;
        }
    }
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const [left, right, top, bottom] = [
        Math.min(...xs),
        Math.max(...xs),
        Math.min(...ys),
        Math.max(...ys),
    ];
    const factor = 1 / Math.max(right - left, bottom - top);
    const [dx, dy] = [
        (1 - (right - left) * factor) / 2,
        (1 - (bottom - top) * factor) / 2,
    ];
    return contours.map((contour) =>
        mapContour(contour, ([x, y]) => [
            (x - left) * factor + dx,
            (y - top) * factor + dy,
        ]),
    );
};

/* Fitting to a box. */

const round = (n: number) => Math.round(n * 1000) / 1000;

/** `value` times `k`, folded when `value` is a plain number. */
const scaled = (value: NumericValue, k: number): NumericValue =>
    value.type === "numeric"
        ? { ...value, value: round(value.value * k) }
        : mul(value, unitless(round(k)));

/** One coordinate, `u` of the way across an axis of the box. */
const coordinate = (u: number, fit: ShapeFit): NumericValue => {
    if (fit.fit === "stretch" || u === 0.5) {
        return pct(round(u * 100));
    }
    if (fit.fit === "contain") {
        return add(pct(50), scaled(fit.size, u - 0.5));
    }
    // fixed: measured from the nearer edge, at most the share it has of a small box.
    if (u <= 0.5) {
        return min(scaled(fit.size, u), pct(round(u * 100)));
    }
    return sub(
        pct(100),
        min(scaled(fit.size, 1 - u), pct(round((1 - u) * 100))),
    );
};

const fitPoint = (
    [x, y]: Vec,
    fit: ShapeFit,
    inset?: NumericValue,
): ShapePoint => {
    const axis = (u: number) => {
        const value = coordinate(u, fit);
        // Move a point in toward the middle, the whole inset at the edges and none at the
        // center, so a ring of this width follows the outline.
        return inset && u !== 0.5
            ? add(value, scaled(inset, 1 - 2 * u))
            : value;
    };
    return [axis(x), axis(y)];
};

const fitContour = (
    contour: UnitContour,
    fit: ShapeFit,
    inset?: NumericValue,
): ShapeContour => ({
    from: fitPoint(contour.from, fit, inset),
    segments: contour.segments.map((segment): ShapeSegment =>
        segment.op === "line"
            ? { op: "line", to: fitPoint(segment.to, fit, inset) }
            : {
                  op: "curve",
                  to: fitPoint(segment.to, fit, inset),
                  c1: fitPoint(segment.c1, fit, inset),
                  c2: fitPoint(segment.c2, fit, inset),
              },
    ),
});

/** The shape as a clip for its box. */
export const clipShape = (shape: ShapeGeometry): ShapeNode => ({
    type: "shape",
    contours: shape.contours.map((contour) => fitContour(contour, shape.fit)),
});

/** A ring along the shape's edge, `width` wide, as a clip: fill a layer with the outline
 *  color and clip it to this to stroke the shape. The inner edge moves each point in by
 *  `width` at the box's edges and less toward its middle, so the ring is exact on straight
 *  edges and close on curves. */
export const outlineShape = (
    shape: ShapeGeometry,
    width: NumericValue,
): ShapeNode => ({
    type: "shape",
    fillRule: "evenodd",
    contours: shape.contours.flatMap((contour) => [
        fitContour(contour, shape.fit),
        fitContour(contour, shape.fit, width),
    ]),
});
