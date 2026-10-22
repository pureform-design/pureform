// The avatar's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and the avatar machine (Zag's), and Root's element props. An avatar is a
// picture (`src`, the `image` part) with initials or an icon (the `fallback` part, its children)
// that show until the picture has loaded and when it fails, named by `label`.

import type {
    avatarAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The avatar's parts: `"root" | "image" | "fallback"`. */
export type AvatarPart = PartName<typeof avatarAnatomy>;

/** The avatar's variant groups and instance tokens. */
export interface AvatarVariantProps {
    readonly size?: VariantProp<"avatar", "size">;
    readonly color?: VariantProp<"avatar", "color">;
    readonly shape?: VariantProp<"avatar", "shape">;
    readonly tokens?: InstanceTokens<"avatar"> | undefined;
}

/** How the picture's load stands once it has settled. */
export type AvatarStatus = "loaded" | "error";

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface AvatarRootOwnProps extends AvatarVariantProps {
    /** Who or what it shows: the avatar's accessible name. Left out, the avatar is decorative
     *  and hidden from assistive technology. */
    readonly label?: string | undefined;
    /** Called when the picture loads or fails. */
    readonly onStatusChange?:
        | ((details: { readonly status: AvatarStatus }) => void)
        | undefined;
    /** Root's id, also the machine's.
     *  @control none */
    readonly id?: string | undefined;
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<AvatarPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<AvatarPart> | undefined;
}

/** The keys of `AvatarRootOwnProps`, which Root keeps off its element. */
export const AVATAR_ROOT_PROPS = [
    "size",
    "color",
    "shape",
    "tokens",
    "label",
    "onStatusChange",
    "id",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof AvatarRootOwnProps)[];

/** What the ready-made avatar renders inside Root, in the framework's node type. */
export interface AvatarContentProps<Node> {
    /** The picture. It shows once it has loaded; until then, and if it fails, the children
     *  (the fallback) do. */
    readonly src?: string | undefined;
    /** Initials, or an icon: the fallback. */
    readonly children?: Node;
}

/** The registry selection from Root's props. */
export const avatarSelection = (
    props: AvatarVariantProps,
): Selection<"avatar"> => ({
    size: props.size,
    color: props.color,
    shape: props.shape,
    tokens: props.tokens,
});

/** The machine's props from Root's. */
export const avatarMachineProps = (
    props: Pick<AvatarRootOwnProps, "id" | "onStatusChange">,
) => ({ id: props.id, onStatusChange: props.onStatusChange });

/** Root's element props: `role="img"` named by `label`, or hidden from assistive technology
 *  without one. The picture inside is decorative, since the root names it. */
export const avatarRootProps = (props: Pick<AvatarRootOwnProps, "label">) =>
    props.label === undefined
        ? { "aria-hidden": "true" as const }
        : { role: "img" as const, "aria-label": props.label };
