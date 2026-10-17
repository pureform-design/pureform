// The touch target's contract, shared by every binding: the props Root takes for itself. A touch
// target is an invisible box that grows a small interactive element's hit area to the theme's
// minimum; put it first inside a positioned, interactive element. It says nothing.

import type {
    PartName,
    TestIdOverride,
    touchTargetAnatomy,
} from "@pureform/anatomy";

import type { Unstyled } from "../parts";

/** The touch target's parts: `"root"`. */
export type TouchTargetPart = PartName<typeof touchTargetAnatomy>;

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface TouchTargetRootOwnProps {
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<TouchTargetPart> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<TouchTargetPart> | undefined;
}

/** The keys of `TouchTargetRootOwnProps`, which Root keeps off its element. */
export const TOUCH_TARGET_ROOT_PROPS = [
    "testId",
    "unstyled",
] as const satisfies readonly (keyof TouchTargetRootOwnProps)[];
