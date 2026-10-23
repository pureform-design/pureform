// A value a machine reads and writes: the prop when it's controlled, else its own signal.
// Ported from @zag-js/solid 1.46.0 (MIT) to Solid 2.

import type { Bindable, BindableParams } from "@zag-js/core";
import { isFunction } from "@zag-js/utils";
import {
    type Accessor,
    createMemo,
    createSignal,
    onCleanup,
    untrack,
} from "solid-js";

let latestReads = 0;

/** Runs `fn` with every bindable reading its last write, rather than the value Solid shows, which
 *  only takes a write at the next flush. A machine's watches run this way, so what they write
 *  lands in the same flush as the write they follow. */
export function readingLatest<T>(fn: () => T): T {
    latestReads++;
    try {
        return fn();
    } finally {
        latestReads--;
    }
}

export function createBindable<T>(
    props: Accessor<BindableParams<T>>,
): Bindable<T> {
    // Read once, at creation.
    const initial = untrack(() => props().value ?? props().defaultValue);
    const eq = untrack(() => props().isEqual ?? Object.is);

    // Boxed, since Solid 2 treats a function passed to `createSignal` as a computation.
    // Owned writes are allowed: a machine's context changes from handlers, effects, and cleanups
    // alike (a hovered button leaving the page ends its source's hover, which its machine hears).
    const [value, setValue] = createSignal<{ v: T }>(
        { v: initial as T },
        { ownedWrite: true },
    );
    let latest = initial as T;
    const controlled = createMemo(() => props().value !== undefined);

    const read = (): T =>
        controlled()
            ? (props().value as T)
            : latestReads > 0
              ? latest
              : value().v;

    const set = (v: T | ((prev: T) => T)) => {
        // An update reads the last write, not the value Solid shows until the next flush, so
        // several updates in one go (a toast store adding three toasts) each build on the last.
        const prev = untrack(controlled) ? untrack(read) : latest;
        const next = isFunction(v) ? v(prev) : v;
        if (props().debug) {
            console.log(`[bindable > ${props().debug}] setValue`, {
                next,
                prev,
            });
        }
        if (!untrack(controlled)) {
            latest = next;
            setValue({ v: next });
        }
        if (!eq(next, prev)) props().onChange?.(next, prev);
    };

    return {
        initial,
        // Zag reads `ref.current` outside tracking for the latest value. Solid 1's port kept
        // it in step with an effect, which lags a write; a getter can't.
        ref: {
            get current() {
                return untrack(read);
            },
        },
        get: read,
        set,
        invoke(nextValue: T, prevValue: T) {
            props().onChange?.(nextValue, prevValue);
        },
        hash(current: T) {
            return props().hash?.(current) ?? String(current);
        },
    };
}

createBindable.cleanup = (fn: VoidFunction) => {
    onCleanup(() => fn());
};

createBindable.ref = <T>(defaultValue: T) => {
    let value = defaultValue;
    return {
        get: () => value,
        set: (next: T) => {
            value = next;
        },
    };
};
