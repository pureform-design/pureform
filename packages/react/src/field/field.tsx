// The plain form primitives: Field, Label, Input, Textarea, Description and ErrorText. Field
// connects the pieces inside it: the label's `htmlFor`, the control's `aria-describedby` (the
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
import {
    createContext,
    use,
    useCallback,
    useId,
    useLayoutEffect,
    useMemo,
    useState,
} from "react";
import type {
    ElementType,
    InputHTMLAttributes,
    LabelHTMLAttributes,
    ReactNode,
    Ref,
    TextareaHTMLAttributes,
} from "react";

import { useComponent } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";

type Described = FieldState["described"];

interface FieldContextValue {
    readonly state: FieldState;
    /** Marks a supporting piece present while it's mounted. */
    readonly describe: (piece: keyof Described, present: boolean) => void;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** The field around, if any: the pieces work alone too. */
const useField = () => use(FieldContext);

/** Field's props: its states, the control's id, the ready-made content, its tokens, `testId`
 *  and `unstyled`, `as`, and the element's own props. */
export interface FieldProps
    extends
        Omit<PartProps, keyof FieldRootOwnProps | "children">,
        FieldRootOwnProps,
        FieldContentProps<ReactNode> {
    /** The pieces: a Label, an Input or a Textarea, a Description and an ErrorText. Left out,
     *  Field renders them from `label`, `description` and `error`. */
    readonly children?: ReactNode;
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A column connecting the pieces inside it. */
export function Field(props: FieldProps): ReactNode {
    const generated = useId();
    const ids = useMemo(
        () => fieldIds(props.controlId ?? `${generated}-control`),
        [props.controlId, generated],
    );
    const readyMade = props.children === undefined;
    const [described, setDescribed] = useState<Described>(() => ({
        description: readyMade && isPresent(props.description),
        error: readyMade && isPresent(props.error),
    }));
    const state = fieldState(props, ids, described);
    const describe = useCallback(
        (piece: keyof Described, present: boolean) =>
            setDescribed((current) =>
                current[piece] === present
                    ? current
                    : { ...current, [piece]: present },
            ),
        [],
    );
    const scope = useComponent(fieldAnatomy, {
        selection: fieldSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, children, ...rest } = omitProps(props, FIELD_ROOT_PROPS);
    return (
        <FieldContext value={{ state, describe }}>
            {scope.render("root", {
                element: "div",
                as,
                props: {
                    ...rest,
                    children: readyMade ? (
                        <>
                            {isPresent(props.label) && (
                                <Label>{props.label}</Label>
                            )}
                            <Input />
                            {isPresent(props.description) && (
                                <Description>{props.description}</Description>
                            )}
                            {isPresent(props.error) && (
                                <ErrorText>{props.error}</ErrorText>
                            )}
                        </>
                    ) : (
                        children
                    ),
                },
            })}
        </FieldContext>
    );
}

/** The label's props: its required mark and dimming over the field's, its tokens, `testId` and
 *  `unstyled`, `as`, and the element's own props. */
export interface LabelProps
    extends
        Omit<LabelHTMLAttributes<HTMLLabelElement>, keyof LabelRootOwnProps>,
        LabelRootOwnProps {
    readonly ref?: Ref<HTMLLabelElement> | undefined;
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ElementType | undefined;
}

/** The label: names the field's control, dims while it's disabled, and marks it required. */
export function Label(props: LabelProps): ReactNode {
    const field = useField();
    const state = fieldLabelState(field?.state, props);
    const scope = useComponent(labelAnatomy, {
        selection: labelSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, children, ...rest } = omitProps(props, LABEL_ROOT_PROPS);
    const { for: htmlFor, ...own } = fieldLabelProps(field?.state, state);
    return scope.render("root", {
        element: "label",
        as,
        machine: { ...own, htmlFor },
        props: {
            ...rest,
            children: (
                <>
                    {children}
                    {state.required &&
                        scope.render("requiredIndicator", {
                            element: "span",
                            machine: { "aria-hidden": true },
                            props: { children: REQUIRED_MARK },
                        })}
                </>
            ),
        },
    });
}

/** The input's props: the field's states over its own, its tokens, `testId` and `unstyled`,
 *  `as`, and the input's own props (`type`, `value`, `onChange`). */
export interface InputProps
    extends
        Omit<InputHTMLAttributes<HTMLInputElement>, keyof InputRootOwnProps>,
        InputRootOwnProps {
    readonly ref?: Ref<HTMLInputElement> | undefined;
    /** Another element or component to render instead of `<input>`. */
    readonly as?: ElementType | undefined;
}

/** A plain input in the theme's box. `type="date"`, `"time"` and `"datetime-local"` open the
 *  browser's own pickers; for Material's, use `DatePicker` and `TimePicker`. */
export function Input(props: InputProps): ReactNode {
    const field = useField();
    const scope = useComponent(inputAnatomy, {
        selection: inputSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, INPUT_ROOT_PROPS);
    return scope.render("root", {
        element: "input",
        as,
        props: { ...rest, ...fieldControlProps(field?.state, props) },
    });
}

/** The textarea's props: as the input's, with the textarea's own. */
export interface TextareaProps
    extends
        Omit<
            TextareaHTMLAttributes<HTMLTextAreaElement>,
            keyof TextareaRootOwnProps
        >,
        TextareaRootOwnProps {
    readonly ref?: Ref<HTMLTextAreaElement> | undefined;
    /** Another element or component to render instead of `<textarea>`. */
    readonly as?: ElementType | undefined;
}

/** A plain textarea in Input's box, resizing vertically. */
export function Textarea(props: TextareaProps): ReactNode {
    const field = useField();
    const scope = useComponent(plainTextareaAnatomy, {
        selection: plainTextareaSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, TEXTAREA_ROOT_PROPS);
    return scope.render("root", {
        element: "plainTextarea",
        as,
        props: { ...rest, ...fieldControlProps(field?.state, props) },
    });
}

/** Marks a supporting piece present in the field around while it's mounted. */
const useDescribes = (
    field: FieldContextValue | null,
    piece: keyof Described,
) => {
    const describe = field?.describe;
    useLayoutEffect(() => {
        if (!describe) return;
        describe(piece, true);
        return () => describe(piece, false);
    }, [describe, piece]);
};

/** The supporting pieces' props: their tokens, `testId` and `unstyled`, `as`, and the element's
 *  own props. */
export interface DescriptionProps
    extends
        Omit<PartProps, keyof DescriptionRootOwnProps>,
        DescriptionRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ElementType | undefined;
}

/** The supporting text under the field's control, which describes it. */
export function Description(props: DescriptionProps): ReactNode {
    const field = useField();
    useDescribes(field, "description");
    const scope = useComponent(descriptionAnatomy, {
        selection: descriptionSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, DESCRIPTION_ROOT_PROPS);
    return scope.render("root", {
        element: "span",
        as,
        machine: { id: field?.state.ids.description },
        props: rest,
    });
}

export interface ErrorTextProps
    extends
        Omit<PartProps, keyof ErrorTextRootOwnProps>,
        ErrorTextRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ElementType | undefined;
}

/** The error under the field's control, which describes it. Render it while the field is
 *  invalid. */
export function ErrorText(props: ErrorTextProps): ReactNode {
    const field = useField();
    useDescribes(field, "error");
    const scope = useComponent(errorTextAnatomy, {
        selection: errorTextSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, ERROR_TEXT_ROOT_PROPS);
    return scope.render("root", {
        element: "span",
        as,
        machine: { id: field?.state.ids.error },
        props: rest,
    });
}
