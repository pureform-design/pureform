import type { AnyArray, AnyRecord } from ".";
import type { IsTuple } from "./is-tuple";
import type { Coalesce, GetNullish, Nullish } from "./nullish";

export type Mergeable = AnyRecord | AnyArray;

export type ArrayMergeMode = "concat" | "memberwise-merge" | "replace";

type MergeCoreArrayClause<
    T1,
    T2,
    TArrayMergeMode extends ArrayMergeMode,
    TNullish extends Nullish,
> = PickArray<T1> extends AnyArray
    ? PickArray<T2> extends AnyArray
        ? IsAnyNever<PickArray<T1>, PickArray<T2>> extends true
            ? Coalesce<T2, T1, TNullish>
            : Coalesce<
                  | Coalesce<
                        | MergeArray<
                              PickArray<T1>,
                              PickArray<T2>,
                              TArrayMergeMode,
                              TNullish
                          >
                        | GetNullish<T2, TNullish>,
                        T1,
                        TNullish
                    >
                  | GetNullish<T1, TNullish>,
                  T2
              >
        : Coalesce<T2, T1, TNullish>
    : Coalesce<T2, T1, TNullish>;

type MergeCore<
    T1,
    T2,
    TArrayMergeMode extends ArrayMergeMode,
    TNullish extends Nullish,
> = PickRecord<T1> extends AnyRecord
    ? PickRecord<T2> extends AnyRecord
        ? IsAnyNever<PickRecord<T1>, PickRecord<T2>> extends true
            ? MergeCoreArrayClause<T1, T2, TArrayMergeMode, TNullish>
            : Coalesce<
                  | Coalesce<
                        | MergeRecord<
                              PickRecord<T1>,
                              PickRecord<T2>,
                              TArrayMergeMode,
                              TNullish
                          >
                        | GetNullish<T2, TNullish>,
                        T1,
                        TNullish
                    >
                  | GetNullish<T1, TNullish>,
                  T2
              >
        : Coalesce<T2, T1, TNullish>
    : MergeCoreArrayClause<T1, T2, TArrayMergeMode, TNullish>;

type MergeRecord<
    T1 extends AnyRecord,
    T2 extends AnyRecord,
    TArrayMergeMode extends ArrayMergeMode,
    TNullish extends Nullish,
> = {
    [K in keyof T1 | keyof T2]: K extends keyof T1
        ? K extends keyof T2
            ? MergeCore<T1[K], T2[K], TArrayMergeMode, TNullish>
            : T1[K]
        : K extends keyof T2
          ? T2[K]
          : never;
};

type PickArray<T> = T extends AnyArray ? T : never;
type PickRecord<T> = T extends AnyRecord ? T : never;

type IsNever<T> = [T] extends [never] ? true : false;

type IsAnyNever<T1, T2> = IsNever<T1> extends true ? true : IsNever<T2>;

type MergeNonTuple<
    T1 extends AnyArray,
    T2 extends AnyArray,
    TArrayMergeMode extends ArrayMergeMode,
    TNullish extends Nullish,
> = MergeCore<T1[number], T2[number], TArrayMergeMode, TNullish>[];

type MergeTuple<
    T1 extends AnyArray,
    T2 extends AnyArray,
    TArrayMergeMode extends ArrayMergeMode,
    TNullish extends Nullish,
> = T1 extends [infer F1, ...infer R1]
    ? T2 extends [infer F2, ...infer R2]
        ? [
              MergeCore<F1, F2, TArrayMergeMode, TNullish>,
              ...MergeTuple<R1, R2, TArrayMergeMode, TNullish>,
          ] // Prefer T2's element if available
        : [F1, ...MergeTuple<R1, [], TArrayMergeMode, TNullish>] // Use T1's element if T2 is exhausted
    : T2; // If T1 is exhausted, return remaining T2 elements

type MergeArray<
    T1 extends AnyArray,
    T2 extends AnyArray,
    TArrayMergeMode extends ArrayMergeMode,
    TNullish extends Nullish,
> = TArrayMergeMode extends "memberwise-merge"
    ? IsTuple<T1> extends true
        ? IsTuple<T2> extends true
            ? MergeTuple<T1, T2, TArrayMergeMode, TNullish>
            : MergeNonTuple<T1, T2, TArrayMergeMode, TNullish>
        : MergeNonTuple<T1, T2, TArrayMergeMode, TNullish>
    : TArrayMergeMode extends "concat"
      ? [...T1, ...T2]
      : TArrayMergeMode extends "replace"
        ? Coalesce<T2, T1, TNullish>
        : never;

export type DeepMerge<
    T1 extends AnyRecord,
    T2 extends AnyRecord,
    TArrayMergeMode extends ArrayMergeMode = "memberwise-merge",
> = T1 extends T2
    ? T2 extends T1
        ? T2
        : MergeRecord<T1, T2, TArrayMergeMode, Nullish>
    : MergeRecord<T1, T2, TArrayMergeMode, Nullish>;
