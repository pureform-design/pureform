// The grid list's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection, and the roles its parts take. A grid list has no machine and no
// interaction: it lays out tiles. Root is a list and each tile a list item, so assistive
// technology counts them; a grid that isn't a list of like things leaves the roles off by passing
// its own `role`.

import type {
    gridListAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The grid list's parts: `"root" | "tile" | "content" | "media" | "header" | "footer" |
 *  "headline" | "subhead"`. */
export type GridListPart = PartName<typeof gridListAnatomy>;

/** The grid list's variant groups and instance tokens. `columns` is how many tiles share a row,
 *  `gutter` the space between them and `aspect` a tile's width over its height. The `columns`,
 *  `gutter` and `aspect` tokens take any value the groups don't name. */
export interface GridListVariantProps {
    readonly columns?: VariantProp<"gridList", "columns">;
    readonly gutter?: VariantProp<"gridList", "gutter">;
    readonly aspect?: VariantProp<"gridList", "aspect">;
    readonly tokens?: InstanceTokens<"gridList"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface GridListRootOwnProps extends GridListVariantProps {
    /** A prefix for every part's test id (`photos` → `photos-root`), or ids by part. */
    readonly testId?: TestIdOverride<GridListPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<GridListPart> | undefined;
}

/** The keys of `GridListRootOwnProps`, which Root keeps off its element. */
export const GRID_LIST_ROOT_PROPS = [
    "columns",
    "gutter",
    "aspect",
    "tokens",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof GridListRootOwnProps)[];

/** The registry selection from Root's props. */
export const gridListSelection = (
    props: GridListVariantProps,
): Selection<"gridList"> => ({
    columns: props.columns,
    gutter: props.gutter,
    aspect: props.aspect,
    tokens: props.tokens,
});

/** Root's element props: the list role. */
export const gridListRootProps = () => ({ role: "list" as const });

/** A tile's element props: the list item role. */
export const gridListTileProps = () => ({ role: "listitem" as const });
