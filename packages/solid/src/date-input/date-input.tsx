// The date input: Root on Zag's date input machine, a surface holding the header (the headline,
// the date typed so far, the mode toggle), a divider, the text field whose input is a group of
// segments (the month, the day and the year, in the locale's order, each typed into or stepped
// with the arrow keys), and the actions. The container is always marked filled, so the label
// stays floated over the segments' placeholders. A hidden input submits the date.

import { dateInputAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    DATE_INPUT_CONTENT_PROPS,
    DATE_INPUT_ROOT_PROPS,
    dateFormatHint,
    dateInputSelection,
    dateMachineProps,
    isoDate,
    isPresent,
    pickerLocale,
    selectedDateText,
} from "@pureform/binding-core";
import type {
    DateInputContentProps,
    DateInputRootOwnProps,
} from "@pureform/binding-core";
import * as dateInput from "@pureform/machines/date-input";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    For,
    merge,
    omit,
    Show,
} from "solid-js";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { CalendarIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { pickerAction } from "../picker-actions";
import type { PickerActionProps } from "../picker-actions";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof dateInputAnatomy;

const toIso = (value: dateInput.DateValue) =>
    isoDate({ year: value.year, month: value.month, day: value.day });

const parseIso = (value: string): dateInput.DateValue =>
    dateInput.parse(value) as dateInput.DateValue;

/** What Root shares with its parts. */
interface DateInputContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<dateInput.Api<PropTypes>>;
    /** The chosen dates, as ISO dates. */
    readonly value: Accessor<readonly string[]>;
    readonly locale: Accessor<string>;
    readonly supportingTextId: Accessor<string>;
    readonly errorText: Accessor<string | undefined>;
    readonly confirm: () => void;
    readonly cancel: () => void;
}

const context = createPartContext<DateInputContextValue>("DateInput");

/** Root's props: the variants and tokens, the dates' props (`value`, `locale`, `min`, `name`,
 *  …), `error`, `onConfirm`, `onCancel`, `testId` and `unstyled` for every part, `as`, and the
 *  element's own props. */
export interface DateInputRootProps
    extends
        Omit<PartProps, keyof DateInputRootOwnProps>,
        DateInputRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface DateInputPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface DateInputIconProps extends DateInputPartProps {
    readonly mirror?: boolean | undefined;
}

/** The input's props: a part's, and which date of a range it takes (0, or 1 for the end). */
export interface DateInputInputProps extends DateInputPartProps {
    readonly index?: number | undefined;
}

/** A segment's props: the segment, from `api.getSegments()`, the input's `index`, and a part's. */
export interface DateInputSegmentProps extends DateInputPartProps {
    readonly segment: dateInput.DateSegment;
    readonly index?: number | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>`. */
export interface DateInputTriggerProps extends DateInputPartProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

/** The date input's root: the picker's surface, around the header, the field and the actions. */
function Root(props: DateInputRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<
        "value",
        readonly string[],
        { readonly value: readonly string[] }
    >("DateInput", "value", props);
    const service = useMachine(dateInput.machine, () => {
        const state = value.machineProps();
        return {
            id,
            dir: dir(),
            ...dateMachineProps(props, parseIso),
            invalid: props.invalid || props.error !== undefined,
            value: state.value?.map(parseIso),
            defaultValue: state.defaultValue?.map(parseIso),
            onValueChange: (details: dateInput.ValueChangeDetails) =>
                state.onValueChange({ value: details.value.map(toIso) }),
        };
    });
    const api = createMemo(() => dateInput.connect(service, normalizeProps));
    const dates = createMemo(() => api().value.map(toIso));
    const scope = useComponent(dateInputAnatomy, {
        selection: () => dateInputSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const children = {
        get children() {
            return (
                <>
                    {props.children}
                    <For
                        each={props.selectionMode === "range" ? [0, 1] : [0]}
                        keyed={false}
                    >
                        {(index) => (
                            <input
                                {...(api().getHiddenInputProps({
                                    index: index(),
                                }) as object)}
                            />
                        )}
                    </For>
                </>
            );
        },
    };
    return (
        <context.Provider
            value={{
                scope,
                api,
                value: dates,
                locale: () => pickerLocale(props),
                supportingTextId: () => `${id}-supporting-text`,
                errorText: () => props.error || undefined,
                confirm: () => props.onConfirm?.(dates()),
                cancel: () => props.onCancel?.(),
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: merge(
                    omit(props, "as", "children", ...DATE_INPUT_ROOT_PROPS),
                    children,
                ),
            })}
        </context.Provider>
    );
}

const part =
    (
        name: PartName<Anatomy>,
        display: string,
        element: "div" | "span" | "hr",
        machine?: (context: DateInputContextValue) => object,
    ) =>
    (props: DateInputPartProps): JSX.Element => {
        const ctx = context.use(display);
        return ctx.scope.render(name, {
            element,
            ...(machine ? { machine: () => machine(ctx) } : {}),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    };

const icon = (name: "leadingIcon" | "trailingIcon", display: string) =>
    function Icon(props: DateInputIconProps): JSX.Element {
        const { scope } = context.use(display);
        return scope.render(name, {
            element: "span",
            machine: () => ({ "aria-hidden": "true" }),
            states: () => ({ mirrored: props.mirror }),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled", "mirror"),
        });
    };

/** The header: the headline, the selected date, and the mode toggle. */
const Header = part("header", "Header", "div");
/** The title. */
const Headline = part("headline", "Headline", "span");
/** The date typed so far, or a placeholder. */
const SelectedDate = part("selectedDate", "SelectedDate", "span");

/** The button that switches to the calendar: `as={IconButton}` draws it as one. */
function ModeToggle(props: DateInputTriggerProps): JSX.Element {
    const { scope } = context.use("ModeToggle");
    return scope.render("modeToggle", {
        element: "button",
        as: () => props.as,
        machine: () => ({ type: "button" }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** The line under the header, an `<hr>`. */
const Divider = part("divider", "Divider", "hr");
/** The text field: the container and the supporting text. */
const Field = part("field", "Field", "div");

/** The filled or outlined box holding the icons, the segments, and the label. Always filled, so
 *  the label stays floated over the segments. */
function Container(props: DateInputPartProps): JSX.Element {
    const { scope, api } = context.use("Container");
    return scope.render("container", {
        element: "div",
        machine: () => api().getControlProps(),
        states: () => ({ filled: true }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
const LeadingIcon = icon("leadingIcon", "LeadingIcon");
/** Text before the segments. Turn on Root's `prefixText` with it. */
const PrefixText = part("prefixText", "PrefixText", "span");

/** The group of segments, named by the label. */
function Input(props: DateInputInputProps): JSX.Element {
    const { scope, api } = context.use("Input");
    return scope.render("input", {
        element: "div",
        machine: () => api().getSegmentGroupProps({ index: props.index }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "index"),
    });
}

/** A segment: the month, the day or the year, which takes digits and the arrow keys, or the
 *  literal between them. Shows its text unless given children. */
function Segment(props: DateInputSegmentProps): JSX.Element {
    const { scope, api } = context.use("Segment");
    const children = {
        get children() {
            return props.children ?? props.segment.text;
        },
    };
    return scope.render("segment", {
        element: "span",
        machine: () =>
            api().getSegmentProps({
                segment: props.segment,
                index: props.index,
            }),
        unstyled: () => props.unstyled,
        props: merge(
            omit(props, "unstyled", "segment", "index", "children"),
            children,
        ),
    });
}

/** Text after the segments. Turn on Root's `suffixText` with it. */
const SuffixText = part("suffixText", "SuffixText", "span");

/** The floating label, which names the segments. */
function Label(props: DateInputPartProps): JSX.Element {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** An icon at the end of the field. Turn on Root's `trailingIcon` with it. */
const TrailingIcon = icon("trailingIcon", "TrailingIcon");

/** Helper text under the field (the date's format, say). With an `error`, it shows the error. */
function SupportingText(props: DateInputPartProps): JSX.Element {
    const { scope, supportingTextId, errorText } =
        context.use("SupportingText");
    const children = {
        get children() {
            return errorText() ?? props.children;
        },
    };
    return scope.render("supportingText", {
        element: "span",
        machine: () => ({ id: supportingTextId() }),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), children),
    });
}

/** The buttons at the end. */
const Actions = part("actions", "Actions", "div");

/** Calls `onConfirm` with the date: `as={Button}` draws it as a button. */
const ConfirmTrigger: (props: PickerActionProps) => JSX.Element = pickerAction(
    "ConfirmTrigger",
    (name) => context.use(name).confirm,
);
/** Calls `onCancel`. */
const CancelTrigger: (props: PickerActionProps) => JSX.Element = pickerAction(
    "CancelTrigger",
    (name) => context.use(name).cancel,
);

/** The ready-made date input's props: Root's, with `class`, `style`, and `slotProps` keyed by
 *  part, and the headline, placeholder, label, supporting text, actions' labels, and the mode
 *  toggle as content. `aria-describedby` goes on the segments. */
export interface DateInputProps
    extends
        Omit<DateInputRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        DateInputContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "aria-describedby",
    ...DATE_INPUT_CONTENT_PROPS,
] as const;

// Inside Root, so it reads the date and the segments.
function ReadyMadeContent(props: {
    readonly own: DateInputProps;
    readonly slots: (part: PartName<Anatomy>) => PartProps;
}): JSX.Element {
    const { api, value, locale, supportingTextId } = context.use("Root");
    const own = props.own;
    const slots = props.slots;
    const indexes = () => (own.selectionMode === "range" ? [0, 1] : [0]);
    return (
        <>
            <Header {...slots("header")}>
                <Headline {...slots("headline")}>
                    {isPresent(own.headline) ? own.headline : "Select date"}
                </Headline>
                <SelectedDate {...slots("selectedDate")}>
                    {selectedDateText(value(), locale()) ??
                        (isPresent(own.placeholder)
                            ? own.placeholder
                            : "Enter date")}
                </SelectedDate>
                <Show when={own.onModeToggle}>
                    <ModeToggle
                        as={IconButton}
                        icon={<CalendarIcon />}
                        aria-label={own.modeToggleLabel ?? "Switch to calendar"}
                        onClick={() => own.onModeToggle?.()}
                        {...(slots("modeToggle") as object)}
                    />
                </Show>
            </Header>
            <Divider {...slots("divider")} />
            <Field {...slots("field")}>
                <Container {...slots("container")}>
                    <For each={indexes()} keyed={false}>
                        {(index) => (
                            <Input
                                index={index()}
                                aria-describedby={
                                    own["aria-describedby"] ??
                                    supportingTextId()
                                }
                                {...slots("input")}
                            >
                                <For
                                    each={api().getSegments({ index: index() })}
                                    keyed={false}
                                >
                                    {(segment) => (
                                        <Segment
                                            segment={segment()}
                                            index={index()}
                                            {...slots("segment")}
                                        />
                                    )}
                                </For>
                            </Input>
                        )}
                    </For>
                    <Label {...slots("label")}>
                        {isPresent(own.label) ? own.label : "Date"}
                    </Label>
                </Container>
                <SupportingText {...slots("supportingText")}>
                    {isPresent(own.supportingText)
                        ? own.supportingText
                        : dateFormatHint(locale())}
                </SupportingText>
            </Field>
            <Actions {...slots("actions")}>
                <CancelTrigger
                    as={Button}
                    variant="text"
                    label={
                        isPresent(own.cancelLabel) ? own.cancelLabel : "Cancel"
                    }
                />
                <ConfirmTrigger
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

/** The ready-made date input: the header, the divider, the field (labelled "Date" by default,
 *  the date's format as its supporting text, or the error), and Cancel and OK. */
function ReadyMade(props: DateInputProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as DateInputRootProps;
    return (
        <Root {...own} {...(slots("root") as object)}>
            <ReadyMadeContent own={props} slots={slots} />
        </Root>
    );
}

/** Material's modal date input. Use it ready-made, `<DateInput onConfirm={…} onCancel={…} />`
 *  (inside a dialog, say), or compose its parts under `DateInput.Root`: `Header` (`Headline`,
 *  `SelectedDate`, `ModeToggle`), `Divider`, `Field` holding `Container` (`LeadingIcon`,
 *  `PrefixText`, `Input` of `Segment`s, `SuffixText`, `Label`, `TrailingIcon`) and
 *  `SupportingText`, and `Actions` (with `CancelTrigger` and `ConfirmTrigger`). */
export const DateInput = Object.assign(ReadyMade, {
    Root,
    Header,
    Headline,
    SelectedDate,
    ModeToggle,
    Divider,
    Field,
    Container,
    LeadingIcon,
    PrefixText,
    Input,
    Segment,
    SuffixText,
    Label,
    TrailingIcon,
    SupportingText,
    Actions,
    CancelTrigger,
    ConfirmTrigger,
});
