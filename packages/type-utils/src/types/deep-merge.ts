import type { AnyArray, AnyRecord } from ".";
import type { IsTuple } from "./is-tuple";
import type { Coalesce, GetNullish } from "./nullish";

export type Mergeable = AnyRecord | AnyArray;

type MergeRecord<
    T1 extends AnyRecord,
    T2 extends AnyRecord,
    TIsMergeArray extends boolean = true,
    TNullish extends undefined | null = undefined | null,
> = {
    [K in keyof T1 | keyof T2]: K extends keyof T1
        ? K extends keyof T2
            ? T1[K] extends AnyRecord
                ? T2[K] extends AnyRecord
                    ? MergeRecord<T1[K], T2[K], TIsMergeArray, TNullish>
                    : MergeRest<T1[K], T2[K], TIsMergeArray, TNullish>
                : T1[K] extends AnyArray
                  ? T2[K] extends AnyArray
                      ? MergeArray<T1[K], T2[K], TIsMergeArray, TNullish>
                      : MergeRest<T1[K], T2[K], TIsMergeArray, TNullish>
                  : MergeRest<T1[K], T2[K], TIsMergeArray, TNullish>
            : T1[K]
        : K extends keyof T2
          ? T2[K]
          : never;
};

type PickArray<T> = T extends AnyArray ? T : never;
type PickRecord<T> = T extends AnyRecord ? T : never;

type IsNever<T> = [T] extends [never] ? true : false;

type IsAnyNever<T1, T2> = IsNever<T1> extends true ? true : IsNever<T2>;

type MergeRest<
    T1,
    T2,
    TIsMergeArray extends boolean = true,
    TNullish extends undefined | null = undefined | null,
> = PickRecord<T1> extends AnyRecord
    ? PickRecord<T2> extends AnyRecord
        ? IsAnyNever<PickRecord<T1>, PickRecord<T2>> extends true
            ? Coalesce<T2, T1, TNullish>
            : Coalesce<
                  | Coalesce<
                        | MergeRecord<
                              PickRecord<T1>,
                              PickRecord<T2>,
                              TIsMergeArray,
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
    : PickArray<T1> extends AnyArray
      ? PickArray<T2> extends AnyArray
          ? IsAnyNever<PickArray<T1>, PickArray<T2>> extends true
              ? Coalesce<T2, T1, TNullish>
              : Coalesce<
                    | Coalesce<
                          | MergeArray<
                                PickArray<T1>,
                                PickArray<T2>,
                                TIsMergeArray,
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

type MergeNonTuple<
    T1 extends AnyArray,
    T2 extends AnyArray,
    TIsMergeArray extends boolean = true,
    TNullish extends null | undefined = null | undefined,
> = T1[number] extends AnyRecord
    ? T2[number] extends AnyRecord
        ? DeepMerge<T1[number], T2[number], TIsMergeArray, TNullish>[]
        : MergeRest<T1[number], T2[number], TIsMergeArray, TNullish>[]
    : T1[number] extends AnyArray
      ? T2[number] extends AnyArray
          ? MergeArray<T1[number], T2[number], TIsMergeArray, TNullish>[]
          : MergeRest<T1[number], T2[number], TIsMergeArray, TNullish>[]
      : T1[number];

type MergeTuple<
    T1 extends AnyArray,
    T2 extends AnyArray,
    TIsMergeArray extends boolean = true,
    TNullish extends null | undefined = null | undefined,
> = T1 extends [infer F1, ...infer R1]
    ? T2 extends [infer F2, ...infer R2]
        ? [
              F1 extends AnyRecord
                  ? F2 extends AnyRecord
                      ? MergeRecord<F1, F2, TIsMergeArray, TNullish>
                      : MergeRest<F1, F2, TIsMergeArray, TNullish>
                  : F1 extends AnyArray
                    ? F2 extends AnyArray
                        ? MergeArray<F1, F2, TIsMergeArray, TNullish>
                        : MergeRest<F1, F2, TIsMergeArray, TNullish>
                    : MergeRest<F1, F2, TIsMergeArray, TNullish>,
              ...MergeTuple<R1, R2, TIsMergeArray, TNullish>,
          ] // Prefer T2's element if available
        : [F1, ...MergeTuple<R1, [], TIsMergeArray, TNullish>] // Use T1's element if T2 is exhausted
    : T2; // If T1 is exhausted, return remaining T2 elements

type MergeArray<
    T1 extends AnyArray,
    T2 extends AnyArray,
    TIsMergeArray extends boolean = true,
    TNullish extends null | undefined = null | undefined,
> = TIsMergeArray extends true
    ? IsTuple<T1> extends true
        ? IsTuple<T2> extends true
            ? MergeTuple<T1, T2, TIsMergeArray, TNullish>
            : MergeNonTuple<T1, T2, TIsMergeArray, TNullish>
        : MergeNonTuple<T1, T2, TIsMergeArray, TNullish>
    : MergeRest<T1, T2, TIsMergeArray, TNullish>;

export type DeepMerge<
    T1 extends AnyRecord,
    T2 extends AnyRecord,
    TIsMergeArray extends boolean = true,
    TNullish extends undefined | null = undefined | null,
> = T1 extends T2
    ? T2 extends T1
        ? T2
        : MergeRecord<T1, T2, TIsMergeArray, TNullish>
    : MergeRecord<T1, T2, TIsMergeArray, TNullish>;
