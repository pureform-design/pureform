// The scrim's contract, shared by every binding: the props Root takes for itself and how they map
// onto the selection. A scrim dims what sits behind a modal surface; it says nothing, so it's
// hidden from assistive technology.

import type { PartName, scrimAnatomy, TestIdOverride } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";

/** The scrim's parts: `"root"`. */
export type ScrimPart = PartName<typeof scrimAnatomy>;

/** The scrim's instance tokens; it has no variant groups. */
export interface ScrimVariantProps {
    readonly tokens?: InstanceTokens<"scrim"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface ScrimRootOwnProps extends ScrimVariantProps {
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<ScrimPart> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<ScrimPart> | undefined;
}

/** The keys of `ScrimRootOwnProps`, which Root keeps off its element. */
export const SCRIM_ROOT_PROPS = [
    "tokens",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof ScrimRootOwnProps)[];

/** The registry selection from Root's props. */
export const scrimSelection = (
    props: ScrimVariantProps,
): Selection<"scrim"> => ({ tokens: props.tokens });
