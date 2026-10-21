// The loading indicator's contract, shared by every binding: a `role="progressbar"` root with no
// value (the wait is too short to measure), around a container and the morphing indicator. It
// has no machine: the preset animates it.

import type {
    loadingIndicatorAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The loading indicator's parts: `"root" | "container" | "indicator"`. */
export type LoadingIndicatorPart = PartName<typeof loadingIndicatorAnatomy>;

/** The loading indicator's variant groups and instance tokens. */
export interface LoadingIndicatorVariantProps {
    /** `contained` draws it on a round container. @default "uncontained" */
    readonly variant?: VariantProp<"loadingIndicator", "variant">;
    readonly color?: VariantProp<"loadingIndicator", "color">;
    readonly tokens?: InstanceTokens<"loadingIndicator"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface LoadingIndicatorRootOwnProps extends LoadingIndicatorVariantProps {
    /** A prefix for every part's test id, or ids by part. */
    readonly testId?: TestIdOverride<LoadingIndicatorPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<LoadingIndicatorPart> | undefined;
}

/** The keys of `LoadingIndicatorRootOwnProps`, which Root keeps off its element. */
export const LOADING_INDICATOR_ROOT_PROPS = [
    "variant",
    "color",
    "tokens",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof LoadingIndicatorRootOwnProps)[];

/** The registry selection from the loading indicator's props. */
export const loadingIndicatorSelection = (
    props: LoadingIndicatorVariantProps,
): Selection<"loadingIndicator"> => ({
    variant: props.variant,
    color: props.color,
    tokens: props.tokens,
});

/** Root's element props: a progress bar with no value, which ARIA reads as an unknown amount.
 *  Name it with `aria-label`. */
export const loadingIndicatorRootProps = () => ({
    role: "progressbar" as const,
});
