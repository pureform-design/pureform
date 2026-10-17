// The supporting text's contract, shared by every binding: the props Root takes for itself and how
// they map onto the selection. Supporting text is the helper or error line under a control; its
// `tone` colors it. Point the control's `aria-describedby` at it.

import type {
    PartName,
    supportingTextAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The supporting text's parts: `"root"`. */
export type SupportingTextPart = PartName<typeof supportingTextAnatomy>;

/** The supporting text's variant groups and instance tokens. */
export interface SupportingTextVariantProps {
    readonly tone?: VariantProp<"supportingText", "tone">;
    readonly tokens?: InstanceTokens<"supportingText"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SupportingTextRootOwnProps extends SupportingTextVariantProps {
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<SupportingTextPart> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<SupportingTextPart> | undefined;
}

/** The keys of `SupportingTextRootOwnProps`, which Root keeps off its element. */
export const SUPPORTING_TEXT_ROOT_PROPS = [
    "tone",
    "tokens",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof SupportingTextRootOwnProps)[];

/** The registry selection from Root's props. */
export const supportingTextSelection = (
    props: SupportingTextVariantProps,
): Selection<"supportingText"> => ({ tone: props.tone, tokens: props.tokens });
