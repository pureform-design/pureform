// The modal date picker: Root on Zag's dialog machine (the shared dialog parts: the trigger, the
// backdrop drawn by the scrim, the positioner and the surface), and inside it Zag's date picker
// running inline over a draft. The draft starts from the confirmed value each time the dialog
// opens; the confirm action commits it and closes, the cancel action closes and drops it. Each
// day and year is its own `calendarCell`. The ready-made DatePicker draws the header, the
// controls, the weekday row over the grid (or the year list) and the actions.

import {
    datePickerBackdropAnatomy,
    datePickerOverlayAnatomy,
} from "@pureform/anatomy";
import type {
    buttonAnatomy,
    ComponentAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import {
    DATE_PICKER_ROOT_PROPS,
    dateMachineProps,
    datePickerSelection,
    dialogPositionerLayout,
    isPresent,
    pickerLocale,
    pickerWeekStart,
    selectedDateText,
    todayIso,
} from "@pureform/binding-core";
import type {
    DatePickerContentProps,
    DatePickerPart,
    DatePickerRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import * as datePicker from "@pureform/machines/date-picker";
import type * as dialog from "@pureform/machines/dialog";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    type ReactNode,
    useEffect,
    useId,
    useMemo,
    useState,
} from "react";

import { Button } from "../button";
import { calendarParts, parseIso } from "../calendar-parts";
import type {
    CalendarCellProps,
    CalendarContext,
    CalendarPartProps,
    CalendarStepProps,
    CalendarTableProps,
} from "../calendar-parts";
import { useControllable } from "../controllable";
import { dialogParts } from "../dialog-parts";
import type { DialogChromeTriggerProps } from "../dialog-parts";
import {
    ChevronEndIcon,
    ChevronStartIcon,
    DropDownArrow,
    EditIcon,
} from "../glyphs";
import { IconButton } from "../icon-button";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import type { PartContext } from "../part-context";
import { useSlotProps, asRoot } from "../parts";
import type { InnerPropsOf, SlotKeyedProps } from "../parts";
import { pickerAction } from "../picker-actions";
import type { PickerActionProps } from "../picker-actions";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof datePickerOverlayAnatomy;

/** Root's props: the tokens, the dates' props (`value`, `defaultValue`, `selectionMode`,
 *  `locale`, `min`, …), the dialog's (`open`, `closeOnEscape`, …), `testId` and `unstyled` for
 *  every part, `as`, and the element's own props. */
export interface DatePickerRootProps
    extends
        Omit<PartProps, keyof DatePickerRootOwnProps>,
        DatePickerRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export type DatePickerPartProps = CalendarPartProps;

/** A button part's props: a part's, and `as` to render a component instead of `<button>`
 *  (`as={IconButton}`), which takes the rest of the props. */
export type DatePickerTriggerProps = DialogChromeTriggerProps;

/** A previous or next button's props. */
export type DatePickerStepProps = CalendarStepProps;

/** The grid's or the year list's props. */
export type DatePickerTableProps = CalendarTableProps;

/** A cell's props. */
export type DatePickerCellProps = CalendarCellProps;

/** What Root shares with the picker's parts, besides the dialog's. */
interface DatePickerContextValue extends CalendarContext {
    readonly dialog: dialog.Api<PropTypes>;
    /** Commits the draft and closes. */
    readonly confirm: () => void;
    /** Closes, dropping the draft. */
    readonly cancel: () => void;
}

const NONE: readonly string[] = [];

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
    machineProps: (props) => ({
        closeOnEscape: props.closeOnEscape,
        closeOnInteractOutside: props.closeOnInteractOutside,
        restoreFocus: props.restoreFocus,
        // Focus goes to the chosen day (or today), the one in the tab order, as it opens.
        initialFocusEl: openDay,
    }),
    positionerLayout: (present) => dialogPositionerLayout(present),
});

const context = createPartContext<DatePickerContextValue>("DatePicker");

// Runs the calendar inside the dialog's Root, over a draft of the confirmed value.
function Calendar({
    own,
    children,
}: {
    readonly own: DatePickerRootProps;
    readonly children: ReactNode;
}): ReactNode {
    const { api: dialogApi, scope } = chrome.context.use("Root");
    const id = useId();
    const dir = useDirection();
    const value = useControllable<
        "value",
        readonly string[],
        { readonly value: readonly string[] }
    >("DatePicker", "value", own);
    const [own_, setOwn] = useState(value.defaultValue ?? NONE);
    const confirmed = value.controlled ? value.value! : own_;
    const [draft, setDraft] = useState(confirmed);
    // The draft starts again from the confirmed value each time the dialog opens.
    const open = dialogApi.open;
    const [wasOpen, setWasOpen] = useState(open);
    if (wasOpen !== open) {
        setWasOpen(open);
        if (open) setDraft(confirmed);
    }
    const draftKey = draft.join(",");
    const zagValue = useMemo(() => draft.map(parseIso), [draftKey]);
    const service = useMachine(datePicker.machine, {
        id,
        dir,
        ...dateMachineProps(own, parseIso),
        inline: true,
        // Zag focuses the cells it finds in its content: the dialog's surface.
        ids: { content: dialogApi.getContentProps().id as string },
        value: zagValue,
        onValueChange: (details) =>
            setDraft(details.value.map(datePicker.toISO)),
    });
    const picker = datePicker.connect(service, normalizeProps);
    useEffect(() => {
        if (!open) return;
        picker.setView("day");
        picker.setFocusedValue(parseIso(draft[0] ?? todayIso()));
    }, [open]);
    const close = () => dialogApi.setOpen(false);
    return (
        <context.Provider
            value={{
                scope: scope as never,
                picker,
                selected: draft,
                selectionMode: own.selectionMode ?? "single",
                locale: pickerLocale(own),
                weekStart: pickerWeekStart(own),
                dialog: dialogApi,
                confirm: () => {
                    if (!value.controlled) setOwn(draft);
                    value.machineProps.onValueChange({ value: draft });
                    close();
                },
                cancel: close,
            }}
        >
            {children}
            {own.name !== undefined ? (
                <input
                    type="hidden"
                    name={own.name}
                    value={confirmed.join(",")}
                    disabled={own.disabled}
                />
            ) : null}
        </context.Provider>
    );
}

/** The picker's root, a `<div>` around the trigger and the dialog. The registry doesn't style
 *  it. */
function Root(props: DatePickerRootProps): ReactNode {
    return (
        <chrome.Root {...props}>
            <Calendar own={props}>{props.children}</Calendar>
        </chrome.Root>
    );
}

/** The button that opens the dialog. */
const Trigger: (props: DatePickerTriggerProps) => ReactNode = chrome.Trigger;

/** Dims the page behind the dialog, drawn by the scrim. */
const Backdrop: (props: DatePickerPartProps) => ReactNode = chrome.Backdrop;

/** Covers the viewport and centers the picker; hidden once it's closed and its exit animation is
 *  over. The registry doesn't style it. */
const Positioner: (props: DatePickerPartProps) => ReactNode = chrome.Positioner;

/** The picker's surface, the dialog. It stays while its exit animation runs. */
const Content: (props: DatePickerPartProps) => ReactNode = chrome.Content;

/** The row holding the headline, the selected date and the mode toggle. */
const Header: (props: DatePickerPartProps) => ReactNode = chrome.part(
    "header",
    "Header",
    "div",
);

/** The title, which names the dialog. */
const Headline: (props: DatePickerPartProps) => ReactNode = chrome.part(
    "headline",
    "Headline",
    "span",
    (api) => api.getTitleProps(),
);

/** The chosen date (the draft) as the header writes it. */
const SelectedDate: (props: DatePickerPartProps) => ReactNode = chrome.part(
    "selectedDate",
    "SelectedDate",
    "span",
);

/** The button that switches to the date input: `as={IconButton}` draws it as one. */
const ModeToggle: (props: DatePickerTriggerProps) => ReactNode = chrome.trigger(
    "modeToggle",
    "ModeToggle",
);

/** The line under the header. */
const Divider: (props: DatePickerPartProps) => ReactNode = chrome.part(
    "divider",
    "Divider",
    "hr",
);

/** The row holding the view trigger and the previous and next buttons. */
const Controls: (props: DatePickerPartProps) => ReactNode = chrome.part(
    "controls",
    "Controls",
    "div",
);

/** The buttons at the end. */
const Actions: (props: DatePickerPartProps) => ReactNode = chrome.part(
    "actions",
    "Actions",
    "div",
);

/** The month and year shown ("August 2026"), a button that switches between the days and the
 *  years. */
function ViewTrigger({ unstyled, ...props }: DatePickerPartProps): ReactNode {
    const { scope, picker } = context.use("ViewTrigger");
    const view = picker.view === "day" ? "year" : "day";
    return scope.render("viewTrigger" as never, {
        element: "button",
        machine: {
            ...picker.getViewTriggerProps({ view: picker.view }),
            "aria-label": undefined,
            onClick: () => picker.setView(view),
        },
        unstyled,
        props,
    });
}

const calendar = calendarParts(
    context as unknown as PartContext<CalendarContext>,
);

/** The weekday row; by default a Weekday per day, from the week's first. */
const Weekdays: (props: DatePickerPartProps) => ReactNode = calendar.Weekdays;
/** A weekday's label: the narrow one shown, the long one as `aria-label`. */
const Weekday: (props: DatePickerPartProps) => ReactNode = calendar.Weekday;
/** The grid of days; by default a Week of Cells per week of the shown month. */
const Grid: (props: DatePickerTableProps) => ReactNode = calendar.Grid;
/** A week of the grid. */
const Week: (props: DatePickerPartProps) => ReactNode = calendar.Week;
/** A day (or a year, with `view="year"`): its own `calendarCell` component. */
const Cell: (props: DatePickerCellProps) => ReactNode = calendar.Cell;
/** The years, in the grid's place; by default a Cell per year. */
const YearList: (props: DatePickerTableProps) => ReactNode = calendar.YearList;
/** Shows the previous month. */
const Prev: (props: DatePickerStepProps) => ReactNode = calendar.Prev;
/** Shows the next month. */
const Next: (props: DatePickerStepProps) => ReactNode = calendar.Next;

/** Commits the chosen dates and closes the dialog: `as={Button}` draws it as a button. */
const ConfirmTrigger: (props: PickerActionProps) => ReactNode = pickerAction(
    "ConfirmTrigger",
    (name) => context.use(name).confirm,
);
/** Closes the dialog and drops the dates chosen since it opened. */
const CancelTrigger: (props: PickerActionProps) => ReactNode = pickerAction(
    "CancelTrigger",
    (name) => context.use(name).cancel,
);

/** The ready-made picker's props: Root's, with `className`, `style` and `slotProps` keyed by
 *  part, and the trigger's label, the headline, the placeholder and the actions' labels as
 *  content. */
export interface DatePickerProps
    extends
        Omit<DatePickerRootProps, keyof SlotKeyedProps<Anatomy, "backdrop"> | "children">,
        Omit<SlotKeyedProps<Anatomy, "backdrop">, "testId" | "unstyled">,
        DatePickerContentProps<ReactNode> {
    readonly testId?: TestIdOverride<DatePickerPart> | undefined;
    readonly unstyled?: Unstyled<DatePickerPart> | undefined;
    /** The Cancel action, drawn as a button. */
    readonly cancelButtonProps?: ButtonInnerProps | undefined;
    /** The OK action, drawn as a button. */
    readonly confirmButtonProps?: ButtonInnerProps | undefined;
}

type ButtonInnerProps = InnerPropsOf<typeof buttonAnatomy>;

// Inside Root, so it can read the view and the draft.
function ReadyMadeContent({ own }: { readonly own: DatePickerProps }) {
    const { picker, selected, locale } = context.use("Root");
    const slot = useSlotProps(own as SlotKeyedProps<ComponentAnatomy, "backdrop">);
    const days = picker.view === "day";
    return (
        <>
            {isPresent(own.trigger) ? (
                <Trigger
                    as={Button}
                    label={own.trigger}
                    {...asRoot(slot("trigger"))}
                />
            ) : null}
            <Backdrop {...slot("backdrop")} />
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    <Header {...slot("header")}>
                        <Headline {...slot("headline")}>
                            {own.headline ?? "Select date"}
                        </Headline>
                        <SelectedDate {...slot("selectedDate")}>
                            {selectedDateText(selected, locale) ??
                                own.placeholder ??
                                "Selected date"}
                        </SelectedDate>
                        {own.onModeToggle ? (
                            <ModeToggle
                                as={IconButton}
                                icon={<EditIcon />}
                                aria-label={
                                    own.modeToggleLabel ??
                                    "Switch to text input"
                                }
                                onClick={own.onModeToggle}
                                {...asRoot(slot("modeToggle"))}
                            />
                        ) : null}
                    </Header>
                    <Divider {...slot("divider")} />
                    <Controls {...slot("controls")}>
                        <ViewTrigger {...slot("viewTrigger")}>
                            {picker.visibleRangeText.start}
                            <DropDownArrow />
                        </ViewTrigger>
                        {days ? (
                            <>
                                <Prev
                                    as={IconButton}
                                    icon={<ChevronStartIcon />}
                                    mirror
                                    {...asRoot(slot("prev"))}
                                />
                                <Next
                                    as={IconButton}
                                    icon={<ChevronEndIcon />}
                                    mirror
                                    {...asRoot(slot("next"))}
                                />
                            </>
                        ) : null}
                    </Controls>
                    {days ? (
                        <>
                            <Weekdays {...slot("weekdays")} />
                            <Grid {...slot("grid")} />
                        </>
                    ) : (
                        <YearList {...slot("yearList")} />
                    )}
                    <Actions {...slot("actions")}>
                        <CancelTrigger
                            {...own.cancelButtonProps}
                            as={Button}
                            variant="text"
                            label={own.cancelLabel ?? "Cancel"}
                        />
                        <ConfirmTrigger
                            {...own.confirmButtonProps}
                            as={Button}
                            variant="text"
                            label={own.confirmLabel ?? "OK"}
                        />
                    </Actions>
                </Content>
            </Positioner>
        </>
    );
}

/** The ready-made picker: the trigger, drawn as a button, when given a label, the backdrop, and
 *  the dialog with its header (the mode toggle only with `onModeToggle`), the month's controls,
 *  the days (or the years) and the Cancel and OK actions. */
function ReadyMade(props: DatePickerProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        trigger: _trigger,
        headline: _headline,
        placeholder: _placeholder,
        cancelLabel: _cancelLabel,
        confirmLabel: _confirmLabel,
        cancelButtonProps: _cancelButtonProps,
        confirmButtonProps: _confirmButtonProps,
        onModeToggle: _onModeToggle,
        modeToggleLabel: _modeToggleLabel,
        ...rootProps
    } = props;
    const slot = useSlotProps(props as SlotKeyedProps<ComponentAnatomy, "backdrop">);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <ReadyMadeContent own={props} />
        </Root>
    );
}

/** Material's modal date picker. Use it ready-made, `<DatePicker trigger="Pick a date"
 *  defaultValue={["2026-08-17"]} onValueChange={…} />`, or compose its parts under
 *  `DatePicker.Root`: `Trigger`, `Backdrop`, then `Positioner` holding `Content`, which holds
 *  `Header` (`Headline`, `SelectedDate`, `ModeToggle`), `Divider`, `Controls` (`ViewTrigger`,
 *  `Prev`, `Next`), `Weekdays` of `Weekday`s over a `Grid` of `Week`s of `Cell`s (or a
 *  `YearList`), and `Actions` (with `CancelTrigger` and `ConfirmTrigger`). */
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
