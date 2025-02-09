import type { AnyArray } from "./any-array";
import type { AnyRecord } from "./any-record";
import type { IsTuple } from "./is-tuple";

export type Nullish = undefined | null;

export type ExcludeNullish<
    T,
    TNullish extends null | undefined = GetNullish<T>,
> = Exclude<T, TNullish>;

type AddNullishToTupleElements<
    T extends unknown[],
    TNullish extends null | undefined = null | undefined,
> = T extends [infer F, ...infer R]
    ? [F | TNullish, ...AddNullishToTupleElements<R, TNullish>]
    : never;

type AddNullishToMembers<
    T extends AnyRecord | AnyArray,
    TNullish extends null | undefined = null | undefined,
> = T extends AnyArray
    ? IsTuple<T> extends true
        ? AddNullishToTupleElements<T, TNullish>
        : (T[number] | TNullish)[]
    : T extends AnyRecord
      ? { [K in keyof T]?: T[K] | TNullish }
      : never;

export type GetNullish<
    T,
    TNullish extends null | undefined = null | undefined,
> = T extends TNullish | undefined ? T : never;

export type TransmuteNullish<
    T extends AnyRecord | AnyArray | TNullish,
    TNullish extends null | undefined = undefined | null,
> = AddNullishToMembers<ExcludeNullish<T, TNullish>, TNullish>;

export type IsNullish<
    T,
    TNullish extends null | undefined = null | undefined,
> = GetNullish<T, TNullish> extends never ? false : true;

export type Coalesce<
    TMaybeNullish,
    TFallback,
    TNullish extends undefined | null = undefined | null,
> = IsNullish<TMaybeNullish, TNullish> extends true
    ? ExcludeNullish<TMaybeNullish, TNullish> | TFallback
    : TMaybeNullish;
