// The calendar the date pickers share, over Zag's date picker: the previous and next buttons, the
// weekday row, the grid of days and its weeks, the month and year lists, and each day, month or
// year as its own `calendarCell` component, with its own variants and indication. The modal and
// the docked date picker pass their contexts; their Roots run the machine.

import { calendarCellAnatomy } from "@pureform/anatomy";
import type { ComponentAnatomy, TestIdOverride } from "@pureform/anatomy";
import {
    calendarCellSelection,
    calendarCellSelectionOf,
    weekdayLabels,
} from "@pureform/binding-core";
import type {
    CalendarCellPart,
    CalendarCellSelection,
    CalendarView,
    Controllable,
    DateSelectionMode,
    Unstyled,
} from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import * as datePicker from "@pureform/machines/date-picker";
import type { InstanceTokens } from "@pureform/styling";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useMemo, useState } from "react";

import { useControllable } from "./controllable";

import { useInteractionHandlers, useOwnInteractionSource } from "./interaction";
import type { PartContext } from "./part-context";
import { useComponent } from "./parts";
import type { ComponentScope } from "./parts";
import { combinePartProps } from "./props";
import type { PartProps } from "./props";

/** What a picker's Root shares with the calendar's parts. */
export interface CalendarContext {
    readonly scope: ComponentScope<ComponentAnatomy>;
    readonly picker: datePicker.Api<PropTypes>;
    /** The dates the calendar shows chosen, as ISO dates: the draft, in the modal picker. */
    readonly selected: readonly string[];
    readonly selectionMode: DateSelectionMode;
    readonly locale: string;
    readonly weekStart: number;
}

/** A calendar part's props: the element's own, and the part's `unstyled`. */
export interface CalendarPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A table part's props (the grid, a year or month list): a part's, the view it shows, and how
 *  many cells a row holds, which the arrow keys move by. */
export interface CalendarTableProps extends CalendarPartProps {
    readonly columns?: number | undefined;
}

/** A previous or next button's props: a part's, `as` to render a component instead of
 *  `<button>` (`as={IconButton}`), which takes the rest of the props, what it steps by (the
 *  shown view's page by default: a month, or the years shown), and `mirror` to flip it under `rtl`. */
export interface CalendarStepProps extends CalendarPartProps {
    readonly as?: ElementType | undefined;
    readonly unit?: "page" | "month" | "year" | undefined;
    readonly mirror?: boolean | undefined;
    readonly [prop: string]: unknown;
}

/** A cell's props: its date (an ISO date in the day view, a month 1 to 12, or a year), its view,
 *  its own tokens, test ids and `unstyled`, and an interaction source of the app's. Its children
 *  replace the label. */
export interface CalendarCellProps extends Omit<PartProps, "children"> {
    readonly value: string | number;
    /** @default "day" */
    readonly view?: CalendarView | undefined;
    /** The cells a row of its list holds, for the month and year views. */
    readonly columns?: number | undefined;
    readonly tokens?: InstanceTokens<"calendarCell"> | undefined;
    readonly testId?: TestIdOverride<CalendarCellPart> | undefined;
    readonly unstyled?: Unstyled<CalendarCellPart> | undefined;
    readonly interactionSource?: MutableInteractionSource | undefined;
    readonly children?: ReactNode;
}

/** The columns of the month and year lists, unless a part says otherwise. */
export const YEAR_COLUMNS = 3;
export const MONTH_COLUMNS = 3;

type Dict = Readonly<Record<string, unknown>>;

/** An ISO date as Zag's date value. */
export const parseIso = (value: string): datePicker.DateValue =>
    datePicker.parse(value);

/** A Root's controllable `value` (ISO dates) as the props of Zag's date picker or date input,
 *  which take and give date values: `value`, `defaultValue` and `onValueChange`. A date input's
 *  value may hold an empty place, which isn't a date. */
export function useDateValue(
    component: string,
    props: Controllable<
        "value",
        readonly string[],
        { readonly value: readonly string[] }
    >,
) {
    const value = useControllable<
        "value",
        readonly string[],
        { readonly value: readonly string[] }
    >(component, "value", props);
    const valueKey = value.value?.join(",");
    const zagValue = useMemo(() => value.value?.map(parseIso), [valueKey]);
    const [zagDefault] = useState(() => value.defaultValue?.map(parseIso));
    return {
        value: zagValue,
        defaultValue: zagDefault,
        onValueChange: (details: {
            readonly value: readonly datePicker.DateValue[];
        }) =>
            value.machineProps.onValueChange({
                value: details.value.filter(Boolean).map(datePicker.toISO),
            }),
    };
}

/** Builds the calendar's parts over a picker's context. */
export function calendarParts(context: PartContext<CalendarContext>) {
    const part = (name: string) => name as never;

    function Weekdays({ unstyled, ...props }: CalendarPartProps): ReactNode {
        const { scope, picker, locale, weekStart } = context.use("Weekdays");
        return scope.render(part("weekdays"), {
            element: "div",
            // Zag's head, hidden from assistive technology as Zag's is: each day's name
            // already says its weekday.
            machine: {
                ...picker.getTableHeadProps({ view: "day" }),
                role: "row",
            },
            unstyled,
            props: {
                ...props,
                children:
                    props.children ??
                    weekdayLabels(locale, weekStart).map((day) => (
                        <Weekday key={day.long} aria-label={day.long}>
                            {day.narrow}
                        </Weekday>
                    )),
            },
        });
    }

    /** A weekday's label: show the narrow one, and give the long one as `aria-label`. */
    function Weekday({ unstyled, ...props }: CalendarPartProps): ReactNode {
        const { scope, picker } = context.use("Weekday");
        return scope.render(part("weekday"), {
            element: "div",
            machine: {
                ...picker.getTableHeaderProps({ view: "day" }),
                role: "columnheader",
            },
            unstyled,
            props,
        });
    }

    function Grid({ unstyled, columns, ...props }: CalendarTableProps) {
        const { scope, picker } = context.use("Grid");
        return scope.render(part("grid"), {
            element: "div",
            machine: picker.getTableProps({ view: "day", columns }),
            unstyled,
            props: {
                ...props,
                children:
                    props.children ??
                    picker.weeks.map((week) => (
                        <Week key={week[0]!.toString()}>
                            {week.map((day) => (
                                <Cell
                                    key={day.toString()}
                                    value={datePicker.toISO(day)}
                                />
                            ))}
                        </Week>
                    )),
            },
        });
    }

    function Week({ unstyled, ...props }: CalendarPartProps): ReactNode {
        const { scope, picker } = context.use("Week");
        return scope.render(part("week"), {
            element: "div",
            machine: {
                ...picker.getTableRowProps({ view: "day" }),
                role: "row",
            },
            unstyled,
            props,
        });
    }

    const list = (
        slot: "yearList" | "monthList",
        view: "year" | "month",
        name: string,
        fallback: number,
    ) =>
        function List({
            unstyled,
            columns = fallback,
            ...props
        }: CalendarTableProps): ReactNode {
            const { scope, picker } = context.use(name);
            const rows =
                view === "year"
                    ? picker.getYearsGrid({ columns })
                    : picker.getMonthsGrid({ columns, format: "short" });
            return scope.render(part(slot), {
                element: "div",
                machine: picker.getTableProps({ view, columns }),
                unstyled,
                props: {
                    ...props,
                    children:
                        props.children ??
                        rows.flat().map((cell) => (
                            <Cell
                                key={cell.value}
                                view={view}
                                value={cell.value}
                                columns={columns}
                            >
                                {cell.label}
                            </Cell>
                        )),
                },
            });
        };

    /** The years, three a row, each a cell; choosing one goes back to the days. */
    const YearList = list("yearList", "year", "YearList", YEAR_COLUMNS);
    /** The months, each a cell; choosing one goes back to the days. */
    const MonthList = list("monthList", "month", "MonthList", MONTH_COLUMNS);

    const step = (slot: "prev" | "next", name: string, by: 1 | -1) =>
        function Step({
            unstyled,
            as,
            unit = "page",
            mirror,
            ...props
        }: CalendarStepProps): ReactNode {
            const { scope, picker } = context.use(name);
            const stepView = unit === "month" ? "day" : picker.view;
            const machine: Dict =
                unit === "year"
                    ? {
                          type: "button",
                          "aria-label": by < 0 ? "Previous year" : "Next year",
                          onClick: () =>
                              picker.setFocusedValue(
                                  picker.focusedValue.add({ years: by }),
                              ),
                      }
                    : by < 0
                      ? picker.getPrevTriggerProps({ view: stepView })
                      : picker.getNextTriggerProps({ view: stepView });
            return scope.render(part(slot), {
                element: "button",
                as,
                machine,
                states: { mirrored: mirror },
                unstyled,
                props,
            });
        };

    /** Shows the previous page of the view (a month, or the years shown), the previous month
     *  with `unit="month"`, or year with `unit="year"`. */
    const Prev = step("prev", "Prev", -1);
    /** Shows the next page of the view, month with `unit="month"`, or year with
     *  `unit="year"`. */
    const Next = step("next", "Next", 1);

    function Cell({
        value,
        view = "day",
        columns,
        tokens,
        testId,
        unstyled,
        interactionSource,
        children,
        ...props
    }: CalendarCellProps): ReactNode {
        const { picker, selected, selectionMode } = context.use("Cell");
        let root: Dict;
        let trigger: Dict;
        let label: ReactNode;
        let selection: CalendarCellSelection;
        let today = false;
        let outside = false;
        let disabled: boolean;
        if (view === "day") {
            const iso = String(value);
            const date = parseIso(iso);
            const state = picker.getDayTableCellState({ value: date });
            root = picker.getDayTableCellProps({ value: date });
            trigger = picker.getDayTableCellTriggerProps({ value: date });
            label = date.day;
            selection = calendarCellSelection(iso, selected, selectionMode);
            today = state.today;
            outside = state.outsideRange;
            disabled = state.disabled;
        } else {
            const cell = { value: Number(value), columns };
            const state =
                view === "year"
                    ? picker.getYearTableCellState(cell)
                    : picker.getMonthTableCellState(cell);
            root =
                view === "year"
                    ? picker.getYearTableCellProps(cell)
                    : picker.getMonthTableCellProps(cell);
            trigger = combinePartProps([
                view === "year"
                    ? picker.getYearTableCellTriggerProps(cell)
                    : picker.getMonthTableCellTriggerProps(cell),
                // Choosing a year goes back to the days, as choosing a month does.
                view === "year"
                    ? { onClick: () => picker.setView("day") }
                    : undefined,
            ]);
            label = state.valueText;
            selection = state.selected ? "selected" : "none";
            disabled = state.disabled;
        }
        const source = useOwnInteractionSource(interactionSource);
        const handlers = useInteractionHandlers(source, disabled);
        const scope = useComponent(calendarCellAnatomy, {
            selection: calendarCellSelectionOf({
                view,
                selection,
                today,
                outside,
                tokens,
            }),
            testId,
            unstyled,
            interactionSource: source,
        });
        return scope.render("root", {
            element: "div",
            machine: root,
            props: {
                ...props,
                children: scope.render("trigger", {
                    element: "div",
                    machine: combinePartProps([trigger, handlers]),
                    props: { children: children ?? label },
                }),
            },
        });
    }

    return {
        Weekdays,
        Weekday,
        Grid,
        Week,
        Cell,
        YearList,
        MonthList,
        Prev,
        Next,
    };
}
