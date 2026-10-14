// pureform's foundation tokens: spacing and sizes.
//
// These are the layout defaults every pureform component reads. Spacing follows a 4px grid.
// Radii and opacities come from the theme's shape and state contracts instead.

import { px } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

/** Spacing on a 4px grid, keyed by multiple: `"4"` is 16px. */
const SPACING = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16] as const;

/** Component dimensions shared across recipes. `touchTarget` is the minimum interactive area
 *  Material requires, whatever the visible size. */
const SIZES = {
    iconSmall: 18,
    iconMedium: 24,
    controlSmall: 32,
    controlMedium: 40,
    controlLarge: 48,
    touchTarget: 48,
} as const;

const toPx = (entries: Record<string, number>) =>
    Object.fromEntries(
        Object.entries(entries).map(([name, value]) => [name, px(value)]),
    );

/** Build the foundation fragment. Compose it under any config that uses pureform components. */
export const foundation = (): Pick<CoreConfig, "tokens"> => ({
    tokens: {
        spacing: Object.fromEntries(
            SPACING.map((step) => [String(step), px(step * 4)]),
        ),
        sizes: toPx(SIZES),
    },
});
