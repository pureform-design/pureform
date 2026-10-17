// The text's contract, shared by every binding: the props Root takes for itself and how they map
// onto the selection. Text sets its children in one of the theme's text styles. The preset's
// variant group is `style`, which an element's `style` prop already names, so Root takes it as
// `textStyle`.

import type { PartName, TestIdOverride, textAnatomy } from "@pureform/anatomy";
import type { Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The text's parts: `"root"`. */
export type TextPart = PartName<typeof textAnatomy>;

/** The text's variant group: the text style, by name (`"bodyMedium"`, `"titleLarge"`, or one a
 *  theme adds). */
export interface TextVariantProps {
    readonly textStyle?: VariantProp<"text", "style">;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface TextRootOwnProps extends TextVariantProps {
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<TextPart> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<TextPart> | undefined;
}

/** The keys of `TextRootOwnProps`, which Root keeps off its element. */
export const TEXT_ROOT_PROPS = [
    "textStyle",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof TextRootOwnProps)[];

/** The registry selection from Root's props: `textStyle` is the preset's `style` group. */
export const textSelection = (props: TextVariantProps): Selection<"text"> =>
    ({ style: props.textStyle }) as Selection<"text">;
