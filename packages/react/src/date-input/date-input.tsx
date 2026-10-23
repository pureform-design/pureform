// The date input: Root on Zag's date input, a surface holding the header (the headline, the date
// typed so far and the mode toggle), a divider, the text field (its input a group of segments,
// the month, the day and the year in the locale's order, each a `segment`) and the actions. The
// container is always marked filled, so the label stays floated over the segments' placeholders.
// The ready-made DateInput draws all of it, and its confirm action calls `onConfirm` with the
// date.

import { dateInputAnatomy } from "@pureform/anatomy";
import {
    DATE_INPUT_CONTENT_PROPS,
    DATE_INPUT_ROOT_PROPS,
    dateFormatHint,
    dateInputSelection,
    dateMachineProps,
    isPresent,
    pickerLocale,
    selectedDateText,
} from "@pureform/binding-core";
import type {
    DateInputContentProps,
    DateInputRootOwnProps,
} from "@pureform/binding-core";
import * as dateInput from "@pureform/machines/date-input";
import { toISO } from "@pureform/machines/date-picker";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, Fragment, type ReactNode, useId } from "react";

import { Button } from "../button";
import { parseIso, useDateValue } from "../calendar-parts";
import { CalendarIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { plainParts, useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { pickerAction } from "../picker-actions";
import type { PickerActionProps } from "../picker-actions";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { affixFieldParts } from "../select-field-parts";

type Anatomy = typeof dateInputAnatomy;

/** Root's props: the field's variants and tokens, the dates' props (`value`, `defaultValue`,
 *  `locale`, `min`, …), `error`, `onConfirm` and `onCancel`, `testId` and `unstyled` for every
 *  part, `as`, and the element's own props. */
export interface DateInputRootProps
    extends
        Omit<PartProps, keyof DateInputRootOwnProps>,
        DateInputRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface DateInputPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface DateInputIconProps extends DateInputPartProps {
    readonly mirror?: boolean | undefined;
}

/** A button part's props: a part's, and `as` to render a component instead of `<button>`
 *  (`as={IconButton}`), which takes the rest of the props. */
export interface DateInputTriggerProps extends DateInputPartProps {
    readonly as?: ElementType | undefined;
    readonly [prop: string]: unknown;
}

/** A segment's props: the segment, from `api.getSegments()`, and a part's. */
export interface DateInputSegmentProps extends DateInputPartProps {
    readonly segment: dateInput.DateSegment;
}

/** What Root shares with its parts. */
interface DateInputContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: dateInput.Api<PropTypes>;
    /** The date typed, as ISO dates: none until it's whole. */
    readonly value: readonly string[];
    readonly locale: string;
    readonly headlineId: string;
    readonly supportingTextId: string;
    readonly errorText: string | undefined;
    readonly confirm: () => void;
    readonly cancel: () => void;
}

const context = createPartContext<DateInputContextValue>("DateInput");

/** The date input's root: the picker's surface, a group named by its headline. */
function Root(props: DateInputRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useDateValue("DateInput", props);
    const service = useMachine(dateInput.machine, {
        id,
        dir,
        ...dateMachineProps(props, parseIso),
        invalid: props.invalid || isPresent(props.error) || undefined,
        ...value,
    });
    const api = dateInput.connect(service, normalizeProps);
    const iso = api.value.filter(Boolean).map(toISO);
    const scope = useComponent(dateInputAnatomy, {
        selection: dateInputSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const headlineId = `${id}-headline`;
    const { as, ...rest } = omitProps(props, DATE_INPUT_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                api,
                value: iso,
                locale: pickerLocale(props),
                headlineId,
                supportingTextId: `${id}-supporting-text`,
                errorText: props.error || undefined,
                confirm: () => props.onConfirm?.(iso),
                cancel: () => props.onCancel?.(),
            }}
        >
            {scope.render("root", {
                element: "div",
                as,
                machine: {
                    ...api.getRootProps(),
                    role: "group",
                    "aria-labelledby": headlineId,
                },
                props: rest,
            })}
        </context.Provider>
    );
}

const block = plainParts<Anatomy>(context.use, "div");
const inline = plainParts<Anatomy>(context.use, "span");

/** The row holding the headline, the date typed and the mode toggle. */
const Header = block("header", "Header");
/** The text field: the container, then the supporting text. */
const Field = block("field", "Field");
/** The buttons at the end. */
const Actions = block("actions", "Actions");
/** The date typed so far, as the header writes it. */
const SelectedDate = inline("selectedDate", "SelectedDate");
const field = affixFieldParts(context.use);

/** Text before the segments. Turn on Root's `prefixText` with it. */
const PrefixText: (props: DateInputPartProps) => ReactNode = field.PrefixText;
/** Text after the segments. Turn on Root's `suffixText` with it. */
const SuffixText: (props: DateInputPartProps) => ReactNode = field.SuffixText;

/** The title, which names the group. */
function Headline({ unstyled, ...props }: DateInputPartProps): ReactNode {
    const { scope, headlineId } = context.use("Headline");
    return scope.render("headline", {
        element: "span",
        machine: { id: headlineId },
        unstyled,
        props,
    });
}

/** The button that switches to the calendar: `as={IconButton}` draws it as one. */
function ModeToggle({
    unstyled,
    as,
    ...props
}: DateInputTriggerProps): ReactNode {
    const { scope } = context.use("ModeToggle");
    return scope.render("modeToggle", {
        element: "button",
        as,
        machine: { type: "button" },
        unstyled,
        props,
    });
}

/** The line under the header. */
function Divider({ unstyled, ...props }: DateInputPartProps): ReactNode {
    const { scope } = context.use("Divider");
    return scope.render("divider", { element: "hr", unstyled, props });
}

/** The filled or outlined box holding the icons, the segments and the label; always marked
 *  filled, so the label stays floated. */
function Container({ unstyled, ...props }: DateInputPartProps): ReactNode {
    const { scope, api } = context.use("Container");
    return scope.render("container", {
        element: "div",
        machine: api.getControlProps(),
        states: { filled: true },
        unstyled,
        props,
    });
}

/** The group of segments; by default a Segment per segment, in the locale's order, and the
 *  hidden input that submits the date. */
function Input({ unstyled, ...props }: DateInputPartProps): ReactNode {
    const { scope, api, supportingTextId } = context.use("Input");
    return scope.render("input", {
        element: "div",
        machine: {
            ...api.getSegmentGroupProps(),
            "aria-describedby": supportingTextId,
        },
        unstyled,
        props: {
            ...props,
            children: props.children ?? (
                <>
                    {api.getSegments().map((segment, index) => (
                        <Fragment key={`${segment.type}-${index}`}>
                            <Segment segment={segment} />
                        </Fragment>
                    ))}
                    <input {...api.getHiddenInputProps()} />
                </>
            ),
        },
    });
}

/** One segment: the month, the day or the year, which takes digits and the arrow keys, or the
 *  separator between them. */
function Segment({
    unstyled,
    segment,
    ...props
}: DateInputSegmentProps): ReactNode {
    const { scope, api } = context.use("Segment");
    return scope.render("segment", {
        element: "span",
        machine: api.getSegmentProps({ segment }),
        unstyled,
        props: { ...props, children: props.children ?? segment.text },
    });
}

/** The floating label. */
const Label: (props: DateInputPartProps) => ReactNode = field.Label;

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
const LeadingIcon: (props: DateInputIconProps) => ReactNode = field.LeadingIcon;

/** An icon at the end of the field. Turn on Root's `trailingIcon` with it. */
function TrailingIcon({
    unstyled,
    mirror,
    ...props
}: DateInputIconProps): ReactNode {
    const { scope } = context.use("TrailingIcon");
    return scope.render("trailingIcon", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** Helper text under the field. With an `error`, it shows the error instead. */
const SupportingText: (props: DateInputPartProps) => ReactNode =
    field.SupportingText;

/** Calls `onConfirm` with the date: `as={Button}` draws it as a button. */
const ConfirmTrigger: (props: PickerActionProps) => ReactNode = pickerAction(
    "ConfirmTrigger",
    (name) => context.use(name).confirm,
);
/** Calls `onCancel`. */
const CancelTrigger: (props: PickerActionProps) => ReactNode = pickerAction(
    "CancelTrigger",
    (name) => context.use(name).cancel,
);

/** The ready-made date input's props: Root's, with `className`, `style`, and `slotProps` keyed
 *  by part, and the headline, label, supporting text, icons and affixes (each renders only when
 *  given) and actions' labels as content. */
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
        DateInputContentProps<ReactNode> {}

// Inside Root, so it can read the date typed.
function ReadyMadeContent({ own }: { readonly own: DateInputProps }) {
    const { value, locale } = context.use("Root");
    const slot = useSlotProps(own);
    return (
        <>
            <Header {...slot("header")}>
                <Headline {...slot("headline")}>
                    {own.headline ?? "Select date"}
                </Headline>
                <SelectedDate {...slot("selectedDate")}>
                    {selectedDateText(value, locale) ??
                        own.placeholder ??
                        "Enter date"}
                </SelectedDate>
                {own.onModeToggle ? (
                    <ModeToggle
                        as={IconButton}
                        icon={<CalendarIcon />}
                        aria-label={own.modeToggleLabel ?? "Switch to calendar"}
                        onClick={own.onModeToggle}
                        {...slot("modeToggle")}
                    />
                ) : null}
            </Header>
            <Divider {...slot("divider")} />
            <Field {...slot("field")}>
                <Container {...slot("container")}>
                    {isPresent(own.leadingIcon) ? (
                        <LeadingIcon
                            mirror={own.mirrorLeadingIcon}
                            {...slot("leadingIcon")}
                        >
                            {own.leadingIcon}
                        </LeadingIcon>
                    ) : null}
                    {isPresent(own.prefixText) ? (
                        <PrefixText {...slot("prefixText")}>
                            {own.prefixText}
                        </PrefixText>
                    ) : null}
                    <Input {...slot("input")} />
                    {isPresent(own.suffixText) ? (
                        <SuffixText {...slot("suffixText")}>
                            {own.suffixText}
                        </SuffixText>
                    ) : null}
                    <Label {...slot("label")}>{own.label ?? "Date"}</Label>
                    {isPresent(own.trailingIcon) ? (
                        <TrailingIcon
                            mirror={own.mirrorTrailingIcon}
                            {...slot("trailingIcon")}
                        >
                            {own.trailingIcon}
                        </TrailingIcon>
                    ) : null}
                </Container>
                <SupportingText {...slot("supportingText")}>
                    {isPresent(own.supportingText)
                        ? own.supportingText
                        : dateFormatHint(locale)}
                </SupportingText>
            </Field>
            <Actions {...slot("actions")}>
                <CancelTrigger
                    as={Button}
                    variant="text"
                    label={own.cancelLabel ?? "Cancel"}
                />
                <ConfirmTrigger
                    as={Button}
                    variant="text"
                    label={own.confirmLabel ?? "OK"}
                />
            </Actions>
        </>
    );
}

/** The ready-made date input: the header (the mode toggle only with `onModeToggle`), the field
 *  with the date's format as supporting text, and the Cancel and OK actions. */
function ReadyMade(props: DateInputProps): ReactNode {
    const slot = useSlotProps(props);
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        ...rest
    } = props;
    const rootProps = omitProps(rest, DATE_INPUT_CONTENT_PROPS);
    return (
        <Root
            {...rootProps}
            leadingIcon={isPresent(props.leadingIcon) || undefined}
            trailingIcon={isPresent(props.trailingIcon) || undefined}
            prefixText={isPresent(props.prefixText) || undefined}
            suffixText={isPresent(props.suffixText) || undefined}
            {...(slot("root") as object)}
        >
            <ReadyMadeContent own={props} />
        </Root>
    );
}

/** Material's modal date input. Use it ready-made, `<DateInput onConfirm={(value) => …} />`, or
 *  compose its parts under `DateInput.Root`: `Header` (`Headline`, `SelectedDate`,
 *  `ModeToggle`), `Divider`, `Field` holding `Container` (`LeadingIcon`, `PrefixText`, `Input`
 *  of `Segment`s, `SuffixText`, `Label`, `TrailingIcon`) and `SupportingText`, then
 *  `Actions` (with `CancelTrigger` and `ConfirmTrigger`). */
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
