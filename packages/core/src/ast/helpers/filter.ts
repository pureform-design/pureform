// Filters.
import type { FilterNode, NumericValue } from "../nodes";

type Fn = FilterNode["fns"][number];

export const filter = (...fns: Fn[]): FilterNode => ({ type: "filter", fns });

const fn =
    (name: Fn["fn"]) =>
    (...args: NumericValue[]): Fn => ({ fn: name, args });

export const blur = fn("blur");
export const brightness = fn("brightness");
export const saturate = fn("saturate");
