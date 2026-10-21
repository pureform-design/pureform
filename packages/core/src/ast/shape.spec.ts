import { describe, expect, it } from "vitest";

import {
    circle,
    clipShape,
    defineShape,
    morph,
    morphSequence,
    normalize,
    outlineShape,
    px,
    rectangle,
    roundedPolygon,
    star,
} from "./index";
import type { UnitContour, Vec } from "./index";

const ends = (contour: UnitContour): Vec[] => [
    contour.from,
    ...contour.segments.map((segment) => segment.to),
];

const bounds = (contours: UnitContour[]) => {
    const points = contours.flatMap(ends);
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
};

describe("roundedPolygon", () => {
    it("draws sharp corners as lines", () => {
        const square = roundedPolygon([
            { at: [0, 0] },
            { at: [1, 0] },
            { at: [1, 1] },
            { at: [0, 1] },
        ]);
        expect(square.segments.every((s) => s.op === "line")).toBe(true);
        expect(ends(square)).toContainEqual([1, 1]);
    });

    it("rounds a corner with a curve tangent to both edges", () => {
        const square = rectangle(2, 2, 0.5);
        const curves = square.segments.filter((s) => s.op === "curve");
        expect(curves).toHaveLength(4);
        // The bottom right corner's arc runs from 0.5 up its right edge to 0.5 along the bottom.
        expect(square.from[0]).toBeCloseTo(0.5);
        expect(square.from[1]).toBe(1);
    });

    it("shrinks roundings that don't fit their edge", () => {
        const square = rectangle(2, 2, 5);
        for (const point of ends(square)) {
            expect(Math.abs(point[0]) <= 1 && Math.abs(point[1]) <= 1).toBe(
                true,
            );
        }
        expect(ends(square)).toContainEqual([0, 1]);
    });
});

describe("normalize", () => {
    it("fits a shape to the unit square, centered", () => {
        const [left, right, top, bottom] = bounds(
            normalize([star(5, 0.5, 0.1)]),
        );
        expect(Math.min(right! - left!, bottom! - top!)).toBeLessThanOrEqual(1);
        expect(Math.max(right! - left!, bottom! - top!)).toBeCloseTo(1, 1);
        expect((left! + right!) / 2).toBeCloseTo(0.5, 1);
    });

    it("draws a circle of diameter 1 around the middle", () => {
        for (const [x, y] of ends(normalize([circle()])[0]!)) {
            expect(Math.hypot(x - 0.5, y - 0.5)).toBeCloseTo(0.5, 2);
        }
    });
});

describe("fitting", () => {
    const square = defineShape({
        from: [0, 0],
        segments: [
            { op: "line", to: [0.25, 0] },
            { op: "line", to: [1, 1] },
        ],
    });

    it("stretches with the box by default", () => {
        const [contour] = clipShape(square).contours;
        expect(contour?.segments[0]?.to).toEqual([
            { type: "numeric", value: 25, unit: "%" },
            { type: "numeric", value: 0, unit: "%" },
        ]);
    });

    it("keeps features their distance from the nearer edge when fixed", () => {
        const fixed = clipShape({
            ...square,
            fit: { fit: "fixed", size: px(40) },
        });
        const [x] = fixed.contours[0]!.segments[0]!.to;
        expect(x).toMatchObject({ type: "mathFn", fn: "min" });
        expect(JSON.stringify(x)).toContain('"value":10,"unit":"px"');
        const [farX] = fixed.contours[0]!.segments[1]!.to;
        expect(farX).toMatchObject({ type: "calc", op: "-" });
    });

    it("strokes an outline as an even-odd ring", () => {
        const ring = outlineShape(square, px(2));
        expect(ring.fillRule).toBe("evenodd");
        expect(ring.contours).toHaveLength(2);
        // The inner contour's top left corner moves in by the width.
        expect(JSON.stringify(ring.contours[1]?.from)).toContain(
            '"value":2,"unit":"px"',
        );
    });
});

describe("morph", () => {
    const square = defineShape(rectangle(1, 1));
    const star5 = defineShape(normalize([star(5, 0.5, 0.05)]));

    it("redraws both shapes as the same number of curves", () => {
        const { from, to } = morph(square, star5);
        const [a, b] = [from.contours[0]!, to.contours[0]!];
        expect(a.segments.length).toBe(b.segments.length);
        expect(a.segments.every((s) => s.op === "curve")).toBe(true);
        expect(b.segments.every((s) => s.op === "curve")).toBe(true);
    });

    it("is morphSequence of the two shapes", () => {
        const { from, to } = morph(square, star5);
        expect([from, to]).toEqual(morphSequence([square, star5]));
    });

    it("keeps each contour closed", () => {
        const { from, to } = morph(square, star5);
        for (const contour of [from.contours[0]!, to.contours[0]!]) {
            const last = contour.segments.at(-1)!.to;
            expect(last[0]).toBeCloseTo(contour.from[0]);
            expect(last[1]).toBeCloseTo(contour.from[1]);
        }
    });

    it("starts the target at the point closest to the source's start", () => {
        const shifted = defineShape(rectangle(1, 1));
        const { from, to } = morph(square, shifted);
        expect(to.contours[0]!.from).toEqual(from.contours[0]!.from);
    });

    it("runs both the same direction", () => {
        const backwards = defineShape({
            ...rectangle(1, 1),
            segments: [...rectangle(1, 1).segments].reverse(),
        });
        const { from, to } = morph(square, backwards);
        const signed = (c: UnitContour) =>
            [c.from, ...c.segments.map((s) => s.to)].reduce(
                (sum, p, i, all) => {
                    const q = all[(i + 1) % all.length]!;
                    return sum + p[0] * q[1] - q[0] * p[1];
                },
                0,
            );
        expect(Math.sign(signed(to.contours[0]!))).toBe(
            Math.sign(signed(from.contours[0]!)),
        );
    });

    it("lowers to matching commands", () => {
        const { from, to } = morph(square, star5);
        const ops = (shape: typeof from) =>
            clipShape(shape).contours[0]!.segments.map((s) => s.op);
        expect(ops(to)).toEqual(ops(from));
    });
});
