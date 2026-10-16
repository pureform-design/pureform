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
