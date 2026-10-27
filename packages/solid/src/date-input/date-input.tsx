// The date input: Root on Zag's date input machine, a surface holding the header (the headline,
// the date typed so far, the mode toggle), a divider, the text field whose input is a group of
// segments (the month, the day and the year, in the locale's order, each typed into or stepped
// with the arrow keys), and the actions. The container is always marked filled, so the label
// stays floated over the segments' placeholders. A hidden input submits the date.

import { dateInputAnatomy } from "@pureform/anatomy";
import type { buttonAnatomy, PartName } from "@pureform/anatomy";
import {
    DATE_INPUT_CONTENT_PROPS,
    DATE_INPUT_ROOT_PROPS,
    dateFormatHint,
    dateInputSelection,
    isPresent,
    pickerLocale,
    selectedDateText,
} from "@pureform/binding-core";
import type {
    DateInputContentProps,
    DateInputRootOwnProps,
} from "@pureform/binding-core";
import { dateMachineProps } from "@pureform/binding-web";
import * as dateInput from "@pureform/machines/date-input";
import { toISO } from "@pureform/machines/date-picker";
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
import { parseDate, useDateValue } from "../calendar-parts";
import { CalendarIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, plainParts, useComponent, asRoot } from "../parts";
import type { ComponentScope, InnerPropsOf, SlotKeyedProps } from "../parts";
import { pickerAction } from "../picker-actions";
import type { PickerActionProps } from "../picker-actions";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { affixFieldParts } from "../select-field-parts";

type Anatomy = typeof dateInputAnatomy;

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
    const value = useDateValue("DateInput", props);
    const service = useMachine(dateInput.machine, () => ({
        id,
        dir: dir(),
        ...dateMachineProps(props, parseDate),
        invalid: props.invalid || props.error !== undefined,
        ...value(),
    }));
    const api = createMemo(() => dateInput.connect(service, normalizeProps));
    const dates = createMemo(() => api().value.filter(Boolean).map(toISO));
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
    const merged = merge(
        omit(props, "as", "children", ...DATE_INPUT_ROOT_PROPS),
        children,
    );
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
                props: merged,
            })}
        </context.Provider>
    );
}

const block = plainParts<Anatomy>(context.use, "div");
const inline = plainParts<Anatomy>(context.use, "span");

const field = affixFieldParts(context.use);

/** The header: the headline, the selected date, and the mode toggle. */
const Header = block<DateInputPartProps>("header", "Header");
/** The title. */
const Headline = inline<DateInputPartProps>("headline", "Headline");
/** The date typed so far, or a placeholder. */
const SelectedDate = inline<DateInputPartProps>("selectedDate", "SelectedDate");

/** The button that switches to the calendar: `as={IconButton}` draws it as one. */
function ModeToggle(props: DateInputTriggerProps): JSX.Element {
    const { scope } = context.use("ModeToggle");
    const rest = omit(props, "unstyled", "as");
    return scope.render("modeToggle", {
        element: "button",
        as: () => props.as,
        machine: () => ({ type: "button" }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The line under the header, an `<hr>`. */
function Divider(props: DateInputPartProps): JSX.Element {
    const { scope } = context.use("Divider");
    const rest = omit(props, "unstyled");
    return scope.render("divider", {
        element: "hr",
        unstyled: () => props.unstyled,
        props: rest,
    });
}
/** The text field: the container and the supporting text. */
const Field = block<DateInputPartProps>("field", "Field");

/** The filled or outlined box holding the icons, the segments, and the label. Always filled, so
 *  the label stays floated over the segments. */
function Container(props: DateInputPartProps): JSX.Element {
    const { scope, api } = context.use("Container");
    const rest = omit(props, "unstyled");
    return scope.render("container", {
        element: "div",
        machine: () => api().getControlProps(),
        states: () => ({ filled: true }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
const LeadingIcon: (props: DateInputIconProps) => JSX.Element =
    field.LeadingIcon;
/** Text before the segments. Turn on Root's `prefixText` with it. */
const PrefixText: (props: DateInputPartProps) => JSX.Element = field.PrefixText;

/** The group of segments, named by the label. */
function Input(props: DateInputInputProps): JSX.Element {
    const { scope, api } = context.use("Input");
    const rest = omit(props, "unstyled", "index");
    return scope.render("input", {
        element: "div",
        machine: () => api().getSegmentGroupProps({ index: props.index }),
        unstyled: () => props.unstyled,
        props: rest,
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
    const merged = merge(
        omit(props, "unstyled", "segment", "index", "children"),
        children,
    );
    return scope.render("segment", {
        element: "span",
        machine: () =>
            api().getSegmentProps({
                segment: props.segment,
                index: props.index,
            }),
        unstyled: () => props.unstyled,
        props: merged,
    });
}

/** Text after the segments. Turn on Root's `suffixText` with it. */
const SuffixText: (props: DateInputPartProps) => JSX.Element = field.SuffixText;

/** The floating label, which names the segments. */
const Label: (props: DateInputPartProps) => JSX.Element = field.Label;

/** An icon at the end of the field. Turn on Root's `trailingIcon` with it. */
function TrailingIcon(props: DateInputIconProps): JSX.Element {
    const { scope } = context.use("TrailingIcon");
    const rest = omit(props, "unstyled", "mirror");
    return scope.render("trailingIcon", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** Helper text under the field (the date's format, say). With an `error`, it shows the error. */
const SupportingText: (props: DateInputPartProps) => JSX.Element =
    field.SupportingText;

/** The buttons at the end. */
const Actions = block<DateInputPartProps>("actions", "Actions");

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
 *  part, and the headline, placeholder, label, supporting text, icons and affixes (each renders
 *  only when given), actions' labels, and the mode toggle as content. `aria-describedby` goes on the segments. */
export interface DateInputProps
    extends
        Omit<
            DateInputRootProps,
            | keyof SlotKeyedProps<Anatomy>
            | "children"
            | "leadingIcon"
            | "trailingIcon"
            | "prefixText"
            | "suffixText"
        >,
        SlotKeyedProps<Anatomy>,
        DateInputContentProps<JSX.Element> {
    /** The Cancel action, drawn as a button. */
    readonly cancelButtonProps?: ButtonInnerProps | undefined;
    /** The OK action, drawn as a button. */
    readonly confirmButtonProps?: ButtonInnerProps | undefined;
}

type ButtonInnerProps = InnerPropsOf<typeof buttonAnatomy>;

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "cancelButtonProps",
    "confirmButtonProps",
    "aria-describedby",
    ...DATE_INPUT_CONTENT_PROPS,
] as const;

// Inside Root, so it reads the date and the segments.
function ReadyMadeContent(props: {
    readonly own: DateInputProps;
    readonly slots: (part: PartName<Anatomy>) => PartProps;
}): JSX.Element {
    const { api, value, locale, supportingTextId } = context.use("Root");
    // oxlint-disable-next-line solid/reactivity -- the parent's own props, passed once and never replaced
    const own = props.own;
    // oxlint-disable-next-line solid/reactivity -- the parent's slot props function, passed once and never replaced
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
                        {...asRoot(slots("modeToggle"))}
                    />
                </Show>
            </Header>
            <Divider {...slots("divider")} />
            <Field {...slots("field")}>
                <Container {...slots("container")}>
                    <Show when={isPresent(own.leadingIcon)}>
                        <LeadingIcon
                            mirror={own.mirrorLeadingIcon}
                            {...slots("leadingIcon")}
                        >
                            {own.leadingIcon}
                        </LeadingIcon>
                    </Show>
                    <Show when={isPresent(own.prefixText)}>
                        <PrefixText {...slots("prefixText")}>
                            {own.prefixText}
                        </PrefixText>
                    </Show>
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
                    <Show when={isPresent(own.suffixText)}>
                        <SuffixText {...slots("suffixText")}>
                            {own.suffixText}
                        </SuffixText>
                    </Show>
                    <Label {...slots("label")}>
                        {isPresent(own.label) ? own.label : "Date"}
                    </Label>
                    <Show when={isPresent(own.trailingIcon)}>
                        <TrailingIcon
                            mirror={own.mirrorTrailingIcon}
                            {...slots("trailingIcon")}
                        >
                            {own.trailingIcon}
                        </TrailingIcon>
                    </Show>
                </Container>
                <SupportingText {...slots("supportingText")}>
                    {isPresent(own.supportingText)
                        ? own.supportingText
                        : dateFormatHint(locale())}
                </SupportingText>
            </Field>
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

/** The ready-made date input: the header, the divider, the field (labelled "Date" by default,
 *  the date's format as its supporting text, or the error), and Cancel and OK. */
function ReadyMade(props: DateInputProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as DateInputRootProps;
    return (
        <Root
            {...own}
            leadingIcon={isPresent(props.leadingIcon) || undefined}
            trailingIcon={isPresent(props.trailingIcon) || undefined}
            prefixText={isPresent(props.prefixText) || undefined}
            suffixText={isPresent(props.suffixText) || undefined}
            {...(slots("root") as object)}
        >
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
