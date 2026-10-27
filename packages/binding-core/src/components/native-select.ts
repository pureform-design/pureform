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
import type { ItemInstance, Unstyled } from "../parts";
import type { InteractiveProps } from "./indication";
import { selectItemGroups } from "./select";
import type { SelectItemGroup } from "./select";

/** The native select's parts: `"root" | "select" | "icon" | "group" | "option"`. */
export type NativeSelectPart = PartName<typeof nativeSelectAnatomy>;

/** The native select's instance tokens. It has one look and no variant groups. */
export interface NativeSelectVariantProps {
    readonly tokens?: InstanceTokens<"nativeSelect"> | undefined;
}

/** The chosen option's value; with `multiple`, every chosen option's, in the options' order. */
export type NativeSelectValue = string | readonly string[];

/** What the native `<select>` takes from Root's props. The value is the chosen option's value, or
 *  with `multiple` an array of the chosen options' values. Inside a Field, the field's id, states
 *  and descriptions apply, its own props winning. */
export interface NativeSelectBehaviorProps extends Controllable<
    "value",
    NativeSelectValue
> {
    /** Lets several options be chosen (`<select multiple>`): the value is an array, and a form
     *  submits each chosen value under `name`. */
    readonly multiple?: boolean | undefined;
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

/** The value props, typed by `multiple`: a string for one option, an array of strings for
 *  several. Each binding's Root and ready-made component take these in place of
 *  `NativeSelectBehaviorProps`' untyped union. */
export type NativeSelectValueProps =
    | {
          readonly multiple?: false | undefined;
          readonly value?: string | undefined;
          readonly defaultValue?: string | undefined;
          readonly onValueChange?:
              | ((details: {
                    readonly value: string;
                    readonly reason?: "reset" | undefined;
                }) => void)
              | undefined;
      }
    | {
          readonly multiple: true;
          readonly value?: readonly string[] | undefined;
          readonly defaultValue?: readonly string[] | undefined;
          readonly onValueChange?:
              | ((details: {
                    readonly value: readonly string[];
                    readonly reason?: "reset" | undefined;
                }) => void)
              | undefined;
      };

/** The keys `NativeSelectValueProps` types. */
export type NativeSelectValueKeys =
    | "multiple"
    | "value"
    | "defaultValue"
    | "onValueChange";

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
    "multiple",
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

/** The value as a list of chosen values: `""` (nothing chosen) is none. */
export const nativeSelectValues = (
    value: NativeSelectValue | undefined,
): readonly string[] =>
    value === undefined
        ? []
        : typeof value === "string"
          ? value === ""
              ? []
              : [value]
          : value;

/** The value to report from the chosen options' values: an array with `multiple`, else the first
 *  (`""` for none). */
export const nativeSelectValue = (
    chosen: readonly string[],
    multiple: boolean | undefined,
): NativeSelectValue => (multiple ? [...chosen] : (chosen[0] ?? ""));

/** Whether two values choose the same options. */
export const sameNativeSelectValue = (
    a: NativeSelectValue | undefined,
    b: NativeSelectValue | undefined,
): boolean => {
    if (typeof a === "string" || typeof b === "string" || !a || !b)
        return a === b;
    return (
        a.length === b.length && a.every((value, index) => value === b[index])
    );
};

/** The options by `<optgroup>`: options outside any group come in their own runs, in order. */
export const nativeSelectGroups = (
    items: readonly NativeSelectItem[],
): SelectItemGroup<NativeSelectItem>[] => selectItemGroups(items);

/** The ready-made native select's repeated parts, each to its copy (`ItemInstance`): an option
 *  (its index in the order drawn, groups together, and its data; the placeholder is `-1`, with an
 *  empty value and the placeholder as label), and a group (its index among the groups, and its
 *  label as `item`). */
export interface NativeSelectInstances {
    readonly option: ItemInstance<NativeSelectItem>;
    readonly group: ItemInstance<string>;
}
