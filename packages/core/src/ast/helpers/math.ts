// calc / arithmetic and the comparison / clamping math functions.
import type {
    CalcNode,
    ClampNode,
    MinMaxNode,
    NumericValue,
    TrigNode,
} from "../nodes";

/** Generic infix calc, for example `calc("-", pct(100), px(16))`. Nest for mixed operators
 *  or precedence: `div(sub(pct(100), px(16)), unitless(2))`. */
export const calc = (
    op: CalcNode["op"],
    ...operands: NumericValue[]
): CalcNode => ({ type: "calc", op, operands });
export const add = (...operands: NumericValue[]) => calc("+", ...operands);
export const sub = (...operands: NumericValue[]) => calc("-", ...operands);
export const mul = (...operands: NumericValue[]) => calc("*", ...operands);
export const div = (...operands: NumericValue[]) => calc("/", ...operands);

/** CSS `min()`: the smallest resolved operand. */
export const min = (...args: NumericValue[]): MinMaxNode => ({
    type: "mathFn",
    fn: "min",
    args,
});
/** CSS `max()`: the largest resolved operand. */
export const max = (...args: NumericValue[]): MinMaxNode => ({
    type: "mathFn",
    fn: "max",
    args,
});
/** CSS `clamp(lower, preferred, upper)`: a fluid or bounded value. */
export const clamp = (
    lower: NumericValue,
    preferred: NumericValue,
    upper: NumericValue,
): ClampNode => ({
    type: "mathFn",
    fn: "clamp",
    args: [lower, preferred, upper],
});

/** CSS `sin()`: the sine of an angle, a number. */
export const sin = (angle: NumericValue): TrigNode => ({
    type: "mathFn",
    fn: "sin",
    args: [angle],
});
/** CSS `tan()`: the tangent of an angle, a number. */
export const tan = (angle: NumericValue): TrigNode => ({
    type: "mathFn",
    fn: "tan",
    args: [angle],
});
/** CSS `asin()`: the angle whose sine is a number. */
export const asin = (n: NumericValue): TrigNode => ({
    type: "mathFn",
    fn: "asin",
    args: [n],
});
/** CSS `atan2(y, x)`: the angle from the x axis to the point (x, y), of one type. */
export const atan2 = (y: NumericValue, x: NumericValue): TrigNode => ({
    type: "mathFn",
    fn: "atan2",
    args: [y, x],
});
/** `a / b` as a number for two values of one type (`b` positive), which `calc()` can't divide
 *  everywhere: `tan(atan2(a, b))`. */
export const ratio = (a: NumericValue, b: NumericValue): TrigNode =>
    tan(atan2(a, b));
