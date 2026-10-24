// The modal date picker: Root on Zag's dialog machine (the shared dialog parts: the trigger, the
// backdrop drawn by the scrim, the positioner and the surface), and inside it Zag's date picker
// running inline over a draft: the draft starts from the confirmed `value` each time the dialog
// opens, the confirm action commits it (`onValueChange`) and closes, and the cancel action closes
// and drops it. The calendar's parts are the shared ones, each cell a `calendarCell` of its own.

import {
    datePickerBackdropAnatomy,
    datePickerOverlayAnatomy,
} from "@pureform/anatomy";
import type {
    buttonAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import {
    DATE_PICKER_CONTENT_PROPS,
    DATE_PICKER_ROOT_PROPS,
    dateMachineProps,
    datePickerSelection,
    dialogPositionerLayout,
    isPresent,
    pickerLocale,
    selectedDateText,
} from "@pureform/binding-core";
import type {
    CalendarInstances,
    DatePickerContentProps,
    DatePickerPart,
    DatePickerRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import * as datePicker from "@pureform/machines/date-picker";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createEffect,
    createMemo,
    createSignal,
    createUniqueId,
    merge,
    omit,
    Show,
    untrack,
} from "solid-js";

import { Button } from "../button";
import { calendarParts, parseDate } from "../calendar-parts";
import type {
    CalendarCellProps,
    CalendarContext,
    CalendarPartProps,
    CalendarStepProps,
    CalendarTableProps,
} from "../calendar-parts";
import { useControllable } from "../controllable";
import { dialogParts } from "../dialog-parts";
import { DropDownArrow, EditIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, plainParts, asRoot } from "../parts";
import type {
    ComponentScope,
    InnerPropsOf,
    SlotKeyedProps,
    SlotPropsOf,
} from "../parts";
import { pickerAction } from "../picker-actions";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof datePickerOverlayAnatomy;

/** Root's props: the tokens, the dates' props (`value`, `selectionMode`, `locale`, `min`, …), the
 *  dialog's (`open`, `closeOnEscape`, …), `testId` and `unstyled` for every part, `as`, and the
 *  element's own props. */
export interface DatePickerRootProps
    extends
        Omit<PartProps, keyof DatePickerRootOwnProps>,
        DatePickerRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export type DatePickerPartProps = CalendarPartProps;

/** A trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface DatePickerTriggerProps extends DatePickerPartProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

export type {
    CalendarCellProps as DatePickerCellProps,
    CalendarStepProps as DatePickerStepProps,
    CalendarTableProps as DatePickerTableProps,
};

/** The open picker's day in the tab order. */
const openDay = (): HTMLElement | null =>
    document.querySelector<HTMLElement>(
        '[data-scope="date-picker"][data-pf-part="content"][data-state="open"] [data-scope="calendar-cell"][data-pf-part="trigger"][tabindex="0"]',
    );

const chrome = dialogParts({
    name: "DatePicker",
    anatomy: datePickerOverlayAnatomy,
    backdropAnatomy: datePickerBackdropAnatomy,
    rootProps: DATE_PICKER_ROOT_PROPS,
    selection: (props: DatePickerRootProps) => datePickerSelection(props),
    machineProps: (props: DatePickerRootProps) => ({
        closeOnEscape: props.closeOnEscape,
        closeOnInteractOutside: props.closeOnInteractOutside,
        restoreFocus: props.restoreFocus,
        // Focus goes to the chosen day (or today), the one in the tab order, as it opens.
        initialFocusEl: openDay,
    }),
    positionerLayout: (present) => dialogPositionerLayout(present),
});

/** What the picker inside the dialog shares with its parts. */
interface PickerContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly picker: Accessor<datePicker.Api<PropTypes>>;
    /** The dates chosen in the calendar, not yet confirmed. */
    readonly draft: Accessor<readonly string[]>;
    readonly locale: Accessor<string>;
    readonly confirm: () => void;
    readonly cancel: () => void;
}

const pickerContext = createPartContext<PickerContextValue>("DatePicker");

// Inside the dialog's Root: runs the calendar over the draft.
function Picker(props: {
    readonly root: DatePickerRootProps;
    readonly children?: JSX.Element;
}): JSX.Element {
    const { scope, api: dialog } = chrome.context.use("Root");
    const root = props.root;
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<
        "value",
        readonly string[],
        { readonly value: readonly string[] }
    >("DatePicker", "value", root);
    const [own, setOwn] = createSignal<readonly string[]>(
        value.defaultValue ?? [],
    );
    const confirmed = () =>
        value.controlled() ? (value.value() ?? []) : own();
    const [draft, setDraft] = createSignal<readonly string[]>(
        untrack(confirmed),
    );
    const service = useMachine(datePicker.machine, () => ({
        id,
        dir: dir(),
        ...dateMachineProps(root, parseDate),
        inline: true,
        closeOnSelect: false,
        // Zag finds the focused day inside its content: here, the dialog's.
        ids: {
            content: (dialog().getContentProps() as { id?: string }).id,
        },
        value: draft().map(parseDate),
        onValueChange: (details: datePicker.ValueChangeDetails) =>
            setDraft(details.value.map(datePicker.toISO)),
        // Material's picker goes from the years straight back to the days.
        onViewChange: (details: datePicker.ViewChangeDetails) => {
            if (details.view === "month") picker().setView("day");
        },
    }));
    const picker = createMemo(() =>
        datePicker.connect(service, normalizeProps),
    );
    // Each opening starts over from the confirmed dates, on the day view of the first.
    createEffect(
        () => dialog().open,
        (open) => {
            if (!open) return;
            const dates = confirmed();
            setDraft(dates);
            const api = picker();
            api.setView("day");
            if (dates[0]) api.setFocusedValue(parseDate(dates[0]));
        },
    );
    const confirm = () => {
        const dates = draft();
        if (!value.controlled()) setOwn(dates);
        value.machineProps().onValueChange({ value: dates });
        dialog().setOpen(false);
    };
    return (
        <pickerContext.Provider
            value={{
                scope: scope as unknown as ComponentScope<Anatomy>,
                picker,
                draft,
                locale: () => pickerLocale(root),
                confirm,
                cancel: () => dialog().setOpen(false),
            }}
        >
            {props.children}
            <Show when={root.name}>
                <input
                    type="hidden"
                    name={root.name}
                    value={confirmed().join(",")}
                />
            </Show>
        </pickerContext.Provider>
    );
}

/** The date picker's root, a `<div>` around the trigger and the dialog. The registry doesn't
 *  style it. */
function Root(props: DatePickerRootProps): JSX.Element {
    return (
        <chrome.Root {...props}>
            <Picker root={props}>{props.children}</Picker>
        </chrome.Root>
    );
}

/** The button that opens the dialog. */
const Trigger: (props: DatePickerTriggerProps) => JSX.Element = chrome.Trigger;

/** Dims the page behind the dialog, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. */
const Backdrop: (props: DatePickerPartProps) => JSX.Element = chrome.Backdrop;

/** Covers the viewport and centers the dialog; hidden once it's closed and its exit animation is
 *  over. The registry doesn't style it. */
const Positioner: (props: DatePickerPartProps) => JSX.Element =
    chrome.Positioner;

/** The picker's surface, the dialog. It stays while its exit animation runs. */
const Content: (props: DatePickerPartProps) => JSX.Element = chrome.Content;

const block = plainParts<Anatomy>(pickerContext.use, "div");
const inline = plainParts<Anatomy>(pickerContext.use, "span");

/** The header: the headline, the selected date, and the mode toggle. */
const Header = block<DatePickerPartProps>("header", "Header");

/** The title, an `<h2>`, which names the dialog. */
const Headline: (props: DatePickerPartProps) => JSX.Element = chrome.part(
    "headline",
    "Headline",
    "h2",
    (api) => api.getTitleProps(),
);

/** The chosen date, or a placeholder. */
const SelectedDate = inline<DatePickerPartProps>(
    "selectedDate",
    "SelectedDate",
);

/** The button that switches to the date input: `as={IconButton}` draws it as one. */
const ModeToggle: (props: DatePickerTriggerProps) => JSX.Element =
    chrome.trigger("modeToggle", "ModeToggle", () => ({ type: "button" }));

/** The line under the header, an `<hr>`. */
function Divider(props: DatePickerPartProps): JSX.Element {
    const { scope } = pickerContext.use("Divider");
    return scope.render("divider", {
        element: "hr",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The row of the view trigger and the previous and next buttons. */
const Controls = block<DatePickerPartProps>("controls", "Controls");

/** Switches between the days and the years; shows the month and year shown, and an arrow. */
function ViewTrigger(props: DatePickerPartProps): JSX.Element {
    const { scope, picker, locale } = pickerContext.use("ViewTrigger");
    const children = {
        get children() {
            return (
                props.children ?? (
                    <>
                        {new Intl.DateTimeFormat(locale(), {
                            month: "long",
                            year: "numeric",
                            timeZone: "UTC",
                        }).format(
                            new Date(
                                `${datePicker.toISO(picker().focusedValue)}T00:00:00Z`,
                            ),
                        )}
                        <DropDownArrow />
                    </>
                )
            );
        },
    };
    return scope.render("viewTrigger", {
        element: "button",
        machine: () => {
            const api = picker();
            return {
                ...api.getViewTriggerProps({ view: api.view }),
                // Its text, the month and year, names it.
                "aria-label": undefined,
                onClick: () =>
                    picker().setView(picker().view === "day" ? "year" : "day"),
            };
        },
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled", "children"), children),
    });
}

const calendar = calendarParts((name) => {
    const { scope, picker } = pickerContext.use(name);
    return {
        scope: scope as unknown as CalendarContext["scope"],
        picker,
    };
});

/** The button that shows the previous month (or the previous years). Its chevron flips under
 *  `rtl` unless `mirror={false}`. */
const Prev: (props: CalendarStepProps) => JSX.Element = calendar.Prev;
/** The button that shows the next month (or the next years). */
const Next: (props: CalendarStepProps) => JSX.Element = calendar.Next;
/** The row of weekday labels. */
const Weekdays: (props: DatePickerPartProps) => JSX.Element = calendar.Weekdays;
/** A weekday's label: the narrow one, named by the long one (`aria-label`). */
const Weekday: (props: DatePickerPartProps) => JSX.Element = calendar.Weekday;
/** The grid of the shown month's weeks. The arrow keys move between days, Enter chooses one. */
const Grid: (props: CalendarTableProps) => JSX.Element = calendar.Grid;
/** A week, a row of seven cells. */
const Week: (props: CalendarTableProps) => JSX.Element = calendar.Week;
/** A day (or, with `view`, a year), drawn by the `calendarCell` component. */
const Cell: (props: CalendarCellProps) => JSX.Element = calendar.Cell;
/** The years, in the year view, each a `Cell` with `view="year"`. */
const YearList: (props: CalendarTableProps) => JSX.Element = calendar.YearList;

/** The buttons at the end. */
const Actions = block<DatePickerPartProps>("actions", "Actions");

/** Commits the chosen dates and closes the dialog: `as={Button}` draws it as a button. */
const ConfirmTrigger = pickerAction(
    "ConfirmTrigger",
    (name) => pickerContext.use(name).confirm,
);
/** Closes the dialog and drops the dates chosen since it opened. */
const CancelTrigger = pickerAction(
    "CancelTrigger",
    (name) => pickerContext.use(name).cancel,
);

/** The ready-made date picker's props: Root's, with `class`, `style`, `slotProps` and
 *  `unstyled` keyed by part (the backdrop's too, and `cell` for each calendar cell; a cell, week
 *  or weekday also by copy, `CalendarInstances`), and the trigger's label, the headline, the placeholder, the actions' labels, and the mode
 *  toggle as content. */
export interface DatePickerProps
    extends
        Omit<
            DatePickerRootProps,
            keyof SlotKeyedProps<Anatomy, "backdrop"> | "children"
        >,
        SlotKeyedProps<Anatomy, Extra, CalendarInstances>,
        DatePickerContentProps<JSX.Element> {
    readonly testId?: TestIdOverride<DatePickerPart>;
    readonly unstyled?: Unstyled<DatePickerPart | "cell", CalendarInstances>;
    /** The Cancel action, drawn as a button. */
    readonly cancelButtonProps?: ButtonInnerProps | undefined;
    /** The OK action, drawn as a button. */
    readonly confirmButtonProps?: ButtonInnerProps | undefined;
}

type ButtonInnerProps = InnerPropsOf<typeof buttonAnatomy>;

type Extra = "backdrop" | "cell";

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "cancelButtonProps",
    "confirmButtonProps",
    ...DATE_PICKER_CONTENT_PROPS,
] as const;

// Inside Root, so it reads the draft and the view.
function ReadyMadeContent(props: {
    readonly own: DatePickerProps;
    readonly slots: SlotPropsOf<PartName<Anatomy> | Extra, CalendarInstances>;
}): JSX.Element {
    const { picker, draft, locale } = pickerContext.use("Root");
    const own = props.own;
    const slots = props.slots;
    return (
        <>
            <Header {...slots("header")}>
                <Headline {...slots("headline")}>
                    {isPresent(own.headline) ? own.headline : "Select date"}
                </Headline>
                <SelectedDate {...slots("selectedDate")}>
                    {selectedDateText(draft(), locale()) ??
                        (isPresent(own.placeholder)
                            ? own.placeholder
                            : "Selected date")}
                </SelectedDate>
                <Show when={own.onModeToggle}>
                    <ModeToggle
                        as={IconButton}
                        icon={<EditIcon />}
                        aria-label={
                            own.modeToggleLabel ?? "Switch to text input"
                        }
                        onClick={() => own.onModeToggle?.()}
                        {...asRoot(slots("modeToggle") as object)}
                    />
                </Show>
            </Header>
            <Divider {...slots("divider")} />
            <Controls {...slots("controls")}>
                <ViewTrigger {...slots("viewTrigger")} />
                <Show when={picker().view === "day"}>
                    <Prev as={IconButton} {...asRoot(slots("prev"))} />
                    <Next as={IconButton} {...asRoot(slots("next"))} />
                </Show>
            </Controls>
            <Show
                when={picker().view === "day"}
                fallback={
                    <YearList {...slots("yearList")}>
                        <calendar.YearCells slots={slots} />
                    </YearList>
                }
            >
                <calendar.DayCalendar slots={slots} />
            </Show>
            <Actions {...slots("actions")}>
                <CancelTrigger
                    {...own.cancelButtonProps}
                    as={Button}
                    variant="text"
                    label={
                        isPresent(own.cancelLabel) ? own.cancelLabel : "Cancel"
                    }
                />
                <ConfirmTrigger
                    {...own.confirmButtonProps}
                    as={Button}
                    variant="text"
                    label={
                        isPresent(own.confirmLabel) ? own.confirmLabel : "OK"
                    }
                />
            </Actions>
        </>
    );
}

/** The ready-made date picker: the trigger, drawn as a button, when given a label, the backdrop,
 *  and the dialog with the header, the calendar (the days, or the years), and Cancel and OK. */
function ReadyMade(props: DatePickerProps): JSX.Element {
    const slots = createSlotProps<Anatomy, Extra, CalendarInstances>(props);
    const backdrop = slots("backdrop");
    const own = omit(props, ...READY_MADE_PROPS) as DatePickerRootProps;
    return (
        <Root {...own} {...(slots("root") as object)}>
            <Show when={isPresent(props.trigger)}>
                <Trigger
                    as={Button}
                    label={props.trigger}
                    {...asRoot(slots("trigger") as object)}
                />
            </Show>
            <Backdrop {...backdrop} />
            <Positioner {...slots("positioner")}>
                <Content {...slots("content")}>
                    <ReadyMadeContent own={props} slots={slots} />
                </Content>
            </Positioner>
        </Root>
    );
}

/** Material's modal date picker. Use it ready-made, `<DatePicker trigger="Pick a date"
 *  onValueChange={…} />`, or compose its parts under `DatePicker.Root`: `Trigger`, `Backdrop`,
 *  then `Positioner` holding `Content`, which holds `Header` (`Headline`, `SelectedDate`,
 *  `ModeToggle`), `Divider`, `Controls` (`ViewTrigger`, `Prev`, `Next`), `Weekdays` of `Weekday`s
 *  and `Grid` of `Week`s of `Cell`s (or `YearList` of year `Cell`s), and `Actions` (with
 *  `CancelTrigger` and `ConfirmTrigger`). */
export const DatePicker = Object.assign(ReadyMade, {
    Root,
    Trigger,
    Backdrop,
    Positioner,
    Content,
    Header,
    Headline,
    SelectedDate,
    ModeToggle,
    Divider,
    Controls,
    ViewTrigger,
    Prev,
    Next,
    Weekdays,
    Weekday,
    Grid,
    Week,
    Cell,
    YearList,
    Actions,
    CancelTrigger,
    ConfirmTrigger,
});
