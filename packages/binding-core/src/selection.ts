// A selection over the provider's defaults: a variant or token the instance leaves `undefined`
// takes the default.

import type { ComponentName, ComponentRef, Selection } from "@pureform/styling";

type Dict = Record<string, unknown>;

const defined = (
    base: Dict | undefined,
    over: Dict | undefined,
): Dict | undefined => {
    if (!base) return over;
    if (!over) return base;
    const merged: Dict = { ...base };
    for (const key in over) {
        if (over[key] !== undefined) merged[key] = over[key];
    }
    return merged;
};

const signatureOf = (value: Dict): string => {
    const parts: string[] = [];
    for (const key of Object.keys(value).sort()) {
        const item = value[key];
        if (item === undefined) continue;
        parts.push(
            `${JSON.stringify(key)}:${
                item !== null && typeof item === "object"
                    ? `{${signatureOf(item as Dict)}}`
                    : JSON.stringify(item)
            }`,
        );
    }
    return parts.join(",");
};

/** A string that's equal for two selections exactly when they select the same: keys in any
 *  order, `undefined` keys left out, tokens compared by value. Bindings whose selection is a new
 *  object every render (React) memoize on it. */
export const selectionSignature = (selection: object): string =>
    signatureOf(selection as Dict);

/** `selection` over `defaults`: keys `selection` leaves `undefined` take the default, and tokens
 *  merge the same way. Returns `selection` itself when there are no defaults. */
export const withDefaults = <C extends ComponentRef = ComponentName>(
    defaults: Selection<C> | undefined,
    selection: Selection<C>,
): Selection<C> => {
    if (!defaults) return selection;
    const { tokens: defaultTokens, ...defaultVariants } = defaults as Dict;
    const { tokens, ...variants } = selection as Dict;
    const merged = defined(defaultVariants, variants) as Dict;
    const mergedTokens = defined(
        defaultTokens as Dict | undefined,
        tokens as Dict | undefined,
    );
    return (
        mergedTokens ? { ...merged, tokens: mergedTokens } : merged
    ) as Selection<C>;
};
