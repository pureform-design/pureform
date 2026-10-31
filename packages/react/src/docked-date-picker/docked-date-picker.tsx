// The docked date picker: Root on Zag's date picker as a popover under its field. The field's
// parts as the preset draws them (the date typed into the input, which sets the value once the
// field loses focus, and the trailing icon, a button that opens the calendar), then the
// calendar's popup: the month and year controls, the weekday row over the grid of days (or the
// month or year list) and the actions. Choosing a date sets the value and, by default, closes
// the calendar. The ready-made DockedDatePicker draws all of it.

import { dockedDatePickerOverlayAnatomy } from "@pureform/anatomy";
import type { ComponentAnatomy, PartName } from "@pureform/anatomy";
import {
    DOCKED_DATE_PICKER_ROOT_PROPS,
    dateFormatHint,
    dockedDatePickerSelection,
    isPresent,
    pickerLocale,
    pickerWeekStart,
} from "@pureform/binding-core";
import type {
    CalendarInstances,
    DockedDatePickerContentProps,
    DockedDatePickerRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import { dateMachineProps, presentProps } from "@pureform/binding-web";
import * as datePicker from "@pureform/machines/date-picker";
import { normalizeProps } from "@zag-js/react";
import {
    type ElementType,
    type FormEvent,
    type ReactNode,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { calendarParts, parseIso, useDateValue } from "../calendar-parts";
import type {
    CalendarCellProps,
    CalendarContext,
    CalendarPartProps,
    CalendarSlots,
    CalendarStepProps,
    CalendarTableProps,
    CalendarWeekdaysProps,
} from "../calendar-parts";
import { useControllable } from "../controllable";
import {
    CalendarIcon,
    ChevronEndIcon,
    ChevronStartIcon,
    DropDownArrow,
} from "../glyphs";
import { IconButton } from "../icon-button";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import type { PartContext } from "../part-context";
import { plainParts, useComponent, useSlotProps, asRoot } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { affixFieldParts } from "../select-field-parts";

type Anatomy = typeof dockedDatePickerOverlayAnatomy;

/** Root's props: the field's variants and tokens, the dates' props (`value`, `defaultValue`,
 *  `locale`, `min`, …), `open`'s, `closeOnSelect`, `error`, `testId` and `unstyled` for every
 *  part, `as`, and the element's own props. */
export interface DockedDatePickerRootProps
    extends
        Omit<PartProps, keyof DockedDatePickerRootOwnProps>,
        DockedDatePickerRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export type DockedDatePickerPartProps = CalendarPartProps;

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface DockedDatePickerIconProps extends CalendarPartProps {
    readonly mirror?: boolean | undefined;
}

/** A previous or next button's props: `unit="month"` or `unit="year"` says what it steps by. */
export type DockedDatePickerStepProps = CalendarStepProps;

/** The grid's or a list's props. */
export type DockedDatePickerTableProps = CalendarTableProps;

/** A cell's props. */
export type DockedDatePickerCellProps = CalendarCellProps;

/** What Root shares with its parts. */
interface DockedDatePickerContextValue extends CalendarContext {
    readonly scope: ComponentScope<Anatomy> & CalendarContext["scope"];
    readonly supportingTextId: string;
    readonly errorText: string | undefined;
    readonly filled: boolean;
    readonly setTyped: (typed: boolean) => void;
    readonly presence: Presence;
}

const context =
    createPartContext<DockedDatePickerContextValue>("DockedDatePicker");

/** The picker's root, a `<div>` around the field, the supporting text and the popup. */
function Root(props: DockedDatePickerRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useDateValue("DockedDatePicker", props);
    const open = useControllable<"open", boolean>(
        "DockedDatePicker",
        "open",
        props,
    );
    const lastView = useRef<datePicker.DateView>("day");
    const service = useMachine(datePicker.machine, {
        id,
        dir,
        ...dateMachineProps(props, parseIso),
        invalid: props.invalid || isPresent(props.error) || undefined,
        // The format, as the supporting text shows it: the preset shows it once the
        // field is focused and the label has floated (Material's hint).
        placeholder: dateFormatHint(pickerLocale(props)),
        closeOnSelect: props.closeOnSelect ?? true,
        ...value,
        // Material's docked picker goes from the years straight back to the days, with the
        // keys as with a click.
        onViewChange: (details) => {
            const from = lastView.current;
            lastView.current = details.view;
            if (from === "year" && details.view === "month")
                picker.setView("day");
        },
        ...open.machineProps,
    });
    const picker = datePicker.connect(service, normalizeProps);
    const presence = usePresence(picker.open);
    const [typed, setTyped] = useState(false);
    const selected = picker.value.map(datePicker.toISO);
    const scope = useComponent(dockedDatePickerOverlayAnatomy, {
        selection: dockedDatePickerSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, DOCKED_DATE_PICKER_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope: scope as DockedDatePickerContextValue["scope"],
                picker,
                selected,
                selectionMode: props.selectionMode ?? "single",
                locale: pickerLocale(props),
                weekStart: pickerWeekStart(props),
                yearBounds: { min: props.min, max: props.max },
                supportingTextId: `${id}-supporting-text`,
                errorText: props.error || undefined,
                filled: typed || selected.length > 0,
                setTyped,
                presence,
            }}
        >
            {scope.render("root", {
                element: "div",
                as,
                machine: picker.getRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

/** The filled or outlined box holding the icons, the input and the label; marked filled while
 *  the input has text. */
function Container({ unstyled, ...props }: CalendarPartProps): ReactNode {
    const { scope, picker, filled } = context.use("Container");
    return scope.render("container", {
        element: "div",
        machine: picker.getControlProps(),
        states: { filled },
        unstyled,
        props,
    });
}

/** The date as text, in the locale's format; a date typed sets the value once the field loses
 *  focus. */
function Input({ unstyled, ...props }: CalendarPartProps): ReactNode {
    const { scope, picker, setTyped } = context.use("Input");
    const input = useRef<HTMLInputElement | null>(null);
    const text = picker.valueAsString[0] ?? "";
    // Zag writes a new value's text into the input an effect later; a value set by its owner
    // shows in the same commit, unless the user is typing.
    useLayoutEffect(() => {
        const element = input.current;
        if (element && element.ownerDocument.activeElement !== element)
            element.value = text;
    }, [text]);
    return scope.render("input", {
        element: "input",
        ref: (element: HTMLElement | null) => {
            input.current = element as HTMLInputElement | null;
        },
        machine: {
            ...picker.getInputProps(),
            onInput: (event: FormEvent<HTMLInputElement>) =>
                setTyped(event.currentTarget.value !== ""),
        },
        unstyled,
        props,
    });
}

const field = affixFieldParts((name) => {
    const { picker, ...rest } = context.use(name);
    return { ...rest, api: picker };
});

/** The floating label. */
const Label: (props: CalendarPartProps) => ReactNode = field.Label;
/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
const LeadingIcon: (props: DockedDatePickerIconProps) => ReactNode =
    field.LeadingIcon;
/** Text before the input's. Turn on Root's `prefixText` with it. */
const PrefixText: (props: CalendarPartProps) => ReactNode = field.PrefixText;
/** Text after the input's. Turn on Root's `suffixText` with it. */
const SuffixText: (props: CalendarPartProps) => ReactNode = field.SuffixText;

const block = plainParts<Anatomy>(context.use, "div");
/** The popup's row of month and year controls. */
const Controls = block("controls", "Controls");
/** The buttons at the end of the popup. */
const Actions = block("actions", "Actions");

/** The button at the end of the field that opens the calendar. */
function TrailingIcon({
    unstyled,
    mirror,
    ...props
}: DockedDatePickerIconProps): ReactNode {
    const { scope, picker } = context.use("TrailingIcon");
    return scope.render("trailingIcon", {
        element: "button",
        machine: picker.getTriggerProps(),
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** Helper text under the field. With an `error`, it shows the error instead. */
const SupportingText: (props: CalendarPartProps) => ReactNode =
    field.SupportingText;

/** Places the popup under the field; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
function Positioner({ unstyled, ...props }: CalendarPartProps): ReactNode {
    const { scope, picker, presence } = context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        machine: presentProps(picker.getPositionerProps(), presence.present),
        unstyled,
        props,
    });
}

/** The calendar's popup. It stays while its exit animation runs. */
function Content({ unstyled, ...props }: CalendarPartProps): ReactNode {
    const { scope, picker, presence } = context.use("Content");
    return scope.render("content", {
        element: "div",
        ref: presence.ref,
        machine: presentProps(picker.getContentProps(), presence.present),
        unstyled,
        props,
    });
}

const viewButton = (
    part: "monthButton" | "yearButton",
    name: string,
    view: "month" | "year",
) =>
    function ViewButton({ unstyled, ...props }: CalendarPartProps): ReactNode {
        const { scope, picker } = context.use(name);
        const shown = picker.view === view;
        return scope.render(part, {
            element: "button",
            machine: {
                type: "button",
                "aria-expanded": shown,
                onClick: () => picker.setView(shown ? "day" : view),
            },
            unstyled,
            props: {
                ...props,
                children:
                    props.children ??
                    picker.format(
                        picker.focusedValue,
                        view === "month"
                            ? { month: "short" }
                            : { year: "numeric" },
                    ),
            },
        });
    };

/** The focused month ("Aug"), a button that shows the month list, or the days again. */
const MonthButton = viewButton("monthButton", "MonthButton", "month");
/** The focused year ("2026"), a button that shows the year list, or the days again. */
const YearButton = viewButton("yearButton", "YearButton", "year");

const calendar = calendarParts(
    context as unknown as PartContext<CalendarContext>,
);

/** The weekday row; by default a Weekday per day, from the week's first. */
const Weekdays: (props: CalendarWeekdaysProps) => ReactNode = calendar.Weekdays;
/** A weekday's label: the narrow one shown, the long one as `aria-label`. */
const Weekday: (props: CalendarPartProps) => ReactNode = calendar.Weekday;
/** The grid of days; by default a Week of Cells per week of the shown month. */
const Grid: (props: DockedDatePickerTableProps) => ReactNode = calendar.Grid;
/** A week of the grid. */
const Week: (props: CalendarPartProps) => ReactNode = calendar.Week;
/** A day (or a month or year, with `view`): its own `calendarCell` component. */
const Cell: (props: DockedDatePickerCellProps) => ReactNode = calendar.Cell;
/** The months, in the grid's place; by default a Cell per month. */
const MonthList: (props: DockedDatePickerTableProps) => ReactNode =
    calendar.MonthList;
/** The years, in the grid's place; by default a Cell per year. */
const YearList: (props: DockedDatePickerTableProps) => ReactNode =
    calendar.YearList;
/** Shows the previous month (`unit="month"`) or year (`unit="year"`). */
const Prev: (props: DockedDatePickerStepProps) => ReactNode = calendar.Prev;
/** Shows the next month (`unit="month"`) or year (`unit="year"`). */
const Next: (props: DockedDatePickerStepProps) => ReactNode = calendar.Next;

/** The ready-made picker's props: Root's, with `className`, `style`, `slotProps` and `unstyled`
 *  keyed by part (and `cell` for each calendar cell; a cell, week or weekday also by copy,
 *  `CalendarInstances`), and the label, supporting text, icons and affixes as content. `aria-label`,
 *  `aria-labelledby` and `aria-describedby` go on the input. */
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
        Omit<SlotKeyedProps<Anatomy, "cell", CalendarInstances>, "unstyled">,
        DockedDatePickerContentProps<ReactNode> {
    readonly unstyled?:
        | Unstyled<PartName<Anatomy> | "cell", CalendarInstances>
        | undefined;
}

// Inside Root, so it can read the view and the locale.
function ReadyMadeContent({ own }: { readonly own: DockedDatePickerProps }) {
    const { picker, locale, supportingTextId } = context.use("Root");
    const slot = useSlotProps<Anatomy, "cell", CalendarInstances>(own);
    const slots: CalendarSlots = slot;
    const step = (unit: "month" | "year") => (
        <>
            <Prev
                as={IconButton}
                icon={<ChevronStartIcon />}
                unit={unit}
                mirror
                {...asRoot(slot("prev"))}
            />
            {unit === "month" ? (
                <MonthButton {...slot("monthButton")}>
                    {picker.format(picker.focusedValue, { month: "short" })}
                    <DropDownArrow />
                </MonthButton>
            ) : (
                <YearButton {...slot("yearButton")}>
                    {picker.format(picker.focusedValue, { year: "numeric" })}
                    <DropDownArrow />
                </YearButton>
            )}
            <Next
                as={IconButton}
                icon={<ChevronEndIcon />}
                unit={unit}
                mirror
                {...asRoot(slot("next"))}
            />
        </>
    );
    return (
        <>
            <Container {...slot("container")}>
                {isPresent(own.leadingIcon) ? (
                    <LeadingIcon {...slot("leadingIcon")}>
                        {own.leadingIcon}
                    </LeadingIcon>
                ) : null}
                {isPresent(own.prefixText) ? (
                    <PrefixText {...slot("prefixText")}>
                        {own.prefixText}
                    </PrefixText>
                ) : null}
                <Input
                    aria-label={own["aria-label"]}
                    aria-labelledby={own["aria-labelledby"]}
                    aria-describedby={
                        own["aria-describedby"] ?? supportingTextId
                    }
                    {...slot("input")}
                />
                {isPresent(own.suffixText) ? (
                    <SuffixText {...slot("suffixText")}>
                        {own.suffixText}
                    </SuffixText>
                ) : null}
                {isPresent(own.label) ? (
                    <Label {...slot("label")}>{own.label}</Label>
                ) : null}
                <TrailingIcon
                    aria-label={own.triggerLabel ?? "Open calendar"}
                    {...slot("trailingIcon")}
                >
                    <CalendarIcon />
                </TrailingIcon>
            </Container>
            <SupportingText {...slot("supportingText")}>
                {isPresent(own.supportingText)
                    ? own.supportingText
                    : dateFormatHint(locale)}
            </SupportingText>
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    <Controls {...slot("controls")}>
                        {step("month")}
                        {step("year")}
                    </Controls>
                    {picker.view === "day" ? (
                        <>
                            <Weekdays {...slot("weekdays")} slots={slots} />
                            <Grid {...slot("grid")} slots={slots} />
                        </>
                    ) : picker.view === "month" ? (
                        <MonthList {...slot("monthList")} slots={slots} />
                    ) : (
                        <YearList {...slot("yearList")} slots={slots} />
                    )}
                    {isPresent(own.actions) ? (
                        <Actions {...slot("actions")}>{own.actions}</Actions>
                    ) : null}
                </Content>
            </Positioner>
        </>
    );
}

/** The ready-made picker: the field (the leading icon and affixes only when given) with its
 *  supporting text, the date's format by default, and the calendar's popup. */
function ReadyMade(props: DockedDatePickerProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        "aria-label": _ariaLabel,
        "aria-labelledby": _ariaLabelledBy,
        "aria-describedby": _ariaDescribedBy,
        label: _label,
        supportingText: _supportingText,
        leadingIcon,
        prefixText,
        suffixText,
        triggerLabel: _triggerLabel,
        actions: _actions,
        ...rootProps
    } = props;
    const slot = useSlotProps(props as SlotKeyedProps<ComponentAnatomy>);
    return (
        <Root
            {...rootProps}
            leadingIcon={isPresent(leadingIcon) || undefined}
            prefixText={isPresent(prefixText) || undefined}
            suffixText={isPresent(suffixText) || undefined}
            {...(slot("root") as object)}
        >
            <ReadyMadeContent own={props} />
        </Root>
    );
}

/** Material's docked date picker. Use it ready-made, `<DockedDatePicker label="Date"
 *  name="date" />`, or compose its parts under `DockedDatePicker.Root`: `Container` holding
 *  `LeadingIcon`, `PrefixText`, `Input`, `SuffixText`, `Label` and `TrailingIcon`, then
 *  `SupportingText` and `Positioner` holding `Content`, which holds `Controls` (`Prev`,
 *  `MonthButton`, `Next`, `Prev`, `YearButton`, `Next`), `Weekdays` over a `Grid` of `Week`s of
 *  `Cell`s (or a `MonthList` or `YearList`), and `Actions`. */
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
