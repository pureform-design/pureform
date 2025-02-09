import type { ArrayLength, IsLiteralNumber } from ".";

export type IsTuple<T extends readonly unknown[]> = IsLiteralNumber<
    ArrayLength<T>
>;
