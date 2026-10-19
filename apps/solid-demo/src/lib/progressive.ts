// Rendering a long list a little at a time: a count that starts at none and grows once the page has
// painted, a short task at a time, until it covers the whole list. A page renders what it must
// show at once with the page, and the rest as the count reaches it, so no task runs long.

import { isServer } from "@solidjs/web";
import {
    type Accessor,
    createSignal,
    flush,
    onCleanup,
    onSettled,
    untrack,
} from "solid-js";

/** How long a chunk should take to render, in milliseconds: well within a frame, so the browser
 *  can paint and handle input between chunks. */
const BUDGET = 8;

/** How many of a list's items to render by now: 0 on the server and while the page first renders,
 *  then more in a task after the page paints and in each task after that, each chunk sized from
 *  how long the last one took, until it reaches `length()`. From then on it's `Infinity`, so items
 *  added later render at once. */
export function createProgress(length: Accessor<number>): Accessor<number> {
    const [count, setCount] = createSignal(0);
    let step = 4;
    let frame: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // The first chunk after the page paints: the frame's callback runs before it, the timeout
    // after. Each later one in a task of its own, between which the browser paints as it needs.
    const start = () => {
        frame = requestAnimationFrame(() => {
            timer = setTimeout(grow);
        });
    };
    const grow = () => {
        const began = performance.now();
        const next = untrack(count) + step;
        if (next >= untrack(length)) {
            flush(() => setCount(Infinity));
            return;
        }
        flush(() => setCount(next));
        // The next chunk takes about the budget: at most 4 times this one, and at least 1.
        const took = Math.max(performance.now() - began, 0.25);
        step = Math.max(
            1,
            Math.min(step * 4, Math.round((step * BUDGET) / took)),
        );
        timer = setTimeout(grow);
    };
    // On the server too, where it doesn't run, so hydration finds the same nodes.
    onSettled(() => {
        if (!isServer) start();
    });
    onCleanup(() => {
        if (frame !== undefined) cancelAnimationFrame(frame);
        clearTimeout(timer);
    });
    return count;
}
