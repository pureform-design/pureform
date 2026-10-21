// The pureform docked date picker: Material's docked date picker, a text field that opens a
// calendar under it.
//
// Markup: the text field's parts (the date typed into the input, the trailing icon a button that
// opens the calendar), then the calendar's popup (`content`): the controls (the month and the
// year, each a menu button between a previous and a next button), the weekday row over the grid
// of days (each a `calendarCell`), or the month or year list in its place, and the actions. The
// binding places the popup under the field (Zag's positioner), at the theme's `menu` layer, and it
// grows in from the field as the menu does.
//
//   <div class={root}>
//     <div class={container}>
//       <input class={input} id="date" placeholder="mm/dd/yyyy" value="08/17/2026" />
//       <label class={label} for="date">Date</label>
//       <button class={trailingIcon} aria-label="Open calendar">📅</button>
//     </div>
//     <div class={content} role="dialog">
//       <div class={controls}>
//         <button class={prev}>‹</button><button class={monthButton}>Aug ▾</button>
//         <button class={next}>›</button>
//         <button class={prev}>‹</button><button class={yearButton}>2026 ▾</button>
//         <button class={next}>›</button>
//       </div>
//       <div class={weekdays}>…</div>
//       <div class={grid} role="grid">…</div>
//     </div>
//   </div>

import { typed } from "@pureform/core";
import {
    auto,
    center,
    column,
    flex,
    pct,
    px,
    unitless,
} from "@pureform/core/ast";
import type { MaterialDensity } from "@pureform/theme";
import { radius, spacing, zIndex } from "@pureform/theme";

import {
    CALENDAR_TOKENS,
    calendarControlButton,
    calendarParts,
    PICKER_TOKENS,
    pickerChrome,
} from "./calendar";
import {
    AFFIX_FIELD_SLOTS,
    AFFIX_FIELD_STRUCTURE,
    AFFIX_TOKENS,
    affixField,
    fieldTokens,
} from "./field";
import { overlayMotion, POPUP_MOTION } from "./overlay";
import {
    DEFAULT_GROUP,
    defaultDensities,
    defaultGroups,
    densitySteps,
    surface,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const pf = typed();

/** The slots of the docked picker's popup, after the field's. */
export const DOCKED_DATE_PICKER_POPUP_SLOTS = [
    "content",
    "controls",
    "prev",
    "monthButton",
    "next",
    "yearButton",
    "weekdays",
    "weekday",
    "grid",
    "week",
    "monthList",
    "yearList",
    "actions",
] as const;

/** Build the docked date picker with a `color` variant per group in `groups`, setting the
 *  field's focus color. */
export const createDockedDatePicker = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) => {
    const { tokens, ref } = fieldTokens("dockedDatePicker", {
        ...AFFIX_TOKENS,
        ...CALENDAR_TOKENS,
        ...PICKER_TOKENS,
        // The popup: a step lower than the modal picker's corners.
        popupRadius: radius("large"),
        popupContainer: sys("surfaceContainerHigh"),
        popupGap: px(4),
    });
    const field = affixField(ref);
    const { density, ...parts } = field.parts(groups, densities);
    const calendar = calendarParts(ref);
    const chrome = pickerChrome(ref);
    return variantsOf<{
        color: G | typeof DEFAULT_GROUP;
        density: "inherit" | D;
    }>()(
        pf.slotComponent({
            name: "dockedDatePicker",
            $meta: {
                description:
                    "Material docked date picker: a text field whose trailing icon opens a calendar under it, with month and year menu buttons, previous and next buttons, the weekday row over the grid of days (calendarCell), the month or year list, and the actions.",
            },
            tokens,
            slots: [...AFFIX_FIELD_SLOTS, ...DOCKED_DATE_PICKER_POPUP_SLOTS],
            structure: {
                ...AFFIX_FIELD_STRUCTURE,
                root: [...AFFIX_FIELD_STRUCTURE.root, "content"],
                content: [
                    "controls",
                    "weekdays",
                    "grid",
                    "monthList",
                    "yearList",
                    "actions",
                ],
                controls: ["prev", "monthButton", "next", "yearButton"],
                weekdays: ["weekday"],
                grid: ["week"],
            },
            variants: {
                variant: ["filled", "outlined"],
                color: groups as ColorGroups,
                leadingIcon: ["true", "false"],
                trailingIcon: ["true", "false"],
                prefixText: ["true", "false"],
                suffixText: ["true", "false"],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    ...parts.base,
                    ...calendar,
                    content: {
                        ...surface(
                            ref("popupContainer"),
                            ref("selectedDateColor"),
                            "level3",
                        ),
                        ...overlayMotion({ ...POPUP_MOTION, fromAnchor: true }),
                        zIndex: zIndex("menu"),
                        display: flex,
                        flexDirection: column,
                        width: ref("width"),
                        maxWidth: pct(100),
                        borderRadius: ref("popupRadius"),
                        marginBlockStart: ref("popupGap"),
                        paddingBlockStart: spacing("2"),
                    },
                    monthButton: calendarControlButton(ref),
                    yearButton: calendarControlButton(ref),
                    controls: { ...calendar.controls, flexShrink: unitless(0) },
                    // The months, one a row, as a menu lists them.
                    monthList: {
                        display: flex,
                        flexDirection: column,
                        alignItems: center,
                        height: ref("yearListHeight"),
                        overflow: auto,
                    },
                    actions: chrome.actions,
                },
                variants: {
                    ...parts.variants,
                    ...density.variants,
                },
                compoundVariants: parts.compoundVariants,
                defaultVariants: {
                    ...parts.defaultVariants,
                    ...density.defaultVariants,
                    // M3's docked picker is an outlined field with the calendar button at its end.
                    variant: "outlined",
                    trailingIcon: "true",
                },
            }),
        }),
    );
};

export const dockedDatePicker = createDockedDatePicker();
