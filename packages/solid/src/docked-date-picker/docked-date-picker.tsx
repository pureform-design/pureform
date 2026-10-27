// The docked date picker: Root on Zag's date picker as a popover, the field's parts as the preset
// draws them (the date typed into the input in the locale's format, which Zag reads once the
// field loses focus or on Enter; the trailing icon a button that opens the calendar), and the
// calendar's popup under the field (Zag's positioner) with the month and year controls, the
// shared calendar parts, and the month and year lists. Choosing a date sets `value` and closes it.

import { dockedDatePickerOverlayAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    dateFormatHint,
    DOCKED_DATE_PICKER_CONTENT_PROPS,
    DOCKED_DATE_PICKER_ROOT_PROPS,
    dockedDatePickerSelection,
    isPresent,
    pickerLocale,
} from "@pureform/binding-core";
import type {
    CalendarInstances,
    Unstyled,
    DockedDatePickerContentProps,
    DockedDatePickerRootOwnProps,
} from "@pureform/binding-core";
import { dateMachineProps, presentProps } from "@pureform/binding-web";
import * as datePicker from "@pureform/machines/date-picker";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    Match,
    merge,
    omit,
    Show,
    Switch,
} from "solid-js";

import { calendarParts, parseDate, useDateValue } from "../calendar-parts";
import type {
    CalendarCellProps,
    CalendarContext,
    CalendarPartProps,
    CalendarStepProps,
    CalendarTableProps,
} from "../calendar-parts";
import { useControllable } from "../controllable";
import { CalendarIcon, DropDownArrow } from "../glyphs";
import { IconButton } from "../icon-button";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, plainParts, useComponent, asRoot } from "../parts";
import type { ComponentScope, SlotKeyedProps, SlotPropsOf } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { affixFieldParts } from "../select-field-parts";

type Anatomy = typeof dockedDatePickerOverlayAnatomy;

/** What Root shares with its parts. */
interface DockedContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<datePicker.Api<PropTypes>>;
    readonly supportingTextId: Accessor<string>;
    readonly errorText: Accessor<string | undefined>;
    readonly presence: Presence;
    readonly filled: Accessor<boolean>;
    readonly setText: (text: string) => void;
    readonly locale: Accessor<string>;
}

const context = createPartContext<DockedContextValue>("DockedDatePicker");

/** Root's props: the variants and tokens, the dates' props (`value`, `locale`, `min`, …), `open`,
 *  `closeOnSelect`, `error`, `testId` and `unstyled` for every part, `as`, and the element's own
 *  props. */
export interface DockedDatePickerRootProps
    extends
        Omit<PartProps, keyof DockedDatePickerRootOwnProps>,
        DockedDatePickerRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export type DockedDatePickerPartProps = CalendarPartProps;

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface DockedDatePickerIconProps extends DockedDatePickerPartProps {
    readonly mirror?: boolean | undefined;
}

export type {
    CalendarCellProps as DockedDatePickerCellProps,
    CalendarStepProps as DockedDatePickerStepProps,
    CalendarTableProps as DockedDatePickerTableProps,
};

/** The docked date picker's root, a `<div>` around the field, the supporting text, and the
 *  calendar's popup. */
function Root(props: DockedDatePickerRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useDateValue("DockedDatePicker", props);
    const open = useControllable<"open", boolean>(
        "DockedDatePicker",
        "open",
        props,
    );
    const [text, setText] = createSignal("");
    // Material's docked picker goes from the years straight back to the days.
    let lastView: datePicker.DateView = "day";
    const service = useMachine(datePicker.machine, () => {
        return {
            id,
            dir: dir(),
            ...dateMachineProps(props, parseDate),
            invalid: props.invalid || props.error !== undefined,
            // The format, as the supporting text shows it: the preset shows it once the
            // field is focused and the label has floated (Material's hint).
            placeholder: dateFormatHint(pickerLocale(props)),
            closeOnSelect: props.closeOnSelect ?? true,
            ...value(),
            onViewChange: (details: datePicker.ViewChangeDetails) => {
                const from = lastView;
                lastView = details.view;
                if (from === "year" && details.view === "month")
                    api().setView("day");
            },
            ...open.machineProps(),
        };
    });
    const api = createMemo(() => datePicker.connect(service, normalizeProps));
    const presence = usePresence(() => api().open);
    const scope = useComponent(dockedDatePickerOverlayAnatomy, {
        selection: () => dockedDatePickerSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider
            value={{
                scope,
                api,
                supportingTextId: () => `${id}-supporting-text`,
                errorText: () => props.error || undefined,
                presence,
                filled: () => text() !== "" || api().value.length > 0,
                setText,
                locale: () => pickerLocale(props),
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...DOCKED_DATE_PICKER_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The filled or outlined box holding the icons, the input, and the label; filled while the
 *  input holds text, so the label floats. */
function Container(props: DockedDatePickerPartProps): JSX.Element {
    const { scope, api, filled } = context.use("Container");
    return scope.render("container", {
        element: "div",
        machine: () => api().getControlProps(),
        states: () => ({ filled: filled() }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The date as text, in the locale's format: Zag reads it once the field loses focus, or on
 *  Enter. */
function Input(props: DockedDatePickerPartProps): JSX.Element {
    const { scope, api, setText } = context.use("Input");
    let element: HTMLInputElement | undefined;
    const read = () => setText(element?.value ?? "");
    return scope.render("input", {
        element: "input",
        ref: (node) => {
            element = node as HTMLInputElement;
        },
        machine: () =>
            combinePartProps([
                api().getInputProps() as Record<string, unknown>,
                { onInput: read, onFocusOut: () => setTimeout(read) },
            ]),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

const field = affixFieldParts(context.use);

/** The floating label. */
const Label: (props: DockedDatePickerPartProps) => JSX.Element = field.Label;
/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
const LeadingIcon: (props: DockedDatePickerIconProps) => JSX.Element =
    field.LeadingIcon;
/** Text before the input's. Turn on Root's `prefixText` with it. */
const PrefixText: (props: DockedDatePickerPartProps) => JSX.Element =
    field.PrefixText;
/** Text after the input's. Turn on Root's `suffixText` with it. */
const SuffixText: (props: DockedDatePickerPartProps) => JSX.Element =
    field.SuffixText;
/** Helper text under the field (the date's format, say). With an `error`, it shows the error. */
const SupportingText: (props: DockedDatePickerPartProps) => JSX.Element =
    field.SupportingText;

/** The button at the end that opens or closes the calendar. Name it with `aria-label`. */
function TrailingIcon(props: DockedDatePickerIconProps): JSX.Element {
    const { scope, api } = context.use("TrailingIcon");
    const children = {
        get children() {
            return props.children ?? <CalendarIcon />;
        },
    };
    return scope.render("trailingIcon", {
        element: "button",
        machine: () => api().getTriggerProps(),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled", "mirror", "children"), children),
    });
}

/** Places the calendar under the field; hidden once it's closed and its exit animation is over.
 *  The registry doesn't style it. */
function Positioner(props: DockedDatePickerPartProps): JSX.Element {
    const { scope, api, presence } = context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        machine: () =>
            presentProps(api().getPositionerProps(), presence.present()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The calendar's popup. It stays while its exit animation runs. */
function Content(props: DockedDatePickerPartProps): JSX.Element {
    const { scope, api, presence } = context.use("Content");
    return scope.render("content", {
        element: "div",
        ref: presence.ref,
        machine: () =>
            presentProps(api().getContentProps(), presence.present()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

const block = plainParts<Anatomy>(context.use, "div");

/** The row of the month's and the year's controls. */
const Controls = block<DockedDatePickerPartProps>("controls", "Controls");
/** The buttons at the end. */
const Actions = block<DockedDatePickerPartProps>("actions", "Actions");

const viewButton = (
    part: "monthButton" | "yearButton",
    display: string,
    view: "month" | "year",
) =>
    function ViewButton(props: DockedDatePickerPartProps): JSX.Element {
        const { scope, api, locale } = context.use(display);
        const children = {
            get children() {
                return (
                    props.children ?? (
                        <>
                            {view === "month"
                                ? new Intl.DateTimeFormat(locale(), {
                                      month: "short",
                                      timeZone: "UTC",
                                  }).format(
                                      new Date(
                                          Date.UTC(
                                              2026,
                                              api().focusedValue.month - 1,
                                              1,
                                          ),
                                      ),
                                  )
                                : String(api().focusedValue.year)}
                            <DropDownArrow />
                        </>
                    )
                );
            },
        };
        return scope.render(part, {
            element: "button",
            machine: () => ({
                type: "button",
                disabled: api().disabled,
                "aria-expanded": String(api().view === view),
                onClick: () =>
                    api().setView(api().view === view ? "day" : view),
            }),
            unstyled: () => props.unstyled,
            props: merge(omit(props, "unstyled", "children"), children),
        });
    };

/** Shows the months to choose from, or the days again; shows the month. */
const MonthButton = viewButton("monthButton", "MonthButton", "month");
/** Shows the years to choose from, or the days again; shows the year. */
const YearButton = viewButton("yearButton", "YearButton", "year");

const calendar = calendarParts((name) => {
    const { scope, api } = context.use(name);
    return {
        scope: scope as unknown as CalendarContext["scope"],
        picker: api,
    };
});

/** The button that shows the previous month, or with `unit="year"` the previous year. Its
 *  chevron flips under `rtl` unless `mirror={false}`. */
const Prev: (props: CalendarStepProps) => JSX.Element = calendar.Prev;
/** The button that shows the next month, or with `unit="year"` the next year. */
const Next: (props: CalendarStepProps) => JSX.Element = calendar.Next;
/** The row of weekday labels. */
const Weekdays: (props: DockedDatePickerPartProps) => JSX.Element =
    calendar.Weekdays;
/** A weekday's label: the narrow one, named by the long one (`aria-label`). */
const Weekday: (props: DockedDatePickerPartProps) => JSX.Element =
    calendar.Weekday;
/** The grid of the shown month's weeks. The arrow keys move between days, Enter chooses one. */
const Grid: (props: CalendarTableProps) => JSX.Element = calendar.Grid;
/** A week, a row of seven cells. */
const Week: (props: CalendarTableProps) => JSX.Element = calendar.Week;
/** A day (or, with `view`, a month or a year), drawn by the `calendarCell` component. */
const Cell: (props: CalendarCellProps) => JSX.Element = calendar.Cell;
/** The months, one a row, each a `Cell` with `view="month"`. */
const MonthList: (props: CalendarTableProps) => JSX.Element =
    calendar.MonthList;
/** The years, each a `Cell` with `view="year"`. */
const YearList: (props: CalendarTableProps) => JSX.Element = calendar.YearList;

/** The ready-made docked date picker's props: Root's, with `class`, `style`, `slotProps` and
 *  `unstyled` keyed by part (and `cell` for each calendar cell; a cell, week or weekday also by
 *  copy, `CalendarInstances`), and the label, supporting text, icons, and the calendar button's name as
 *  content. `aria-label`, `aria-labelledby`, and `aria-describedby` go on the input. */
export interface DockedDatePickerProps
    extends
        Omit<
            DockedDatePickerRootProps,
            | keyof SlotKeyedProps<Anatomy>
            | "children"
            | "leadingIcon"
            | "prefixText"
            | "suffixText"
        >,
        SlotKeyedProps<Anatomy, "cell", CalendarInstances>,
        DockedDatePickerContentProps<JSX.Element> {
    readonly unstyled?: Unstyled<PartName<Anatomy> | "cell", CalendarInstances>;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    ...DOCKED_DATE_PICKER_CONTENT_PROPS,
] as const;

// Inside Root, so it reads the view and whether an error shows.
function ReadyMadeContent(props: {
    readonly own: DockedDatePickerProps;
    readonly slots: SlotPropsOf<PartName<Anatomy> | "cell", CalendarInstances>;
}): JSX.Element {
    const { api, supportingTextId, locale } = context.use("Root");
    const own = props.own;
    const slots = props.slots;
    const view = () => api().view;
    return (
        <>
            <Container {...slots("container")}>
                <Show when={isPresent(own.leadingIcon)}>
                    <LeadingIcon {...slots("leadingIcon")}>
                        {own.leadingIcon}
                    </LeadingIcon>
                </Show>
                <Show when={isPresent(own.prefixText)}>
                    <PrefixText {...slots("prefixText")}>
                        {own.prefixText}
                    </PrefixText>
                </Show>
                <Input
                    aria-label={own["aria-label"]}
                    aria-labelledby={own["aria-labelledby"]}
                    aria-describedby={
                        own["aria-describedby"] ?? supportingTextId()
                    }
                    {...slots("input")}
                />
                <Show when={isPresent(own.suffixText)}>
                    <SuffixText {...slots("suffixText")}>
                        {own.suffixText}
                    </SuffixText>
                </Show>
                <Label {...slots("label")}>{own.label}</Label>
                <TrailingIcon
                    aria-label={own.triggerLabel ?? "Open calendar"}
                    {...slots("trailingIcon")}
                />
            </Container>
            <SupportingText {...slots("supportingText")}>
                {isPresent(own.supportingText)
                    ? own.supportingText
                    : dateFormatHint(locale())}
            </SupportingText>
            <Positioner {...slots("positioner")}>
                <Content {...slots("content")}>
                    <Controls {...slots("controls")}>
                        <Show when={view() === "day"}>
                            <Prev as={IconButton} {...asRoot(slots("prev"))} />
                        </Show>
                        <MonthButton {...slots("monthButton")} />
                        <Show when={view() === "day"}>
                            <Next as={IconButton} {...asRoot(slots("next"))} />
                            <Prev
                                as={IconButton}
                                unit="year"
                                {...asRoot(slots("prev"))}
                            />
                        </Show>
                        <YearButton {...slots("yearButton")} />
                        <Show when={view() === "day"}>
                            <Next
                                as={IconButton}
                                unit="year"
                                {...asRoot(slots("next"))}
                            />
                        </Show>
                    </Controls>
                    <Switch>
                        <Match when={view() === "month"}>
                            <MonthList {...slots("monthList")}>
                                <calendar.MonthCells slots={slots} />
                            </MonthList>
                        </Match>
                        <Match when={view() === "year"}>
                            <YearList {...slots("yearList")}>
                                <calendar.YearCells slots={slots} />
                            </YearList>
                        </Match>
                        <Match when={view() === "day"}>
                            <calendar.DayCalendar slots={slots} />
                        </Match>
                    </Switch>
                </Content>
            </Positioner>
        </>
    );
}

/** The ready-made docked date picker: the field in the preset's structure (the leading icon and
 *  affixes only when given), the supporting text (the date's format by default, or the error),
 *  and the calendar's popup. */
function ReadyMade(props: DockedDatePickerProps): JSX.Element {
    const slots = createSlotProps<Anatomy, "cell", CalendarInstances>(props);
    const own = omit(props, ...READY_MADE_PROPS) as DockedDatePickerRootProps;
    return (
        <Root
            {...own}
            leadingIcon={isPresent(props.leadingIcon) || undefined}
            prefixText={isPresent(props.prefixText) || undefined}
            suffixText={isPresent(props.suffixText) || undefined}
            {...(slots("root") as object)}
        >
            <ReadyMadeContent own={props} slots={slots} />
        </Root>
    );
}

/** Material's docked date picker. Use it ready-made, `<DockedDatePicker label="Date"
 *  onValueChange={…} />`, or compose its parts under `DockedDatePicker.Root`: `Container`
 *  holding `LeadingIcon`, `PrefixText`, `Input`, `SuffixText`, `Label`, and `TrailingIcon`, then
 *  `SupportingText` and `Positioner` holding `Content`, which holds `Controls` (`Prev`,
 *  `MonthButton`, `Next`, and `Prev unit="year"`, `YearButton`, `Next unit="year"`), `Weekdays`
 *  of `Weekday`s and `Grid` of `Week`s of `Cell`s (or `MonthList` or `YearList` of `Cell`s),
 *  and `Actions`. */
export const DockedDatePicker = Object.assign(ReadyMade, {
    Root,
    Container,
    LeadingIcon,
    PrefixText,
    Input,
    SuffixText,
    Label,
    TrailingIcon,
    SupportingText,
    Positioner,
    Content,
    Controls,
    Prev,
    MonthButton,
    Next,
    YearButton,
    Weekdays,
    Weekday,
    Grid,
    Week,
    Cell,
    MonthList,
    YearList,
    Actions,
});
