// The avatar's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection, and Root's element props. An avatar is a picture (`src`, an `<img>`), or
// initials or an icon (its children, in a `<span>`), named by `label`.

import type {
    avatarAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The avatar's parts: `"root"`. */
export type AvatarPart = PartName<typeof avatarAnatomy>;

/** The avatar's variant groups and instance tokens. */
export interface AvatarVariantProps {
    readonly size?: VariantProp<"avatar", "size">;
    readonly color?: VariantProp<"avatar", "color">;
    readonly shape?: VariantProp<"avatar", "shape">;
    readonly tokens?: InstanceTokens<"avatar"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface AvatarRootOwnProps extends AvatarVariantProps {
    /** The picture: Root renders an `<img>`. */
    readonly src?: string | undefined;
    /** Who or what it shows: the picture's `alt`, or the initials' accessible name. Left out,
     *  the avatar is decorative and hidden from assistive technology. */
    readonly label?: string | undefined;
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<AvatarPart> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<AvatarPart> | undefined;
}

/** The keys of `AvatarRootOwnProps`, which Root keeps off its element. */
export const AVATAR_ROOT_PROPS = [
    "size",
    "color",
    "shape",
    "tokens",
    "src",
    "label",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof AvatarRootOwnProps)[];

/** The element Root renders: `as`, else an `<img>` with a `src`, else a `<span>`. */
export const avatarElement = <E>(props: {
    readonly src?: string | undefined;
    readonly as?: E | undefined;
}): E | "img" | "span" =>
    props.as ?? (props.src !== undefined ? "img" : "span");

/** The registry selection from Root's props. */
export const avatarSelection = (
    props: AvatarVariantProps,
): Selection<"avatar"> => ({
    size: props.size,
    color: props.color,
    shape: props.shape,
    tokens: props.tokens,
});

/** Root's element props: a picture's `src` and `alt` (empty when decorative); anything else is
 *  `role="img"` named by `label`, or hidden from assistive technology without one. */
export const avatarRootProps = (
    props: Pick<AvatarRootOwnProps, "src" | "label">,
    element: unknown,
) =>
    element === "img"
        ? { src: props.src, alt: props.label ?? "" }
        : props.label === undefined
          ? { "aria-hidden": "true" as const }
          : { role: "img" as const, "aria-label": props.label };
