// Custom-utility argument placeholder and unit stamping.
import type { NumericValue, Unit, UtilityArgNode } from "../nodes";
import { mul } from "./math";
import { numeric } from "./scalar";

/** The call-site value inside a `DynamicUtilityDef` template. A bare `arg()` is the whole
 *  single argument; `arg("x")` or `arg(0)` picks a named or positional member of an object-
 *  or array-valued `apply`. It composes in arithmetic, for example `mul(arg(), px(4))`. */
export const arg = (key?: string | number): UtilityArgNode => ({
    type: "utilityArg",
    ...(key !== undefined ? { key } : {}),
});

/** Stamp a unit onto a unitless numeric (for example a utility arg): `withUnit(arg(), "px")`.
 *  Lowers through `× 1<unit>`; the adapter constant-folds a literal (`unitless(2)` becomes
 *  `2px`) and keeps it symbolic for a ref or arg. Precondition, not checkable by TypeScript
 *  through a ref: the input is unitless, so do not wrap an already-dimensioned value. */
export const withUnit = (n: NumericValue, unit: Unit): NumericValue =>
    mul(n, numeric(1, unit));
