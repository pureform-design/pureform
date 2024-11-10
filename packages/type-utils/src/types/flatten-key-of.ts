import type { IsTuple } from "./is-tuple";
import type { TupleNumericIndices } from "./tuple-indices";

type FlattenArrayKeyOf<
    TIndices extends string | number,
    TValue,
    TIncludeArray extends boolean = true,
> = TValue extends Record<string, unknown>
    ? `${TIndices}` | `${TIndices}.${FlattenKeyOf<TValue, TIncludeArray>}`
    : `${TIndices}`;

export type FlattenKeyOf<
    T,
    TIncludeArrayKeys extends boolean = true,
> = T extends Record<string, unknown>
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
