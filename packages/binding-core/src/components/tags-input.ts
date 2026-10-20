// The tags input's contract, shared by every binding: the props Root takes for itself, how they
// map onto the selection and Zag's tags input machine, and what the ready-made component renders.
// It's a text field whose values are input chips: the field's parts draw the field, and each
// value is an `inputChip` (`input-chip.ts`).

import type {
    PartName,
    TestIdOverride,
    tagsInputAnatomy,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { InteractiveProps } from "./indication";
import type { InputChipVariantProps } from "./input-chip";
import type { VariantProp } from "./variants";

/** The tags input's parts: the text field's without the prefix, suffix and counter: `"root" |
 *  "container" | "leadingIcon" | "input" | "label" | "trailingIcon" | "supportingText"`. */
export type TagsInputPart = PartName<typeof tagsInputAnatomy>;

/** The tags input's variant groups and instance tokens, and its chips'. `leadingIcon` and
 *  `trailingIcon` make room for an icon at either end; the ready-made component sets them when
 *  it renders one. */
export interface TagsInputVariantProps {
    readonly variant?: VariantProp<"tagsInput", "variant">;
    readonly color?: VariantProp<"tagsInput", "color">;
    readonly density?: VariantProp<"tagsInput", "density">;
    readonly leadingIcon?: boolean | undefined;
    readonly trailingIcon?: boolean | undefined;
    readonly tokens?: InstanceTokens<"tagsInput"> | undefined;
    /** The chips' variants and tokens. */
    readonly chip?: InputChipVariantProps | undefined;
}

/** What the tags input machine takes from Root's props. */
export interface TagsInputBehaviorProps extends Controllable<
    "value",
    string[]
> {
    readonly disabled?: boolean | undefined;
    /** Marks the field invalid (`aria-invalid`), which the error look keys on. */
    readonly invalid?: boolean | undefined;
    /** An error message: marks the field invalid and replaces the supporting text. */
    readonly error?: string | undefined;
    readonly required?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    /** The input's placeholder, shown while there's no chip. The label floats while it shows,
     *  so the default is a single space. */
    readonly placeholder?: string | undefined;
    /** The name the values submit under, joined by commas. */
    readonly name?: string | undefined;
    /** The id of the form the values belong to, for a field outside it. */
    readonly form?: string | undefined;
    /** The most values it takes. */
    readonly max?: number | undefined;
    /** The longest value, in characters. */
    readonly maxLength?: number | undefined;
    /** What ends a value besides Enter. @default "," */
    readonly delimiter?: string | RegExp | undefined;
    /** Split pasted text into values. */
    readonly addOnPaste?: boolean | undefined;
    readonly allowDuplicates?: boolean | undefined;
    /** What leaving the field does with the typed text: add it, clear it, or (by default) keep
     *  it. */
    readonly blurBehavior?: "add" | "clear" | undefined;
    /** Whether a value may be added. */
    readonly validate?:
        | ((details: { inputValue: string; value: string[] }) => boolean)
        | undefined;
    /** A remove button's accessible name, from its chip's value. @default `Delete tag ${value}` */
    readonly removeLabel?: ((value: string) => string) | undefined;
    /** The root element's id; the machine builds the other ids from it. */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface TagsInputRootOwnProps
    extends TagsInputVariantProps, TagsInputBehaviorProps, InteractiveProps {
    /** A prefix for every part's test id (`tags` → `tags-input`), or ids by part. The chips' parts
     *  take the prefix too (`tags-chip-label`). */
    readonly testId?: TestIdOverride<TagsInputPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<TagsInputPart> | undefined;
}

/** The keys of `TagsInputRootOwnProps`, which Root keeps off its element. */
export const TAGS_INPUT_ROOT_PROPS = [
    "variant",
    "color",
    "density",
    "leadingIcon",
    "trailingIcon",
    "tokens",
    "chip",
    "disabled",
    "invalid",
    "error",
    "required",
    "readOnly",
    "placeholder",
    "name",
    "form",
    "max",
    "maxLength",
    "delimiter",
    "addOnPaste",
    "allowDuplicates",
    "blurBehavior",
    "validate",
    "removeLabel",
    "id",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof TagsInputRootOwnProps)[];

/** What the ready-made tags input renders inside Root, in the framework's node type. */
export interface TagsInputContentProps<Node> {
    /** The floating label, also the input's accessible name. */
    readonly label?: Node;
    /** Helper text under the field; an error message takes its place. */
    readonly supportingText?: Node;
    /** An icon at the start of the field; renders only when given. */
    readonly leadingIcon?: Node;
    /** An icon at the end of the field; renders only when given. */
    readonly trailingIcon?: Node;
    /** A chip's leading avatar, from its value; the part renders only when this returns one. */
    readonly chipAvatar?: ((value: string) => Node) | undefined;
    /** A chip's leading icon, from its value, when it has no avatar. */
    readonly chipIcon?: ((value: string) => Node) | undefined;
    /** The remove buttons' icon. @default a cross */
    readonly removeIcon?: Node;
}

/** The keys of `TagsInputContentProps`. */
export const TAGS_INPUT_CONTENT_PROPS = [
    "label",
    "supportingText",
    "leadingIcon",
    "trailingIcon",
    "chipAvatar",
    "chipIcon",
    "removeIcon",
] as const satisfies readonly (keyof TagsInputContentProps<unknown>)[];

/** The tags input's registry selection from Root's props. */
export const tagsInputSelection = (
    props: TagsInputVariantProps,
): Selection<"tagsInput"> => ({
    variant: props.variant,
    color: props.color,
    density: props.density,
    leadingIcon: props.leadingIcon,
    trailingIcon: props.trailingIcon,
    tokens: props.tokens,
});

/** The test id prefix of the chips' parts, from Root's `testId`: `tags` → `tags-chip`. */
export const tagsInputChipTestId = (
    testId: TestIdOverride<TagsInputPart> | undefined,
): string | undefined =>
    typeof testId === "string" ? `${testId}-chip` : undefined;

/** The tags input machine's props from Root's, besides `id`, `dir`, and the controllable `value`
 *  (the binding's `useControllable`). An error marks the field invalid. */
export const tagsInputMachineProps = (props: TagsInputBehaviorProps) => ({
    disabled: props.disabled,
    invalid: props.invalid || props.error !== undefined || undefined,
    required: props.required,
    readOnly: props.readOnly,
    placeholder: props.placeholder ?? " ",
    name: props.name,
    form: props.form,
    max: props.max,
    maxLength: props.maxLength,
    delimiter: props.delimiter,
    addOnPaste: props.addOnPaste,
    allowDuplicates: props.allowDuplicates,
    blurBehavior: props.blurBehavior,
    validate: props.validate,
    translations: props.removeLabel
        ? { deleteTagTriggerLabel: props.removeLabel }
        : undefined,
});

/** The tags input's own value, and whether the container counts as filled (a chip, or text):
 *  the label floats over either. */
export const tagsInputFilled = (count: number, inputValue: string): boolean =>
    count > 0 || inputValue !== "";
