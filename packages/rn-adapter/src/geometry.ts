// Shapes and gradients at a box's size, as SVG draws them. A selected drawing keeps the lengths
// that mix pixels and percentages until the box is laid out; these place them as CSS would.

import type { GradientValue, ShapePoint, ShapeValue, Value } from "./values";
import { colorWith, pixels } from "./values";

export interface Box {
    width: number;
    height: number;
}

const round = (n: number) => Math.round(n * 1000) / 1000 + 0;

/** A shape's points in a box of the given size, in order: each contour's start, then each
 *  segment's control points and end. Percentages of x are of the width, and of y of the
 *  height, as in CSS's `shape()`. Shapes of one structure, as a morph's are, give lists to
 *  interpolate. */
export const shapeCoordinates = (shape: ShapeValue, box: Box): number[] => {
    const out: number[] = [];
    const at = ([x, y]: ShapePoint) =>
        out.push(pixels(x, box.width), pixels(y, box.height));
    for (const contour of shape.contours) {
        at(contour.from);
        for (const segment of contour.segments) {
            if (segment.op === "curve") {
                at(segment.c1);
                at(segment.c2);
            }
            at(segment.to);
        }
    }
    return out;
};

/** SVG path data for a shape's structure at the given points, from `shapeCoordinates`. */
export const pathAt = (
    shape: ShapeValue,
    coordinates: readonly number[],
): string => {
    let i = 0;
    const at = () => `${round(coordinates[i++]!)} ${round(coordinates[i++]!)}`;
    return shape.contours
        .map((contour) => {
            const start = `M ${at()}`;
            const rest = contour.segments.map((segment) =>
                segment.op === "line"
                    ? `L ${at()}`
                    : `C ${at()} ${at()} ${at()}`,
            );
            return `${start} ${rest.join(" ")} Z`;
        })
        .join(" ");
};

/** A shape's SVG path data in a box of the given size. */
export const shapePath = (shape: ShapeValue, box: Box): string =>
    pathAt(shape, shapeCoordinates(shape, box));

export interface GradientStop {
    /** From 0 to 1 along the gradient. */
    offset: number;
    color: string;
}

/** A gradient placed in a box: a linear one along a line in the box's pixels, and a radial one
 *  as an ellipse centered in it, in fractions of the box, as SVG's bounding box units take. */
export type PlacedGradient =
    | {
          kind: "linear";
          x1: number;
          y1: number;
          x2: number;
          y2: number;
          stops: GradientStop[];
      }
    | { kind: "radial"; r: number; stops: GradientStop[] };

const degrees = (angle: Value | undefined): number => {
    if (angle === undefined) return 180;
    if (typeof angle === "number") return angle;
    const n = Number.parseFloat(angle as string);
    const unit = String(angle).replace(/^[-\d.e+]+/, "");
    return unit === "turn"
        ? n * 360
        : unit === "rad"
          ? (n * 180) / Math.PI
          : unit === "grad"
            ? n * 0.9
            : n;
};

// Each stop's offset: a missing first or last at the ends, missing ones between spread evenly
// between their neighbors, and none before the one ahead of it, as CSS places them.
const offsets = (
    stops: GradientValue["stops"],
    length: number,
    current: string,
): GradientStop[] => {
    const at: (number | undefined)[] = stops.map((stop) =>
        stop.at === undefined ? undefined : pixels(stop.at, length) / length,
    );
    if (at[0] === undefined) at[0] = 0;
    if (at[at.length - 1] === undefined) at[at.length - 1] = 1;
    let last = 0;
    for (let i = 0; i < at.length; i++) {
        if (at[i] !== undefined) {
            at[i] = Math.max(at[i]!, last);
            last = at[i]!;
            continue;
        }
        let next = i;
        while (at[next] === undefined) next++;
        const step = (at[next]! - last) / (next - i + 1);
        for (let j = i; j < next; j++) at[j] = last + step * (j - i + 1);
        i = next - 1;
    }
    return stops.map((stop, i) => ({
        offset: round(Math.min(Math.max(at[i]!, 0), 1)),
        color: colorWith(stop.color, current),
    }));
};

/** A gradient's geometry in a box. A radial gradient is an ellipse, CSS's default shape, and
 *  its stops' lengths run along its horizontal radius. `current` is the color a stop that
 *  mixes with the current color takes. */
export const placeGradient = (
    gradient: GradientValue,
    box: Box,
    current = "rgb(0, 0, 0)",
): PlacedGradient => {
    const { width, height } = box;
    if (gradient.kind === "radial") {
        // An ellipse through the corners keeps the sides' proportions, scaled by √2.
        const corner =
            gradient.extent === "closest-corner" ||
            gradient.extent === "farthest-corner" ||
            gradient.extent === undefined;
        const r = corner ? Math.SQRT1_2 : 0.5;
        return {
            kind: "radial",
            r: round(r),
            stops: offsets(gradient.stops, Math.max(width * r, 1e-6), current),
        };
    }
    // CSS's gradient line: through the center at the angle (0 points up), long enough that
    // the corners meet the ends' perpendiculars.
    const radians = (degrees(gradient.angle) * Math.PI) / 180;
    const [dx, dy] = [Math.sin(radians), -Math.cos(radians)];
    const length = Math.abs(width * dx) + Math.abs(height * dy);
    const [cx, cy] = [width / 2, height / 2];
    return {
        kind: "linear",
        x1: round(cx - (dx * length) / 2),
        y1: round(cy - (dy * length) / 2),
        x2: round(cx + (dx * length) / 2),
        y2: round(cy + (dy * length) / 2),
        stops: offsets(gradient.stops, Math.max(length, 1e-6), current),
    };
};

// Split a list on its top-level commas, keeping `rgba(a, b, c, d)` whole.
const layers = (list: string): string[] => {
    const out: string[] = [];
    let depth = 0;
    let current = "";
    for (const char of list) {
        if (char === "(") depth++;
        if (char === ")") depth--;
        if (char === "," && depth === 0) {
            out.push(current.trim());
            current = "";
        } else current += char;
    }
    if (current.trim()) out.push(current.trim());
    return out;
};

/** A box shadow as CSS `drop-shadow()` filters, which follow what's drawn: each outer layer's
 *  offsets, blur, and color. Spreads and inset layers have no drop shadow, and drop. */
export const dropShadows = (boxShadow: string): string =>
    layers(boxShadow)
        .filter((layer) => !layer.startsWith("inset"))
        .map((layer) => {
            const color =
                /(rgba?|hsla?|oklch|oklab|lab|lch|color)\(.*\)$|#\w+$|[a-z]+$/i.exec(
                    layer,
                )?.[0] ?? "";
            const [x = "0", y = "0", blur = "0"] = layer
                .slice(0, layer.length - color.length)
                .trim()
                .split(/\s+/);
            return `drop-shadow(${x} ${y} ${blur} ${color})`.replace(
                / \)$/,
                ")",
            );
        })
        .join(" ");
