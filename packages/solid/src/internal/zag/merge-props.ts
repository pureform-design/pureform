// Merges part props lazily: `class`, `style`, and handlers combine across sources, and any
// other key takes the last defined value. Sources may be accessors, read on every access, so
// the result stays reactive. From @zag-js/solid 1.46.0 (MIT); it has no Solid dependency.

import { mergeProps as zagMergeProps } from "@zag-js/core";

export type MaybeAccessor<T> = T | (() => T);

type Dict = Record<string, unknown>;

const resolve = (source: unknown): Dict | undefined =>
    (typeof source === "function" ? source() : source) as Dict | undefined;

const combines = (key: string) =>
    key === "style" ||
    key === "class" ||
    key === "className" ||
    key === "data-ownedby" ||
    key.startsWith("on");

export function mergeProps<T>(source: MaybeAccessor<T>): T;
export function mergeProps<T, U>(
    source: MaybeAccessor<T>,
    source1: MaybeAccessor<U>,
): T & U;
export function mergeProps<T, U, V>(
    source: MaybeAccessor<T>,
    source1: MaybeAccessor<U>,
    source2: MaybeAccessor<V>,
): T & U & V;
export function mergeProps<T, U, V, W>(
    source: MaybeAccessor<T>,
    source1: MaybeAccessor<U>,
    source2: MaybeAccessor<V>,
    source3: MaybeAccessor<W>,
): T & U & V & W;
export function mergeProps(...sources: unknown[]) {
    const target: Dict = {};
    for (const source of sources) {
        const resolved = resolve(source);
        if (!resolved) continue;
        for (const key in Object.getOwnPropertyDescriptors(resolved)) {
            if (key in target) continue;
            Object.defineProperty(target, key, {
                enumerable: true,
                get() {
                    if (combines(key)) {
                        let merged: Dict = {};
                        for (const s of sources) {
                            merged = zagMergeProps(merged, {
                                [key]: resolve(s)?.[key],
                            });
                        }
                        return merged[key];
                    }
                    for (let i = sources.length - 1; i >= 0; i--) {
                        const value = resolve(sources[i])?.[key];
                        if (value !== undefined) return value;
                    }
                    return undefined;
                },
            });
        }
    }
    return target;
}
