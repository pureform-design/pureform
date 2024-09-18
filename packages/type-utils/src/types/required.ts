import type { Simplify } from "./simplify";

export type Required<T, TKeys extends keyof T = keyof T> = Simplify<
    {
        [K in TKeys]-?: T[K];
    } & Omit<T, TKeys>
>;