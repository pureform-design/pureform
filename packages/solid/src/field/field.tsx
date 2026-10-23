// The plain form primitives: Field, Label, Input, Textarea, Description and ErrorText. Field
// connects the pieces inside it: the label's `for`, the control's `aria-describedby` (the
// description and the error it holds), and the disabled, invalid and required states. Each piece
// also works alone. With no children, Field renders a label, an Input, a description and an error
// from its `label`, `description` and `error`.

import {
    descriptionAnatomy,
    errorTextAnatomy,
    fieldAnatomy,
    inputAnatomy,
    labelAnatomy,
    plainTextareaAnatomy,
} from "@pureform/anatomy";
import {
    DESCRIPTION_ROOT_PROPS,
    descriptionSelection,
    ERROR_TEXT_ROOT_PROPS,
    errorTextSelection,
    FIELD_ROOT_PROPS,
    fieldControlProps,
    fieldIds,
    fieldLabelProps,
    fieldLabelState,
    fieldSelection,
    fieldState,
    INPUT_ROOT_PROPS,
    inputSelection,
    isPresent,
    LABEL_ROOT_PROPS,
    labelSelection,
    REQUIRED_MARK,
    TEXTAREA_ROOT_PROPS,
    plainTextareaSelection,
} from "@pureform/binding-core";
import type {
    DescriptionRootOwnProps,
    ErrorTextRootOwnProps,
    FieldContentProps,
    FieldRootOwnProps,
    FieldState,
    InputRootOwnProps,
    LabelRootOwnProps,
    TextareaRootOwnProps,
} from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createMemo,
    createSignal,
    createUniqueId,
    merge,
    omit,
    onCleanup,
    onSettled,
    Show,
    useContext,
} from "solid-js";

import { useComponent } from "../parts";
import type { PartProps } from "../props";

type Described = FieldState["described"];

interface FieldContextValue {
    readonly state: Accessor<FieldState>;
    /** Marks a supporting piece present while it's mounted. */
    readonly describe: (piece: keyof Described, present: boolean) => void;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** The field around, if any: the pieces work alone too. */
const useField = () => useContext(FieldContext);

/** Field's props: its states, the control's id, the ready-made content, its tokens, `testId`
 *  and `unstyled`, `as`, and the element's own props. */
export interface FieldProps
    extends
        Omit<PartProps, keyof FieldRootOwnProps | "children">,
        FieldRootOwnProps,
        FieldContentProps<JSX.Element> {
    /** The pieces: a Label, an Input or a Textarea, a Description and an ErrorText. Left out,
     *  Field renders them from `label`, `description` and `error`. */
    readonly children?: JSX.Element;
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A column connecting the pieces inside it. */
export function Field(props: FieldProps): JSX.Element {
    const generated = createUniqueId();
    const ids = createMemo(() =>
        fieldIds(props.controlId ?? `${generated}-control`),
    );
    const readyMade = () => !("children" in props);
    const [mounted, setMounted] = createSignal<Described>(
        { description: false, error: false },
        { ownedWrite: true },
    );
    // The ready-made pieces are known from the props, so the server renders their ids too.
    const described = (): Described => ({
        description:
            mounted().description ||
            (readyMade() && isPresent(props.description)),
        error: mounted().error || (readyMade() && isPresent(props.error)),
    });
    const state = createMemo(() => fieldState(props, ids(), described()));
    const describe = (piece: keyof Described, present: boolean) =>
        setMounted((current) =>
            current[piece] === present
                ? current
                : { ...current, [piece]: present },
        );
    const scope = useComponent(fieldAnatomy, {
        selection: () => fieldSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <FieldContext value={{ state, describe }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                props: merge(
                    omit(props, "as", "children", ...FIELD_ROOT_PROPS),
                    {
                        get children() {
                            return readyMade() ? (
                                <>
                                    <Show when={isPresent(props.label)}>
                                        <Label>{props.label}</Label>
                                    </Show>
                                    <Input />
                                    <Show when={isPresent(props.description)}>
                                        <Description>
                                            {props.description}
                                        </Description>
                                    </Show>
                                    <Show when={isPresent(props.error)}>
                                        <ErrorText>{props.error}</ErrorText>
                                    </Show>
                                </>
                            ) : (
                                props.children
                            );
                        },
                    },
                ),
            })}
        </FieldContext>
    );
}

/** The label's props: its required mark and dimming over the field's, its tokens, `testId` and
 *  `unstyled`, `as`, and the element's own props. */
export interface LabelProps
    extends
        Omit<
            JSX.LabelHTMLAttributes<HTMLLabelElement>,
            keyof LabelRootOwnProps
        >,
        LabelRootOwnProps {
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ValidComponent | undefined;
}

/** The label: names the field's control, dims while it's disabled, and marks it required. */
export function Label(props: LabelProps): JSX.Element {
    const field = useField();
    const state = () => fieldLabelState(field?.state(), props);
    const scope = useComponent(labelAnatomy, {
        selection: () => labelSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return scope.render("root", {
        element: "label",
        as: () => props.as,
        machine: () => fieldLabelProps(field?.state(), state()),
        props: merge(omit(props, "as", ...LABEL_ROOT_PROPS), {
            get children() {
                return (
                    <>
                        {props.children}
                        <Show when={state().required}>
                            {scope.render("requiredIndicator", {
                                element: "span",
                                machine: () => ({ "aria-hidden": "true" }),
                                props: { children: REQUIRED_MARK },
                            })}
                        </Show>
                    </>
                );
            },
        }),
    });
}

/** The input's props: the field's states over its own, its tokens, `testId` and `unstyled`,
 *  `as`, and the input's own props (`type`, `value`, `onInput`). */
export interface InputProps
    extends
        Omit<
            JSX.InputHTMLAttributes<HTMLInputElement>,
            keyof InputRootOwnProps
        >,
        InputRootOwnProps {
    /** Another element or component to render instead of `<input>`. */
    readonly as?: ValidComponent | undefined;
}

/** A plain input in the theme's box. `type="date"`, `"time"` and `"datetime-local"` open the
 *  browser's own pickers; for Material's, use `DatePicker` and `TimePicker`. */
export function Input(props: InputProps): JSX.Element {
    const field = useField();
    const scope = useComponent(inputAnatomy, {
        selection: () => inputSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const control = () =>
        fieldControlProps(
            field?.state(),
            props as Parameters<typeof fieldControlProps>[1],
        );
    return scope.render("root", {
        element: "input",
        as: () => props.as,
        props: merge(
            omit(props, "as", ...INPUT_ROOT_PROPS),
            controlGetters(control),
        ),
    });
}

/** The control's props as getters, which win over the user's (they already take them in). */
const controlGetters = (
    control: () => ReturnType<typeof fieldControlProps>,
) => ({
    get id() {
        return control().id;
    },
    get disabled() {
        return control().disabled;
    },
    get required() {
        return control().required;
    },
    get "aria-invalid"() {
        return control()["aria-invalid"];
    },
    get "aria-describedby"() {
        return control()["aria-describedby"];
    },
});

/** The textarea's props: as the input's, with the textarea's own. */
export interface TextareaProps
    extends
        Omit<
            JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
            keyof TextareaRootOwnProps
        >,
        TextareaRootOwnProps {
    /** Another element or component to render instead of `<textarea>`. */
    readonly as?: ValidComponent | undefined;
}

/** A plain textarea in Input's box, resizing vertically. */
export function Textarea(props: TextareaProps): JSX.Element {
    const field = useField();
    const scope = useComponent(plainTextareaAnatomy, {
        selection: () => plainTextareaSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const control = () =>
        fieldControlProps(
            field?.state(),
            props as Parameters<typeof fieldControlProps>[1],
        );
    return scope.render("root", {
        element: "plainTextarea",
        as: () => props.as,
        props: merge(
            omit(props, "as", ...TEXTAREA_ROOT_PROPS),
            controlGetters(control),
        ),
    });
}

/** Marks a supporting piece present in the field around while it's mounted. */
const describes = (field: FieldContextValue | null, piece: keyof Described) => {
    if (!field) return;
    onSettled(() => {
        field.describe(piece, true);
    });
    onCleanup(() => field.describe(piece, false));
};

/** The supporting pieces' props: their tokens, `testId` and `unstyled`, `as`, and the element's
 *  own props. */
export interface DescriptionProps
    extends
        Omit<PartProps, keyof DescriptionRootOwnProps>,
        DescriptionRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ValidComponent | undefined;
}

/** The supporting text under the field's control, which describes it. */
export function Description(props: DescriptionProps): JSX.Element {
    const field = useField();
    describes(field, "description");
    const scope = useComponent(descriptionAnatomy, {
        selection: () => descriptionSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return scope.render("root", {
        element: "span",
        as: () => props.as,
        machine: () => ({ id: field?.state().ids.description }),
        props: omit(props, "as", ...DESCRIPTION_ROOT_PROPS),
    });
}

export interface ErrorTextProps
    extends
        Omit<PartProps, keyof ErrorTextRootOwnProps>,
        ErrorTextRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ValidComponent | undefined;
}

/** The error under the field's control, which describes it. Render it while the field is
 *  invalid. */
export function ErrorText(props: ErrorTextProps): JSX.Element {
    const field = useField();
    describes(field, "error");
    const scope = useComponent(errorTextAnatomy, {
        selection: () => errorTextSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return scope.render("root", {
        element: "span",
        as: () => props.as,
        machine: () => ({ id: field?.state().ids.error }),
        props: omit(props, "as", ...ERROR_TEXT_ROOT_PROPS),
    });
}
