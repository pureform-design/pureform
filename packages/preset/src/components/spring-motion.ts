// Movement on a spring beside fades on their tween, as Compose splits a component's motion: a
// spatial spring for what moves (position, size, rotation) and the colors on their own timing.

import { tween } from "@pureform/core/ast";
import type { StyleMap, TransitionPart } from "@pureform/core/ast";
import { duration, easing, spring } from "@pureform/theme";
import type { SpringRole } from "@pureform/theme";

import { motionTransition } from "./shared";

type Property = TransitionPart["property"];

/** A transition moving `moving` on the spring `role` and fading `fades` over `short3` on the
 *  standard curve (`tweens`' timing). Under reduced motion the moving ones change at once and
 *  the fades still run. */
export const springTweens = (
    role: SpringRole,
    moving: readonly Property[],
    fades: readonly Property[] = [],
): NonNullable<StyleMap["transition"]> =>
    motionTransition(
        ...moving.map((property) => tween(property, { spring: spring(role) })),
        ...fades.map((property) =>
            tween(property, {
                duration: duration("short3"),
                easing: easing("standard"),
            }),
        ),
    );

/** How a chevron turns over: on the fast spatial spring, its color on its tween. Every chevron
 *  that turns (the list's, accordion's and tree's expand indicator, the select's arrow) uses it,
 *  so they turn alike. Compose rotates its dropdown arrow at once (`ExposedDropdownMenuDefaults
 *  .TrailingIcon`); a small part's movement takes `FastSpatial` in its motion scheme. */
export const chevronTransition = springTweens(
    "spatialFast",
    ["transform"],
    ["color"],
);
