// The code field: a row of single-character cells on Zag's pin input, for a verification code, a
// one-time code or a PIN. Root runs the machine and renders the hidden input the code submits
// with; the parts are the label above the cells, the control (the row), a cell per character, and
// the supporting text below. Typing moves to the next cell, Backspace clears and moves back, and
// pasting a whole code fills every cell.

import { codeFieldAnatomy } from "@pureform/anatomy";
import {
    CODE_FIELD_CONTENT_PROPS,
    CODE_FIELD_ROOT_PROPS,
    codeFieldMachineProps,
    codeFieldSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    CodeFieldContentProps,
    CodeFieldRootOwnProps,
    CodeFieldValueDetails,
} from "@pureform/binding-core";
import * as pinInput from "@pureform/machines/pin-input";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    merge,
    omit,
    Show,
} from "solid-js";

import { useControllable } from "../controllable";
import { useFieldsetDisabled } from "../form";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof codeFieldAnatomy;

/** What Root shares with its parts. */
interface CodeFieldContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<pinInput.Api<PropTypes>>;
    readonly error: Accessor<string | undefined>;
}

const context = createPartContext<CodeFieldContextValue>("CodeField");

/** Root's props: the variants and tokens, the machine's props (`value`, `length`, `type`, `otp`,
 *  `mask`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface CodeFieldRootProps
    extends
        Omit<PartProps, keyof CodeFieldRootOwnProps>,
        CodeFieldRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface CodeFieldPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A cell's props: a part's, and its place in the row. */
export interface CodeFieldInputProps extends CodeFieldPartProps {
    readonly index: number;
}

/** The field's root, a `<div>` around the label, the cells, the supporting text, and the hidden
 *  input the code submits with. */
function Root(props: CodeFieldRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", string[], CodeFieldValueDetails>(
        "CodeField",
        "value",
        props,
    );
    const [hidden, setHidden] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    // Zag's pin input doesn't follow a disabled fieldset.
    const fieldsetDisabled = useFieldsetDisabled(hidden);
    const service = useMachine(pinInput.machine, () => ({
        id: props.id ?? id,
        dir: dir(),
        ...codeFieldMachineProps(props),
        disabled: props.disabled || fieldsetDisabled() || undefined,
        ...value.machineProps(),
    }));
    const api = createMemo(() => pinInput.connect(service, normalizeProps));
    const scope = useComponent(codeFieldAnatomy, {
        selection: () => codeFieldSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope, api, error: () => props.error }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: merge(omit(props, "as", ...CODE_FIELD_ROOT_PROPS), {
                    get children() {
                        return (
                            <>
                                {props.children}
                                <input
                                    {...api().getHiddenInputProps()}
                                    ref={setHidden}
                                />
                            </>
                        );
                    },
                }),
            })}
        </context.Provider>
    );
}

/** The label above the cells: a `<label>` that focuses the first empty cell. */
function Label(props: CodeFieldPartProps): JSX.Element {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The row of cells. */
function Control(props: CodeFieldPartProps): JSX.Element {
    const { scope, api } = context.use("Control");
    return scope.render("control", {
        element: "div",
        machine: () => api().getControlProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** One cell: a native input for one character. */
function Input(props: CodeFieldInputProps): JSX.Element {
    const { scope, api } = context.use("Input");
    return scope.render("input", {
        element: "input",
        machine: () => api().getInputProps({ index: props.index }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "index"),
    });
}

/** Helper text under the cells. While Root has an `error`, it shows the error instead. */
function SupportingText(props: CodeFieldPartProps): JSX.Element {
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

/** The ready-made code field's props: Root's, with `class`, `style`, and `slotProps` keyed by
 *  part (`input`'s go on every cell), and the label and supporting text as content. */
export interface CodeFieldProps
    extends
        Omit<CodeFieldRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        CodeFieldContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...CODE_FIELD_CONTENT_PROPS,
] as const;

// Inside Root, so it can read the cells and whether an error shows.
function Content(props: {
    readonly own: CodeFieldProps;
    readonly slots: (part: string) => PartProps;
}): JSX.Element {
    const { api, error } = context.use("Root");
    const own = props.own;
    return (
        <>
            <Show when={isPresent(own.label)}>
                <Label {...props.slots("label")}>{own.label}</Label>
            </Show>
            <Control {...props.slots("control")}>
                <For each={api().items}>
                    {(index) => (
                        <Input index={index} {...props.slots("input")} />
                    )}
                </For>
            </Control>
            <Show when={isPresent(own.supportingText) || error() !== undefined}>
                <SupportingText {...props.slots("supportingText")}>
                    {own.supportingText}
                </SupportingText>
            </Show>
        </>
    );
}

/** The ready-made code field: the label (when given), a cell per character, and the supporting
 *  text (when given, or while an error shows). */
function ReadyMade(props: CodeFieldProps): JSX.Element {
    const slots = createSlotProps(props) as (part: string) => PartProps;
    const own = omit(props, ...READY_MADE_PROPS) as CodeFieldRootProps;
    const root = slots("root") as object;
    return (
        <Root {...own} {...root}>
            <Content own={props} slots={slots} />
        </Root>
    );
}

/** A row of single-character cells for a verification code, a one-time code or a PIN. Use it
 *  ready-made, `<CodeField label="Code" length={6} otp />`, or compose its parts under
 *  `CodeField.Root`: `Label`, `Control` with an `Input` per cell (`index`), and
 *  `SupportingText`. */
export const CodeField = Object.assign(ReadyMade, {
    Root,
    Label,
    Control,
    Input,
    SupportingText,
});
