import type { DeepMerge } from "@repo/type-utils";

type Object = Record<string, unknown>;

function hasPropertyValue<T extends Object, K extends keyof T>(
    o: T,
    k: K,
): o is T & Record<K, unknown> {
    return k in o && o[k] !== undefined && o[k] !== null;
}

export type DeepMergeOptions = {
    hasPropertyValueFn?: typeof hasPropertyValue;
};

export function deepMerge<T1 extends Object, T2 extends Object>(
    o1: T1,
    o2: T2,
    options?: DeepMergeOptions,
): DeepMerge<T1, T2> {
    const hasPropertyValueFn = options?.hasPropertyValueFn ?? hasPropertyValue;

    if (typeof o1 !== "object" || typeof o2 !== "object") {
        return o2 as DeepMerge<T1, T2>;
    }

    const output: Record<string, unknown> = {};
    const allKeys = new Set([...Object.keys(o1), ...Object.keys(o2)]);

    for (const key of allKeys) {
        if (hasPropertyValueFn(o1, key) && hasPropertyValueFn(o2, key)) {
            const o1Value = o1[key];
            const o2Value = o2[key];

            if (typeof o1Value === "object" && typeof o2Value === "object") {
                output[key] = deepMerge(o1Value as Object, o2Value as Object);
            } else {
                output[key] = o2Value;
            }
        } else if (hasPropertyValueFn(o1, key)) {
            output[key] = o2[key];
        } else if (hasPropertyValueFn(o2, key)) {
            output[key] = o1[key];
        }
    }

    return output as DeepMerge<T1, T2>;
}
