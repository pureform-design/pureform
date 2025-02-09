export type UnionDefault<TOptions, TDefault> = TDefault extends TOptions
    ? TDefault
    : TOptions;
