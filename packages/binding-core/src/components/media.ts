// The media's contract, shared by every binding: the props Root takes for itself and how they map
// onto the selection. Media is a picture (an `<img>`) or a video (`as="video"`) that fills its
// container's width at an aspect ratio; its `src` and `alt` are the element's own.

import type { mediaAnatomy, PartName, TestIdOverride } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The media's parts: `"root"`. */
export type MediaPart = PartName<typeof mediaAnatomy>;

/** The media's variant groups and instance tokens. */
export interface MediaVariantProps {
    readonly aspect?: VariantProp<"media", "aspect">;
    readonly shape?: VariantProp<"media", "shape">;
    readonly tokens?: InstanceTokens<"media"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface MediaRootOwnProps extends MediaVariantProps {
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<MediaPart> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<MediaPart> | undefined;
}

/** The keys of `MediaRootOwnProps`, which Root keeps off its element. */
export const MEDIA_ROOT_PROPS = [
    "aspect",
    "shape",
    "tokens",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof MediaRootOwnProps)[];

/** The registry selection from Root's props. */
export const mediaSelection = (
    props: MediaVariantProps,
): Selection<"media"> => ({
    aspect: props.aspect,
    shape: props.shape,
    tokens: props.tokens,
});
