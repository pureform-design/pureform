export type Simplify<T extends Record<string, unknown>> = {
    [K in keyof T]: T[K] extends Record<string, unknown>
        ? Simplify<T[K]>
        : T[K];
};
