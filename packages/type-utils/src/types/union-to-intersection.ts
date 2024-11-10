export type UnionToIntersection<U> = (
    U extends unknown
        ? (x: U) => void
        : U
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
