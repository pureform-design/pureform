// The number field: a text field for a number on Zag's number input, with a decrement and an
// increment button at its end. Root runs the machine; the parts are the field's (a container
// holding the optional leading icon and affixes, the input and the floating label, then the
// supporting text) and the control holding the two buttons. The input is a `spinbutton`: the
// arrow keys step it, a value is clamped on blur and formatted in the locale, and pressing and
// holding a button repeats.

import { numberFieldAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    NUMBER_FIELD_CONTENT_PROPS,
    NUMBER_FIELD_ROOT_PROPS,
    numberFieldMachineProps,
    numberFieldPlaceholder,
    numberFieldSelection,
} from "@pureform/binding-core";
import type {
    NumberFieldContentProps,
    NumberFieldRootOwnProps,
    NumberFieldValueDetails,
} from "@pureform/binding-core";
import * as numberInput from "@pureform/machines/number-input";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    merge,
    omit,
    Show,
} from "solid-js";

import { useControllable } from "../controllable";
import { AddIcon, RemoveIcon } from "../glyphs";
import { useMachineButton } from "../interaction";
import type { MachineButtonProps } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof numberFieldAnatomy;

/** What Root shares with its parts. */
interface NumberFieldContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<numberInput.Api<PropTypes>>;
    readonly placeholder: Accessor<string>;
    readonly error: Accessor<string | undefined>;
}

const context = createPartContext<NumberFieldContextValue>("NumberField");

/** Root's props: the variants and tokens, the machine's props (`value`, `min`, `max`, `step`,
 *  `formatOptions`, …), `testId` and `unstyled` for every part, `as`, and the element's own
 *  props. */
export interface NumberFieldRootProps
    extends
        Omit<PartProps, keyof NumberFieldRootOwnProps>,
        NumberFieldRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface NumberFieldPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface NumberFieldIconProps extends NumberFieldPartProps {
    readonly mirror?: boolean | undefined;
}

/** A button's props: a part's, and the source its interactions are emitted to. */
export interface NumberFieldTriggerProps
    extends NumberFieldPartProps, MachineButtonProps {}

/** The field's root, a `<div>` around the container and the supporting text. */
function Root(props: NumberFieldRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", string, NumberFieldValueDetails>(
        "NumberField",
        "value",
        props,
    );
    // Zag follows a disabled fieldset around the input itself.
    const service = useMachine(numberInput.machine, () => ({
        id: props.id ?? id,
        dir: dir(),
        ...numberFieldMachineProps(props),
        ...value.machineProps(),
    }));
    const api = createMemo(() => numberInput.connect(service, normalizeProps));
    const scope = useComponent(numberFieldAnatomy, {
        selection: () => numberFieldSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    return (
        <context.Provider
            value={{
                scope,
                api,
                placeholder: () => numberFieldPlaceholder(props.placeholder),
                error: () => props.error,
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...NUMBER_FIELD_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The filled or outlined box holding the icon, the affixes, the input, the label and the
 *  control. It reads its states from the input inside it. */
function Container(props: NumberFieldPartProps): JSX.Element {
    const { scope, api } = context.use("Container");
    return scope.render("container", {
        element: "div",
        states: () => ({ filled: !api().empty }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The native input, a `spinbutton`. The label names it. */
function Input(props: NumberFieldPartProps): JSX.Element {
    const { scope, api, placeholder } = context.use("Input");
    return scope.render("input", {
        element: "input",
        machine: () => ({
            ...api().getInputProps(),
            placeholder: placeholder(),
        }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The floating label: a `<label>` for the input. */
function Label(props: NumberFieldPartProps): JSX.Element {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
function LeadingIcon(props: NumberFieldIconProps): JSX.Element {
    const { scope } = context.use("LeadingIcon");
    return scope.render("leadingIcon", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

const affix = (part: "prefixText" | "suffixText", name: string) =>
    function Affix(props: NumberFieldPartProps): JSX.Element {
        const { scope } = context.use(name);
        return scope.render(part, {
            element: "span",
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    };

/** Text before the input, shown once the label floats. Turn on Root's `prefixText` with it. */
const PrefixText = affix("prefixText", "PrefixText");
/** Text after the input, shown once the label floats. Turn on Root's `suffixText` with it. */
const SuffixText = affix("suffixText", "SuffixText");

/** The group holding the decrement and increment buttons, at the container's end. */
function Control(props: NumberFieldPartProps): JSX.Element {
    const { scope, api } = context.use("Control");
    return scope.render("control", {
        element: "div",
        machine: () => api().getControlProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

type Dict = Readonly<Record<string, unknown>>;

/** The button that steps the value down; holding it repeats. `aria-disabled` at the minimum. */
function DecrementTrigger(props: NumberFieldTriggerProps): JSX.Element {
    const { scope, api } = context.use("DecrementTrigger");
    const machine = () => api().getDecrementTriggerProps() as Dict;
    return scope.render(
        "decrementTrigger",
        useMachineButton(
            props,
            () => [machine()],
            () => machine()["aria-disabled"] === "true",
        ),
    );
}

/** The button that steps the value up; holding it repeats. `aria-disabled` at the maximum. */
function IncrementTrigger(props: NumberFieldTriggerProps): JSX.Element {
    const { scope, api } = context.use("IncrementTrigger");
    const machine = () => api().getIncrementTriggerProps() as Dict;
    return scope.render(
        "incrementTrigger",
        useMachineButton(
            props,
            () => [machine()],
            () => machine()["aria-disabled"] === "true",
        ),
    );
}

/** Helper text under the field. While Root has an `error`, it shows the error instead. */
function SupportingText(props: NumberFieldPartProps): JSX.Element {
    const { scope, error } = context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), {
            get children() {
                return error() ?? props.children;
            },
        }),
    });
}

/** The ready-made number field's props: Root's, with `class`, `style`, and `slotProps` keyed by
 *  part, and the label, supporting text, icons and affixes as content. */
export interface NumberFieldProps
    extends
        Omit<
            NumberFieldRootProps,
            | keyof SlotKeyedProps<Anatomy>
            | "children"
            | "leadingIcon"
            | "prefixText"
            | "suffixText"
        >,
        SlotKeyedProps<Anatomy>,
        NumberFieldContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...NUMBER_FIELD_CONTENT_PROPS,
] as const;

// Inside Root, so it can read whether an error shows.
function Content(props: {
    readonly own: NumberFieldProps;
    readonly slots: (part: string) => PartProps;
}): JSX.Element {
    const { error } = context.use("Root");
    const own = props.own;
    return (
        <>
            <Container {...props.slots("container")}>
                <Show when={isPresent(own.leadingIcon)}>
                    <LeadingIcon
                        mirror={own.mirrorLeadingIcon}
                        {...props.slots("leadingIcon")}
                    >
                        {own.leadingIcon}
                    </LeadingIcon>
                </Show>
                <Show when={isPresent(own.prefixText)}>
                    <PrefixText {...props.slots("prefixText")}>
                        {own.prefixText}
                    </PrefixText>
                </Show>
                <Input {...props.slots("input")} />
                <Show when={isPresent(own.suffixText)}>
                    <SuffixText {...props.slots("suffixText")}>
                        {own.suffixText}
                    </SuffixText>
                </Show>
                <Label {...props.slots("label")}>{own.label}</Label>
                <Control {...props.slots("control")}>
                    <DecrementTrigger {...props.slots("decrementTrigger")}>
                        {isPresent(own.decrementIcon) ? (
                            own.decrementIcon
                        ) : (
                            <RemoveIcon />
                        )}
                    </DecrementTrigger>
                    <IncrementTrigger {...props.slots("incrementTrigger")}>
                        {isPresent(own.incrementIcon) ? (
                            own.incrementIcon
                        ) : (
                            <AddIcon />
                        )}
                    </IncrementTrigger>
                </Control>
            </Container>
            <Show when={isPresent(own.supportingText) || error() !== undefined}>
                <SupportingText {...props.slots("supportingText")}>
                    {own.supportingText}
                </SupportingText>
            </Show>
        </>
    );
}

/** The ready-made number field: every part, in the preset's structure; the icon, affixes and
 *  supporting text only when given (or while an error shows). */
function ReadyMade(props: NumberFieldProps): JSX.Element {
    const slots = createSlotProps(props) as (part: string) => PartProps;
    const own = omit(props, ...READY_MADE_PROPS) as NumberFieldRootProps;
    // The root's slot props are an element's, whose `id` also takes `false`.
    const root = slots("root") as object;
    return (
        <Root
            {...own}
            leadingIcon={isPresent(props.leadingIcon) || undefined}
            prefixText={isPresent(props.prefixText) || undefined}
            suffixText={isPresent(props.suffixText) || undefined}
            {...root}
        >
            <Content own={props} slots={slots} />
        </Root>
    );
}

/** A text field for a number, with decrement and increment buttons. Use it ready-made,
 *  `<NumberField label="Quantity" min={0} max={10} defaultValue="1" />`, or compose its parts
 *  under `NumberField.Root`: `Container` holding `LeadingIcon`, `PrefixText`, `Input`,
 *  `SuffixText`, `Label`, and `Control` with `DecrementTrigger` and `IncrementTrigger`; then
 *  `SupportingText`. */
export const NumberField = Object.assign(ReadyMade, {
    Root,
    Container,
    LeadingIcon,
    PrefixText,
    Input,
    SuffixText,
    Label,
    Control,
    DecrementTrigger,
    IncrementTrigger,
    SupportingText,
});
