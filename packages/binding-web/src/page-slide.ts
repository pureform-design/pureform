// A calendar page sliding in from the side the user moved toward, as Material's date pickers
// slide the month's days when the arrows step it: a Web Animation of the grid's transform and
// opacity, so nothing is written to the element and server rendering and hydration see the markup
// as it is. The caller skips it under reduced motion.

const DURATION = 300;
const EASING = "cubic-bezier(0.05, 0.7, 0.1, 1)";
const DISTANCE = 32;

/** The months a date is from year 0, to tell which way a step went. */
export const monthIndex = (year: number, month: number): number =>
    year * 12 + month;

// The slide running on each page, to stop when another starts.
const running = new WeakMap<Element, Animation>();

/** Slides `element` in from the end (a later page, `1`) or the start (an earlier one, `-1`) of
 *  the line, the ends swapped under right to left. A slide already running is stopped. */
export const slidePage = (element: HTMLElement, direction: 1 | -1): void => {
    if (typeof element.animate !== "function") return;
    const rtl = getComputedStyle(element).direction === "rtl";
    const from = DISTANCE * direction * (rtl ? -1 : 1);
    running.get(element)?.cancel();
    running.set(
        element,
        element.animate(
            [
                { transform: `translateX(${from}px)`, opacity: 0 },
                { transform: "translateX(0)", opacity: 1 },
            ],
            { duration: DURATION, easing: EASING },
        ),
    );
};
