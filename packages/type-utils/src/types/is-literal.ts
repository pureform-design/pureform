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
