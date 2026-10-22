// The text field's and the text area's contract, shared by every binding: the props Root takes for
// itself, how they map onto the selection and pureform's text field machine, and which props of
// the ready-made components belong on the native input rather than on Root. The two components
// differ only in the input's element (`<input>` or `<textarea>`) and the text area's `autoGrow`.

import type {
    PartName,
    TestIdOverride,
    textAreaAnatomy,
    textFieldAnatomy,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The text field's parts: `"root" | "container" | "leadingIcon" | "prefixText" | "input" |
 *  "suffixText" | "label" | "trailingIcon" | "supportingText" | "counter"`. */
export type TextFieldPart = PartName<typeof textFieldAnatomy>;

/** The text area's parts: the text field's, without the prefix and suffix. */
export type TextAreaPart = PartName<typeof textAreaAnatomy>;

/** The text field's variant groups and instance tokens. `leadingIcon` and `trailingIcon` make
 *  room for an icon at either end; the ready-made component sets them when it renders one. */
export interface TextFieldVariantProps {
    readonly variant?: VariantProp<"textField", "variant">;
    readonly color?: VariantProp<"textField", "color">;
    readonly density?: VariantProp<"textField", "density">;
    readonly leadingIcon?: boolean | undefined;
    readonly trailingIcon?: boolean | undefined;
    /** Make room for prefix or suffix text; the ready-made field sets them when it renders one. */
    readonly prefixText?: boolean | undefined;
    readonly suffixText?: boolean | undefined;
    /** A secure (password) field: the trailing icon is the button that shows or hides the text. */
    readonly secure?: boolean | undefined;
    readonly tokens?: InstanceTokens<"textField"> | undefined;
}

/** The text area's variant groups and instance tokens: the text field's, and `autoGrow`, which
 *  grows it with the text instead of scrolling. */
export interface TextAreaVariantProps {
    readonly variant?: VariantProp<"textArea", "variant">;
    readonly color?: VariantProp<"textArea", "color">;
    readonly density?: VariantProp<"textArea", "density">;
    readonly autoGrow?: boolean | undefined;
    readonly leadingIcon?: boolean | undefined;
    readonly trailingIcon?: boolean | undefined;
    readonly tokens?: InstanceTokens<"textArea"> | undefined;
}

/** The ids of the field's elements, for composition: `input` for a `<label for>` elsewhere,
 *  `supportingText` for `aria-describedby`. */
export interface TextFieldElementIds {
    readonly root?: string | undefined;
    readonly input?: string | undefined;
    readonly label?: string | undefined;
    readonly supportingText?: string | undefined;
    readonly counter?: string | undefined;
}

/** What the text field machine takes from Root's props. */
export interface TextFieldBehaviorProps extends Controllable<"value", string> {
    /** A disabled fieldset around the field disables it too. */
    readonly disabled?: boolean | undefined;
    /** Marks the field invalid (`aria-invalid`), which the error look keys on. */
    readonly invalid?: boolean | undefined;
    /** An error message: marks the field invalid, replaces the supporting text, and blocks
     *  submitting, as the input's custom validity. */
    readonly error?: string | undefined;
    /** `"native"`: the input's own constraints (`required`, `pattern`, …) mark it invalid, with
     *  the browser's message, once the user has changed it or tried to submit. */
    readonly validate?: "native" | undefined;
    readonly required?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    /** The input's placeholder. The label floats while it isn't shown, so the default is a single
     *  space. */
    readonly placeholder?: string | undefined;
    /** The name the input submits under.
     *  @control none */
    readonly name?: string | undefined;
    /** The id of the form the input belongs to, for a field outside it.
     *  @control none */
    readonly form?: string | undefined;
    /** The most characters the counter allows: it shows `count / counterMax`, and a longer
     *  value marks the field invalid. Use the input's native `maxLength` to stop typing instead. */
    readonly counterMax?: number | undefined;
    /** The visibility toggle's accessible name in a secure field. @default "Show password" */
    readonly revealLabel?: string | undefined;
    /** The root element's id; the machine builds the other ids from it.
     *  @control none */
    readonly id?: string | undefined;
    readonly ids?: TextFieldElementIds | undefined;
}

/** Everything the text field's Root takes for itself, besides the element's own props and `as`. */
export interface TextFieldRootOwnProps
    extends TextFieldVariantProps, TextFieldBehaviorProps {
    /** A prefix for every part's test id (`email` → `email-input`), or ids by part. */
    readonly testId?: TestIdOverride<TextFieldPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<TextFieldPart> | undefined;
}

/** Everything the text area's Root takes for itself. */
export interface TextAreaRootOwnProps
    extends TextAreaVariantProps, TextFieldBehaviorProps {
    readonly testId?: TestIdOverride<TextAreaPart> | undefined;
    readonly unstyled?: Unstyled<TextAreaPart> | undefined;
}

const BEHAVIOR_PROPS = [
    "disabled",
    "invalid",
    "error",
    "validate",
    "required",
    "readOnly",
    "placeholder",
    "name",
    "form",
    "counterMax",
    "revealLabel",
    "id",
    "ids",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof TextFieldRootOwnProps)[];

/** The keys of `TextFieldRootOwnProps`, which Root keeps off its element. */
export const TEXT_FIELD_ROOT_PROPS = [
    "variant",
    "color",
    "density",
    "leadingIcon",
    "trailingIcon",
    "prefixText",
    "suffixText",
    "secure",
    "tokens",
    ...BEHAVIOR_PROPS,
] as const satisfies readonly (keyof TextFieldRootOwnProps)[];

/** The keys of `TextAreaRootOwnProps`. */
export const TEXT_AREA_ROOT_PROPS = [
    "variant",
    "color",
    "density",
    "leadingIcon",
    "trailingIcon",
    "tokens",
    ...BEHAVIOR_PROPS,
    "autoGrow",
] as const satisfies readonly (keyof TextAreaRootOwnProps)[];

/** The props of the ready-made field that belong on the native input, spelled the same in every
 *  binding. Each binding adds the attributes its framework spells its own way (`maxLength` or
 *  `maxlength`). */
export const TEXT_FIELD_INPUT_PROPS = [
    "type",
    "pattern",
    "min",
    "max",
    "step",
    "list",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
] as const;

/** The props of the ready-made text area that belong on the native text area. */
export const TEXT_AREA_INPUT_PROPS = [
    "rows",
    "cols",
    "wrap",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
] as const;

/** What the ready-made field renders inside Root, in the framework's node type. */
export interface TextFieldContentProps<Node> {
    /** The floating label, also the input's accessible name. */
    readonly label?: Node;
    /** Helper text under the field; an error message takes its place. */
    readonly supportingText?: Node;
    /** An icon at the start of the field; renders only when given. */
    readonly leadingIcon?: Node;
    /** An icon at the end of the field; renders only when given. */
    readonly trailingIcon?: Node;
    /** Flip the leading icon under `rtl` (an arrow that points). */
    readonly mirrorLeadingIcon?: boolean | undefined;
    /** Flip the trailing icon under `rtl`. */
    readonly mirrorTrailingIcon?: boolean | undefined;
}

/** The prefix and suffix text the ready-made text field and select render around the input. */
export interface TextFieldAffixProps<Node> {
    /** Text before the input, such as a currency sign; shows once the label floats. */
    readonly prefixText?: Node;
    /** Text after the input, such as a unit; shows once the label floats. */
    readonly suffixText?: Node;
}

/** The keys of `TextFieldAffixProps`. */
export const TEXT_FIELD_AFFIX_PROPS = [
    "prefixText",
    "suffixText",
] as const satisfies readonly (keyof TextFieldAffixProps<unknown>)[];

/** The keys of `TextFieldContentProps`. */
export const TEXT_FIELD_CONTENT_PROPS = [
    "label",
    "supportingText",
    "leadingIcon",
    "trailingIcon",
    "mirrorLeadingIcon",
    "mirrorTrailingIcon",
] as const satisfies readonly (keyof TextFieldContentProps<unknown>)[];

/** The text field's registry selection from Root's props. */
export const textFieldSelection = (
    props: TextFieldVariantProps,
): Selection<"textField"> => ({
    variant: props.variant,
    color: props.color,
    density: props.density,
    leadingIcon: props.leadingIcon,
    trailingIcon: props.trailingIcon,
    prefixText: props.prefixText,
    suffixText: props.suffixText,
    secure: props.secure,
    tokens: props.tokens,
});

/** The text area's registry selection from Root's props. */
export const textAreaSelection = (
    props: TextAreaVariantProps,
): Selection<"textArea"> => ({
    variant: props.variant,
    color: props.color,
    density: props.density,
    autoGrow: props.autoGrow,
    leadingIcon: props.leadingIcon,
    trailingIcon: props.trailingIcon,
    tokens: props.tokens,
});

/** The text field machine's props from Root's, besides `id`, `dir`, and the controllable `value`
 *  (the binding's `useControllable`). */
export const textFieldMachineProps = (
    props: TextFieldBehaviorProps & { readonly secure?: boolean | undefined },
) => ({
    disabled: props.disabled,
    invalid: props.invalid,
    error: props.error,
    validate: props.validate,
    required: props.required,
    readOnly: props.readOnly,
    placeholder: props.placeholder,
    name: props.name,
    form: props.form,
    counterMax: props.counterMax,
    secure: props.secure,
    revealLabel: props.revealLabel,
    ids: {
        root: props.id ?? props.ids?.root,
        input: props.ids?.input,
        label: props.ids?.label,
        supportingText: props.ids?.supportingText,
        counter: props.ids?.counter,
    },
});

/** The native input's default: what a form reset shows (`ControllableState.resetsTo`). */
export const textFieldNativeDefault = (resetsTo: string | undefined): string =>
    resetsTo ?? "";
