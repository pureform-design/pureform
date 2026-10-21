// The pureform date picker: Material's modal date picker, a dialog holding a calendar.
//
// Markup: the surface (the dialog's content) holding the header (the headline, the selected date,
// and the mode toggle that switches to the date input), a divider, the controls (the month and
// year view trigger, then the previous and next buttons), the weekday row over the grid of days
// (each a `calendarCell`), or the year list in its place, and the actions (text buttons, the
// confirming one last). The binding opens it in Zag's dialog, stacked at the theme's `dialog`
// layer over the scrim, and it slides in as the dialog does.
//
//   <div class={root} role="dialog" aria-labelledby="headline">
//     <div class={header}>
//       <span class={headline} id="headline">Select date</span>
//       <span class={selectedDate}>Mon, Aug 17</span>
//       <button class={modeToggle} aria-label="Switch to text input">✎</button>
//     </div>
//     <hr class={divider} />
//     <div class={controls}>
//       <button class={viewTrigger}>August 2026 ▾</button>
//       <button class={prev} aria-label="Previous month">‹</button>
//       <button class={next} aria-label="Next month">›</button>
//     </div>
//     <div class={weekdays}><span class={weekday}>S</span>…</div>
//     <div class={grid} role="grid"><div class={week} role="row">…cells…</div>…</div>
//     <div class={actions}>…Cancel, OK…</div>
//   </div>

import { typed } from "@pureform/core";
import { auto, flex, unitless } from "@pureform/core/ast";
import { zIndex } from "@pureform/theme";

import {
    CALENDAR_TOKENS,
    calendarControlButton,
    calendarParts,
    pickerChrome,
    PICKER_TOKENS,
} from "./calendar";
import { DIALOG_MOTION, overlayMotion } from "./overlay";
import { componentTokens, surface } from "./shared";

const { tokens, ref } = componentTokens("datePicker", {
    ...PICKER_TOKENS,
    ...CALENDAR_TOKENS,
});

const pf = typed();

export const datePicker = pf.slotComponent({
    name: "datePicker",
    $meta: {
        description:
            "Material modal date picker: a dialog with a header (headline, selected date, mode toggle), the month controls, the weekday row over the grid of days (calendarCell) or the year list, and the actions.",
    },
    tokens,
    slots: [
        "root",
        "header",
        "headline",
        "selectedDate",
        "modeToggle",
        "divider",
        "controls",
        "viewTrigger",
        "prev",
        "next",
        "weekdays",
        "weekday",
        "grid",
        "week",
        "yearList",
        "actions",
    ],
    structure: {
        root: [
            "header",
            "divider",
            "controls",
            "weekdays",
            "grid",
            "yearList",
            "actions",
        ],
        header: ["headline", "selectedDate", "modeToggle"],
        controls: ["viewTrigger", "prev", "next"],
        weekdays: ["weekday"],
        grid: ["week"],
    },
    recipe: () => {
        const chrome = pickerChrome(ref);
        const calendar = calendarParts(ref);
        return {
            base: {
                ...chrome,
                ...calendar,
                root: {
                    ...surface(
                        ref("pickerContainer"),
                        ref("selectedDateColor"),
                        "level3",
                    ),
                    ...overlayMotion(DIALOG_MOTION),
                    ...chrome.root,
                    zIndex: zIndex("dialog"),
                },
                viewTrigger: {
                    ...calendarControlButton(ref),
                    marginInlineEnd: auto,
                },
                controls: {
                    ...calendar.controls,
                    display: flex,
                    flexShrink: unitless(0),
                },
            },
        };
    },
});
