// Filters.
import type { FilterNode, NumericValue, ShadowLayer } from "../nodes";

type Fn = FilterNode["fns"][number];
type ArgsFn = Extract<Fn, { args: NumericValue[] }>;

export const filter = (...fns: Fn[]): FilterNode => ({ type: "filter", fns });

const fn =
    (name: ArgsFn["fn"]) =>
    (...args: NumericValue[]): Fn => ({ fn: name, args });

export const blur = fn("blur");
export const brightness = fn("brightness");
export const saturate = fn("saturate");

/** A shadow cast from what the element draws, following its shape. A layer's spread and inset
 *  have no drop-shadow form and are dropped. */
export const dropShadow = ({ x, y, blur, color }: ShadowLayer): Fn => ({
    fn: "dropShadow",
    layer: { x, y, blur, color },
});
