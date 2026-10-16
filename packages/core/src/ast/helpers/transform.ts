// Transforms.
import type { NumericValue, TransformNode, TransformOp } from "../nodes";

export const transform = (...ops: TransformOp[]): TransformNode => ({
    type: "transform",
    ops,
});

const op = (fn: TransformOp["fn"], ...args: NumericValue[]): TransformOp => ({
    fn,
    args,
});

export const translate = (x: NumericValue, y: NumericValue) =>
    op("translate", x, y);
export const translateX = (x: NumericValue) => op("translateX", x);
export const translateY = (y: NumericValue) => op("translateY", y);
export const scale = (s: NumericValue) => op("scale", s);
export const scaleX = (s: NumericValue) => op("scaleX", s);
export const scaleY = (s: NumericValue) => op("scaleY", s);
/** `a` carries an angle unit: deg, turn, or rad. */
export const rotate = (a: NumericValue) => op("rotate", a);
