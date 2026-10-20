// The drag handle's contract, shared by every binding: a button holding the pill, which a sheet
// or a pane renders where it can be dragged. Name it for what a press does ("Close sheet").

import type {
    dragHandleAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The drag handle's parts: `"root" | "handle"`. */
export type DragHandlePart = PartName<typeof dragHandleAnatomy>;

/** The drag handle's variant groups and instance tokens. */
export interface DragHandleVariantProps {
    /** `vertical` stands the pill up, for a pane divider. @default "horizontal" */
    readonly orientation?: VariantProp<"dragHandle", "orientation">;
    readonly tokens?: InstanceTokens<"dragHandle"> | undefined;
}

/** Everything the drag handle takes for itself, besides the element's own props and `as`. */
export interface DragHandleRootOwnProps extends DragHandleVariantProps {
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<DragHandlePart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<DragHandlePart> | undefined;
}

/** The keys of `DragHandleRootOwnProps`, which Root keeps off its element. */
export const DRAG_HANDLE_ROOT_PROPS = [
    "orientation",
    "tokens",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof DragHandleRootOwnProps)[];

/** The registry selection from the drag handle's props. */
export const dragHandleSelection = (
    props: DragHandleVariantProps,
): Selection<"dragHandle"> => ({
    orientation: props.orientation,
    tokens: props.tokens,
});
