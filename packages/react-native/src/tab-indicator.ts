// The tabs' indicator sliding from the tab selected before to the new one, as the web's does: each
// tab keeps its own indicator, laid out in its place, and the new one is drawn first over the old
// one's box, then moves and resizes into place through the engine (`useSlide`). The boxes come
// from `onLayout` (each tab's place in the row, its content's in the tab, and its indicator's in
// the content), so nothing is measured when the selection changes, and the slide starts in the
// same render that selects the tab. A primary indicator spans its tab's content, so the two can
// differ in width: the slide scales it from the old one's. A change mid-slide starts from where the
// slide has got to. The timing is the `transform` transition the indicator's style declares, so
// reduced motion, which drops it, switches at once.

import {
    curve,
    offsetSpan,
    slideAt,
    slideOffset,
} from "@pureform/rn-adapter/animated";
import type { SlideMotion, Span } from "@pureform/rn-adapter/animated";
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

// How far along its curve a slide is at `time`.
const progressAt = (running: Running, time: number): number => {
    const { duration, delay, easing } = running.motion;
    const elapsed = time - running.start - delay;
    if (elapsed <= 0) return 0;
    if (elapsed >= duration) return 1;
    return curve(easing)(elapsed / duration);
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
            const drawn =
                last && last.value === previous
                    ? offsetSpan(
                          from,
                          slideAt(last.motion.from, progressAt(last, time)),
                      )
                    : from;
            const offset = slideOffset(drawn, to);
            if (offset) {
                running = {
                    value,
                    start: time,
                    motion: {
                        from: offset,
                        duration: timing.duration,
                        delay: timing.delay,
                        easing: timing.easing,
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
