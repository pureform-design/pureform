// The autocomplete's contract, shared by every binding: the props Root takes for itself, how they
// map onto the selection and Zag's combobox machine, and which suggestions the list shows. The
// field is the select's with an editable input (the combobox), the arrow as its trailing icon;
// the suggestions open in a list drawn as a menu. The input submits its text under `name`.

import type {
    autocompleteAnatomy,
    autocompleteMenuAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { IndicationProps } from "./indication";
import type { SelectItem, SelectPositioning } from "./select";
import type { VariantProp } from "./variants";

/** The autocomplete's parts: the select's field, without the hidden select. */
export type AutocompletePart = PartName<typeof autocompleteAnatomy>;

/** The parts of the list of suggestions: `"positioner" | "root"` (the list,
 *  `Autocomplete.Content`) `| "itemGroup" | "itemGroupLabel" | "item" | "itemLabel"`. */
export type AutocompleteMenuPart = PartName<typeof autocompleteMenuAnatomy>;

/** One suggestion, as data: the select's option. */
export type AutocompleteItem = SelectItem;

/** The autocomplete's variant groups and instance tokens, as the select's. */
export interface AutocompleteVariantProps {
    readonly variant?: VariantProp<"autocomplete", "variant">;
    readonly color?: VariantProp<"autocomplete", "color">;
    readonly density?: VariantProp<"autocomplete", "density">;
    readonly leadingIcon?: boolean | undefined;
    readonly prefixText?: boolean | undefined;
    readonly suffixText?: boolean | undefined;
    readonly tokens?: InstanceTokens<"autocomplete"> | undefined;
}

/** The ids of the autocomplete's elements, for composition. */
export interface AutocompleteElementIds {
    readonly root?: string | undefined;
    readonly input?: string | undefined;
    readonly label?: string | undefined;
    readonly content?: string | undefined;
    readonly positioner?: string | undefined;
    readonly supportingText?: string | undefined;
    readonly item?: ((value: string) => string) | undefined;
}

/** Which suggestions match the typed text. */
export type AutocompleteFilter = (
    item: AutocompleteItem,
    inputValue: string,
) => boolean;

/** What the combobox machine takes from Root's props. `value` is the chosen suggestion's, or
 *  `null`; `inputValue` is the typed text; `open` is the list's. */
export interface AutocompleteBehaviorProps
    extends
        Controllable<"value", string | null>,
        Controllable<"inputValue", string>,
        Controllable<"open", boolean> {
    /** Every suggestion, in order; the list shows those `filter` keeps. */
    readonly items?: readonly AutocompleteItem[] | undefined;
    /** Which suggestions the typed text keeps. `false` keeps all (the app filters `items`).
     *  @default labels containing the text, ignoring case */
    readonly filter?: AutocompleteFilter | false | undefined;
    /** Keep text that matches no suggestion. @default true */
    readonly allowCustomValue?: boolean | undefined;
    /** Open the list when the input is clicked, not only when typing. @default false */
    readonly openOnClick?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    readonly invalid?: boolean | undefined;
    /** An error message: marks the field invalid and replaces the supporting text. */
    readonly error?: string | undefined;
    readonly required?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    /** The name the input submits its text under.
     *  @control none */
    readonly name?: string | undefined;
    /** @control none */
    readonly form?: string | undefined;
    readonly positioning?: SelectPositioning | undefined;
    /** @control none */
    readonly id?: string | undefined;
    readonly ids?: AutocompleteElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface AutocompleteRootOwnProps
    extends
        AutocompleteVariantProps,
        AutocompleteBehaviorProps,
        IndicationProps {
    /** A prefix for every part's test id (`city` → `city-input`), or the field's ids by part. */
    readonly testId?: TestIdOverride<AutocompletePart> | undefined;
    readonly unstyled?: Unstyled<AutocompletePart> | undefined;
}

/** The keys of `AutocompleteRootOwnProps`, which Root keeps off its element. */
export const AUTOCOMPLETE_ROOT_PROPS = [
    "variant",
    "color",
    "density",
    "leadingIcon",
    "prefixText",
    "suffixText",
    "tokens",
    "items",
    "filter",
    "allowCustomValue",
    "openOnClick",
    "disabled",
    "invalid",
    "error",
    "required",
    "readOnly",
    "name",
    "form",
    "positioning",
    "id",
    "ids",
    "value",
    "defaultValue",
    "onValueChange",
    "inputValue",
    "defaultInputValue",
    "onInputValueChange",
    "open",
    "defaultOpen",
    "onOpenChange",
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof AutocompleteRootOwnProps)[];

/** The registry selection of the field. The arrow's room is always there. */
export const autocompleteSelection = (
    props: AutocompleteVariantProps,
): Selection<"autocomplete"> => ({
    variant: props.variant,
    color: props.color,
    density: props.density,
    leadingIcon: props.leadingIcon,
    prefixText: props.prefixText,
    suffixText: props.suffixText,
    trailingIcon: true,
    tokens: props.tokens,
});

/** The list's registry selection: the menu's, in the autocomplete's color and density. */
export const autocompleteMenuSelection = (
    props: AutocompleteVariantProps,
): Selection<"menu"> => ({
    color: props.color as Selection<"menu">["color"],
    density: props.density as Selection<"menu">["density"],
});

/** Labels containing the typed text, ignoring case: the default filter. */
export const containsFilter: AutocompleteFilter = (item, inputValue) =>
    item.label
        .toLocaleLowerCase()
        .includes(inputValue.trim().toLocaleLowerCase());

/** The suggestions the list shows for the typed text. */
export const autocompleteMatches = (
    items: readonly AutocompleteItem[],
    inputValue: string,
    filter: AutocompleteFilter | false | undefined,
): AutocompleteItem[] =>
    filter === false
        ? [...items]
        : items.filter((item) => (filter ?? containsFilter)(item, inputValue));

/** The supporting text's id: the given one, else built from the machine's id. */
export const autocompleteSupportingTextId = (
    props: Pick<AutocompleteBehaviorProps, "ids">,
    id: string,
): string => props.ids?.supportingText ?? `combobox:${id}:supporting-text`;

/** The text the list filters by, from Zag's input change: what the user typed, or nothing (every
 *  suggestion) when the text changed otherwise, such as to a chosen suggestion's label. */
export const autocompleteFilterText = (details: {
    readonly inputValue: string;
    readonly reason?: string | undefined;
}): string => (details.reason === "input-change" ? details.inputValue : "");

/** The input's text to start with: the given one, else the label of the chosen suggestion. */
export const autocompleteInitialText = (
    props: Pick<
        AutocompleteBehaviorProps,
        "items" | "value" | "defaultValue" | "defaultInputValue"
    >,
): string | undefined => {
    if (props.defaultInputValue !== undefined) return props.defaultInputValue;
    const value = props.value !== undefined ? props.value : props.defaultValue;
    return props.items?.find((item) => item.value === value)?.label;
};
