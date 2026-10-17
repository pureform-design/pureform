// The list's contract, shared by every binding: the props the list takes for itself, the items the
// ready-made list takes as data, and how the list's variants become every item's defaults. The list
// is an unstyled `<ul>` (`listAnatomy`) with each list item in an `<li>`, so an item can be a link
// or a button.

import type { listAnatomy, PartName, TestIdOverride } from "@pureform/anatomy";

import type { ListItemContentProps, ListItemPart } from "./list-item";
import type { ListItemVariantProps } from "./list-item";

/** The list's own parts: `"root" | "item"` (the `<li>` around each list item). */
export type ListPart = PartName<typeof listAnatomy>;

/** The list's variants: every list item's defaults, which an item's own override. */
export type ListVariantProps = Pick<
    ListItemVariantProps,
    "density" | "color" | "tokens"
>;

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface ListRootOwnProps extends ListVariantProps {
    /** The list's and its `<li>`s' test ids: a prefix (`mail` → `mail-root`, `mail-item`), or by
     *  part. */
    readonly testId?: TestIdOverride<ListPart> | undefined;
}

/** The keys of `ListRootOwnProps`, which Root keeps off its element. */
export const LIST_ROOT_PROPS = [
    "density",
    "color",
    "tokens",
    "testId",
] as const satisfies readonly (keyof ListRootOwnProps)[];

/** One item of the ready-made list, as data: a list item's content, variants, and props. */
export interface ListItemData<Node = unknown>
    extends ListItemContentProps<Node>, ListItemVariantProps {
    /** Its key among the items. @default its index */
    readonly value?: string | undefined;
    /** Where it leads: the item renders as a link. */
    readonly href?: string | undefined;
    readonly selected?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    /** The item's test ids: a prefix or ids by part. */
    readonly testId?: TestIdOverride<ListItemPart> | undefined;
}

/** What the ready-made list renders inside Root. */
export interface ListContentProps<Node> {
    /** The items, in order. */
    readonly items?: readonly ListItemData<Node>[] | undefined;
}

/** The keys of `ListContentProps`. */
export const LIST_CONTENT_PROPS = [
    "items",
] as const satisfies readonly (keyof ListContentProps<unknown>)[];

/** A list item's variants over its list's: the item's own win; tokens merge. */
export const listItemVariants = (
    list: ListVariantProps | undefined,
    item: ListItemVariantProps,
): ListItemVariantProps => ({
    ...item,
    density: item.density ?? list?.density,
    color: item.color ?? list?.color,
    tokens:
        list?.tokens || item.tokens
            ? { ...list?.tokens, ...item.tokens }
            : undefined,
});
