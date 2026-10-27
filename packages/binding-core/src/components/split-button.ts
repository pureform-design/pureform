// The split button's contract, shared by every binding: a leading button for the main action and a
// trailing button that opens the menu component. Root takes the menu's behaviour props.

import type {
    PartName,
    splitButtonAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { IndicationProps } from "./indication";
import type { MenuBehaviorProps, MenuItem } from "./menu";
import {
    MENU_BUTTON_BEHAVIOR_PROPS,
    menuButtonPositioning,
} from "./menu-button";
import type { VariantProp } from "./variants";

/** The split button's parts: `"root" | "leadingButton" | "trailingButton" | "trailingIcon"`. The
 *  menu it opens is the menu component, with its own parts. */
export type SplitButtonPart = PartName<typeof splitButtonAnatomy>;

/** The split button's variant groups and instance tokens. */
export interface SplitButtonVariantProps {
    readonly color?: VariantProp<"splitButton", "color">;
    readonly variant?: VariantProp<"splitButton", "variant">;
    readonly size?: VariantProp<"splitButton", "size">;
    readonly density?: VariantProp<"splitButton", "density">;
    readonly tokens?: InstanceTokens<"splitButton"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. `aria-label` names
 *  the menu; name the trailing button with its own `aria-label`. */
export interface SplitButtonRootOwnProps
    extends SplitButtonVariantProps, MenuBehaviorProps, IndicationProps {
    /** Disables both buttons. */
    readonly disabled?: boolean | undefined;
    /** A prefix for every part's test id (`save` → `save-leading-button`), or ids by part. */
    readonly testId?: TestIdOverride<SplitButtonPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<SplitButtonPart> | undefined;
}

/** The keys of `SplitButtonRootOwnProps`, which Root keeps off its element. */
export const SPLIT_BUTTON_ROOT_PROPS = [
    "color",
    "variant",
    "size",
    "density",
    "tokens",
    "disabled",
    ...MENU_BUTTON_BEHAVIOR_PROPS,
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof SplitButtonRootOwnProps)[];

/** The split button's registry selection from Root's props. */
export const splitButtonSelection = (
    props: SplitButtonVariantProps,
): Selection<"splitButton"> => ({
    color: props.color,
    variant: props.variant,
    size: props.size,
    density: props.density,
    tokens: props.tokens,
});

/** The split button's menu opens under the trailing button, at its end. */

export const splitButtonPositioning = (
    props: Pick<MenuBehaviorProps, "positioning">,
) => menuButtonPositioning(props, "bottom-end");

/** What the ready-made split button renders inside Root, in the framework's node type. */
export interface SplitButtonContentProps<Node> {
    /** The leading button's label. */
    readonly label?: Node;
    /** An icon before the label. */
    readonly icon?: Node;
    /** The trailing button's icon, which turns over while the menu is open. A down arrow unless
     *  given. */
    readonly trailingIcon?: Node;
    /** The trailing button's accessible name. @default "More options" */
    readonly menuLabel?: string | undefined;
    /** Called when the leading button is pressed. */
    readonly onAction?: (() => void) | undefined;
    /** The menu's items, in order. */
    readonly items?: readonly MenuItem<Node>[] | undefined;
}

/** The keys of `SplitButtonContentProps`. */
export const SPLIT_BUTTON_CONTENT_PROPS = [
    "label",
    "icon",
    "trailingIcon",
    "menuLabel",
    "onAction",
    "items",
] as const satisfies readonly (keyof SplitButtonContentProps<unknown>)[];

/** The trailing button's name when the ready-made split button isn't given one. */
export const SPLIT_BUTTON_MENU_LABEL = "More options";
