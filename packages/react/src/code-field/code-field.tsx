// The code field: a row of single-character cells on Zag's pin input, for a verification code, a
// one-time code or a PIN. Root runs the machine and renders the hidden input the code submits
// with; the parts are the label above the cells, the control (the row), a cell per character, and
// the supporting text below. Typing moves to the next cell, Backspace clears and moves back, and
// pasting a whole code fills every cell.

import { codeFieldAnatomy } from "@pureform/anatomy";
import {
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
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId, useState } from "react";

import { useControllable } from "../controllable";
import { useFieldsetDisabled } from "../form";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof codeFieldAnatomy;

/** What Root shares with its parts. */
interface CodeFieldContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: pinInput.Api<PropTypes>;
    readonly error: string | undefined;
}

const context = createPartContext<CodeFieldContextValue>("CodeField");

/** Root's props: the variants and tokens, the machine's props (`value`, `length`, `type`, `otp`,
 *  `mask`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface CodeFieldRootProps
    extends
        Omit<PartProps, keyof CodeFieldRootOwnProps>,
        CodeFieldRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
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
function Root(props: CodeFieldRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", string[], CodeFieldValueDetails>(
        "CodeField",
        "value",
        props,
    );
    const [hidden, setHidden] = useState<HTMLInputElement | null>(null);
    // Zag's pin input doesn't follow a disabled fieldset.
    const fieldsetDisabled = useFieldsetDisabled(hidden);
    const service = useMachine(pinInput.machine, {
        id: props.id ?? id,
        dir,
        ...codeFieldMachineProps(props),
        disabled: props.disabled || fieldsetDisabled || undefined,
        ...value.machineProps,
    });
    const api = pinInput.connect(service, normalizeProps);
    const scope = useComponent(codeFieldAnatomy, {
        selection: codeFieldSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, children, ...rest } = omitProps(props, CODE_FIELD_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, error: props.error }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: {
                    ...rest,
                    children: (
                        <>
                            {children}
                            <input
                                {...api.getHiddenInputProps()}
                                ref={setHidden}
                            />
                        </>
                    ),
                },
            })}
        </context.Provider>
    );
}

/** The label above the cells: a `<label>` that focuses the first empty cell. */
function Label({ unstyled, ...props }: CodeFieldPartProps): ReactNode {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: api.getLabelProps(),
        unstyled,
        props,
    });
}

/** The row of cells. */
function Control({ unstyled, ...props }: CodeFieldPartProps): ReactNode {
    const { scope, api } = context.use("Control");
    return scope.render("control", {
        element: "div",
        machine: api.getControlProps(),
        unstyled,
        props,
    });
}

/** One cell: a native input for one character. */
function Input({ unstyled, index, ...props }: CodeFieldInputProps): ReactNode {
    const { scope, api } = context.use("Input");
    return scope.render("input", {
        element: "input",
        machine: api.getInputProps({ index }),
        unstyled,
        props,
    });
}

/** Helper text under the cells. While Root has an `error`, it shows the error instead. */
function SupportingText({ unstyled, ...props }: CodeFieldPartProps): ReactNode {
    const { scope, error } = context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        unstyled,
        props: { ...props, children: error ?? props.children },
    });
}

/** The ready-made code field's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part (`input`'s go on every cell), and the label and supporting text as content. */
export interface CodeFieldProps
    extends
        Omit<CodeFieldRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        CodeFieldContentProps<ReactNode> {}

// Inside Root, so it can read the cells and whether an error shows.
function ReadyMadeContent({
    own,
}: {
    readonly own: CodeFieldProps;
}): ReactNode {
    const { api, error } = context.use("Root");
    const slot = useSlotProps(own);
    return (
        <>
            {isPresent(own.label) ? (
                <Label {...slot("label")}>{own.label}</Label>
            ) : null}
            <Control {...slot("control")}>
                {api.items.map((index) => (
                    <Input key={index} index={index} {...slot("input")} />
                ))}
            </Control>
            {isPresent(own.supportingText) || error !== undefined ? (
                <SupportingText {...slot("supportingText")}>
                    {own.supportingText}
                </SupportingText>
            ) : null}
        </>
    );
}

/** The ready-made code field: the label (when given), a cell per character, and the supporting
 *  text (when given, or while an error shows). */
function ReadyMade(props: CodeFieldProps): ReactNode {
    const slot = useSlotProps(props);
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        label: _label,
        supportingText: _supportingText,
        ...rootProps
    } = props;
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <ReadyMadeContent own={props} />
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
