export type DeepPartial<T extends Record<string, unknown>> = {
    [P in keyof T]+?: T[P] extends Record<string, unknown>
        ? DeepPartial<T[P]>
        : T[P];
};
