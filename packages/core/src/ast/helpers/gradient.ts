// Gradients.
import type {
    ColorValue,
    GradientNode,
    GradientStop,
    NumericValue,
    RadialExtent,
} from "../nodes";

const grad = (
    kind: GradientNode["kind"],
    stops: GradientStop[],
    angle?: NumericValue,
): GradientNode => ({
    type: "gradient",
    kind,
    stops,
    ...(angle ? { angle } : {}),
});

export const linearGradient = (stops: GradientStop[], angle?: NumericValue) =>
    grad("linear", stops, angle);
/** A radial gradient. `extent` sets how far it reaches; for example `"closest-side"` ends it
 *  at the nearest edge of the box. */
export const radialGradient = (
    stops: GradientStop[],
    extent?: RadialExtent,
): GradientNode => ({
    ...grad("radial", stops),
    ...(extent ? { extent } : {}),
});
export const conicGradient = (stops: GradientStop[], angle?: NumericValue) =>
    grad("conic", stops, angle);

/** A gradient stop; `position` is an optional % or length. */
export const stop = (
    color: ColorValue,
    position?: NumericValue,
): GradientStop => ({
    color,
    ...(position ? { position } : {}),
});
