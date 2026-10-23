// The plain form primitives' contract, shared by every binding: Field, Label, Input, Textarea,
// Description and ErrorText. Field connects the pieces inside it: the label's `for`, the
// control's `aria-describedby` (the description and the error it holds), and the disabled,
// invalid and required states, which the control and the label read from it. Each piece has one
// look, so the props they take for themselves are the tokens, `testId` and `unstyled`.

import type {
    descriptionAnatomy,
    errorTextAnatomy,
    fieldAnatomy,
    inputAnatomy,
    labelAnatomy,
    PartName,
    TestIdOverride,
    textareaAnatomy,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";

/** The field's parts: `"root"`. */
export type FieldPart = PartName<typeof fieldAnatomy>;
/** The label's parts: `"root"`, `"requiredIndicator"`. */
export type LabelPart = PartName<typeof labelAnatomy>;
/** The input's parts: `"root"`. */
export type InputPart = PartName<typeof inputAnatomy>;
/** The textarea's parts: `"root"`. */
export type TextareaPart = PartName<typeof textareaAnatomy>;
/** The description's parts: `"root"`. */
export type DescriptionPart = PartName<typeof descriptionAnatomy>;
/** The error text's parts: `"root"`. */
export type ErrorTextPart = PartName<typeof errorTextAnatomy>;

/** The pieces, by registry name. */
type Piece =
    | "field"
    | "label"
    | "input"
    | "textarea"
    | "description"
    | "errorText";

/** What every piece takes for itself: its instance tokens, test ids, and `unstyled`. */
interface PieceOwnProps<C extends Piece, P extends string> {
    readonly tokens?: InstanceTokens<C> | undefined;
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<P> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<P> | undefined;
}

const PIECE_PROPS = ["tokens", "testId", "unstyled"] as const;

/** The states Field gives the pieces inside it. Each piece's own prop wins over Field's. */
export interface FieldStateProps {
    /** Disables the control, and dims the label. */
    readonly disabled?: boolean | undefined;
    /** Marks the control invalid (`aria-invalid`), drawing its error color. */
    readonly invalid?: boolean | undefined;
    /** The control must be filled to submit; the label shows a required mark. */
    readonly required?: boolean | undefined;
}

/** The ready-made field's content: with no children, Field renders a label, an Input, a
 *  description and an error from these. */
export interface FieldContentProps<N> {
    /** The label's text. */
    readonly label?: N | undefined;
    /** The supporting text under the input. */
    readonly description?: N | undefined;
    /** The error under the input. Given, it marks the field invalid. */
    readonly error?: N | undefined;
}

/** Everything Field's Root takes for itself, besides the element's own props and `as`. */
export interface FieldRootOwnProps
    extends FieldStateProps, PieceOwnProps<"field", FieldPart> {
    /** The control's id, which the label's `for` and the other ids derive from. Left out, the
     *  field makes one.
     *  @control none */
    readonly controlId?: string | undefined;
}

/** The keys of `FieldRootOwnProps` and `FieldContentProps`, which Field keeps off its element. */
export const FIELD_ROOT_PROPS = [
    ...PIECE_PROPS,
    "disabled",
    "invalid",
    "required",
    "controlId",
    "label",
    "description",
    "error",
] as const satisfies readonly (
    | keyof FieldRootOwnProps
    | keyof FieldContentProps<unknown>
)[];

export interface LabelRootOwnProps extends PieceOwnProps<"label", LabelPart> {
    /** Shows the required mark, over the field's `required`. */
    readonly required?: boolean | undefined;
    /** Dims it, over the field's `disabled`. */
    readonly disabled?: boolean | undefined;
}

export const LABEL_ROOT_PROPS = [
    ...PIECE_PROPS,
    "required",
    "disabled",
] as const satisfies readonly (keyof LabelRootOwnProps)[];

/** What Input and Textarea take for themselves: the field's states, which win over the
 *  field's, and the pieces' own. */
export interface InputRootOwnProps
    extends FieldStateProps, PieceOwnProps<"input", InputPart> {}

export interface TextareaRootOwnProps
    extends FieldStateProps, PieceOwnProps<"textarea", TextareaPart> {}

export const INPUT_ROOT_PROPS = [
    ...PIECE_PROPS,
    "invalid",
] as const satisfies readonly (keyof InputRootOwnProps)[];

export const TEXTAREA_ROOT_PROPS = [
    ...PIECE_PROPS,
    "invalid",
] as const satisfies readonly (keyof TextareaRootOwnProps)[];

export type DescriptionRootOwnProps = PieceOwnProps<
    "description",
    DescriptionPart
>;
export type ErrorTextRootOwnProps = PieceOwnProps<"errorText", ErrorTextPart>;

export const DESCRIPTION_ROOT_PROPS = PIECE_PROPS;
export const ERROR_TEXT_ROOT_PROPS = PIECE_PROPS;

// A piece's registry selection: its tokens.
const pieceSelection =
    <C extends Piece>() =>
    (props: {
        readonly tokens?: InstanceTokens<C> | undefined;
    }): Selection<C> =>
        ({ tokens: props.tokens }) as Selection<C>;

export const fieldSelection = pieceSelection<"field">();
export const labelSelection = pieceSelection<"label">();
export const inputSelection = pieceSelection<"input">();
export const textareaSelection = pieceSelection<"textarea">();
export const descriptionSelection = pieceSelection<"description">();
export const errorTextSelection = pieceSelection<"errorText">();

/** The ids Field gives its pieces, from the control's. */
export interface FieldIds {
    readonly control: string;
    readonly label: string;
    readonly description: string;
    readonly error: string;
}

export const fieldIds = (control: string): FieldIds => ({
    control,
    label: `${control}-label`,
    description: `${control}-description`,
    error: `${control}-error`,
});

/** What Field shares with the pieces inside it. `described` names the supporting pieces it
 *  holds, which the control's `aria-describedby` points at. */
export interface FieldState {
    readonly ids: FieldIds;
    readonly disabled: boolean;
    readonly invalid: boolean;
    readonly required: boolean;
    readonly described: { readonly description: boolean; readonly error: boolean };
}

/** Field's state from its props and the supporting pieces it holds. An `error` marks it
 *  invalid. */
export const fieldState = (
    props: FieldStateProps & FieldContentProps<unknown>,
    ids: FieldIds,
    described: FieldState["described"],
): FieldState => ({
    ids,
    disabled: props.disabled ?? false,
    invalid: (props.invalid ?? false) || isGiven(props.error),
    required: props.required ?? false,
    described,
});

const isGiven = (node: unknown) =>
    node !== undefined && node !== null && node !== false && node !== "";

/** The control's props: its id, the field's states (its own props win), and the
 *  description's and the error's ids in `aria-describedby` after any it was given. Outside a
 *  field, only its own states. */
export const fieldControlProps = (
    field: FieldState | undefined,
    own: FieldStateProps & {
        readonly id?: string | undefined;
        readonly "aria-describedby"?: string | undefined;
    },
) => {
    const invalid = own.invalid ?? field?.invalid ?? false;
    const disabled = own.disabled ?? field?.disabled ?? false;
    const required = own.required ?? field?.required ?? false;
    const describedBy = [
        own["aria-describedby"],
        field?.described.description ? field.ids.description : undefined,
        field?.described.error ? field.ids.error : undefined,
    ].filter(Boolean);
    return {
        id: own.id ?? field?.ids.control,
        disabled: disabled || undefined,
        required: required || undefined,
        "aria-invalid": invalid || undefined,
        "aria-describedby":
            describedBy.length > 0 ? describedBy.join(" ") : undefined,
    };
};

/** The label's state: required and disabled, its own props over the field's. */
export const fieldLabelState = (
    field: FieldState | undefined,
    own: LabelRootOwnProps,
) => ({
    required: own.required ?? field?.required ?? false,
    disabled: own.disabled ?? field?.disabled ?? false,
});

/** The label's element props: its id and the control it names (the binding spells `for` its
 *  own way), and `aria-disabled` while dimmed, which its style reads. */
export const fieldLabelProps = (
    field: FieldState | undefined,
    state: { readonly disabled: boolean },
) => ({
    id: field?.ids.label,
    for: field?.ids.control,
    "aria-disabled": state.disabled || undefined,
});

/** The required mark's text, hidden from assistive technology: the control's `required` says
 *  it. */
export const REQUIRED_MARK = "*";

/** Input types that open the platform's own date or time picker. */
export const DATE_TIME_INPUT_TYPES = [
    "date",
    "time",
    "datetime-local",
] as const;
