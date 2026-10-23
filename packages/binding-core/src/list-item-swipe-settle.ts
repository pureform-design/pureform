// A swipeable list item's settle on the web: once let go, the row goes to rest on its own spring
// transition (the preset's `swipeOffset` tween on the fast spatial spring), but from the drag's
// speed, as React Native's `settle()` carries the release velocity. The row's transition is read
// as the press starts, before the drag's `pressed` state swaps it for the state layer's.

import type { SpringNode } from "@pureform/core/ast";
import type { Registry } from "@pureform/styling";
import { tokenVar } from "@pureform/styling/theme-vars";

import { createDragVelocity } from "./drag";
import { settleOnSpring, springRoleVar, transitionSpring } from "./settle";

/** The spring role the preset's swipeable row settles on. */
export const LIST_ITEM_SWIPE_SPRING = "spatialFast";

/** What a swipeable row's settle reads and sets: `start` as a press begins, `move` with each
 *  offset the drag sets, `release` once let go, before the row's offset goes to `to`. */
export interface SwipeSettle {
    readonly start: (
        element: HTMLElement,
        offset: number,
        time: number,
    ) => void;
    readonly move: (offset: number, time: number) => void;
    readonly release: (element: HTMLElement, from: number, to: number) => void;
}

/** A swipeable row's settle from its release speed, for the registry's var names. */
export const createSwipeSettle = (
    registry: () => Pick<Registry, "vars"> | undefined,
): SwipeSettle => {
    const speed = createDragVelocity();
    let spring: SpringNode | undefined;
    let property: string | undefined;
    let stop: (() => void) | undefined;
    return {
        start(element, offset, time) {
            stop?.();
            stop = undefined;
            const vars = registry();
            property =
                vars && tokenVar("components.listItem.swipeOffset", vars.vars);
            spring = property
                ? transitionSpring(
                      element,
                      property,
                      springRoleVar(vars, LIST_ITEM_SWIPE_SPRING),
                  )
                : undefined;
            speed.reset();
            speed.add(offset, time);
        },
        move(offset, time) {
            speed.add(offset, time);
        },
        release(element, from, to) {
            if (!spring || !property) return;
            // The offset's speed, in pixels per millisecond.
            stop = settleOnSpring(
                [element],
                property,
                spring,
                to - from,
                speed.velocity() / 1000,
            );
        },
    };
};
