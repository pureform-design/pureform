// The icon button's contract, shared by every binding: the props Root takes for itself, how they
// map onto the selection and the button machine, and the name an icon-only button needs. A toggle
// icon button (`selected` or `defaultSelected` given) also selects the preset's `toggle` variant,
// which draws Material's unselected and selected colors.

import type {
    iconButtonAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { ButtonBehaviorProps } from "./button";
import type { VariantProp } from "./variants";

/** The icon button's parts: `"root" | "touchTarget" | "container" | "icon" | "outline"`. */
export type IconButtonPart = PartName<typeof iconButtonAnatomy>;

/** The icon button's variant groups and instance tokens. `toggle` isn't here: it follows the
 *  machine's `toggle` (see `iconButtonSelection`). */
export interface IconButtonVariantProps {
    readonly color?: VariantProp<"iconButton", "color">;
    readonly variant?: VariantProp<"iconButton", "variant">;
    readonly shape?: VariantProp<"iconButton", "shape">;
    readonly size?: VariantProp<"iconButton", "size">;
    readonly density?: VariantProp<"iconButton", "density">;
    readonly tokens?: InstanceTokens<"iconButton"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface IconButtonRootOwnProps
    extends IconButtonVariantProps, ButtonBehaviorProps {
    /** A prefix for every part's test id (`like` → `like-icon`), or ids by part. */
    readonly testId?: TestIdOverride<IconButtonPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<IconButtonPart> | undefined;
}

/** The keys of `IconButtonRootOwnProps`, which Root keeps off its element. */
export const ICON_BUTTON_ROOT_PROPS = [
    "color",
    "variant",
    "shape",
    "size",
    "density",
    "tokens",
    "disabled",
    "type",
    "name",
    "value",
    "form",
    "toggle",
    "id",
    "ids",
    "selected",
    "defaultSelected",
    "onSelectedChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof IconButtonRootOwnProps)[];

/** Whether a press toggles `selected`: `toggle` when given, else whether `selected` or
 *  `defaultSelected` is. The button machine decides the same way. */
export const isToggle = (props: ButtonBehaviorProps): boolean =>
    props.toggle ??
    (props.selected !== undefined || props.defaultSelected !== undefined);

/** The registry selection from Root's props, with `toggle` set for a toggle icon button. */
export const iconButtonSelection = (
    props: IconButtonVariantProps & ButtonBehaviorProps,
): Selection<"iconButton"> => ({
    color: props.color,
    variant: props.variant,
    shape: props.shape,
    size: props.size,
    density: props.density,
    toggle: isToggle(props),
    tokens: props.tokens,
});

/** What the ready-made icon button renders inside Root, in the framework's node type. */
export interface IconButtonContentProps<Node> {
    /** The icon, in the container. */
    readonly icon?: Node;
    /** Flips the icon under right to left, for an icon that points. */
    readonly mirrorIcon?: boolean | undefined;
}

/** The keys of `IconButtonContentProps`. */
export const ICON_BUTTON_CONTENT_PROPS = [
    "icon",
    "mirrorIcon",
] as const satisfies readonly (keyof IconButtonContentProps<unknown>)[];
