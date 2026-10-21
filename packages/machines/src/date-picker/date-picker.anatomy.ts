import { createAnatomy } from "@zag-js/anatomy";
import { anatomy as zagAnatomy } from "@zag-js/date-picker";

// Zag's parts, with the preset's names for what the pickers draw. The modal picker's surface is
// Zag's `content` (inline, in Zag's dialog); the docked picker's field is Zag's `control` and
// `input`, its trailing icon Zag's `trigger`, and its popup Zag's `content`. Zag's tables are the
// calendar's `grid`, `weekdays` and `week`; each cell is a `calendarCell`.
const CALENDAR = [
    "controls",
    "prev",
    "next",
    "weekdays",
    "weekday",
    "grid",
    "week",
    "yearList",
    "actions",
] as const;

export const anatomy = zagAnatomy.extendWith(
    "header",
    "headline",
    "selectedDate",
    "modeToggle",
    "divider",
    ...CALENDAR,
);
export const parts = anatomy.build();

export const dockedAnatomy = zagAnatomy.extendWith(
    "container",
    "leadingIcon",
    "prefixText",
    "suffixText",
    "trailingIcon",
    "supportingText",
    "monthButton",
    "yearButton",
    "monthList",
    ...CALENDAR,
);

/** A calendar cell: the grid cell and the button inside it, Zag's `tableCell` and
 *  `tableCellTrigger`. */
export const cellAnatomy = createAnatomy("calendarCell").parts(
    "root",
    "trigger",
);
