// The list's contract, shared by every binding: the props the list takes for itself, the items the
// ready-made list takes as data, and how the list's variants become every item's defaults. The list
// is a `<ul>` (`listAnatomy`) with each list item in an `<li>`, so an item can be a link or a
// button. A segmented list gives each item its position among the tiles.

import type { listAnatomy, PartName, TestIdOverride } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type {
    ListItemContentProps,
    ListItemExpandProps,
    ListItemPart,
} from "./list-item";
import type { ListItemVariantProps } from "./list-item";

/** The list's own parts: `"root" | "item"` (the `<li>` around each list item). */
export type ListPart = PartName<typeof listAnatomy>;

/** The list's variants: every list item's defaults, which an item's own override. A list
 *  item's tokens aren't among them: the ready-made list gives them in `listItemProps`. */
export type ListVariantProps = Pick<
    ListItemVariantProps,
    "density" | "color" | "leadingType"
>;

/** The list's own variant and tokens (the list recipe's): `segmented` sets its items apart as
 *  tiles. */
export interface ListOwnVariantProps {
    readonly variant?: "standard" | "segmented" | undefined;
    readonly tokens?: InstanceTokens<"list"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface ListRootOwnProps
    extends ListVariantProps, ListOwnVariantProps {
    /** The list's and its `<li>`s' test ids: a prefix (`mail` → `mail-root`, `mail-item`), or by
     *  part. */
    readonly testId?: TestIdOverride<ListPart> | undefined;
    /** The list's parts, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ListPart> | undefined;
}

/** The keys of `ListRootOwnProps`, which Root keeps off its element. */
export const LIST_ROOT_PROPS = [
    "variant",
    "density",
    "color",
    "tokens",
    "leadingType",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof ListRootOwnProps)[];

/** One item of the ready-made list, as data: a list item's content, variants, and props. */
export interface ListItemData<Node = unknown>
    extends
        ListItemContentProps<Node>,
        ListItemVariantProps,
        ListItemExpandProps {
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

/** A list item's variants over its list's: the item's own win. Reads only the
 *  variant props, so a binding's props (with their children) can be passed as they are. */
export const listItemVariants = (
    list: ListVariantProps | null | undefined,
    item: ListItemVariantProps,
): ListItemVariantProps => ({
    lines: item.lines,
    interactive: item.interactive,
    leadingType: item.leadingType ?? list?.leadingType,
    position: item.position,
    swipeable: item.swipeable,
    actionColor: item.actionColor,
    density: item.density ?? list?.density,
    color: item.color ?? list?.color,
    tokens: item.tokens,
});

/** The list's registry selection. */
export const listSelection = (
    props: ListOwnVariantProps,
): Selection<"list"> => ({
    variant: props.variant,
    tokens: props.tokens,
});

/** A tile's place in a run of separate tiles (a segmented list's items, a menu's groups, a
 *  connected button group), by its `index` among `count`: the preset's `position` variant
 *  rounds its corners by it. */
export type TilePosition = "first" | "middle" | "last" | "single";

/** Where the tile at `index` sits among `count` tiles. */
export const tilePosition = (index: number, count: number): TilePosition =>
    count === 1
        ? "single"
        : index === 0
          ? "first"
          : index === count - 1
            ? "last"
            : "middle";

/** Where an item sits among `count` tiles, by its `index`: its corners follow. Outside a
 *  segmented list, `none`. */
export const listItemPosition = (
    index: number,
    count: number,
    segmented: boolean,
): "none" | TilePosition => (segmented ? tilePosition(index, count) : "none");
