type Primitives = string | number | boolean | null | undefined;

export type IsPrimitive<T> =
    Exclude<T, Primitives> extends never ? true : false;

export type UnionToIntersection<U> = (
    U extends unknown ? (x: U) => void : U
) extends (x: infer I) => void
    ? I
    : U;

export type UnionToIntersectionRecursive<T> = (
    T extends unknown
        ? { [K in keyof T]: UnionToIntersectionRecursive<T[K]> }
        : T
) extends infer O
    ? UnionToIntersection<O>
    : T;

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

export type ArrayLength<T extends unknown[]> = T["length"];

export type IsTuple<T extends unknown[]> = IsLiteralNumber<ArrayLength<T>>;

export type IsReadonlyArray<T> = T extends readonly unknown[] ? true : false;

export type IsLiteral<T extends number | string | boolean> = T extends number
    ? IsLiteralNumber<T>
    : T extends string
      ? IsLiteralString<T>
      : T extends boolean
        ? IsLiteralBoolean<T>
        : false;

export type IsLiteralNumber<T extends number> = T extends number
    ? number extends T
        ? false
        : true
    : false;

export type IsLiteralString<T extends string> = T extends string
    ? string extends T
        ? false
        : true
    : false;

export type IsLiteralBoolean<T extends boolean> = T extends boolean
    ? boolean extends T
        ? false
        : true
    : false;

type FlattenArrayKeyOf<
    TIndices extends string | number,
    TValue,
    TIncludeArray extends boolean = true,
> =
    TValue extends Record<string, unknown>
        ? `${TIndices}` | `${TIndices}.${FlattenKeyOf<TValue, TIncludeArray>}`
        : `${TIndices}`;

export type FlattenKeyOf<T, TIncludeArrayKeys extends boolean = true> =
    T extends Record<string, unknown>
        ? {
              [K in keyof T]: K extends string | number
                  ? `${K}` | `${K}.${FlattenKeyOf<T[K], TIncludeArrayKeys>}`
                  : never;
          }[keyof T]
        : TIncludeArrayKeys extends true
          ? T extends (infer V)[]
              ? IsTuple<T> extends true
                  ? {
                        [I in TupleNumericIndices<T>]: FlattenArrayKeyOf<
                            I,
                            T[I],
                            TIncludeArrayKeys
                        >;
                    }[TupleNumericIndices<T>]
                  : FlattenArrayKeyOf<number, V, TIncludeArrayKeys>
              : never
          : never;

export type Simplify<T extends Record<string, unknown>> = {
    [K in keyof T]: T[K] extends Record<string, unknown>
        ? Simplify<T[K]>
        : T[K];
};

export type RecordKeys = string | number | symbol;

export type Required<T, TKeys extends keyof T = keyof T> = Simplify<
    {
        [K in TKeys]-?: T[K];
    } & Omit<T, TKeys>
>;

export type Optional<T, TKeys extends keyof T = keyof T> = Simplify<
    {
        [K in TKeys]?: T[K];
    } & Omit<T, TKeys>
>;
