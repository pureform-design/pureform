// What a provider's `slotProps` key means, for the keys that changed: a provider addresses a
// component's parts by their anatomy names, as an instance does, where it once used the preset's
// style slots. An overlay's surface is `content` (the preset's `root` slot), a sheet's body is
// `body` (its `content` slot), the search view's is `surface`, the tabs' list is `list`.

import {
    bottomSheetOverlayAnatomy,
    datePickerOverlayAnatomy,
    dialogOverlayAnatomy,
    dockedDatePickerOverlayAnatomy,
    fullscreenDialogOverlayAnatomy,
    menuOverlayAnatomy,
    popoverOverlayAnatomy,
    richTooltipOverlayAnatomy,
    searchViewOverlayAnatomy,
    sideSheetOverlayAnatomy,
    tabsCompositeAnatomy,
    tooltipOverlayAnatomy,
} from "./composites";
import type { ComponentAnatomy } from "./types";

const COMPOSITES: Readonly<Record<string, ComponentAnatomy>> = {
    dialog: dialogOverlayAnatomy,
    fullscreenDialog: fullscreenDialogOverlayAnatomy,
    popover: popoverOverlayAnatomy,
    tooltip: tooltipOverlayAnatomy,
    richTooltip: richTooltipOverlayAnatomy,
    menu: menuOverlayAnatomy,
    datePicker: datePickerOverlayAnatomy,
    dockedDatePicker: dockedDatePickerOverlayAnatomy,
    bottomSheet: bottomSheetOverlayAnatomy,
    sideSheet: sideSheetOverlayAnatomy,
    searchView: searchViewOverlayAnatomy,
    tabs: tabsCompositeAnatomy,
};

/** The part that took over `key`, a preset slot's name, in `component`'s provider keys: the part
 *  that slot draws when its name is something else (`dialog`'s `root` slot is the `content` part).
 *  `undefined` when `key` was never a renamed slot of `component`. */
export const renamedSlotPart = (
    component: string,
    key: string,
): string | undefined => {
    const anatomy = COMPOSITES[component];
    if (!anatomy) return undefined;
    for (const name of anatomy.partNames) {
        const part = anatomy.parts[name]!;
        if (typeof part.slot === "string" && part.slot === key && name !== key)
            return name;
    }
    return undefined;
};
