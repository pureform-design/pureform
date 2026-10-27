// Joining web class values the way `clsx` does: strings and numbers as they are, arrays flattened,
// objects by their truthy keys, and anything falsy skipped. Bindings whose framework takes only a
// string (React's `className`) join with it.

/** A class value as `clsx` takes it: a string, an array of class values, or an object whose
 *  truthy keys are classes. */
export type ClassValue =
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined
    | ClassDictionary
    | readonly ClassValue[];

/** Classes by name, on when the value is truthy: `{ busy: saving }`. */
export type ClassDictionary = { readonly [name: string]: unknown };

const append = (joined: string, value: ClassValue): string => {
    if (!value || value === true) return joined;
    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "bigint"
    ) {
        return joined ? `${joined} ${value}` : String(value);
    }
    if (Array.isArray(value)) {
        let result = joined;
        for (const item of value as readonly ClassValue[])
            result = append(result, item);
        return result;
    }
    let result = joined;
    for (const name in value as ClassDictionary) {
        if ((value as ClassDictionary)[name])
            result = result ? `${result} ${name}` : name;
    }
    return result;
};

/** The class values joined into one string, as `clsx` joins them:
 *  `cx("a", ["b", { c: true, d: false }])` is `"a b c"`. */
export const cx = (...values: readonly ClassValue[]): string =>
    append("", values);
