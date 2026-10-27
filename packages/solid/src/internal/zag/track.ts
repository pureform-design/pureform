// Runs a machine's watches: each one's effect when one of its dependencies changes, not on the
// first run. Ported from @zag-js/solid 1.46.0 (MIT) to Solid 2. Zag's Solid adapter ran each
// watch in an effect, a flush after the write it follows, so what the watch writes (a select's
// highlighted item, from its highlighted value) reached readers a flush late, and they ran twice.
// Here the machine checks its watches right after its own writes, in the same batch, reading the
// bindables' latest values (as Zag's vanilla adapter does); an effect per watch still catches what
// changes from outside, such as a prop.

import { isEqual, isFunction } from "@zag-js/utils";
import { createEffect, untrack } from "solid-js";

import { readingLatest } from "./bindable";

const access = <T>(v: T | (() => T)): T => (isFunction(v) ? v() : v);

// Enough for watches that feed each other; a chain longer than this ends in the effects.
const MAX_ROUNDS = 10;

interface Watch {
    readonly deps: unknown[];
    readonly effect: VoidFunction;
    prev?: unknown[];
}

/** A machine's watches, and `run` for the machine's own writes. */
export interface Tracker {
    /** Registers a watch: Zag's `track`. */
    readonly track: (deps: unknown[], effect: VoidFunction) => void;
    /** Runs `fn`, then every watch whose dependencies it changed. Nested runs check once, when
     *  the outermost ends. */
    readonly run: (fn: VoidFunction) => void;
}

export function createTracker(stopped: () => boolean): Tracker {
    const watches: Watch[] = [];
    let depth = 0;

    const check = (watch: Watch): boolean => {
        if (!watch.prev) return false;
        const prev = watch.prev;
        const next = watch.deps.map((d) => access(d));
        if (!next.some((value, i) => !isEqual(prev[i], value))) return false;
        watch.prev = next;
        watch.effect();
        return true;
    };

    const settle = () => {
        if (depth > 0 || stopped()) return;
        depth++;
        try {
            readingLatest(() =>
                untrack(() => {
                    for (let round = 0; round < MAX_ROUNDS; round++) {
                        let ran = false;
                        for (const watch of watches) ran = check(watch) || ran;
                        if (!ran) break;
                    }
                }),
            );
        } finally {
            depth--;
        }
    };

    return {
        track: (deps, effect) => {
            const watch: Watch = { deps, effect };
            watches.push(watch);
            createEffect(
                () => deps.map((d) => access(d)),
                (next) => {
                    if (!watch.prev) watch.prev = next;
                    else settle();
                },
            );
        },
        run: (fn) => {
            depth++;
            try {
                fn();
            } finally {
                depth--;
            }
            settle();
        },
    };
}
