// What the components that are a button opening Zag's menu share (the split button, the FAB
// menu): the menu's behaviour props on their Root, and the menu machine's props from them, opening
// where each component places its menu.

import type { MenuBehaviorProps } from "./menu";
import type { OverlayPlacement } from "./overlay";

/** A menu button's placement defaults without constructing machine props. */
export const menuButtonPositioning = (
    props: Pick<MenuBehaviorProps, "positioning">,
    placement: OverlayPlacement,
) => ({
    placement,
    ...props.positioning,
    // An unspecified placement takes the button's default, including an explicit undefined.
    ...(props.positioning?.placement === undefined ? { placement } : {}),
});

/** The keys of `MenuBehaviorProps`, which a menu button's Root keeps off its element. */
export const MENU_BUTTON_BEHAVIOR_PROPS = [
    "onSelect",
    "closeOnSelect",
    "loopFocus",
    "typeahead",
    "positioning",
    "aria-label",
    "ids",
    "open",
    "defaultOpen",
    "onOpenChange",
] as const satisfies readonly (keyof MenuBehaviorProps)[];
