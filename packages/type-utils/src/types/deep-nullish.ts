export type DeepNullish<
    T extends Record<string, unknown>,
    TNullish extends null | undefined = null | undefined,
> = {
    [P in keyof T]?:
        | (T[P] extends Record<string, unknown> ? DeepNullish<T[P]> : T[P])
        | TNullish;
};
