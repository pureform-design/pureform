// How a component's props name its variant groups. A prop's type follows the app's registry once
// generated declarations augment it, and takes any variant value while nothing is registered.

import type { ComponentRef, Variants } from "@pureform/styling";

/** The values one variant group takes, as a component prop: `VariantProp<"button", "variant">`
 *  is `"filled" | "tonal" | …` in an app whose registry declares them, and any value otherwise.
 *  A group the registry doesn't declare takes only `undefined`. */
export type VariantProp<
    C extends ComponentRef,
    G extends string,
> = G extends keyof Variants<C>
    ? Exclude<Variants<C>[G], object> | undefined
    : undefined;
