// Runs a machine's effect when one of its dependencies changes, not on the first run.
// Ported from @zag-js/solid 1.46.0 (MIT) to Solid 2's split effects: the compute half reads
// the dependencies, and the effect half compares and runs.

import { isEqual, isFunction } from "@zag-js/utils";
import { createEffect, untrack } from "solid-js";

const access = <T>(v: T | (() => T)): T => (isFunction(v) ? v() : v);

export const createTrack = (deps: unknown[], effect: VoidFunction) => {
    createEffect(
        () => deps.map((d) => access(d)),
        (next, prev) => {
            if (prev === undefined) return;
            if (next.some((value, i) => !isEqual(prev[i], value)))
                untrack(effect);
        },
    );
};
