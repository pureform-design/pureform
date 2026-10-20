// The badge's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection, and Root's element props. A badge is a dot (`small`) or a short label or
// count (`large`, its children), named by `label`.

import type { badgeAnatomy, PartName, TestIdOverride } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The badge's parts: `"root"`. */
export type BadgePart = PartName<typeof badgeAnatomy>;

/** The badge's variant groups and instance tokens. */
export interface BadgeVariantProps {
    readonly size?: VariantProp<"badge", "size">;
    readonly placement?: VariantProp<"badge", "placement">;
    readonly tokens?: InstanceTokens<"badge"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface BadgeRootOwnProps extends BadgeVariantProps {
    /** What the badge says for assistive technology ("3 unread"). Left out, the badge is
     *  announced as its children, and a dot without a label is hidden. */
    readonly label?: string | undefined;
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<BadgePart> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<BadgePart> | undefined;
}

/** The keys of `BadgeRootOwnProps`, which Root keeps off its element. */
export const BADGE_ROOT_PROPS = [
    "size",
    "placement",
    "tokens",
    "label",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof BadgeRootOwnProps)[];

/** The registry selection from Root's props. */
export const badgeSelection = (
    props: BadgeVariantProps,
): Selection<"badge"> => ({
    size: props.size,
    placement: props.placement,
    tokens: props.tokens,
});

/** Root's element props: a label names it (`role="img"`); a dot without one is hidden from
 *  assistive technology. A large badge without a label is its children's text. */
export const badgeRootProps = (
    props: Pick<BadgeRootOwnProps, "size" | "label">,
) =>
    props.label !== undefined
        ? { role: "img" as const, "aria-label": props.label }
        : props.size === "small"
          ? { "aria-hidden": "true" as const }
          : {};
