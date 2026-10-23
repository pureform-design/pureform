// A dragged element going to rest on its own spring transition, but from the drag's speed: the
// web has no spring, so a spring transition is a duration and a `linear()` curve sampled from
// rest. Let go mid-flight, it would start still. This takes the spring back, from the vars the
// web writes a spring token's parameters to (`<spring>-stiffness`, `-damping`, `-mass`) when the
// caller names the spring, else by fitting one to the curve (`springFromCurve`); samples it
// again from the release's speed, and sets that inline for the
// one settle, as React Native's `settle()` carries the release velocity. The bottom sheet and the
// list item's swipe settle this way.

import {
    formatLinearEasing,
    parseLinearEasing,
    sampleSpring,
    springFromCurve,
} from "@pureform/core";
import type { SpringNode } from "@pureform/core/ast";
import type { Registry } from "@pureform/styling";
import { tokenVar } from "@pureform/styling/theme-vars";

// Splits a computed list at its top-level commas (a `linear()` holds its own).
const splitList = (text: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let from = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === "(") depth++;
        else if (char === ")") depth--;
        else if (char === "," && depth === 0) {
            parts.push(text.slice(from, i).trim());
            from = i + 1;
        }
    }
    parts.push(text.slice(from).trim());
    return parts;
};

const seconds = (text: string) => {
    const value = Number.parseFloat(text);
    return text.trim().endsWith("ms") ? value / 1000 : value;
};

/** The var a theme's spring `role` (such as `"spatialDefault"`) is written under, as the
 *  registry's target names it, for `settleTransition`'s `spring`. `undefined` without a
 *  registry. */
export const springRoleVar = (
    registry: Pick<Registry, "vars"> | undefined,
    role: string,
): string | undefined => registry && tokenVar(`springs.${role}`, registry.vars);

const fitted = new Map<string, SpringNode>();

/** The spring whose parameters the web writes under `name` (a spring token's var, such as
 *  `--springs-spatial-fast`), as `element` inherits them; `undefined` when they aren't all set. */
export const springFromVars = (
    element: Element,
    name: string,
): SpringNode | undefined => {
    const style = getComputedStyle(element);
    const read = (param: string) =>
        Number.parseFloat(style.getPropertyValue(`${name}-${param}`));
    const stiffness = read("stiffness");
    const damping = read("damping");
    const mass = read("mass");
    return stiffness > 0 && damping >= 0 && mass > 0
        ? { type: "spring", stiffness, damping, mass }
        : undefined;
};

/** The spring `element`'s transition of `property` runs on: the one under `spring`'s vars when
 *  it's given and set, else one fitted to the transition's `linear()` curve. `undefined` when the
 *  transition isn't on a `linear()` curve (reduced motion, or none). */
export const transitionSpring = (
    element: HTMLElement,
    property: string,
    spring?: string,
): SpringNode | undefined => {
    const style = getComputedStyle(element);
    const properties = splitList(style.transitionProperty ?? "");
    const index = properties.findIndex(
        (name) => name === property || name === "all",
    );
    if (index < 0) return undefined;
    const at = <T>(list: T[]) => list[index % list.length];
    const duration = seconds(
        at(splitList(style.transitionDuration ?? "")) ?? "0s",
    );
    const easing = at(splitList(style.transitionTimingFunction ?? "")) ?? "";
    const points = parseLinearEasing(easing);
    if (!points || !(duration > 0)) return undefined;
    const exact = spring ? springFromVars(element, spring) : undefined;
    if (exact) return exact;
    const key = `${duration} ${easing}`;
    let fit = fitted.get(key);
    if (!fit) {
        fit = springFromCurve(points, duration * 1000);
        fitted.set(key, fit);
    }
    return fit;
};

/** Starts `element`'s transition of `property` at `velocity` (pixels per millisecond, in the
 *  direction of a positive `distance`), for a move of `distance` pixels the caller makes next.
 *  `spring` names the spring token the transition runs on (its var, such as
 *  `--springs-spatial-default`), whose exact parameters it then reads. Only a transition on a
 *  `linear()` curve (a spring's) changes; without one (reduced motion, or no move), nothing does.
 *  Returns what drops the inline transition, which it also drops once the transition ends. */
export const settleTransition = (
    element: HTMLElement,
    property: string,
    distance: number,
    velocity: number,
    spring?: string,
): (() => void) => {
    const nothing = () => {};
    if (Math.abs(distance) < 1 || velocity === 0) return nothing;
    const found = transitionSpring(element, property, spring);
    return found
        ? startOn([element], property, found, distance, velocity)
        : nothing;
};

// Sets each element's transition of `property` to `spring` sampled from `velocity`, until it ends.
const startOn = (
    elements: readonly HTMLElement[],
    property: string,
    spring: SpringNode,
    distance: number,
    velocity: number,
): (() => void) => {
    // The release's speed as a share of the move per second.
    const sampled = sampleSpring(spring, {
        velocity: (velocity * 1000) / distance,
    });
    const transition = `${property} ${sampled.duration}ms ${formatLinearEasing(sampled.points)}`;
    const drops = elements.map((element) => {
        element.style.transition = transition;
        const drop = () => {
            element.removeEventListener("transitionend", ended);
            element.removeEventListener("transitioncancel", ended);
            element.style.removeProperty("transition");
        };
        const ended = (event: TransitionEvent) => {
            if (event.target === element && event.propertyName === property)
                drop();
        };
        element.addEventListener("transitionend", ended);
        element.addEventListener("transitioncancel", ended);
        return drop;
    });
    return () => {
        for (const drop of drops) drop();
    };
};

/** Starts `elements`' transition of `property` on `spring` itself (one with no transition of its
 *  own, such as a splitter's panes on Compose's `spring(0.8, 380)`), at `velocity` (pixels per
 *  millisecond, in the direction of a positive `distance`) for a move of `distance` pixels the
 *  caller makes next. Under reduced motion, or without a move, nothing changes. Returns what
 *  drops the inline transitions, which also go once each ends. */
export const settleOnSpring = (
    elements: readonly HTMLElement[],
    property: string,
    spring: SpringNode,
    distance: number,
    velocity: number,
): (() => void) => {
    const view = elements[0]?.ownerDocument.defaultView;
    if (
        Math.abs(distance) < 1 ||
        !view ||
        view.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
        return () => {};
    return startOn(elements, property, spring, distance, velocity);
};
