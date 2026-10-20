// Tiles: separate surfaces in a run (a segmented list's items, a menu's groups, later a
// connected button group), whose corners follow their position in the run.

import type { NumericValue, StyleMap, ValueNode } from "@pureform/core/ast";
import { radius } from "@pureform/theme";

/** Where a tile sits in a run of separate tiles (a segmented list's items, a menu's groups):
 *  `none` outside such a run. */
export const POSITIONS = ["none", "first", "middle", "last", "single"] as const;

export type Position = (typeof POSITIONS)[number];

/** The axis a run of tiles goes along: `block` for lists and menus, `inline` for a connected
 *  button group or a split button. */
export type RunAxis = "block" | "inline";

/** A tile's corners on the run's `start` and `end` sides along `axis`. */
export const runCorners = (
    start: NumericValue,
    end: NumericValue,
    axis: RunAxis = "block",
): StyleMap =>
    axis === "block"
        ? {
              borderStartStartRadius: start,
              borderStartEndRadius: start,
              borderEndStartRadius: end,
              borderEndEndRadius: end,
          }
        : {
              borderStartStartRadius: start,
              borderEndStartRadius: start,
              borderStartEndRadius: end,
              borderEndEndRadius: end,
          };

/** The corners of a tile by its position in a run along `axis` (stacked in the block direction
 *  by default): `outer` on the run's outside corners, `inner` where it meets the tile next to
 *  it. `none` sets nothing. */
export const positionCorners = (
    outer: NumericValue,
    inner: NumericValue,
    axis: RunAxis = "block",
): Record<Position, StyleMap> => ({
    none: {},
    first: runCorners(outer, inner, axis),
    middle: runCorners(inner, inner, axis),
    last: runCorners(inner, outer, axis),
    single: runCorners(outer, outer, axis),
});

/** The radii a tile takes by position: the theme's large and extra-small roles. */
export const TILE_RADII = {
    outerRadius: radius("large"),
    innerRadius: radius("extraSmall"),
} satisfies Record<string, ValueNode>;
