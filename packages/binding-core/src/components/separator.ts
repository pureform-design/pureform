// The separator's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection, and Root's element props. A separator is Material's divider: an `<hr>`, or
// any element with `role="separator"`.

import type {
    PartName,
    separatorAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The separator's parts: `"root"`. */
export type SeparatorPart = PartName<typeof separatorAnatomy>;

/** The separator's variant groups and instance tokens. */
export interface SeparatorVariantProps {
    readonly inset?: VariantProp<"separator", "inset">;
    readonly tokens?: InstanceTokens<"separator"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SeparatorRootOwnProps extends SeparatorVariantProps {
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<SeparatorPart> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<SeparatorPart> | undefined;
}

/** The keys of `SeparatorRootOwnProps`, which Root keeps off its element. */
export const SEPARATOR_ROOT_PROPS = [
    "inset",
    "tokens",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof SeparatorRootOwnProps)[];

/** The registry selection from Root's props. */
export const separatorSelection = (
    props: SeparatorVariantProps,
): Selection<"separator"> => ({ inset: props.inset, tokens: props.tokens });

/** Root's element props: an `<hr>` is a separator already; any other element gets the role. */
export const separatorRootProps = (element: unknown) =>
    element === "hr" ? {} : { role: "separator" as const };
