// Platform-neutral lookup and per-instance resolution. Each binding chooses which channels to
// read, when to read them, and how to combine the results.

import { forInstance, forSlot } from "./parts";
import type { PerInstance, SlotKeyed } from "./parts";

/** Read one part from any keyed channels during a single resolution. Instance data is read
 *  lazily, at most once across those channels, even when it is undefined. Create a new reader
 *  for each resolution: keeping one across renders or reactive evaluations would hold stale
 *  instance data. No channel values or function results are cached. */
export function createSlotReader<P extends string, I = undefined>(
    part: P,
    instance?: () => I,
): <V>(keyed: SlotKeyed<P, PerInstance<V, I>> | undefined) => V | undefined {
    let read = false;
    let value: I | undefined;
    return <V>(keyed: SlotKeyed<P, PerInstance<V, I>> | undefined) => {
        const entry = forSlot<P, PerInstance<V, I>>(keyed, part);
        if (typeof entry !== "function") return entry;
        if (!read) {
            value = instance?.();
            read = true;
        }
        // An omitted instance preserves forInstance's existing undefined-instance behavior.
        return forInstance<V, I>(entry, value as I);
    };
}
