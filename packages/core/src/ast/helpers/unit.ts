// Unit sugar over `scalar.numeric`.
import type { NumericScalarNode } from "../nodes";
import { numeric } from "./scalar";

export const px = (value: number): NumericScalarNode => numeric(value, "px");
export const rem = (value: number): NumericScalarNode => numeric(value, "rem");
/** Font-relative length: web verbatim; non-web resolves against the in-scope font-size. */
export const em = (value: number): NumericScalarNode => numeric(value, "em");
export const pct = (value: number): NumericScalarNode => numeric(value, "%");
/** Explicitly unitless number (fontWeight, lineHeight, zIndex, opacity). */
export const unitless = (value: number): NumericScalarNode =>
    numeric(value, "none");
