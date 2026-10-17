// The icon's contract, shared by every binding: the props Root takes for itself, how they map onto
// the selection, and Root's element props. An icon is a box at an icon size around whatever the
// app renders (an SVG, an icon font glyph); it's decorative unless given a `label`.

import type { iconAnatomy, PartName, TestIdOverride } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The icon's parts: `"root"`. */
export type IconPart = PartName<typeof iconAnatomy>;

/** The icon's variant groups and instance tokens. `filled` draws an icon font filled or outlined;
 *  left as `"inherit"`, it follows the slot the icon sits in. */
export interface IconVariantProps {
    readonly size?: VariantProp<"icon", "size">;
    readonly color?: VariantProp<"icon", "color">;
    readonly filled?: VariantProp<"icon", "filled">;
    readonly tokens?: InstanceTokens<"icon"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface IconRootOwnProps extends IconVariantProps {
    /** What the icon says, when it says something: it becomes `role="img"` with this name. Left
     *  out, it's decorative and hidden from assistive technology. */
    readonly label?: string | undefined;
    /** Flip it under `rtl`, for an icon that points. */
    readonly mirror?: boolean | undefined;
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<IconPart> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<IconPart> | undefined;
}

/** The keys of `IconRootOwnProps`, which Root keeps off its element. */
export const ICON_ROOT_PROPS = [
    "size",
    "color",
    "filled",
    "tokens",
    "label",
    "mirror",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof IconRootOwnProps)[];

/** The registry selection from Root's props. */
export const iconSelection = (props: IconVariantProps): Selection<"icon"> => ({
    size: props.size,
    color: props.color,
    filled: props.filled,
    tokens: props.tokens,
});

/** Root's element props: `role="img"` named by `label`, or hidden from assistive technology. */
export const iconRootProps = (props: Pick<IconRootOwnProps, "label">) =>
    props.label === undefined
        ? { "aria-hidden": "true" as const }
        : { role: "img" as const, "aria-label": props.label };
