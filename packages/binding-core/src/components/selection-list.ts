// The selection list's contract, shared by every binding: a list (`listAnatomy`) whose rows are
// options of Zag's listbox (Angular's `mat-selection-list`). The list is the `listbox` and takes
// focus; the arrow keys move a highlight across its options, and a press or Enter or Space selects
// one. Each option is a list item marked with `aria-selected`, which its selected colors read.

import type { Controllable } from "../controllable";
import type { InteractionSourceProps } from "./indication";
import type { ListRootOwnProps } from "./list";
import type { ListItemContentProps, ListItemVariantProps } from "./list-item";

/** What Zag's listbox takes from Root's props. */
export interface SelectionListBehaviorProps extends Controllable<
    "value",
    string[]
> {
    /** `single` selects one option at a time, as M3 lists mostly do; `multiple` any number, as
     *  Angular's selection list does. @default "single" */
    readonly selectionMode?: "single" | "multiple" | undefined;
    /** Whether a single-select list lets its one option go off again. @default false */
    readonly deselectable?: boolean | undefined;
    /** Whether the arrow keys go round from the last option to the first. @default false */
    readonly loopFocus?: boolean | undefined;
    /** Disables every option. */
    readonly disabled?: boolean | undefined;
    /** The list's id; the machine builds the options' ids from it.
     *  @control none */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SelectionListRootOwnProps
    extends ListRootOwnProps, SelectionListBehaviorProps {}

/** The keys of `SelectionListRootOwnProps`, which Root keeps off its element. */
export const SELECTION_LIST_ROOT_PROPS = [
    "variant",
    "density",
    "color",
    "tokens",
    "leadingType",
    "testId",
    "unstyled",
    "selectionMode",
    "deselectable",
    "loopFocus",
    "disabled",
    "id",
    "value",
    "defaultValue",
    "onValueChange",
] as const satisfies readonly (keyof SelectionListRootOwnProps)[];

/** One option of the selection list, as data: a list item's content and variants, with its
 *  value. */
export interface SelectionListItem<Node = unknown>
    extends
        ListItemContentProps<Node>,
        Omit<ListItemVariantProps, "interactive">,
        InteractionSourceProps {
    readonly value: string;
    /** The text typeahead matches, for an option whose headline isn't a string. @default its
     *  headline, if a string, else its value */
    readonly textValue?: string | undefined;
    readonly disabled?: boolean | undefined;
}

/** What the ready-made selection list renders inside Root. */
export interface SelectionListContentProps<Node> {
    /** The options, in order. */
    readonly items?: readonly SelectionListItem<Node>[] | undefined;
}

/** The keys of `SelectionListContentProps`. */
export const SELECTION_LIST_CONTENT_PROPS = [
    "items",
] as const satisfies readonly (keyof SelectionListContentProps<unknown>)[];

/** An option as the listbox's collection holds it. */
export interface SelectionListOption {
    readonly value: string;
    readonly label: string;
    readonly disabled: boolean;
}

/** The listbox's collection items from the options: each with its typeahead text and whether
 *  it's disabled. */
export const selectionListOptions = (
    items: readonly Pick<
        SelectionListItem,
        "value" | "textValue" | "headline" | "disabled"
    >[],
): SelectionListOption[] =>
    items.map((item) => ({
        value: item.value,
        label:
            item.textValue ??
            (typeof item.headline === "string" ? item.headline : item.value),
        disabled: !!item.disabled,
    }));

/** Portable defaults consumed by both platform selection implementations. */
export const selectionListDefaults = (props: SelectionListBehaviorProps) => ({
    selectionMode: props.selectionMode ?? ("single" as const),
    deselectable: props.deselectable,
});
