// Reduced motion for JS: the provider's setting in effect, over the system's preference.

import type { MotionSetting } from "@pureform/core";

export type { MotionSetting } from "@pureform/core";
export { MOTION_ATTRIBUTE } from "@pureform/core";

/** The media query the system's preference is read from. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Whether to reduce motion: `"reduce"` and `"full"` decide; `"system"` follows the system. */
export const resolveReducedMotion = (
    setting: MotionSetting,
    systemReduces: boolean,
): boolean =>
    setting === "reduce" ? true : setting === "full" ? false : systemReduces;
