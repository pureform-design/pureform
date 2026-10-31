// Types over the preset's components, from the generated anatomy.

import type {
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
import type { anatomy } from "./generated";
import type { PartName } from "./types";

/** The preset components' anatomies, by name. */
export type Anatomies = typeof anatomy;

/** A preset component's name. */
export type AnatomyName = keyof Anatomies;

/** A preset component's part names: `PartOf<"button">` is `"root" | "label" | …`. */
export type PartOf<N extends AnatomyName> = PartName<Anatomies[N]>;

/** The composite anatomies the bindings render a component with, by component name: the parts an
 *  instance addresses, which differ from the preset's slots where the surface is `content`. */
interface CompositeAnatomies {
    dialog: typeof dialogOverlayAnatomy;
    fullscreenDialog: typeof fullscreenDialogOverlayAnatomy;
    popover: typeof popoverOverlayAnatomy;
    tooltip: typeof tooltipOverlayAnatomy;
    richTooltip: typeof richTooltipOverlayAnatomy;
    menu: typeof menuOverlayAnatomy;
    datePicker: typeof datePickerOverlayAnatomy;
    dockedDatePicker: typeof dockedDatePickerOverlayAnatomy;
    bottomSheet: typeof bottomSheetOverlayAnatomy;
    sideSheet: typeof sideSheetOverlayAnatomy;
    searchView: typeof searchViewOverlayAnatomy;
    tabs: typeof tabsCompositeAnatomy;
}

/** Parts another component's entry draws, reached through their owner: an overlay's `backdrop`
 *  (the scrim's) and a date picker's `cell` (the calendar cell's). */
interface OwnedParts {
    dialog: "backdrop";
    datePicker: "backdrop" | "cell";
    dockedDatePicker: "cell";
    bottomSheet: "backdrop";
    sideSheet: "backdrop";
}

/** The part names a provider's `slotProps` and an instance's keyed props address a component by:
 *  its anatomy's parts as the bindings render it (the unstyled wrapper `root`, the surface
 *  `content`), and the parts it owns. One vocabulary for everything a consumer writes. */
export type ProviderPartOf<N extends AnatomyName> =
    | (N extends keyof CompositeAnatomies
          ? PartName<CompositeAnatomies[N]>
          : PartOf<N>)
    | (N extends keyof OwnedParts ? OwnedParts[N] : never);
