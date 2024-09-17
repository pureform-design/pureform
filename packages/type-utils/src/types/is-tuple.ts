import type { ArrayLength, IsLiteralNumber } from ".";

export type IsTuple<T extends unknown[]> = IsLiteralNumber<ArrayLength<T>>;
