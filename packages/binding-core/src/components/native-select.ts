// The native select's contract, shared by every binding: the props Root takes for itself, how they
// map onto the selection and the native `<select>`, and how the ready-made component lays out its
// options. It has no machine: the platform's `<select>` takes the value, the form, the keyboard
// and the list. Material 3 has no such control (its `select` is a field with a menu), so the design
// is pureform's own.

import type {
    nativeSelectAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { InteractiveProps } from "./indication";
import { selectItemGroups } from "./select";
import type { SelectItemGroup } from "./select";

/** The native select's parts: `"root" | "select" | "icon" | "group" | "option"`. */
export type NativeSelectPart = PartName<typeof nativeSelectAnatomy>;

/** The native select's instance tokens. It has one look and no variant groups. */
export interface NativeSelectVariantProps {
    readonly tokens?: InstanceTokens<"nativeSelect"> | undefined;
}

/** What the native `<select>` takes from Root's props. The value is the chosen option's value. */
export interface NativeSelectBehaviorProps extends Controllable<
    "value",
    string
> {
    /** A disabled fieldset around the select disables it too. */
    readonly disabled?: boolean | undefined;
    /** Marks the select invalid (`aria-invalid`), which the error look keys on. */
    readonly invalid?: boolean | undefined;
    /** Blocks submitting until an option with a value is chosen. Give it a `placeholder` (an
     *  option with no value) so none is chosen at first. */
    readonly required?: boolean | undefined;
    /** The name the value submits under.
     *  @control none */
    readonly name?: string | undefined;
    /** The id of the form the select belongs to, for one outside it.
     *  @control none */
    readonly form?: string | undefined;
    /** The `<select>`'s id, for a `<label for>` elsewhere (Field sets it).
     *  @control none */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface NativeSelectRootOwnProps
    extends
        InteractiveProps,
        NativeSelectVariantProps,
        NativeSelectBehaviorProps {
    /** A prefix for every part's test id (`size` → `size-select`), or ids by part. */
    readonly testId?: TestIdOverride<NativeSelectPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<NativeSelectPart> | undefined;
}

/** The keys of `NativeSelectRootOwnProps`, which Root keeps off its element. */
export const NATIVE_SELECT_ROOT_PROPS = [
    "tokens",
    "disabled",
    "invalid",
    "required",
    "name",
    "form",
    "id",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof NativeSelectRootOwnProps)[];

/** One option, as data. */
export interface NativeSelectItem {
    readonly value: string;
    readonly label: string;
    readonly disabled?: boolean | undefined;
    /** The label of the `<optgroup>` it belongs to. A group's options sit together, in the order
     *  the groups first appear. */
    readonly group?: string | undefined;
}

/** What the ready-made native select renders, in the framework's node type. */
export interface NativeSelectContentProps<Node> {
    /** The options, as data. Or give `<NativeSelect.Option>`s as children. */
    readonly items?: readonly NativeSelectItem[] | undefined;
    /** A first option with no value, shown while none is chosen. */
    readonly placeholder?: string | undefined;
    /** The chevron. @default a down arrow */
    readonly icon?: Node;
}

/** The keys of `NativeSelectContentProps`. */
export const NATIVE_SELECT_CONTENT_PROPS = [
    "items",
    "placeholder",
    "icon",
] as const satisfies readonly (keyof NativeSelectContentProps<unknown>)[];

/** The attributes of the ready-made component that belong on the `<select>`, spelled the same in
 *  every binding. Each binding adds the ones its framework spells its own way. */
export const NATIVE_SELECT_ATTRIBUTE_PROPS = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-errormessage",
] as const;

/** The native select's registry selection from Root's props. */
export const nativeSelectSelection = (
    props: NativeSelectVariantProps,
): Selection<"nativeSelect"> => ({ tokens: props.tokens });

/** The `<select>`'s own props from Root's: what it submits, validates and is disabled by. The
 *  root's `data-disabled` follows the same `disabled`. */
export const nativeSelectProps = (
    props: Pick<
        NativeSelectBehaviorProps,
        "disabled" | "invalid" | "required" | "name" | "form" | "id"
    >,
    fieldsetDisabled = false,
) => ({
    id: props.id,
    name: props.name,
    form: props.form,
    required: props.required || undefined,
    disabled: props.disabled || fieldsetDisabled || undefined,
    "aria-invalid": props.invalid ? ("true" as const) : undefined,
});

/** The options by `<optgroup>`: options outside any group come in their own runs, in order. */
export const nativeSelectGroups = (
    items: readonly NativeSelectItem[],
): SelectItemGroup<NativeSelectItem>[] => selectItemGroups(items);
