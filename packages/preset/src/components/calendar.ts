// The calendar the date pickers share: the month and year controls, the weekday row, the grid of
// days, and the year list, as slot styles a picker spreads into its own recipe; the header and
// actions of a dialog-like picker (the modal date picker and the date input); and the
// `calendarCell` component, which draws one day, month or year of the grid.
//
// A cell is its own component, as a list item is the list's: each cell takes its own variants
// (today, its place in a selected range, outside the shown month), which a slot of the picker
// couldn't, since a slot's variants are the picker's.
//
//   <div class={grid} role="grid">
//     <div class={week} role="row">
//       <div class={calendarCell({ selection: "selected", today: true }).root} role="gridcell">
//         <div class={….trigger} role="button" aria-label="Monday, August 17, 2026">17</div>
//       </div>
//     </div>
//   </div>

import { typed } from "@pureform/core";
import {
    auto,
    center,
    end,
    colorMix,
    column,
    flex,
    none,
    pct,
    px,
    row,
    solid,
    spaceBetween,
    transparent,
    unitless,
    wrap,
} from "@pureform/core/ast";
import type { AliasNode, StyleMap, ValueNode } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import {
    componentTokens,
    disabledColor,
    iconBox,
    iconFill,
    INDICATION_ROOT,
    pressableRoot,
    sys,
} from "./shared";

/** The tokens a picker's calendar reads, which it spreads into its own: the cell size every row
 *  lines up on, the weekday labels' color, the controls' color and icon size, and the year list's
 *  height. */
export const CALENDAR_TOKENS = {
    cellSize: px(48),
    weekdayColor: sys("onSurface"),
    controlColor: sys("onSurfaceVariant"),
    controlHeight: px(48),
    iconSize: sizeToken("iconMedium"),
    iconFill: unitless(0),
    calendarPadding: spacing("3"),
    yearListHeight: px(288),
} satisfies Record<string, ValueNode>;

export type CalendarToken = keyof typeof CALENDAR_TOKENS;

/** The calendar's slots, after a picker's own: the controls row (with its view trigger, or month
 *  and year buttons, and the previous and next buttons), the weekday row and its labels, the grid
 *  and its weeks, and the year list. */
export const CALENDAR_SLOTS = [
    "controls",
    "prev",
    "next",
    "weekdays",
    "weekday",
    "grid",
    "week",
    "yearList",
] as const;

// A control's icon: a box of the icon size that grows to hold an icon button.
const controlIcon = (
    ref: (token: "iconSize" | "iconFill" | "controlColor") => AliasNode,
): StyleMap => {
    const {
        width: _width,
        height: _height,
        ...box
    } = iconBox(ref("iconSize"), { fill: iconFill(ref("iconFill")) });
    return {
        ...box,
        minHeight: ref("iconSize"),
        color: ref("controlColor"),
        flexShrink: unitless(0),
    };
};

/** A text button's place in the controls row (the view trigger, or the month and year buttons):
 *  the label in `labelLarge` and the control color, with room for an arrow. The button component
 *  draws the rest. */
export const calendarControlButton = (
    ref: (token: CalendarToken) => AliasNode,
): StyleMap => ({
    display: flex,
    alignItems: center,
    gap: spacing("2"),
    flexShrink: unitless(0),
    textStyle: textStyle("labelLarge"),
    color: ref("controlColor"),
});

/** The calendar's slot styles over a picker's tokens. Every row is a flex row of cells of
 *  `cellSize`, so the weekday labels line up with the days on every target. */
export const calendarParts = (ref: (token: CalendarToken) => AliasNode) =>
    ({
        controls: {
            display: flex,
            flexDirection: row,
            alignItems: center,
            justifyContent: spaceBetween,
            minHeight: ref("controlHeight"),
            paddingInlineStart: ref("calendarPadding"),
            paddingInlineEnd: ref("calendarPadding"),
        },
        prev: controlIcon(ref),
        next: controlIcon(ref),
        weekdays: {
            display: flex,
            flexDirection: row,
            justifyContent: center,
            paddingInlineStart: ref("calendarPadding"),
            paddingInlineEnd: ref("calendarPadding"),
        },
        weekday: {
            display: flex,
            alignItems: center,
            justifyContent: center,
            width: ref("cellSize"),
            height: ref("cellSize"),
            textStyle: textStyle("bodyLarge"),
            color: ref("weekdayColor"),
        },
        grid: {
            display: flex,
            flexDirection: column,
            alignItems: center,
            paddingInlineStart: ref("calendarPadding"),
            paddingInlineEnd: ref("calendarPadding"),
        },
        week: { display: flex, flexDirection: row },
        yearList: {
            display: flex,
            flexDirection: row,
            flexWrap: wrap,
            justifyContent: center,
            height: ref("yearListHeight"),
            overflow: auto,
            paddingInlineStart: ref("calendarPadding"),
            paddingInlineEnd: ref("calendarPadding"),
        },
    }) satisfies Record<(typeof CALENDAR_SLOTS)[number], StyleMap>;

/** The tokens a dialog-like picker's header and actions read (the modal date picker and the date
 *  input), named apart from a text field's own: the container, the headline's and the selected date's colors, and the paddings. */
export const PICKER_TOKENS = {
    pickerContainer: sys("surfaceContainerHigh"),
    headlineColor: sys("onSurfaceVariant"),
    selectedDateColor: sys("onSurface"),
    dividerColor: sys("outlineVariant"),
    pickerRadius: radius("extraLarge"),
    width: px(360),
    headerPaddingStart: spacing("6"),
    headerPaddingEnd: spacing("3"),
    actionsGap: spacing("2"),
    actionsPadding: spacing("3"),
} satisfies Record<string, ValueNode>;

export type PickerToken = keyof typeof PICKER_TOKENS;

/** The slots of a dialog-like picker's header, in markup order. */
export const PICKER_HEADER_SLOTS = [
    "header",
    "headline",
    "selectedDate",
    "modeToggle",
    "divider",
] as const;

/** A picker's actions: text buttons at the end of the last row. */
export const pickerActions = (
    ref: (token: "actionsGap" | "actionsPadding") => AliasNode,
): StyleMap => ({
    display: flex,
    flexDirection: row,
    justifyContent: end,
    gap: ref("actionsGap"),
    paddingBlockStart: spacing("2"),
    paddingBlockEnd: ref("actionsPadding"),
    paddingInlineStart: ref("actionsPadding"),
    paddingInlineEnd: ref("actionsPadding"),
});

/** A dialog-like picker's root, header, divider and actions over its tokens: a surface of the
 *  picker's width, the headline over the selected date with the mode toggle at its end, and the
 *  text buttons at the end of the last row. */
export const pickerChrome = (
    ref: (
        token: PickerToken | "iconSize" | "iconFill" | "controlColor",
    ) => AliasNode,
) =>
    ({
        root: {
            display: flex,
            flexDirection: column,
            width: ref("width"),
            maxWidth: pct(100),
            backgroundColor: ref("pickerContainer"),
            color: ref("selectedDateColor"),
            borderRadius: ref("pickerRadius"),
            borderWidth: px(0),
        },
        header: {
            display: flex,
            flexDirection: row,
            flexWrap: wrap,
            alignItems: end,
            justifyContent: spaceBetween,
            paddingBlockStart: spacing("4"),
            paddingBlockEnd: spacing("3"),
            paddingInlineStart: ref("headerPaddingStart"),
            paddingInlineEnd: ref("headerPaddingEnd"),
        },
        headline: {
            flexBasis: pct(100),
            paddingBlockEnd: px(36),
            textStyle: textStyle("labelLarge"),
            color: ref("headlineColor"),
        },
        selectedDate: {
            flexGrow: unitless(1),
            minWidth: px(0),
            textStyle: textStyle("headlineLarge"),
            color: ref("selectedDateColor"),
        },
        modeToggle: controlIcon(ref),
        divider: {
            flexShrink: unitless(0),
            height: px(1),
            width: pct(100),
            marginBlockStart: px(0),
            marginBlockEnd: px(0),
            borderWidth: px(0),
            backgroundColor: ref("dividerColor"),
        },
        actions: pickerActions(ref),
    }) satisfies Record<string, StyleMap>;

const { tokens, ref } = componentTokens("calendarCell", {
    ...INDICATION_TOKENS,
    content: sys("onSurface"),
    todayContent: sys("primary"),
    selectedContainer: sys("primary"),
    selectedContent: sys("onPrimary"),
    rangeContainer: sys("secondaryContainer"),
    rangeContent: sys("onSecondaryContainer"),
    todayOutline: px(1),
    radius: radius("full"),
    // The cell, and the circle or pill inside it; the view sets them.
    cellWidth: px(48),
    cellHeight: px(48),
    triggerWidth: px(40),
    triggerHeight: px(40),
    // Hidden days outside the shown month.
    outsideOpacity: unitless(0),
    // What the variants set: today's outline width, and how much of today's, the chosen and the
    // range's colors to mix in (0% or 100%). Each style reads them, so no two groups set one
    // property.
    todayOutlineWidth: px(0),
    today: pct(0),
    selected: pct(0),
    ranged: pct(0),
});

/** Each value of the `selection` variant: not chosen, chosen alone, or the start, a day inside,
 *  or the end of a chosen range. */
export const CALENDAR_SELECTIONS = [
    "none",
    "selected",
    "rangeStart",
    "rangeMiddle",
    "rangeEnd",
] as const;

export type CalendarSelection = (typeof CALENDAR_SELECTIONS)[number];

// The content color: the day's, a range's inside it, today's over both, and the chosen one's
// over everything, through the flags.
const content: ValueNode = colorMix(
    colorMix(
        colorMix(ref("content"), ref("rangeContent"), ref("ranged")),
        ref("todayContent"),
        ref("today"),
    ),
    ref("selectedContent"),
    ref("selected"),
);

// The range's band behind a range's ends and the days inside it: round on the outer side of each
// end.
const band = (side: "start" | "end" | "both" | "none"): StyleMap => {
    const round = radius("full");
    const flat = px(0);
    const start = side === "start" || side === "both" ? round : flat;
    const end = side === "end" || side === "both" ? round : flat;
    return {
        borderStartStartRadius: start,
        borderEndStartRadius: start,
        borderStartEndRadius: end,
        borderEndEndRadius: end,
    };
};

const pf = typed();

export const calendarCell = pf.slotComponent({
    name: "calendarCell",
    bindingVariants: ["view", "selection", "today", "outside"],
    $meta: {
        description:
            "A day, month or year of a date picker's calendar: the cell (which draws a chosen range's band) and the circle or pill inside it. view sets the size; selection, today and outside are per cell.",
    },
    tokens,
    slots: ["root", "trigger"],
    structure: { root: ["trigger"] },
    indication: [
        {
            trigger: "trigger",
            surface: "trigger",
            centered: true,
            focus: "trigger",
        },
    ],
    variants: {
        view: ["day", "month", "year"],
        selection: CALENDAR_SELECTIONS,
        today: ["true", "false"],
        outside: ["true", "false"],
    },
    recipe: () => ({
        base: {
            root: {
                ...INDICATION_ROOT,
                display: flex,
                alignItems: center,
                justifyContent: center,
                flexShrink: unitless(0),
                width: ref("cellWidth"),
                height: ref("cellHeight"),
                backgroundColor: colorMix(
                    transparent,
                    ref("rangeContainer"),
                    ref("ranged"),
                ),
                ...band("none"),
            },
            trigger: {
                ...pressableRoot(ref),
                width: ref("triggerWidth"),
                height: ref("triggerHeight"),
                borderRadius: ref("radius"),
                borderStyle: solid,
                borderWidth: ref("todayOutlineWidth"),
                borderColor: ref("todayContent"),
                textStyle: textStyle("bodyLarge"),
                backgroundColor: stateLayer(ref, {
                    base: colorMix(
                        transparent,
                        ref("selectedContainer"),
                        ref("selected"),
                    ),
                    content,
                }),
                color: content,
                states: {
                    disabled: {
                        color: disabledColor("disabledContent"),
                        borderColor: disabledColor("disabledContent"),
                    },
                },
            },
        },
        variants: {
            view: {
                day: {},
                month: {
                    root: {
                        tokens: {
                            cellWidth: px(88),
                            cellHeight: px(52),
                            triggerWidth: px(72),
                            triggerHeight: px(36),
                        },
                    },
                },
                year: {
                    root: {
                        tokens: {
                            cellWidth: px(88),
                            cellHeight: px(52),
                            triggerWidth: px(72),
                            triggerHeight: px(36),
                        },
                    },
                },
            },
            selection: {
                none: {},
                selected: {
                    root: { tokens: { selected: pct(100) } },
                },
                rangeStart: {
                    root: {
                        tokens: { selected: pct(100), ranged: pct(100) },
                        ...band("start"),
                    },
                },
                rangeMiddle: {
                    root: { tokens: { ranged: pct(100) } },
                },
                rangeEnd: {
                    root: {
                        tokens: { selected: pct(100), ranged: pct(100) },
                        ...band("end"),
                    },
                },
            },
            today: {
                true: {
                    root: {
                        tokens: {
                            today: pct(100),
                            todayOutlineWidth: ref("todayOutline"),
                        },
                    },
                },
                false: {},
            },
            outside: {
                true: {
                    root: {
                        opacity: ref("outsideOpacity"),
                        pointerEvents: none,
                    },
                },
                false: {},
            },
        },
        defaultVariants: {
            view: "day",
            selection: "none",
            today: "false",
            outside: "false",
        },
    }),
});
