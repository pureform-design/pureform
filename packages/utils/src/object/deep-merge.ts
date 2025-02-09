import type {
    AnyArray,
    AnyRecord,
    DeepMerge,
    Mergeable,
} from "@pureform/type-utils";

function isRecord(o: unknown): o is AnyRecord {
    return typeof o === "object" && o !== null && !isArray(o);
}

function isArray(o: unknown): o is AnyArray {
    return o !== null && Array.isArray(o);
}

export type DeepMergeOptions<TMergeArray extends boolean = true> = {
    mergeArrays?: TMergeArray;
};

function mergeRecord<
    T1 extends AnyRecord,
    T2 extends AnyRecord,
    TMergeArrays extends boolean = true,
>(
    o1: T1,
    o2: T2,
    options?: DeepMergeOptions<TMergeArrays>,
): DeepMerge<T1, T2, TMergeArrays> {
    const output: Record<string, unknown> = {};
    const allKeys = new Set([...Object.keys(o1), ...Object.keys(o2)]);

    for (const key of allKeys) {
        const o1Value = o1[key];
        const o2Value = o2[key];
        if (isArray(o1Value) && isArray(o2Value)) {
            output[key] = mergeArrays(o1Value, o2Value, options);
        } else if (isRecord(o1Value) && isRecord(o2Value)) {
            output[key] = mergeRecord(o1Value, o2Value, options);
        } else {
            output[key] = o2Value ?? o1Value;
        }
    }

    return output as DeepMerge<T1, T2, TMergeArrays>;
}

function mergeArrays<
    T1 extends AnyArray,
    T2 extends AnyArray,
    TMergeArrays extends boolean = true,
>(o1: T1, o2: T2, options?: DeepMergeOptions<TMergeArrays>) {
    if (options?.mergeArrays ?? true) {
        const o1Length = o1.length;
        const o2Length = o2.length;
        const output = new Array(o1Length > o2Length ? o1Length : o2Length);

        for (let i = 0; i < o1Length; i++) {
            const o1Value = o1[i];
            const o2Value = o2[i];

            if (isArray(o1Value) && isArray(o2Value)) {
                output[i] = mergeArrays(o1Value, o2Value, options);
            } else if (isRecord(o1Value) && isRecord(o2Value)) {
                output[i] = mergeRecord(o1Value, o2Value, options);
            } else {
                output[i] = o2Value ?? o1Value;
            }
        }

        return output;
    }

    return o2;
}

export class DeepMergeError extends Error {
    constructor(
        message: string,
        public left: unknown,
        public right: unknown,
    ) {
        super(message, {
            cause: {
                left,
                right,
            },
        });
    }
}

export function deepMerge<
    T1 extends AnyRecord,
    T2 extends AnyRecord,
    TMergeArray extends boolean = true,
>(
    o1: T1,
    o2: T2,
    options?: DeepMergeOptions<TMergeArray>,
): DeepMerge<T1, T2, TMergeArray> {
    if (isRecord(o1) && isRecord(o2)) {
        return mergeRecord(o1, o2, options) as DeepMerge<T1, T2, TMergeArray>;
    }

    throw new DeepMergeError(
        `Cannot merge ${typeof o1} (left) with ${typeof o2} (right)`,
        o1,
        o2,
    );
}
