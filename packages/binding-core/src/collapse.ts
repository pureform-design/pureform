// An expanding part's size change: the accordion's content, a tree's group, a list item's region
// and a vertical stepper's content grow open and shrink shut instead of jumping, as Compose's
// `AnimatedVisibility` expands and shrinks them (`expandVertically`, `shrinkVertically`). The
// machines show and hide the part with `hidden`; this watches that attribute and runs the part's
// height (and its block padding, so it reaches 0) from where it was to where it goes, on the
// timing the preset gives the part's `height` transition: a spring's duration and `linear()`
// curve, or none under reduced motion, when the part shows and hides at once. While it shrinks it
// stays drawn, then hides. It reads and sets the part's own size only, never a scroll position.

const running = new WeakMap<HTMLElement, Animation>();

/** The timing of `element`'s transition of `property`, or `undefined` when it has none (or one
 *  of no duration). */
export const transitionTiming = (
    element: Element,
    property: string,
): { duration: number; easing: string } | undefined => {
    const style = getComputedStyle(element);
    const properties = style.transitionProperty.split(",").map((p) => p.trim());
    const index = properties.findIndex((p) => p === property || p === "all");
    if (index < 0) return undefined;
    const pick = (list: string[]) => list[index % list.length]!.trim();
    const durations = style.transitionDuration.split(",");
    const text = pick(durations);
    const duration = Number.parseFloat(text) * (text.endsWith("ms") ? 1 : 1000);
    if (!(duration > 0)) return undefined;
    // A `linear()` curve holds commas of its own, so split at the top level only.
    const easings: string[] = [];
    let depth = 0;
    let from = 0;
    const all = style.transitionTimingFunction;
    for (let i = 0; i < all.length; i++) {
        if (all[i] === "(") depth++;
        else if (all[i] === ")") depth--;
        else if (all[i] === "," && depth === 0) {
            easings.push(all.slice(from, i));
            from = i + 1;
        }
    }
    easings.push(all.slice(from));
    return { duration, easing: pick(easings) };
};

const animate = (element: HTMLElement, open: boolean): void => {
    const timing = transitionTiming(element, "height");
    const before = running.get(element);
    // Where a size change in flight has the part now, before it stops.
    const now = before ? element.getBoundingClientRect().height : undefined;
    before?.cancel();
    running.delete(element);
    if (!timing) return;
    // Drawn while it shrinks, whatever `hidden` says; dropped once it's shut.
    if (!open) element.style.setProperty("display", "block", "important");
    const style = getComputedStyle(element);
    const full = {
        height: `${element.scrollHeight}px`,
        paddingBlockStart: style.paddingBlockStart,
        paddingBlockEnd: style.paddingBlockEnd,
    };
    const shut = {
        height: "0px",
        paddingBlockStart: "0px",
        paddingBlockEnd: "0px",
    };
    const start =
        now === undefined
            ? open
                ? shut
                : full
            : { ...(open ? shut : full), height: `${now}px` };
    if (now !== undefined && open) {
        // Partly open: its padding is part of what shows.
        start.paddingBlockStart = full.paddingBlockStart;
        start.paddingBlockEnd = full.paddingBlockEnd;
    }
    const animation = element.animate(
        [
            { ...start, overflow: "hidden" },
            { ...(open ? full : shut), overflow: "hidden" },
        ],
        { duration: timing.duration, easing: timing.easing },
    );
    running.set(element, animation);
    const done = () => {
        if (running.get(element) !== animation) return;
        running.delete(element);
        if (!open) element.style.removeProperty("display");
    };
    animation.addEventListener("finish", done);
    animation.addEventListener("cancel", () => {
        if (!open) element.style.removeProperty("display");
    });
};

/** Runs `element`'s height between shut and open each time its `hidden` attribute changes, on its
 *  own `height` transition's timing (see above). Returns what stops watching. Call it once the
 *  element is in the document; without `MutationObserver` or `Element.animate` it does nothing. */
export const watchCollapse = (element: HTMLElement): VoidFunction => {
    if (
        typeof MutationObserver !== "function" ||
        typeof element.animate !== "function"
    ) {
        return () => {};
    }
    let open = !element.hidden;
    const observer = new MutationObserver(() => {
        if (element.hidden === !open) return;
        open = !element.hidden;
        animate(element, open);
    });
    observer.observe(element, {
        attributes: true,
        attributeFilter: ["hidden"],
    });
    return () => {
        observer.disconnect();
        running.get(element)?.cancel();
        running.delete(element);
    };
};
