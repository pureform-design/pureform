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
import { presentProps } from "./overlay";
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

/** What the select machine takes from Root's props. The value is the chosen option's, or `null`.
 *  `open` is the list's. */
export interface SelectBehaviorProps
    extends
        Controllable<"value", string | null>,
        Controllable<"open", boolean> {
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

/** Zag's value (a list) from the select's (one value or `null`). */
export const toZagValue = (
    value: string | null | undefined,
): string[] | undefined =>
    value === undefined ? undefined : value === null ? [] : [value];

/** The select's value from Zag's. */
export const fromZagValue = (value: readonly string[]): string | null =>
    value[0] ?? null;

/** The controllable `value`'s machine props in Zag's shape: lists for the value and default, and
 *  the callback given the select's value. `controllable` is `useControllable`'s machine props. */
export const selectValueProps = (controllable: {
    readonly value: string | null | undefined;
    readonly defaultValue: string | null | undefined;
    readonly onValueChange: (
        details: ChangeDetails<"value", string | null>,
    ) => void;
}) => ({
    value: toZagValue(controllable.value),
    defaultValue: toZagValue(controllable.defaultValue),
    onValueChange: (details: { value: string[] }) =>
        controllable.onValueChange({ value: fromZagValue(details.value) }),
});

// Zag's item ids take numbers too; the select's values are strings.
const itemId = (
    id: ((value: string) => string) | undefined,
): ((value: string | number) => string) | undefined =>
    id === undefined ? undefined : (value) => id(String(value));

/** Zag's select props from Root's, besides `id`, `dir`, the collection, and the controllable
 *  `value` and `open`. `fieldsetDisabled` is the binding's `useFieldsetDisabled`. */
export const selectMachineProps = (
    props: SelectBehaviorProps,
    fieldsetDisabled: boolean,
) => ({
    disabled: props.disabled || fieldsetDisabled,
    invalid: props.invalid || !!props.error,
    required: props.required,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    autoComplete: props.autoComplete,
    positioning: {
        placement: "bottom-start" as const,
        sameWidth: true,
        // As wide as the field only while the viewport has room: a field as wide as the viewport
        // would push the list past its edge by Zag's padding, and the page would scroll sideways.
        fitViewport: true,
        ...props.positioning,
    },
    ids: {
        root: props.id ?? props.ids?.root,
        trigger: props.ids?.input,
        label: props.ids?.label,
        hiddenSelect: props.ids?.hiddenSelect,
        content: props.ids?.content,
        positioner: props.ids?.positioner,
        item: itemId(props.ids?.item),
    },
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

const SIDEWAYS: Readonly<Record<string, string>> = {
    ArrowLeft: "ArrowRight",
    ArrowRight: "ArrowLeft",
};

// The event with its sideways arrow key swapped, for a handler that reads `key`.
const swapSideways = <E extends object>(event: E): E =>
    new Proxy(event, {
        get(target, property) {
            if (property === "key") {
                const key = (target as { key?: string }).key ?? "";
                return SIDEWAYS[key] ?? key;
            }
            const value = Reflect.get(target, property, target) as unknown;
            return typeof value === "function" ? value.bind(target) : value;
        },
    });

/** Zag's trigger props for the `input` part, a read-only `<input>` the preset draws as the field:
 *  no `type="button"`, the value's label as its value, and a placeholder of one space so the
 *  label floats once there's a value. Under `rtl` the sideways arrow keys swap, so the one
 *  pointing back chooses the option before, as in any other direction-aware control (Zag's
 *  select reads them by the list's vertical orientation, which doesn't flip). */
export const selectInputProps = <P extends object>(
    props: P,
    valueText: string,
    dir: "ltr" | "rtl" | undefined,
): Omit<P, "type"> & {
    readonly readOnly: true;
    readonly value: string;
    readonly placeholder: " ";
    readonly autoComplete: "off";
} => {
    const { type: _type, ...rest } = props as P & {
        type?: unknown;
        onKeyDown?: (event: object) => void;
    };
    const onKeyDown = (rest as { onKeyDown?: (event: object) => void })
        .onKeyDown;
    return {
        ...rest,
        ...(dir === "rtl" && onKeyDown
            ? {
                  onKeyDown: (event: object) => onKeyDown(swapSideways(event)),
              }
            : {}),
        readOnly: true,
        value: valueText,
        placeholder: " ",
        autoComplete: "off",
    };
};

/** Zag's positioner props, hidden once the list is gone (closed, and its exit animation over), so
 *  the closed list takes no room in the layout or the page's measurements. */
export const selectPositionerProps = presentProps;

/** Zag's hidden-select props, without `aria-labelledby` (it's hidden from assistive technology
 *  anyway) and with the visually hidden style kept. */
export const selectHiddenSelectProps = <P extends object>(
    props: P,
): Omit<P, "aria-labelledby"> => {
    const { "aria-labelledby": _labelledBy, ...rest } = props as P & {
        "aria-labelledby"?: unknown;
    };
    return rest;
};
