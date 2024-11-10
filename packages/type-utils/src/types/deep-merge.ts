type Object = Record<string, unknown>;

export type DeepMerge<T1 extends Object, T2 extends Object> = {
    [K in keyof T1 | keyof T2]: K extends keyof T1
        ? K extends keyof T2
            ? T1[K] extends Object
                ? T2[K] extends Object
                    ? DeepMerge<T1[K], T2[K]>
                    : T2[K]
                : T2[K]
            : T1[K]
        : K extends keyof T2
          ? T2[K]
          : never;
};
