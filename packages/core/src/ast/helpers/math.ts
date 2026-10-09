// calc / arithmetic and the comparison / clamping math functions.
import type { CalcNode, ClampNode, MinMaxNode, NumericValue } from "../nodes";

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
