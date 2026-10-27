// Reduced motion for JS: the provider's setting in effect, over the system's preference.

import type { MotionSetting } from "@pureform/core";

export type { MotionSetting } from "@pureform/core";

/** Whether to reduce motion: `"reduce"` and `"full"` decide; `"system"` follows the system. */
export const resolveReducedMotion = (
    setting: MotionSetting,
    systemReduces: boolean,
): boolean =>
    setting === "reduce" ? true : setting === "full" ? false : systemReduces;
