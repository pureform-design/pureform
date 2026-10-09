// Gradients.
import type {
    ColorValue,
    GradientNode,
    GradientStop,
    NumericValue,
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
export const radialGradient = (stops: GradientStop[]) => grad("radial", stops);
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
