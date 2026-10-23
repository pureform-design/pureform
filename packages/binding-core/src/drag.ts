// What every drag that comes to rest on anchors shares: its speed from the pointer's last moves,
// and the anchor it goes to once let go, as Compose's anchored draggables choose one. The bottom
// sheet (fully open, partly open, closed) and the splitter's dividers use both.

/** Tracks a drag's speed from its last moves. `position` is along the drag's axis; `time` in
 *  ms. */
export const createDragVelocity = (window = 100) => {
    let samples: { position: number; time: number }[] = [];
    return {
        reset() {
            samples = [];
        },
        add(position: number, time: number) {
            samples.push({ position, time });
            samples = samples.filter((sample) => time - sample.time <= window);
        },
        /** px/s over the last `window` ms. */
        velocity(): number {
            const first = samples[0];
            const last = samples.at(-1);
            if (!first || !last || last.time === first.time) return 0;
            return (
                ((last.position - first.position) / (last.time - first.time)) *
                1000
            );
        },
    };
};

/** Which of `anchors` (positions along the drag's axis) a drag let go at `at`, moving at
 *  `velocity` (positive toward higher positions), comes to rest on; returns its index, or -1
 *  without anchors.
 *
 *  At `velocityThreshold` or faster (the same unit as `velocity`), the nearest anchor the way it
 *  was flung, or the nearest overall if there's none that way. Slower, without a
 *  `positionalThreshold`, the nearest (Compose's `PaneExpansionState`). With one, Compose's
 *  `AnchoredDraggable` `computeTarget`: still, the nearest; moving, the next anchor its way once
 *  it's `positionalThreshold(distance)` past the one behind it (`distance` being the gap
 *  between the two), else back to that one. */
export const chooseAnchor = (options: {
    readonly anchors: readonly number[];
    readonly at: number;
    readonly velocity: number;
    readonly velocityThreshold: number;
    readonly positionalThreshold?: ((distance: number) => number) | undefined;
}): number => {
    const { anchors, at, velocity, velocityThreshold, positionalThreshold } =
        options;
    if (anchors.length === 0) return -1;
    const nearest = (indices: readonly number[]) =>
        indices.reduce((best, index) =>
            Math.abs(anchors[index]! - at) < Math.abs(anchors[best]! - at)
                ? index
                : best,
        );
    const all = anchors.map((_, index) => index);
    const EPSILON = 1e-6;
    // The nearest at or past `at` the way given, or undefined.
    const toward = (forward: boolean) => {
        const ahead = all.filter((index) =>
            forward
                ? anchors[index]! >= at - EPSILON
                : anchors[index]! <= at + EPSILON,
        );
        return ahead.length > 0 ? nearest(ahead) : undefined;
    };
    if (Math.abs(velocity) >= Math.abs(velocityThreshold) && velocity !== 0) {
        const forward = velocity > 0;
        // Past the anchor it's on, so a fling from one moves on.
        const ahead = all.filter((index) =>
            forward
                ? anchors[index]! > at + EPSILON
                : anchors[index]! < at - EPSILON,
        );
        return ahead.length > 0 ? nearest(ahead) : nearest(all);
    }
    if (!positionalThreshold || velocity === 0) return nearest(all);
    const forward = velocity > 0;
    const before = toward(false) ?? toward(true)!;
    const after = toward(true) ?? toward(false)!;
    const distance = Math.abs(anchors[after]! - anchors[before]!);
    const behind = forward ? before : after;
    const ahead = forward ? after : before;
    return Math.abs(at - anchors[behind]!) >=
        Math.abs(positionalThreshold(distance))
        ? ahead
        : behind;
};
