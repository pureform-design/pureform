// A list keyed by a property or function, whose children get accessors for the item and its
// index, as `@solid-primitives/keyed`'s `Key`, which @zag-js/solid 1.46.0 (MIT) re-exports.
// Solid 2's `For` does this itself when `keyed` is a function.

import type { JSX } from "@solidjs/web";
import { type Accessor, For, createComponent } from "solid-js";

export function Key<T>(props: {
    each?: readonly T[] | null | false;
    by: ((v: T) => unknown) | keyof T;
    fallback?: JSX.Element;
    children: (v: Accessor<T>, i: Accessor<number>) => JSX.Element;
}): JSX.Element {
    const { by } = props;
    const keyed = typeof by === "function" ? by : (v: T) => v[by];
    return createComponent(For, {
        get each() {
            return props.each;
        },
        keyed,
        get fallback() {
            return props.fallback;
        },
        children: (item: Accessor<T>, index: Accessor<number>) =>
            props.children(item, index),
    } as never);
}
