// The ripple's contract, shared by every binding: the props Root takes for itself and how they map
// onto the selection and pureform's ripple machine. Root is the layer the ripples draw in, placed
// inside a positioned surface; each press on the surface grows a ripple element there, classed
// with the preset's `ripple` slot. The ripple machine runs `ripple()` from `@pureform/js-effects`.

import type {
    PartName,
    rippleAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";

/** The ripple's parts: `"root" | "ripple"`. `ripple` is never rendered by the binding: it's the
 *  class each ripple element takes. */
export type RipplePart = PartName<typeof rippleAnatomy>;

/** The ripple's instance tokens; it has no variant groups. */
export interface RippleVariantProps {
    readonly tokens?: InstanceTokens<"ripple"> | undefined;
}

/** What Root passes to the ripple machine. */
export interface RippleBehaviorProps {
    /** No ripples, for example while the surface is disabled. A disabled form control is skipped
     *  without this. */
    readonly disabled?: boolean | undefined;
    /** How the ripple is drawn: Material's ink well, or the newer sparkle. @default "ink-well" */
    readonly effect?: "ink-well" | "ink-sparkle" | undefined;
    /** Always grow from the center, as icon buttons do. */
    readonly centered?: boolean | undefined;
    /** Let an ancestor surface ripple for the same press too. */
    readonly allowPropagation?: boolean | undefined;
    /** The layer's id, also the machine's.
     *  @control none */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface RippleRootOwnProps
    extends RippleVariantProps, RippleBehaviorProps {
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<RipplePart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<RipplePart> | undefined;
}

/** The keys of `RippleRootOwnProps`, which Root keeps off its element. */
export const RIPPLE_ROOT_PROPS = [
    "tokens",
    "disabled",
    "effect",
    "centered",
    "allowPropagation",
    "id",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof RippleRootOwnProps)[];

/** The registry selection from Root's props. */
export const rippleSelection = (
    props: RippleVariantProps,
): Selection<"ripple"> => ({ tokens: props.tokens });

/** The ripple machine's props from Root's, besides `reducedMotion` (the binding's) and
 *  `rippleClass` (the `ripple` slot's classes). Its timing is the layer's transition, which the
 *  ripple's tokens set. */
export const rippleMachineProps = (props: RippleBehaviorProps) => ({
    disabled: props.disabled,
    variant: props.effect,
    centered: props.centered,
    allowPropagation: props.allowPropagation,
    ids: { layer: props.id },
});
