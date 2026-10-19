// An active indicator sliding from where another one is drawn to its own place, as Material's
// tabs move theirs (FLIP): the new indicator stays laid out where the CSS puts it, and a Web
// Animation of its transform starts it over the old one's box. The timing is the `transform`
// transition the indicator's style declares, so the motion tokens retime it and reduced motion,
// which drops that transition, makes the change at once. Nothing is written to the element, so
// server rendering and hydration see the markup as it is.

/** An animation's timing, from an element's `transform` transition. */
export interface SlideTiming {
    /** In milliseconds. */
    readonly duration: number;
    readonly delay: number;
    readonly easing: string;
}

// The slide running on each indicator, to stop when another starts.
const running = new WeakMap<Element, Animation>();

const milliseconds = (time: string): number => {
    const value = Number.parseFloat(time);
    if (!Number.isFinite(value)) return 0;
    return time.trim().endsWith("ms") ? value : value * 1000;
};

// A computed list (`transition-duration: 0.25s, 0.15s`), split at the commas outside brackets.
const list = (value: string): string[] => {
    const items: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < value.length; i++) {
        const char = value[i];
        if (char === "(") depth++;
        else if (char === ")") depth--;
        else if (char === "," && depth === 0) {
            items.push(value.slice(start, i).trim());
            start = i + 1;
        }
    }
    items.push(value.slice(start).trim());
    return items;
};

/** The timing of the `transform` transition in `style` (a computed style), or `undefined` when
 *  none runs: no transition names it, or it takes no time (reduced motion). */
export const transformTiming = (
    style: Pick<
        CSSStyleDeclaration,
        | "transitionProperty"
        | "transitionDuration"
        | "transitionDelay"
        | "transitionTimingFunction"
    >,
): SlideTiming | undefined => {
    const properties = list(style.transitionProperty);
    // The last one naming it wins, as in CSS.
    let index = properties.length - 1;
    while (
        index >= 0 &&
        properties[index] !== "transform" &&
        properties[index] !== "all"
    ) {
        index--;
    }
    if (index < 0) return undefined;
    // Shorter lists repeat, as CSS reads them.
    const at = (values: string[]) => values[index % values.length] ?? "";
    const duration = milliseconds(at(list(style.transitionDuration)));
    if (duration <= 0) return undefined;
    return {
        duration,
        delay: milliseconds(at(list(style.transitionDelay))),
        easing: at(list(style.transitionTimingFunction)) || "ease",
    };
};

/** The transform that draws a box laid out at `to` over `from` instead, scaling about its
 *  center: its center moved onto `from`'s, its width scaled to `from`'s. `undefined` when either
 *  has no width. */
export const slideTransform = (
    from: Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">,
    to: Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">,
): string | undefined => {
    if (!(from.width > 0) || !(to.width > 0)) return undefined;
    const x = from.left + from.width / 2 - (to.left + to.width / 2);
    const y = from.top + from.height / 2 - (to.top + to.height / 2);
    const scale = from.width / to.width;
    return `translate(${x.toFixed(3)}px, ${y.toFixed(3)}px) scaleX(${scale.toFixed(5)})`;
};

/** Slides `to`, a newly shown indicator, in from where `from` is drawn now (mid-slide, where it
 *  has got to), over the `transform` transition `to`'s style declares. Call it once the change
 *  is in the DOM and before it's painted: a layout effect, or a Solid effect. A slide running on
 *  either stops, so a quick change retargets from what's on screen. Does nothing without a
 *  previous indicator, a box on both, a transition, or Web Animations. Returns the animation. */
export const slideIndicator = (
    from: Element | null | undefined,
    to: Element | null | undefined,
): Animation | undefined => {
    if (!from || !to || from === to || typeof to.animate !== "function") {
        return undefined;
    }
    // Its own slide stops first, so it's measured where it rests.
    running.get(to)?.cancel();
    running.delete(to);
    const style = getComputedStyle(to);
    const timing = transformTiming(style);
    const start = timing
        ? slideTransform(
              from.getBoundingClientRect(),
              to.getBoundingClientRect(),
          )
        : undefined;
    running.get(from)?.cancel();
    running.delete(from);
    if (!timing || !start) return undefined;
    const rest = style.transform === "none" ? "" : style.transform;
    const origin = "50% 50%";
    const animation = to.animate(
        [
            { transform: `${start} ${rest}`.trim(), transformOrigin: origin },
            { transform: rest || "none", transformOrigin: origin },
        ],
        { ...timing, fill: "backwards" },
    );
    running.set(to, animation);
    const forget = () => {
        if (running.get(to) === animation) running.delete(to);
    };
    animation.addEventListener("finish", forget);
    animation.addEventListener("cancel", forget);
    return animation;
};
