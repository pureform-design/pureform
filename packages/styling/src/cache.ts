// A per-selection cache for factories. A selection's variants and states make a key; the first
// lookup of a key computes and freezes the result, and every later one is a `Map.get`.

/** The groups and states that make a key, in a fixed order. */
export interface SelectionOrder {
    /** The variant groups, in key order. */
    readonly variants: readonly string[];
    /** The states, in key order. Only a React Native selection has them. */
    readonly states?: readonly string[];
    /** The value each group takes when a selection leaves it out. */
    readonly defaults?: Readonly<Record<string, string>>;
}

/** A cached factory: the computing function, cached. */
export interface SelectionCache<S, R> {
    (selection: S): R;
    /** How many keys it holds. */
    readonly size: number;
    /** Drop every key. */
    clear(): void;
}

const variantValue = (
    value: unknown,
    group: string,
    defaults: Readonly<Record<string, string>> | undefined,
): string | undefined =>
    value === true
        ? "true"
        : value === false
          ? "false"
          : typeof value === "string"
            ? value
            : defaults?.[group];

/** A selection's key: each group's value (or its default, or empty), then a `1` or `0` per
 *  state, joined by `|`. Instance tokens and anything not in `order` are left out. */
export const selectionKey = (
    order: SelectionOrder,
    selection: object,
): string => {
    const s = selection as Record<string, unknown>;
    let key = "";
    for (const group of order.variants) {
        key += `${variantValue(s[group], group, order.defaults) ?? ""}|`;
    }
    for (const state of order.states ?? []) key += s[state] ? "1" : "0";
    return key;
};

/** Freeze a value and every object and array inside it. */
export const deepFreeze = <T>(value: T): T => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
        return value;
    }
    for (const inner of Object.values(value)) deepFreeze(inner);
    return Object.freeze(value);
};

// The selection a key stands for: each group's value as a string, with its default where it's
// left out, and each state as a boolean.
const normalize = (order: SelectionOrder, selection: object): object => {
    const s = selection as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const group of order.variants) {
        const value = variantValue(s[group], group, order.defaults);
        if (value !== undefined) out[group] = value;
    }
    for (const state of order.states ?? []) out[state] = Boolean(s[state]);
    return out;
};

/** Cache `compute` per selection key (`selectionKey`), filling lazily and freezing each
 *  result deeply. `compute` gets the selection the key stands for: groups as strings with
 *  defaults filled in, states as booleans, no tokens. So two selections with one key, such as
 *  `{ toggle: true }` and `{ toggle: "true" }`, compute once.
 *
 *  Factories are pure, so one cache per factory module is safe on a server shared by
 *  requests. */
export const selectionCache = <S extends object, R>(
    order: SelectionOrder,
    compute: (selection: S) => R,
): SelectionCache<S, R> => {
    const table = new Map<string, R>();
    const cached = (selection: S): R => {
        const key = selectionKey(order, selection);
        let result = table.get(key);
        if (result === undefined && !table.has(key)) {
            result = deepFreeze(compute(normalize(order, selection) as S));
            table.set(key, result);
        }
        return result as R;
    };
    return Object.defineProperties(cached, {
        size: { get: () => table.size },
        clear: { value: () => table.clear() },
    }) as SelectionCache<S, R>;
};
