// Tiles: separate surfaces in a run (a segmented list's items, a menu's groups, later a
// connected button group), whose corners follow their position in the run.

import type { NumericValue, StyleMap, ValueNode } from "@pureform/core/ast";
import { radius } from "@pureform/theme";

/** Where a tile sits in a run of separate tiles (a segmented list's items, a menu's groups):
 *  `none` outside such a run. */
export const POSITIONS = ["none", "first", "middle", "last", "single"] as const;

export type Position = (typeof POSITIONS)[number];

/** The corners of a tile by its position in a run stacked in the block direction: `outer` on
 *  the run's outside corners, `inner` where it meets the tile next to it. `none` sets nothing. */
export const positionCorners = (
    outer: NumericValue,
    inner: NumericValue,
): Record<Position, StyleMap> => {
    const corners = (start: NumericValue, end: NumericValue): StyleMap => ({
        borderStartStartRadius: start,
        borderStartEndRadius: start,
        borderEndStartRadius: end,
        borderEndEndRadius: end,
    });
    return {
        none: {},
        first: corners(outer, inner),
        middle: corners(inner, inner),
        last: corners(inner, outer),
        single: corners(outer, outer),
    };
};

/** The radii a tile takes by position: the theme's large and extra-small roles. */
export const TILE_RADII = {
    outerRadius: radius("large"),
    innerRadius: radius("extraSmall"),
} satisfies Record<string, ValueNode>;
