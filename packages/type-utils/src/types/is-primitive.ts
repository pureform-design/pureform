type Primitives = string | number | boolean | null | undefined;

export type IsPrimitive<T> = Exclude<T, Primitives> extends never
    ? true
    : false;
