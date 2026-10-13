// pureform's foundation tokens: spacing, shape, sizes, and the shared opacities.
//
// These are the non-color defaults every pureform component reads. Spacing follows a 4px grid,
// the radii follow the Material shape scale, and the opacities are the Material disabled and
// scrim values.

import { pct, px } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

/** Spacing on a 4px grid, keyed by multiple: `"4"` is 16px. */
const SPACING = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16] as const;

/** The Material shape scale. */
const RADII = {
    none: 0,
    extraSmall: 4,
    small: 8,
    medium: 12,
    large: 16,
    extraLarge: 28,
    full: 9999,
} as const;

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

/** Opacities in percent. A disabled control draws its container and content in the on-surface
 *  color at these strengths, and a scrim dims what is behind a modal surface. */
const OPACITIES = {
    disabledContainer: 12,
    disabledContent: 38,
    scrim: 32,
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
        radii: toPx(RADII),
        sizes: toPx(SIZES),
        opacity: Object.fromEntries(
            Object.entries(OPACITIES).map(([name, value]) => [
                name,
                pct(value),
            ]),
        ),
    },
});
