// The select's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and Zag's select machine, and how the machine's part props are adjusted for
// the preset's markup. The field is the text field's (a read-only combobox `<input>` with the
// arrow as its trailing icon); the options open in a list drawn as a menu; a hidden native
// `<select>` submits, resets, validates, and takes autofill.

import type {
    PartName,
    selectAnatomy,
    selectMenuAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { ChangeDetails, Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import type { VariantProp } from "./variants";

/** The select's parts: the field's, and `"hiddenSelect"`. */
export type SelectPart = PartName<typeof selectAnatomy>;

/** The parts of the select's list of options: `"positioner" | "root"` (the list, `Select.Content`)
 *  `| "itemGroup" | "itemGroupLabel" | "item" | "itemLabel"`. */
export type SelectMenuPart = PartName<typeof selectMenuAnatomy>;

/** The select's variant groups and instance tokens. `leadingIcon` makes room for an icon at the
 *  start; the ready-made select sets it when it renders one. The arrow is always there. */
export interface SelectVariantProps {
    readonly variant?: VariantProp<"select", "variant">;
    readonly color?: VariantProp<"select", "color">;
    readonly density?: VariantProp<"select", "density">;
    readonly leadingIcon?: boolean | undefined;
    /** Make room for prefix or suffix text; the ready-made select sets them when it renders one. */
    readonly prefixText?: boolean | undefined;
    readonly suffixText?: boolean | undefined;
    readonly tokens?: InstanceTokens<"select"> | undefined;
}

/** The ids of the select's elements, for composition. Zag builds each option's id from its value
 *  (`item("m")`). */
export interface SelectElementIds {
    readonly root?: string | undefined;
    /** The combobox input. */
    readonly input?: string | undefined;
    readonly label?: string | undefined;
    readonly hiddenSelect?: string | undefined;
    readonly content?: string | undefined;
    readonly positioner?: string | undefined;
    readonly supportingText?: string | undefined;
    readonly item?: ((value: string) => string) | undefined;
}

/** One option, as data. Option groups come with the menu's group parts (c1c). */
export interface SelectItem extends InteractionSourceProps {
    readonly value: string;
    /** What the option and the field show, and typeahead matches. */
    readonly label: string;
    readonly disabled?: boolean | undefined;
    /** The label of the option group it belongs to. A group's options sit together, in the
     *  order the groups first appear. */
    readonly group?: string | undefined;
}

/** A run of options under one group label (`undefined` for options outside any group). */
export interface SelectItemGroup<Item = SelectItem> {
    readonly group: string | undefined;
    readonly items: readonly Item[];
}

/** The options by group, in the order each group first appears; options outside any group form
 *  their own runs. The list shows them in this order, so give it the items in it too (see
 *  `selectGroupedItems`), or the arrow keys move in a different order than the eye. `groupOf`
 *  reads another tag than `group`: the rail's `section`, say. */
export const selectItemGroups = <Item = SelectItem>(
    items: readonly Item[],
    groupOf: (item: Item) => string | undefined = (item) =>
        (item as SelectItem).group,
): SelectItemGroup<Item>[] => {
    const groups: { group: string | undefined; items: Item[] }[] = [];
    const byName = new Map<string, Item[]>();
    for (const item of items) {
        const group = groupOf(item);
        if (group === undefined) {
            const last = groups.at(-1);
            if (last && last.group === undefined) last.items.push(item);
            else groups.push({ group: undefined, items: [item] });
            continue;
        }
        let run = byName.get(group);
        if (!run) {
            run = [];
            byName.set(group, run);
            groups.push({ group, items: run });
        }
        run.push(item);
    }
    return groups;
};

/** The items in the order the list shows them: by group. */
export const selectGroupedItems = (
    items: readonly SelectItem[],
): SelectItem[] => selectItemGroups(items).flatMap((group) => group.items);

/** Where the list opens: Zag's positioning options that matter here. @default `{ placement:
 *  "bottom-start", sameWidth: true }`, and the list never wider or taller than the room the
 *  viewport has for it */
export interface SelectPositioning {
    readonly placement?:
        | "bottom-start"
        | "bottom"
        | "bottom-end"
        | "top-start"
        | "top"
        | "top-end"
        | undefined;
    /** The gap between the field and the list, in pixels. */
    readonly gutter?: number | undefined;
    /** The list as wide as the field. */
    readonly sameWidth?: boolean | undefined;
    /** `fixed` escapes a container that clips. @default "absolute" */
    readonly strategy?: "absolute" | "fixed" | undefined;
    /** Open on the other side when there's no room. @default true */
    readonly flip?: boolean | undefined;
}

/** What the select machine takes from Root's props. `open` is the list's. The value is the chosen
 *  option's, or `null`, or with `multiple` an array; each binding's props type it by `multiple`
 *  (`SelectValueProps`). */
export interface SelectBehaviorProps
    extends Controllable<"value", SelectValue>, Controllable<"open", boolean> {
    /** Lets several options be chosen: choosing one toggles it without closing the list, and a
     *  form submits each chosen value under `name`. The value is then an array. */
    readonly multiple?: boolean | undefined;
    /** What the field shows for the chosen options, as text. @default the labels, joined by
     *  ", " */
    readonly summary?: ((chosen: readonly SelectItem[]) => string) | undefined;
    /** The options, in order. */
    readonly items?: readonly SelectItem[] | undefined;
    /** A disabled fieldset around the select disables it too. */
    readonly disabled?: boolean | undefined;
    /** Marks the field invalid (`aria-invalid`), which the error look keys on. */
    readonly invalid?: boolean | undefined;
    /** An error message: marks the field invalid, replaces the supporting text, and blocks
     *  submitting, as the hidden select's custom validity. */
    readonly error?: string | undefined;
    /** Blocks submitting until an option is chosen. */
    readonly required?: boolean | undefined;
    /** Shows the value but doesn't open. */
    readonly readOnly?: boolean | undefined;
    /** The name the hidden select submits under.
     *  @control none */
    readonly name?: string | undefined;
    /** The id of the form the hidden select belongs to, for a select outside it.
     *  @control none */
    readonly form?: string | undefined;
    /** The hidden select's `autocomplete`, for autofill. */
    readonly autoComplete?: string | undefined;
    readonly positioning?: SelectPositioning | undefined;
    /** The root element's id; the machine builds the other ids from it.
     *  @control none */
    readonly id?: string | undefined;
    readonly ids?: SelectElementIds | undefined;
}

/** The value props, typed by `multiple`: the chosen option's value, or `null`, for one option, and
 *  an array of the chosen options' values for several. Each binding's Root and ready-made
 *  component take these with `SelectRootOwnProps` (less `SelectValueKeys`), so a scalar value
 *  with `multiple`, or an array without it, is a type error. */
export type SelectValueProps =
    | {
          readonly multiple?: false | undefined;
          readonly value?: string | null | undefined;
          readonly defaultValue?: string | null | undefined;
          readonly onValueChange?:
              | ((details: ChangeDetails<"value", string | null>) => void)
              | undefined;
      }
    | {
          readonly multiple: true;
          readonly value?: readonly string[] | undefined;
          readonly defaultValue?: readonly string[] | undefined;
          readonly onValueChange?:
              | ((details: ChangeDetails<"value", readonly string[]>) => void)
              | undefined;
      };

/** The keys `SelectValueProps` types. */
export type SelectValueKeys =
    | "multiple"
    | "value"
    | "defaultValue"
    | "onValueChange";

/** The chosen options' labels as the field's text: joined by ", ", or `summary`'s. */
export const selectSummary = (
    chosen: readonly SelectItem[],
    summary?: SelectBehaviorProps["summary"],
): string =>
    summary ? summary(chosen) : chosen.map((item) => item.label).join(", ");

/** The select's value in the shape a controllable gives: one value or `null`, or an array. */
export type SelectValue = string | null | readonly string[];

/** The value as the machine's list of values. */
export const toSelectList = (
    value: SelectValue | undefined,
): string[] | undefined =>
    value === undefined
        ? undefined
        : value === null
          ? []
          : typeof value === "string"
            ? [value]
            : [...value];

/** The machine's list of values as the select's value: the array with `multiple`, else the first
 *  or `null`. */
export const fromSelectList = (
    list: readonly string[],
    multiple: boolean | undefined,
): SelectValue => (multiple ? [...list] : (list[0] ?? null));

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SelectRootOwnProps
    extends SelectVariantProps, SelectBehaviorProps, IndicationProps {
    /** A prefix for every part's test id (`size` → `size-input`, `size-item`), or the field's ids
     *  by part. */
    readonly testId?: TestIdOverride<SelectPart> | undefined;
    /** Every part of the field, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<SelectPart> | undefined;
}

/** The keys of `SelectRootOwnProps`, which Root keeps off its element. */
export const SELECT_ROOT_PROPS = [
    "variant",
    "color",
    "density",
    "leadingIcon",
    "prefixText",
    "suffixText",
    "tokens",
    "items",
    "disabled",
    "invalid",
    "error",
    "required",
    "readOnly",
    "name",
    "form",
    "autoComplete",
    "positioning",
    "id",
    "ids",
    "multiple",
    "summary",
    "value",
    "defaultValue",
    "onValueChange",
    "open",
    "defaultOpen",
    "onOpenChange",
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof SelectRootOwnProps)[];

/** The props of the ready-made select that name the combobox, so they go on it. */
export const SELECT_INPUT_LABEL_PROPS = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
] as const;

/** What the ready-made select renders inside Root, in the framework's node type. */
export interface SelectContentProps<Node> {
    /** The floating label, also the combobox's accessible name. */
    readonly label?: Node;
    /** Helper text under the field; an error message takes its place. */
    readonly supportingText?: Node;
    /** An icon at the start of the field; renders only when given. */
    readonly leadingIcon?: Node;
    /** The arrow at the end; a drop-down arrow unless given. */
    readonly trailingIcon?: Node;
    /** Text before the value; shows once the label floats. */
    readonly prefixText?: Node;
    /** Text after the value; shows once the label floats. */
    readonly suffixText?: Node;
}

/** The keys of `SelectContentProps`. */
export const SELECT_CONTENT_PROPS = [
    "label",
    "supportingText",
    "leadingIcon",
    "trailingIcon",
    "prefixText",
    "suffixText",
] as const satisfies readonly (keyof SelectContentProps<unknown>)[];

/** The field's registry selection from Root's props. The arrow's room is always there. */
export const selectSelection = (
    props: SelectVariantProps,
): Selection<"select"> => ({
    variant: props.variant,
    color: props.color,
    density: props.density,
    leadingIcon: props.leadingIcon,
    prefixText: props.prefixText,
    suffixText: props.suffixText,
    trailingIcon: true,
    tokens: props.tokens,
});

/** The list's registry selection: the menu's, in the select's color and density. */
export const selectMenuSelection = (
    props: SelectVariantProps,
): Selection<"menu"> => ({
    color: props.color as Selection<"menu">["color"],
    density: props.density as Selection<"menu">["density"],
});

/** The collection's options: how Zag reads a `SelectItem`. */
export const SELECT_COLLECTION = {
    itemToValue: (item: SelectItem) => item.value,
    itemToString: (item: SelectItem) => item.label,
    isItemDisabled: (item: SelectItem) => item.disabled === true,
} as const;

/** The supporting text's id: the given one, else built from the machine's id. */
export const selectSupportingTextId = (
    props: Pick<SelectBehaviorProps, "ids">,
    id: string,
): string => props.ids?.supportingText ?? `select:${id}:supporting-text`;
