// A calendar page sliding in from the side the user moved toward, as Material's date pickers
// slide the month's days when the arrows step it: a Web Animation of the page's transform, so
// nothing is written to the element and server rendering and hydration see the markup as it is.
// The timing is the `transform` transition the page's style declares, so the motion tokens retime
// it, and reduced motion, which drops that transition, makes the change at once.

import { transformTiming } from "./slide";

/** The months a date is from year 0, to tell which way a step went. */
export const monthIndex = (year: number, month: number): number =>
    year * 12 + month;

// The slide running on each page, to stop when another starts.
const running = new WeakMap<Element, Animation>();

/** Slides `element` in from `distance` pixels toward the end (a later page, `1`) or the start
 *  (an earlier one, `-1`) of the line, the ends swapped under right to left, over the `transform`
 *  transition its style declares. A slide already running is stopped. Does nothing without a
 *  transition or Web Animations. */
export const slidePage = (
    element: HTMLElement,
    direction: 1 | -1,
    distance: number,
): void => {
    if (typeof element.animate !== "function") return;
    running.get(element)?.cancel();
    running.delete(element);
    const style = getComputedStyle(element);
    const timing = transformTiming(style);
    if (!timing) return;
    const from = distance * direction * (style.direction === "rtl" ? -1 : 1);
    const rest = style.transform === "none" ? "" : style.transform;
    const animation = element.animate(
        [
            { transform: `translateX(${from}px) ${rest}`.trim() },
            { transform: rest || "none" },
        ],
        { ...timing, fill: "backwards" },
    );
    running.set(element, animation);
    const forget = () => {
        if (running.get(element) === animation) running.delete(element);
    };
    animation.addEventListener("finish", forget);
    animation.addEventListener("cancel", forget);
};
