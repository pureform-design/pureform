// What the components that are a button opening Zag's menu share (the split button, the FAB
// menu): the menu's behaviour props on their Root, and the menu machine's props from them, opening
// where each component places its menu.

import type { MenuBehaviorProps } from "./menu";
import { menuMachineProps } from "./menu";
import type { OverlayPlacement } from "./overlay";

/** The menu machine's props from a menu button's Root (the split button's, the FAB menu's): the
 *  menu's, opening at `placement` unless `positioning` says otherwise. */
export const menuButtonMachineProps = (
    props: MenuBehaviorProps,
    placement: OverlayPlacement,
) => {
    const machine = menuMachineProps(props);
    return {
        ...machine,
        positioning: {
            ...machine.positioning,
            placement: props.positioning?.placement ?? placement,
        },
    };
};

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
