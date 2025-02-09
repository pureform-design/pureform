export type DeepRequired<
    T extends Record<string, unknown>,
    TNullish extends null | undefined = null | undefined,
> = {
    [P in keyof T]-?: T[P] extends Record<string, unknown>
        ? DeepRequired<T[P]>
        : T[P] extends TNullish
          ? T[P]
          : T[P] extends undefined
            ? T[P]
            : T[P];
};
