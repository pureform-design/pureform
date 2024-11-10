export type TupleStringIndices<T extends readonly unknown[]> = Exclude<
    keyof T,
    keyof unknown[]
>;

export type TupleNumericIndices<T extends readonly unknown[]> =
    TupleStringIndices<T> extends infer K
        ? K extends `${infer N extends number}`
            ? N
            : never
        : never;
