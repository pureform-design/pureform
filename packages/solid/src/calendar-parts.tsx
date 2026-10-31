// The calendar parts the date pickers share (the modal and the docked date picker), over Zag's
// date picker: the previous and next buttons, the weekday row, the grid of weeks, the month and
// year lists, and the cells, each a `calendarCell` component of its own with its own variants
// (its place in the selection, today, outside the shown month). Each picker passes how its parts
// read Root's context: its scope, whose anatomy names these parts, and the machine's API.

import { calendarCellAnatomy } from "@pureform/anatomy";
import type { ComponentAnatomy, PartName } from "@pureform/anatomy";
import {
    calendarCellSelection,
    calendarCellSelectionOf,
    calendarYears,
    isCurrentCalendarPeriod,
} from "@pureform/binding-core";
import type {
    CalendarCellInstance,
    CalendarInstances,
    CalendarView,
    Controllable,
} from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import { scrollCellIntoList } from "@pureform/binding-web";
import * as datePicker from "@pureform/machines/date-picker";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createEffect,
    createMemo,
    For,
    merge,
    omit,
} from "solid-js";

import { useControllable } from "./controllable";
import { ChevronEndIcon, ChevronStartIcon } from "./glyphs";
import { useInteractionHandlers, useOwnInteractionSource } from "./interaction";
import type { PropTypes } from "./internal/zag";
import { useComponent } from "./parts";
import type { PartScope, SlotPropsOf } from "./parts";
import { combinePartProps } from "./props";
import type { PartProps } from "./props";

/** What the calendar parts read of Root's context. */
export interface CalendarContext {
    readonly scope: PartScope<ComponentAnatomy>;
    readonly picker: Accessor<datePicker.Api<PropTypes>>;
    /** The picker's `min` and `max` (ISO dates), which bound the year list. */
    readonly yearBounds?:
        | Accessor<{
              readonly min?: string | undefined;
              readonly max?: string | undefined;
          }>
        | undefined;
}

/** A calendar part's props: the element's own, and the part's `unstyled`. */
export interface CalendarPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A ready-made picker's slot props for the calendar it draws, the repeated parts by copy. */
export type CalendarSlots = SlotPropsOf<
    "weekdays" | "weekday" | "grid" | "week" | "cell",
    CalendarInstances
>;

/** A previous or next button's props: a part's, `mirror` (on by default) to flip its chevron
 *  under `rtl`, and `unit`, what it steps by: the view's page (a month of days), or a year. */
export interface CalendarStepProps extends CalendarPartProps {
    readonly mirror?: boolean | undefined;
    readonly unit?: "page" | "year" | undefined;
    /** Another element or component to render instead of `<button>`: `IconButton`. */
    readonly as?: ValidComponent | undefined;
    /** The icon an `as` component such as `IconButton` draws, as it takes its icon by prop. */
    readonly icon?: JSX.Element | undefined;
}

/** A table's props: a part's, and the view it lays out and how many cells a row holds, for the
 *  arrow keys. */
export interface CalendarTableProps extends CalendarPartProps {
    readonly view?: CalendarView | undefined;
    readonly columns?: number | undefined;
}

/** A cell's props: a day's ISO date, or with `view` a month (1 to 12) or a year; the app's
 *  interaction source; and a part's, which go on the cell's trigger (its `children` too: the
 *  day's number by default). */
export type CalendarCellProps = CalendarPartProps & {
    readonly interactionSource?: MutableInteractionSource | undefined;
    /** The ready-made's slot props, whose `cell` goes on the cell's root. */
    readonly slots?: CalendarSlots | undefined;
} & (
        | { readonly view?: "day" | undefined; readonly value: string }
        | { readonly view: "month" | "year"; readonly value: number }
    );

/** An ISO date as Zag's date value. */
export const parseDate = (value: string): datePicker.DateValue =>
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
    return () => {
        const state = value.machineProps();
        return {
            value: state.value?.map(parseDate),
            defaultValue: state.defaultValue?.map(parseDate),
            onValueChange: (details: {
                readonly value: readonly datePicker.DateValue[];
            }) =>
                state.onValueChange({
                    value: details.value.filter(Boolean).map(datePicker.toISO),
                }),
        };
    };
}

const MONTH_COLUMNS = 1;
const YEAR_COLUMNS = 3;

/** Builds the calendar parts over a picker's context. */
export function calendarParts(use: (name: string) => CalendarContext) {
    const name = (part: string) => part as PartName<ComponentAnatomy>;

    const step = (direction: "prev" | "next", display: string) =>
        function Step(props: CalendarStepProps): JSX.Element {
            const { scope, picker } = use(display);
            const machine = () => {
                const api = picker();
                if (props.unit !== "year") {
                    return direction === "prev"
                        ? api.getPrevTriggerProps({ view: api.view })
                        : api.getNextTriggerProps({ view: api.view });
                }
                const years = direction === "prev" ? -1 : 1;
                return {
                    type: "button",
                    "aria-label":
                        direction === "prev" ? "Previous year" : "Next year",
                    disabled: api.disabled,
                    onClick: () =>
                        picker().setFocusedValue(
                            picker().focusedValue.add({ years }),
                        ),
                };
            };
            const children = {
                get children() {
                    return (
                        // oxlint-disable-next-line solid/components-return-once -- a live props getter the part reads, not a component body
                        props.children ??
                        (direction === "prev" ? (
                            <ChevronStartIcon />
                        ) : (
                            <ChevronEndIcon />
                        ))
                    );
                },
            };
            const merged = merge(
                omit(props, "unstyled", "mirror", "unit", "children", "as"),
                children,
            );
            return scope.render(name(direction), {
                element: "button",
                as: () => props.as,
                machine,
                states: () => ({ mirrored: props.mirror ?? true }),
                unstyled: () => props.unstyled,
                props: merged,
            });
        };

    function Weekdays(props: CalendarPartProps): JSX.Element {
        const { scope, picker } = use("Weekdays");
        const rest = omit(props, "unstyled");
        return scope.render(name("weekdays"), {
            element: "div",
            machine: () => ({
                ...picker().getTableHeadProps({ view: "day" }),
                role: "row",
            }),
            unstyled: () => props.unstyled,
            props: rest,
        });
    }

    function Weekday(props: CalendarPartProps): JSX.Element {
        const { scope, picker } = use("Weekday");
        const rest = omit(props, "unstyled");
        return scope.render(name("weekday"), {
            element: "span",
            machine: () => ({
                ...picker().getTableHeaderProps({ view: "day" }),
                role: "columnheader",
            }),
            unstyled: () => props.unstyled,
            props: rest,
        });
    }

    const table = (
        part: string,
        display: string,
        defaults: { view: CalendarView; columns: number },
    ) =>
        function Table(props: CalendarTableProps): JSX.Element {
            const { scope, picker } = use(display);
            const rest = omit(props, "unstyled", "view", "columns");
            return scope.render(name(part), {
                element: "div",
                machine: () =>
                    picker().getTableProps({
                        view: props.view ?? defaults.view,
                        columns: props.columns ?? defaults.columns,
                    }),
                unstyled: () => props.unstyled,
                props: rest,
            });
        };

    function Week(props: CalendarTableProps): JSX.Element {
        const { scope, picker } = use("Week");
        const rest = omit(props, "unstyled", "view", "columns");
        return scope.render(name("week"), {
            element: "div",
            machine: () => ({
                ...picker().getTableRowProps({ view: props.view ?? "day" }),
                role: "row",
            }),
            unstyled: () => props.unstyled,
            props: rest,
        });
    }

    function Cell(props: CalendarCellProps): JSX.Element {
        const { scope: owner, picker } = use("Cell");
        const view = (): CalendarView => props.view ?? "day";
        const day = createMemo(() =>
            view() === "day"
                ? datePicker.parse(props.value as string)
                : undefined,
        );
        const columns = () =>
            view() === "month" ? MONTH_COLUMNS : YEAR_COLUMNS;
        const state = createMemo(() => {
            const api = picker();
            if (view() === "day")
                return api.getDayTableCellState({ value: day()! });
            const cell = { value: props.value as number, columns: columns() };
            return view() === "month"
                ? api.getMonthTableCellState(cell)
                : api.getYearTableCellState(cell);
        });
        const selection = () => {
            if (view() === "year")
                return state().value.year === picker().focusedValue.year
                    ? "selected"
                    : "none";
            if (view() !== "day") return state().selected ? "selected" : "none";
            const api = picker();
            return calendarCellSelection(
                props.value as string,
                api.value.map(datePicker.toISO),
                api.selectionMode === "range" ? "range" : "single",
            );
        };
        const today = () =>
            view() === "day"
                ? (state() as datePicker.DayTableCellState).today
                : isCurrentCalendarPeriod(
                      view() as "month" | "year",
                      state().value.year,
                      state().value.month,
                  );
        const instance = (): CalendarCellInstance => ({
            view: view(),
            value: props.value,
            selected: selection() !== "none",
            today: today(),
            // Month/year lists have no overflow-day cells; disabled reports availability.
            outside: view() === "day" && state().outsideRange,
            disabled: state().disabled,
        });
        // oxlint-disable-next-line solid/reactivity -- the parent's slot props function, passed once and never replaced
        const slots = props.slots;
        const rootSlot = slots?.("cell", instance) as
            | CalendarPartProps
            | undefined;
        const source = useOwnInteractionSource(() => props.interactionSource);
        const handlers = useInteractionHandlers(
            source,
            () => !state().selectable,
        );
        const cell = useComponent(calendarCellAnatomy, {
            selection: () =>
                calendarCellSelectionOf({
                    view: view(),
                    selection: selection(),
                    today: today(),
                    outside: view() === "day" && state().outsideRange,
                }),
            interactionSource: source,
        });
        const cellProps = () => {
            const api = picker();
            if (view() === "day") {
                return [
                    api.getDayTableCellProps({ value: day()! }),
                    api.getDayTableCellTriggerProps({ value: day()! }),
                ] as const;
            }
            const value = { value: props.value as number, columns: columns() };
            return view() === "month"
                ? ([
                      api.getMonthTableCellProps(value),
                      api.getMonthTableCellTriggerProps(value),
                  ] as const)
                : ([
                      api.getYearTableCellProps(value),
                      api.getYearTableCellTriggerProps(value),
                  ] as const);
        };
        const content = {
            get children() {
                return (
                    props.children ??
                    (view() === "day" ? String(day()!.day) : state().valueText)
                );
            },
        };
        const merged = merge(
            omit(
                props,
                "unstyled",
                "interactionSource",
                "view",
                "value",
                "children",
                "slots",
            ),
            content,
        );
        const trigger = cell.render("trigger", {
            element: "div",
            interactionSource: source,
            machine: () =>
                combinePartProps([
                    cellProps()[1] as Record<string, unknown>,
                    handlers(),
                ]),
            unstyled: () => props.unstyled,
            props: merged,
        });
        return cell.render("root", {
            element: "div",
            machine: () => cellProps()[0],
            unstyled: () => rootSlot?.unstyled,
            // The picker's own `cell` props from the provider come with the calendar cell's, and
            // an instance's `cell` key, which is `rootSlot`, wins over both.
            owner: { component: owner.anatomy.name, part: "cell" },
            props: rootSlot
                ? // oxlint-disable-next-line solid/reactivity -- an optional slot's props, passed straight to render
                  merge(omit(rootSlot, "unstyled"), { children: trigger })
                : { children: trigger },
        });
    }

    /** The weekday row and the grid of the shown month's days, ready-made, with the ready-made
     *  picker's slot props. */
    function DayCalendar(props: {
        readonly slots?: CalendarSlots | undefined;
    }): JSX.Element {
        const { picker } = use("DayCalendar");
        // oxlint-disable-next-line solid/reactivity -- the parent's slot props function, passed once and never replaced
        const slots = props.slots;
        const weekdays = slots?.("weekdays");
        const grid = slots?.("grid");
        return (
            <>
                <Weekdays {...weekdays}>
                    <For each={picker().weekDays} keyed={false}>
                        {(weekday, index) => {
                            const label = slots?.("weekday", () => ({
                                index,
                                long: weekday().long,
                                narrow: weekday().narrow,
                            }));
                            return (
                                <Weekday aria-label={weekday().long} {...label}>
                                    {weekday().narrow}
                                </Weekday>
                            );
                        }}
                    </For>
                </Weekdays>
                <Grid {...grid}>
                    <For each={picker().weeks} keyed={false}>
                        {(week, index) => {
                            const row = slots?.("week", () => ({ index }));
                            return (
                                <Week {...row}>
                                    <For each={week()} keyed={false}>
                                        {(date) => (
                                            <Cell
                                                value={datePicker.toISO(date())}
                                                slots={slots}
                                            />
                                        )}
                                    </For>
                                </Week>
                            );
                        }}
                    </For>
                </Grid>
            </>
        );
    }

    // One scrollable list of years, as Material's, anchored on the chosen date's year (or this
    // one) so it stays put as it is used. Plain numbers, so a focus move that leaves the range as
    // it was updates no cell.
    function YearCells(props: {
        readonly slots?: CalendarSlots | undefined;
    }): JSX.Element {
        const { picker, yearBounds } = use("ListCells");
        const years = createMemo(() =>
            calendarYears(
                picker().value[0]?.year ?? new Date().getFullYear(),
                yearBounds?.() ?? {},
                picker().focusedValue.year,
            ),
        );
        let opened = true;
        createEffect(
            () => picker().focusedValue.year,
            (focused) => {
                const id = picker().getYearTableCellTriggerProps({
                    value: focused,
                    columns: YEAR_COLUMNS,
                }).id as string;
                const cell = document.getElementById(id);
                const list = cell?.closest<HTMLElement>('[role="grid"]');
                if (cell && list) scrollCellIntoList(list, cell, opened);
                opened = false;
            },
        );
        return (
            <For each={years()} keyed={false}>
                {(year) => (
                    <Cell view="year" value={year()} slots={props.slots}>
                        {String(year())}
                    </Cell>
                )}
            </For>
        );
    }

    function MonthCells(props: {
        readonly slots?: CalendarSlots | undefined;
    }): JSX.Element {
        const { picker } = use("ListCells");
        const cells = () =>
            picker()
                .getMonthsGrid({ columns: MONTH_COLUMNS, format: "long" })
                .flat();
        return (
            <For each={cells()} keyed={false}>
                {(cell) => (
                    <Cell view="month" value={cell().value} slots={props.slots}>
                        {cell().label}
                    </Cell>
                )}
            </For>
        );
    }

    const Grid = table("grid", "Grid", { view: "day", columns: 7 });

    return {
        Prev: step("prev", "Prev"),
        Next: step("next", "Next"),
        Weekdays,
        Weekday,
        Grid,
        Week,
        Cell,
        MonthList: table("monthList", "MonthList", {
            view: "month",
            columns: MONTH_COLUMNS,
        }),
        YearList: table("yearList", "YearList", {
            view: "year",
            columns: YEAR_COLUMNS,
        }),
        DayCalendar,
        MonthCells,
        YearCells,
    };
}
