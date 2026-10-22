// The snackbar queue: Material shows one snackbar at a time, so the others wait in order. The
// queue holds them; the one at the front shows, on the snackbar machine, which times it. Once it
// asks to close, the queue marks it closing; once its exit is over (`gone`), the next one shows.
// Framework-free: each binding renders `current()` and subscribes to changes.

import type { OpenChangeDetails, OpenChangeReason } from "./snackbar.types";

/** A snackbar in the queue, with the options it was shown with. */
export interface QueueItem<T> {
    readonly id: string;
    readonly options: T;
    /** Why it's closing, once the shown one is. */
    readonly closing?: OpenChangeReason | undefined;
}

/** What every queued snackbar's options may hold: who to tell once it asks to close. */
export interface QueueOptions {
    readonly onOpenChange?: ((details: OpenChangeDetails) => void) | undefined;
}

/** A queue of snackbars, shown one at a time. */
export interface Queue<T extends QueueOptions> {
    /** The snackbars, the shown one first. */
    readonly items: () => readonly QueueItem<T>[];
    /** The snackbar showing (or closing), if any. */
    readonly current: () => QueueItem<T> | undefined;
    /** Calls `listener` whenever the queue changes; returns the unsubscribe. */
    readonly subscribe: (listener: () => void) => () => void;
    /** Adds a snackbar at the end, shown once those before it have gone. Returns its id. */
    readonly show: (options: T) => string;
    /** Closes the snackbar with this id, or the one showing: the shown one starts its exit (and
     *  its `onOpenChange` hears why); one still waiting leaves unseen. */
    readonly dismiss: (id?: string, reason?: OpenChangeReason) => void;
    /** The shown snackbar's exit is over: the next one shows. */
    readonly gone: (id: string) => void;
    /** Empties the queue: the shown one closes, the waiting ones leave unseen. */
    readonly clear: () => void;
}

/** A new, empty queue. `prefix` starts each id (`snackbar-1`, …). */
export function createQueue<T extends QueueOptions>(
    prefix = "snackbar",
): Queue<T> {
    let items: readonly QueueItem<T>[] = [];
    let count = 0;
    const listeners = new Set<() => void>();
    const set = (next: readonly QueueItem<T>[]) => {
        items = next;
        // A copy, so a listener can unsubscribe while the queue notifies.
        // oxlint-disable-next-line unicorn/no-useless-spread
        for (const listener of [...listeners]) listener();
    };
    const dismiss = (id?: string, reason: OpenChangeReason = "close") => {
        const [shown] = items;
        const target = id ?? shown?.id;
        if (target === undefined) return;
        if (shown?.id !== target) {
            if (items.some((item) => item.id === target)) {
                set(items.filter((item) => item.id !== target));
            }
            return;
        }
        if (shown.closing) return;
        set([{ ...shown, closing: reason }, ...items.slice(1)]);
        shown.options.onOpenChange?.({ open: false, reason });
    };
    return {
        items: () => items,
        current: () => items[0],
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        show(options) {
            const id = `${prefix}-${++count}`;
            set([...items, { id, options }]);
            return id;
        },
        dismiss,
        gone(id) {
            if (items[0]?.id === id) set(items.slice(1));
        },
        clear() {
            const [shown] = items;
            if (!shown) return;
            set([shown]);
            dismiss(shown.id);
        },
    };
}
