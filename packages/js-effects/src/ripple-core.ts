// The part of Material's press ripple every target shares, with no DOM: its timing, its
// geometry, and the life of a press. The web's ripple() and React Native's useRipple() each
// draw it their own way on top.

/** How long a ripple grows and fades, and the grow curve. A release waits for at least half
 *  the grow, so a quick tap still shows most of the ripple. */
export type RippleTiming = {
    /** Grow duration, in ms. */
    grow: number;
    /** Fade duration, in ms. */
    fade: number;
    /** CSS easing for the grow, such as `cubic-bezier(0.2, 0, 0, 1)`. */
    easing: string;
};

/** Material's ripple timing, for a surface that declares none. */
export const DEFAULT_RIPPLE_TIMING: RippleTiming = {
    grow: 450,
    fade: 375,
    easing: "cubic-bezier(0.2, 0, 0, 1)",
};

/** How long a touch waits before it ripples, so a scroll that starts there cancels it. */
export const TOUCH_DELAY_MS = 150;

// The starting circle is a fifth of the longer side, and the ripple grows past the farthest
// corner by a padding and a soft edge.
const INITIAL_ORIGIN_SCALE = 0.2;
const PADDING = 10;
const SOFT_EDGE_MINIMUM_SIZE = 75;
const SOFT_EDGE_CONTAINER_RATIO = 0.35;

export type Point = { x: number; y: number };

/** Geometry of one ripple in a surface of the given size, pressed at `origin`. `size` is the
 *  starting diameter and `scale` the factor it grows by; `start` and `end` are the top-left
 *  corner of the starting circle at the press point and at the center. */
export function rippleGeometry(
    surface: { width: number; height: number },
    origin: Point,
) {
    const { width, height } = surface;
    const longer = Math.max(width, height);
    const softEdge = Math.max(
        SOFT_EDGE_CONTAINER_RATIO * longer,
        SOFT_EDGE_MINIMUM_SIZE,
    );
    const size = Math.max(Math.floor(longer * INITIAL_ORIGIN_SCALE), 1);
    return {
        size,
        scale: (Math.hypot(width, height) + PADDING + softEdge) / size,
        start: { x: origin.x - size / 2, y: origin.y - size / 2 },
        end: { x: (width - size) / 2, y: (height - size) / 2 },
    };
}

export type RippleGeometry = ReturnType<typeof rippleGeometry>;

/** A drawn ripple. `release` fades it after `delay` ms and removes it. */
export type RippleHandle = { release: (delay: number) => void };

/** The life of a surface's presses: one ripple held at a time, a new press releasing the one
 *  before, and a release that waits until half the grow has passed. `now` is the clock, in
 *  ms. */
export function ripplePress(now: () => number = () => Date.now()) {
    let held: { handle: RippleHandle; at: number; minimum: number } | undefined;
    const end = () => {
        if (!held) return;
        const { handle, at, minimum } = held;
        held = undefined;
        handle.release(Math.max(minimum - (now() - at), 0));
    };
    return {
        /** Hold a newly drawn ripple, releasing any before it. */
        begin(handle: RippleHandle, timing: RippleTiming) {
            end();
            held = { handle, at: now(), minimum: timing.grow / 2 };
        },
        /** Release the held ripple, if any. */
        end,
    };
}
