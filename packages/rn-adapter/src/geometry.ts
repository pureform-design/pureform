// Shapes and gradients at a box's size, as SVG draws them. A selected drawing keeps the lengths
// that mix pixels and percentages until the box is laid out; these place them as CSS would.

import { animatable, blend } from "./motion";
import type { ShapeKeyframes } from "./select";
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
    | { kind: "radial"; r: number; stops: GradientStop[] }
    | {
          kind: "conic";
          /** The starting angle, in degrees clockwise from the top. */
          from: number;
          stops: GradientStop[];
      };

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
    if (gradient.kind === "conic") {
        // Positions are angles, or percentages of a turn; their share of the turn places them.
        const turn = gradient.stops.map((stop) =>
            stop.at === undefined
                ? stop
                : {
                      ...stop,
                      at:
                          typeof stop.at === "string" && stop.at.endsWith("%")
                              ? stop.at
                              : `${(degrees(stop.at) / 360) * 100}%`,
                  },
        );
        return {
            kind: "conic",
            from: degrees(gradient.angle ?? 0),
            stops: offsets(turn, 1, current),
        };
    }
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

/** A gradient's color `t` of the way along it, blended between the stops around it as CSS
 *  blends them, and the end stops' beyond them. */
export const colorAt = (stops: readonly GradientStop[], t: number): string => {
    const after = stops.findIndex((stop) => stop.offset >= t);
    if (after <= 0) return stops[after === 0 ? 0 : stops.length - 1]!.color;
    const [a, b] = [stops[after - 1]!, stops[after]!];
    const span = b.offset - a.offset;
    return span <= 0
        ? b.color
        : String(
              blend(
                  animatable(a.color),
                  animatable(b.color),
                  (t - a.offset) / span,
              ),
          );
};

/** A conic gradient as wedges around the box's center, which SVG can draw: each a slice of
 *  the turn in the color at its middle, overlapping the next a little so no seam shows, and
 *  runs of one color merged into one wedge. */
export const conicWedges = (
    placed: Extract<PlacedGradient, { kind: "conic" }>,
    box: Box,
    steps = 360,
): { d: string; color: string }[] => {
    const [cx, cy] = [box.width / 2, box.height / 2];
    const reach = Math.hypot(box.width, box.height) / 2 + 1;
    const at = (degree: number) => {
        const a = (degree * Math.PI) / 180;
        return `${round(cx + reach * Math.sin(a))} ${round(cy - reach * Math.cos(a))}`;
    };
    const runs: { start: number; end: number; color: string }[] = [];
    for (let i = 0; i < steps; i++) {
        const color = colorAt(placed.stops, (i + 0.5) / steps);
        const last = runs.at(-1);
        if (last?.color === color) last.end = i + 1;
        else runs.push({ start: i, end: i + 1, color });
    }
    const step = 360 / steps;
    return runs.map(({ start, end, color }) => {
        const [a, b] = [
            placed.from + start * step - 0.5,
            placed.from + end * step + 0.5,
        ];
        // An arc's worth of points, so a wide run stays a wedge and not a triangle.
        const points = [];
        for (let degree = a; degree < b; degree += 30)
            points.push(`L ${at(degree)}`);
        return {
            d: `M ${round(cx)} ${round(cy)} ${points.join(" ")} L ${at(b)} Z`,
            color,
        };
    });
};

/** A keyframed shape animation's frames for a box: each frame's offset, its shape and its
 *  points, with the drawing's own shape at either end a frame leaves out, as CSS fills in a
 *  missing keyframe. `undefined` when the shapes are of different structures, which can't
 *  morph into each other. */
export const keyframeShapes = (
    keyframes: ShapeKeyframes,
    base: ShapeValue,
    box: Box,
):
    | { offset: number; shape: ShapeValue; points: number[]; d: string }[]
    | undefined => {
    const frames = [...keyframes.frames];
    if (frames[0]?.offset !== 0) frames.unshift({ offset: 0, shape: base });
    if (frames.at(-1)?.offset !== 1) frames.push({ offset: 1, shape: base });
    const all = frames.map((frame) => {
        const points = shapeCoordinates(frame.shape, box);
        return { ...frame, points, d: pathAt(frame.shape, points) };
    });
    const size = all[0]!.points.length;
    return all.every((frame) => frame.points.length === size) ? all : undefined;
};

/** A keyframe animation's direction as CSS writes it. */
export const cssDirection = (direction: ShapeKeyframes["direction"]) =>
    direction === "alternateReverse" ? "alternate-reverse" : direction;
