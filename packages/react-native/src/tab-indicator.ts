// The tabs' indicator sliding from the tab selected before to the new one, as the web's does: each
// tab keeps its own indicator, laid out in its place, and the new one is drawn first over the old
// one's box, then moves and resizes into place through the engine (`useSlide`). The boxes come
// from `onLayout` (each tab's place in the row, its content's in the tab, and its indicator's in
// the content), so nothing is measured when the selection changes, and the slide starts in the
// same render that selects the tab. A primary indicator spans its tab's content, so the two can
// differ in width: the slide scales it from the old one's. A change mid-slide starts from where the
// slide has got to; on a spring (Animated) it also keeps the slide's speed. The timing is the `transform` transition the indicator's style declares, so
// reduced motion, which drops it, switches at once.

import {
    curve,
    offsetSpan,
    slideAt,
    slideOffset,
    springProgress,
} from "@pureform/rn-adapter/animated";
import type {
    SlideMotion,
    SlideOffset,
    Span,
} from "@pureform/rn-adapter/animated";
import type { Transition } from "@pureform/rn-adapter/factory";
import { useCallback, useRef } from "react";

/** Which box a layout is of: a tab's in the row, its content's in the tab, or its indicator's in
 *  the content. */
export type SlidePart = "tab" | "tabContent" | "indicator";

// The slide last started, and when.
interface Running {
    readonly value: string;
    readonly motion: SlideMotion;
    readonly start: number;
}

const now = (): number =>
    typeof performance === "undefined" ? Date.now() : performance.now();

/** A transition on its duration and curve, without its spring. */
export const omitSpring = (transition: Transition): Transition => {
    const { spring: _, ...rest } = transition;
    return rest;
};

// How far along a slide is at `time`, and how fast it's going (progress per second): on its
// spring where it has one, else along its curve.
const stateAt = (
    running: Running,
    time: number,
): { progress: number; velocity: number } => {
    const { duration, delay, easing, spring, velocity = 0 } = running.motion;
    const elapsed = time - running.start - delay;
    if (elapsed <= 0) return { progress: 0, velocity };
    if (spring) return springProgress(spring, velocity, elapsed / 1000);
    if (elapsed >= duration) return { progress: 1, velocity: 0 };
    const at = curve(easing);
    const step = 1;
    const after = Math.min(duration, elapsed + step) / duration;
    const before = Math.max(0, elapsed - step) / duration;
    return {
        progress: at(elapsed / duration),
        velocity:
            ((at(after) - at(before)) /
                (Math.min(duration, elapsed + step) -
                    Math.max(0, elapsed - step))) *
            1000,
    };
};

// The progress per second a new slide starts at so the indicator keeps the speed the last had:
// its centre's, or its width's where the centre doesn't move.
const carriedVelocity = (
    before: SlideOffset,
    going: { progress: number; velocity: number },
    after: SlideOffset,
): number => {
    if (after.translateX !== 0 && before.translateX !== 0)
        return (before.translateX * going.velocity) / after.translateX;
    const [a, b] = [1 - before.scaleX, 1 - after.scaleX];
    return b !== 0 && a !== 0 ? (a * going.velocity) / b : 0;
};

/** What the tabs' slides give each tab. */
export interface IndicatorSlides {
    /** The slide the tab with `value` draws its indicator with: the latest one, while it's that
     *  tab's. */
    motionOf(value: string): SlideMotion | undefined;
    /** Records a tab's box in the row, its content's in the tab, or its indicator's in the
     *  content. The same function each render. */
    readonly onLayout: (value: string, part: SlidePart, span: Span) => void;
}

/** The slides of the tabs' indicators, for the selected `value` and the indicator's `transform`
 *  transition (`undefined` under reduced motion). The first value doesn't slide. */
export const useIndicatorSlides = (
    value: string,
    timing: Transition | undefined,
): IndicatorSlides => {
    const spans = useRef(
        new Map<string, Partial<Record<SlidePart, Span>>>(),
    ).current;
    const state = useRef<{ value?: string; running?: Running }>({});
    const onLayout = useCallback(
        (of: string, part: SlidePart, span: Span) => {
            spans.set(of, { ...spans.get(of), [part]: span });
        },
        [spans],
    );
    // An indicator's box in the row.
    const restOf = (of: string): Span | undefined => {
        const { tab, tabContent, indicator } = spans.get(of) ?? {};
        return tab && tabContent && indicator
            ? { x: tab.x + tabContent.x + indicator.x, width: indicator.width }
            : undefined;
    };
    const current = state.current;
    if (current.value !== value) {
        const previous = current.value;
        const time = now();
        let running: Running | undefined;
        const from = previous === undefined ? undefined : restOf(previous);
        const to = restOf(value);
        if (timing && from && to) {
            // Where the old indicator is drawn now: mid-slide, where that slide has got to.
            const last = current.running;
            const going =
                last && last.value === previous
                    ? stateAt(last, time)
                    : undefined;
            const drawn =
                last && going
                    ? offsetSpan(
                          from,
                          slideAt(last.motion.from, going.progress),
                      )
                    : from;
            const offset = slideOffset(drawn, to);
            if (offset) {
                // A spring keeps the old slide's speed: the indicator's own, in pixels (or in
                // widths, when it only resizes), over the distance it has left.
                const velocity =
                    timing.spring && last && going
                        ? carriedVelocity(last.motion.from, going, offset)
                        : 0;
                running = {
                    value,
                    start: time,
                    motion: {
                        from: offset,
                        duration: timing.duration,
                        delay: timing.delay,
                        easing: timing.easing,
                        ...(timing.spring
                            ? { spring: timing.spring, velocity }
                            : {}),
                    },
                };
            }
        }
        state.current = { value, ...(running ? { running } : {}) };
    }
    const running = state.current.running;
    return {
        motionOf: (of) => (running?.value === of ? running.motion : undefined),
        onLayout,
    };
};
