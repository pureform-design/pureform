export type CloneOptions = {
    deep?: boolean;
};

function shouldClone(
    value: unknown,
): value is unknown[] | Record<string, unknown> {
    return Array.isArray(value) || typeof value === "object";
}

export function clone<T>(value: T, options?: CloneOptions): T {
    const o = options ?? { deep: true };

    if (!shouldClone(value)) {
        return value;
    }

    if (!o.deep) {
        if (Array.isArray(value)) {
            return [...value] as T;
        }

        if (typeof value === "object") {
            return { ...value } as T;
        }

        return value;
    }

    return structuredClone(value);
}
