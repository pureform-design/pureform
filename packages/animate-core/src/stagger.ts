// Stagger as precomputed timing. A driver gets one delay per item, in ms, and hands it to its
// fastest path (a CSS `animation-delay`, an Animated or Reanimated delay), so no frame of the
// sequence needs JavaScript. The delays follow a progression curve: Compose's menu runs a count
// from 0 to the number of items on a spring and shows each item as the count passes it; sampling
// that curve gives each item the moment the count reaches it.

/** Progress of the count from 0 to 1 at `ms` into the sequence; may overshoot 1 as a spring does. */
export type StaggerCurve = (ms: number) => number;

export interface StaggerOptions {
    /** How many items. */
    readonly count: number;
    /** How far the count has run at each moment, from 0 to 1 over `duration`. */
    readonly curve: StaggerCurve;
    /** How long the curve takes to settle, in ms: the latest any item waits. */
    readonly duration: number;
    /** Entering shows items up the count; leaving hides them back down it, in reverse order. */
    readonly phase: "enter" | "exit";
    /** Which end shows first when entering (and hides last when leaving). Default `"end"`:
     *  the last item, nearest a bottom-anchored FAB. */
    readonly from?: "start" | "end";
    /** How much longer the sequence runs, for watching motion slowly. Default 1. */
    readonly timeScale?: number;
    /** Reduced motion drops the stagger: every item at once. */
    readonly reducedMotion?: boolean;
}

// Where the count rounds up to the next item, as an integer animation's value does.
const ROUNDS_AT = 0.5;

/** The first moment, in ms, the curve reaches `target` (a share of its distance), scanning in
 *  `step` ms; the duration if it never does within it. */
const reaches = (
    curve: StaggerCurve,
    target: number,
    duration: number,
    step: number,
): number => {
    for (let t = 0; t <= duration; t += step) {
        if (curve(t) >= target) return t;
    }
    return duration;
};

/** Each item's wait, in ms, in item order, for a sequence on `curve`. Entering, an item waits
 *  until the count has risen past it; leaving, the count runs back down, so the item that
 *  showed last hides first and the sequence runs in reverse. Deterministic and free of timers
 *  and hosts. */
export const staggerDelays = (options: StaggerOptions): number[] => {
    const { count, curve, duration, phase, from = "end" } = options;
    if (!Number.isInteger(count) || count < 0) {
        throw new Error(`stagger: count must be a whole number, not ${count}`);
    }
    if (count === 0) return [];
    if (options.reducedMotion) return Array.from({ length: count }, () => 0);
    const scale = options.timeScale ?? 1;
    // One millisecond is finer than any display refreshes, so the scan loses nothing a frame shows.
    const step = 1;
    const waits = Array.from({ length: count }, (_, index) => {
        // The item's place in the order they show: 0 shows first.
        const rank = from === "end" ? count - 1 - index : index;
        // Entering, the count rises past the item at (rank + 0.5) / count of its distance;
        // leaving, it falls back below it, the same point measured from the other end.
        const target =
            phase === "enter"
                ? (rank + ROUNDS_AT) / count
                : 1 - (rank + ROUNDS_AT) / count;
        return Math.min(reaches(curve, target, duration, step), duration);
    });
    // Relative to the first item to move, which starts at once.
    const first = Math.min(...waits);
    return waits.map((wait) => (wait - first) * scale);
};
