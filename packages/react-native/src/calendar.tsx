// What the date pickers' calendars share: a cell (a day, a month or a year, each its own
// `calendarCell`), and the weekday row and day grid drawn on a picker's own slots. React Native
// has no date machine: the weeks, the labels and what a cell shows come from binding-core's
// date helpers, so they match the web's for the same locale.

import { calendarCellAnatomy } from "@pureform/anatomy";
import {
    calendarCellSelection,
    calendarCellSelectionOf,
    formatIsoDate,
    isSelectableDate,
    monthWeeks,
    parseIsoDate,
    todayIso,
    weekdayLabels,
} from "@pureform/binding-core";
import type {
    CalendarCellInstance,
    CalendarCellPart,
    CalendarCellSelection,
    CalendarView,
    DatePickerBehaviorProps,
    DateSelectionMode,
} from "@pureform/binding-core";
import type { ReactNode } from "react";
import { ScrollView } from "react-native";

import type { MotionStyles } from "./engine";
import { IconSlot, iconSlot } from "./icon-style";
import { useSurfaceIndication } from "./indication";
import { testIdOf, withEngine } from "./parts";
import { nativeSlots, withUnselectable } from "./slot-props";
import type { PartSlots } from "./slot-props";
import { useComponentSlots } from "./styles";
import type { SlotViewsBySlot } from "./styles";

const [INDICATION] = calendarCellAnatomy.indication;

/** What a calendar cell takes. */
export interface CalendarCellProps {
    readonly view: CalendarView;
    readonly selection: CalendarCellSelection;
    readonly today: boolean;
    readonly outside: boolean;
    readonly disabled: boolean;
    /** What it shows: the day's number, the month's or the year's name. */
    readonly children: string;
    /** Its name for assistive technology: the long date. */
    readonly label: string;
    readonly onPress: () => void;
    /** The picker's per-part props, whose `cell` goes on the cell's root. */
    readonly owner?: PartSlots | undefined;
    /** What the cell is, for a function of the copy in the picker's `cell` key. */
    readonly instance?: CalendarCellInstance | undefined;
}

function CalendarCellImpl(props: CalendarCellProps): ReactNode {
    const slot = nativeSlots(undefined);
    const owner = props.owner ?? slot;
    const indication = useSurfaceIndication(INDICATION, {
        disabled: props.disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<CalendarCellPart>(
        "calendarCell",
        indication.select(
            calendarCellSelectionOf({
                view: props.view,
                selection: props.selection,
                today: props.today,
                outside: props.outside,
            }),
        ),
        indication.states({ disabled: props.disabled }),
    );
    const id = (part: CalendarCellPart) =>
        testIdOf(calendarCellAnatomy, part, undefined);
    // A day is a cell of the month's grid, chosen with `aria-selected` as the web's is; a month or
    // a year is a button in a list, chosen with `aria-pressed`.
    const day = props.view === "day";
    const chosen = props.selection !== "none";
    return (
        <v.root.View
            {...owner.props("cell", props.instance)}
            {...(day
                ? { role: "gridcell" as const, "aria-selected": chosen }
                : {})}
            style={owner.style("cell", s.root, props.instance)}
            testID={id("root")}
        >
            <v.trigger.Pressable
                {...slot.props("trigger")}
                {...slot.with("trigger", indication.handlers)}
                role="button"
                {...(day ? {} : { "aria-pressed": chosen })}
                aria-disabled={props.disabled}
                aria-label={props.label}
                {...(props.today ? { "aria-current": "date" } : {})}
                disabled={props.disabled}
                onPress={slot.on("trigger", "onPress", props.onPress)}
                style={slot.style("trigger", withUnselectable(s.trigger))}
                testID={id("trigger")}
            >
                <IconSlot {...iconSlot(selected, "trigger")} motion={s.trigger}>
                    {props.children}
                </IconSlot>
                {indication.layer(selected)}
            </v.trigger.Pressable>
        </v.root.View>
    );
}

/** A day, month or year of a calendar. */
export const CalendarCell = withEngine(CalendarCellImpl, "CalendarCell");

/** The slots a calendar draws on its picker: theirs share these names. */
type DaySlot = "weekdays" | "weekday" | "grid" | "week";

/** A list of months or years: its slot. */
type ListSlot = "yearList" | "monthList";

/** What the calendar's pieces draw with: the picker's styles, views and test ids. */
export interface CalendarSlots<S extends string> {
    readonly styles: MotionStyles;
    readonly views: SlotViewsBySlot<S>;
    readonly id: (part: S) => string;
    /** The picker's per-part props. */
    readonly slot?: PartSlots | undefined;
}

/** What the day grid takes. */
export interface DayGridProps extends Pick<
    DatePickerBehaviorProps,
    "min" | "max" | "isDateUnavailable" | "disabled"
> {
    readonly slots: CalendarSlots<DaySlot>;
    /** The month shown, as an ISO date in it. */
    readonly month: string;
    readonly selected: readonly string[];
    readonly mode: DateSelectionMode;
    readonly locale: string;
    readonly firstDay: number;
    readonly onChoose: (value: string) => void;
}

const LONG_DATE = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
} as const;

/** The weekday row and the month's weeks of day cells. */
export function DayGrid(props: DayGridProps): ReactNode {
    const slot = props.slots.slot ?? nativeSlots(undefined);
    const { styles: s, views: v, id } = props.slots;
    const eachWeekday = slot.each("weekday");
    const eachWeek = slot.each("week");
    const eachCell = slot.each("cell");
    const shown = parseIsoDate(props.month)!;
    const today = todayIso();
    return (
        <>
            <v.weekdays.View
                {...slot.props("weekdays")}
                style={slot.style("weekdays", s.weekdays)}
                testID={id("weekdays")}
            >
                {weekdayLabels(props.locale, props.firstDay).map(
                    (label, index) => {
                        const each = eachWeekday
                            ? { ...label, index }
                            : undefined;
                        return (
                            <v.weekday.Text
                                {...slot.props("weekday", each)}
                                key={label.long}
                                aria-label={label.long}
                                selectable={false}
                                style={slot.style("weekday", s.weekday, each)}
                                testID={id("weekday")}
                            >
                                {label.narrow}
                            </v.weekday.Text>
                        );
                    },
                )}
            </v.weekdays.View>
            <v.grid.View
                {...slot.props("grid")}
                role="grid"
                style={slot.style("grid", s.grid)}
                testID={id("grid")}
            >
                {monthWeeks(shown, props.firstDay).map((week, index) => (
                    <v.week.View
                        {...slot.props(
                            "week",
                            eachWeek ? { index } : undefined,
                        )}
                        key={week[0]}
                        role="row"
                        style={slot.style(
                            "week",
                            s.week,
                            eachWeek ? { index } : undefined,
                        )}
                        testID={id("week")}
                    >
                        {week.map((day) => {
                            const outside =
                                parseIsoDate(day)!.month !== shown.month;
                            const selection = outside
                                ? "none"
                                : calendarCellSelection(
                                      day,
                                      props.selected,
                                      props.mode,
                                  );
                            const disabled =
                                !!props.disabled ||
                                !isSelectableDate(day, props);
                            return (
                                <CalendarCell
                                    key={day}
                                    view="day"
                                    selection={selection}
                                    today={day === today}
                                    outside={outside}
                                    disabled={disabled}
                                    owner={slot}
                                    instance={
                                        eachCell
                                            ? {
                                                  view: "day",
                                                  value: day,
                                                  selected:
                                                      selection !== "none",
                                                  today: day === today,
                                                  outside,
                                                  disabled,
                                              }
                                            : undefined
                                    }
                                    label={formatIsoDate(
                                        day,
                                        props.locale,
                                        LONG_DATE,
                                    )}
                                    onPress={() => props.onChoose(day)}
                                >
                                    {String(parseIsoDate(day)!.day)}
                                </CalendarCell>
                            );
                        })}
                    </v.week.View>
                ))}
            </v.grid.View>
        </>
    );
}

/** What a list of years or months takes. */
export interface CellListProps<L extends ListSlot> {
    readonly slots: CalendarSlots<L>;
    /** The list's slot: the year list, or the docked picker's month list. */
    readonly part: L;
    readonly view: "month" | "year";
    readonly cells: readonly {
        readonly key: number;
        readonly text: string;
        readonly selected: boolean;
        readonly current: boolean;
        readonly disabled: boolean;
    }[];
    readonly onChoose: (key: number) => void;
}

/** A scrolling list of month or year cells. These do not overflow a day grid; disabled handles
 *  unavailable choices, so outside remains false in all targets' month/year lists. */
export function CellList<L extends ListSlot>(
    props: CellListProps<L>,
): ReactNode {
    const slot = props.slots.slot ?? nativeSlots(undefined);
    const { styles: s, id } = props.slots;
    const each = slot.each("cell");
    const {
        height,
        overflow: _overflow,
        ...content
    } = (s[props.part] ?? {}) as Record<string, unknown>;
    return (
        <ScrollView
            {...slot.props(props.part)}
            style={slot.style(props.part, { height: height as number })}
            contentContainerStyle={content as never}
            testID={id(props.part)}
        >
            {props.cells.map((cell) => (
                <CalendarCell
                    key={cell.key}
                    view={props.view}
                    selection={cell.selected ? "selected" : "none"}
                    today={cell.current}
                    outside={false}
                    disabled={cell.disabled}
                    owner={slot}
                    instance={
                        each
                            ? {
                                  view: props.view,
                                  value: cell.key,
                                  selected: cell.selected,
                                  today: cell.current,
                                  outside: false,
                                  disabled: cell.disabled,
                              }
                            : undefined
                    }
                    label={cell.text}
                    onPress={() => props.onChoose(cell.key)}
                >
                    {cell.text}
                </CalendarCell>
            ))}
        </ScrollView>
    );
}

/** The years a calendar lists: between `min` and `max`, else a century either side of the
 *  shown one. */
export const yearsOf = (
    shown: number,
    props: Pick<DatePickerBehaviorProps, "min" | "max">,
): number[] => {
    const first = props.min ? parseIsoDate(props.min)!.year : shown - 100;
    const last = props.max ? parseIsoDate(props.max)!.year : shown + 100;
    return Array.from(
        { length: last - first + 1 },
        (_, index) => first + index,
    );
};

/** A month's name and year: "August 2026". */
export const monthTitle = (month: string, locale: string): string =>
    formatIsoDate(month, locale, { month: "long", year: "numeric" });

/** The first of the month a selection starts in, or today's. */
export const startMonth = (selected: readonly string[]): string =>
    `${(selected[0] ?? todayIso()).slice(0, 7)}-01`;
