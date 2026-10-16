// Reduced motion: the attribute the web bindings set for an app's own motion setting, and which
// transitions move something, which reduced motion stops. Color, opacity, and elevation fades
// keep running, since they don't move anything.

import type { DynamicNode, ValueType } from "./ast";

/** How much motion an app asks for: the system's preference, or reduced or full whatever the
 *  system says. */
export type MotionSetting = "system" | "reduce" | "full";

/** The attribute a provider writes on its element when its motion setting isn't `"system"`:
 *  `data-pf-motion="reduce"` or `data-pf-motion="full"`. The web adapters' `reducedMotion`
 *  condition reads it from an ancestor, over the system's `prefers-reduced-motion`. */
export const MOTION_ATTRIBUTE = "data-pf-motion";

// Properties whose transitions fade rather than move: colors, opacity, and elevation.
const FADES = new Set([
    "color",
    "fill",
    "stroke",
    "opacity",
    "boxShadow",
    "textShadow",
    "filter",
]);

// Token types whose tweens move something: a position, a size, a turn, or a progress value.
const MOVING_TYPES = new Set<ValueType>([
    "length",
    "percentage",
    "lengthPercentage",
    "angle",
    "number",
]);

/** Whether a token of this type moves something as it tweens, so reduced motion stops it:
 *  lengths, percentages, angles, and numbers do; colors and times don't. A token without a
 *  type doesn't either. */
export const valueTypeMoves = (valueType: ValueType | undefined): boolean =>
    valueType !== undefined && MOVING_TYPES.has(valueType);

/** Whether a transition of this property moves, resizes, or reshapes something, so reduced
 *  motion stops it. Colors (any property ending in `Color`), opacity, shadows, and filters
 *  fade instead, and keep running. A dynamic value moves by its type; `"all"` counts as
 *  moving. */
export const transitionMoves = (property: string | DynamicNode): boolean =>
    typeof property === "string"
        ? !(FADES.has(property) || property.endsWith("Color"))
        : valueTypeMoves(property.valueType);
