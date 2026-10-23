// Turning templates into styles against a theme's values, and applying runtime overrides to
// precomputed styles: each value that reads a token kept its template, indexed by the tokens
// it reads, so an override recomputes only those. Building the styles is in `build.ts`, so
// the runtime needs no lowering or color library.

import type { ComponentStyles } from "./lower";
import { formatColor } from "./rgba";
import type { Selected } from "./select";
import { readColorFunction } from "./spaces";
import type { Scheme } from "./theme";
import { dependencies, evaluate, isExpr } from "./values";
import type { Concrete, ThemeValues, Value } from "./values";

export type Templates = Record<string, ComponentStyles>;
export type Resolved = Record<string, ComponentStyles<Value>>;

/** A theme's key: the named theme, or `base`, and the scheme. */
export const themeKey = (theme: string | undefined, scheme: Scheme): string =>
    `${theme ?? "base"}:${scheme}`;

export const mapValues = (
    templates: Templates,
    fn: (value: Value, path: [string, number, number, string]) => Value,
): Resolved =>
    Object.fromEntries(
        Object.entries(templates).map(([name, component]) => [
            name,
            {
                ...component,
                entries: component.entries.map((entry, e) => ({
                    ...entry,
                    rules: entry.rules.map((rule, r) => ({
                        ...rule,
                        style: Object.fromEntries(
                            Object.entries(rule.style).map(
                                ([property, value]) => [
                                    property,
                                    fn(value, [name, e, r, property]),
                                ],
                            ),
                        ),
                    })),
                })),
            },
        ]),
    );

export const readsTheme = (value: Value): boolean =>
    typeof value === "object" &&
    (isExpr(value) ||
        (Array.isArray(value)
            ? value.some(readsTheme)
            : Object.values(value).some(readsTheme)));

/** Resolve templates against a theme's values. */
export const resolve = (templates: Templates, theme: ThemeValues): Resolved =>
    mapValues(templates, (value) =>
        readsTheme(value) ? evaluate(value, theme) : value,
    );

/** Templates and each theme's values, for resolving at runtime. */
export interface RuntimeStyles {
    mode: "runtime";
    templates: Templates;
    themes: Record<string, ThemeValues>;
    /** Each theme's formulas for the tokens that read others, by theme key. */
    formulas?: Record<string, Record<string, Value>>;
}

/** Styles resolved ahead of time. The components' structure is shared: each value that reads
 *  the theme stays a template there, and each theme has those values resolved, in the order a
 *  walk of the structure meets them. An override recomputes the values that read it. */
export interface PrecomputedStyles {
    mode: "precomputed";
    templates: Templates;
    themes: Record<string, ThemeValues>;
    /** Each theme's formulas for the tokens that read others, by theme key. */
    formulas?: Record<string, Record<string, Value>>;
    /** Each theme's resolved values, by theme key. */
    values: Record<string, Value[]>;
    /** The positions in `values` of those reading each token. */
    dependents: Record<string, number[]>;
}

export type Styles = RuntimeStyles | PrecomputedStyles;

/** The templates that read the theme, in walk order. */
export const themeTemplates = (templates: Templates): Value[] => {
    const found: Value[] = [];
    mapValues(templates, (value) => {
        if (readsTheme(value)) found.push(value);
        return value;
    });
    return found;
};

const cache = new WeakMap<
    Styles,
    {
        templates: Value[];
        paths: Record<string, ValuePath[]>;
        sets: Map<string, Resolved>;
    }
>();

/** Overrides for both schemes, or for each: a brand color generated for light and dark has
 *  different values in each. */
export type Overrides =
    | ThemeValues
    | { light?: ThemeValues; dark?: ThemeValues };

const isPerScheme = (
    overrides: Overrides,
): overrides is { light?: ThemeValues; dark?: ThemeValues } =>
    Object.keys(overrides).length > 0 &&
    Object.entries(overrides).every(
        ([key, value]) =>
            (key === "light" || key === "dark") && typeof value === "object",
    );

/** The overrides that apply in a scheme. */
export const overridesFor = (
    overrides: Overrides | undefined,
    scheme: Scheme,
): ThemeValues => {
    const values = !overrides
        ? {}
        : isPerScheme(overrides)
          ? (overrides[scheme] ?? {})
          : (overrides as ThemeValues);
    // Colors in other notations become rgba(), which the runtime reads without a library. The
    // same object comes back when there are none, so it stays a stable memo key.
    let out: ThemeValues | undefined;
    for (const [key, value] of Object.entries(values)) {
        const color =
            typeof value === "string" ? readColorFunction(value) : undefined;
        if (color) (out ??= { ...values })[key] = formatColor(color);
    }
    return out ?? values;
};

// Values over a theme's, read through to it.
const over = (theme: ThemeValues, values: ThemeValues): ThemeValues =>
    Object.assign(Object.create(theme) as ThemeValues, values);

// Each theme's formulas with the tokens they read, worked out once.
const formulaReads = new WeakMap<
    Record<string, Value>,
    (readonly [string, Value, string[]])[]
>();

/** Overrides with the tokens derived from them recomputed: a token whose formula reads an
 *  overridden one, directly or through others, takes its new value. One given outright stays
 *  as given. */
export const withDerived = (
    styles: Pick<Styles, "themes" | "formulas">,
    key: string,
    overrides: ThemeValues,
): ThemeValues => {
    const formulas = styles.formulas?.[key];
    if (!formulas || Object.keys(overrides).length === 0) return overrides;
    const theme = over(styles.themes[key] ?? {}, overrides);
    const out: ThemeValues = { ...overrides };
    const changed = new Set(Object.keys(overrides));
    let reads = formulaReads.get(formulas);
    if (!reads) {
        reads = Object.entries(formulas).map(
            ([token, formula]) =>
                [token, formula, [...dependencies(formula)]] as const,
        );
        formulaReads.set(formulas, reads);
    }
    // Formulas are few and shallow, so a pass until nothing changes is enough.
    for (let again = true; again;) {
        again = false;
        for (const [token, formula, keys] of reads) {
            if (token in overrides || !keys.some((k) => changed.has(k)))
                continue;
            const value = evaluate(formula, theme) as Concrete;
            if (theme[token] === value) continue;
            theme[token] = out[token] = value;
            if (!changed.has(token)) again = true;
            changed.add(token);
        }
    }
    return out;
};

/** A theme's styles with runtime overrides of token or component token values applied, and
 *  the tokens derived from them recomputed. */
export const stylesFor = (
    styles: Styles,
    key: string,
    given: ThemeValues = {},
): Resolved => {
    const overrides = withDerived(styles, key, given);
    const base = styles.themes[key];
    if (!base) throw new Error(`no styles for theme "${key}"`);
    // Over the theme, not a copy of it: themes hold thousands of tokens.
    const theme = over(base, overrides);
    if (styles.mode === "runtime")
        return lazily(
            styles.templates,
            (name) =>
                resolve({ [name]: styles.templates[name]! }, theme)[name]!,
        );
    let cached = cache.get(styles);
    if (!cached) {
        const templates: Value[] = [];
        const paths: Record<string, ValuePath[]> = {};
        for (const name of Object.keys(styles.templates)) {
            const own: ValuePath[] = (paths[name] = []);
            mapValues({ [name]: styles.templates[name]! }, (value, at) => {
                if (readsTheme(value)) {
                    own.push([templates.length, at[1], at[2], at[3]]);
                    templates.push(value);
                }
                return value;
            });
        }
        cached = { templates, paths, sets: new Map() };
        cache.set(styles, cached);
    }
    const { templates, paths } = cached;
    const values = styles.values[key]!;
    const affected = new Set(
        Object.keys(overrides).flatMap((k) => styles.dependents[k] ?? []),
    );
    if (affected.size === 0) {
        let set = cached.sets.get(key);
        if (!set) {
            set = lazily(styles.templates, (name) => {
                const own = paths[name]!;
                let i = 0;
                return mapValues(
                    { [name]: styles.templates[name]! },
                    (value) =>
                        readsTheme(value) ? values[own[i++]![0]]! : value,
                )[name]!;
            });
            cached.sets.set(key, set);
        }
        return set;
    }
    // Over the theme's own styles, a copy of only the rules holding a value that reads an
    // overridden token.
    const plain = stylesFor(styles, key);
    return lazily(styles.templates, (name) => {
        const changed = paths[name]!.filter(([index]) => affected.has(index));
        const component = plain[name]!;
        if (changed.length === 0) return component;
        const entries = [...component.entries];
        const copied = new Set<string>();
        for (const [index, e, r, property] of changed) {
            if (!copied.has(`${e}`)) {
                copied.add(`${e}`);
                entries[e] = { ...entries[e]!, rules: [...entries[e]!.rules] };
            }
            const rules = entries[e]!.rules;
            if (!copied.has(`${e}:${r}`)) {
                copied.add(`${e}:${r}`);
                rules[r] = { ...rules[r]!, style: { ...rules[r]!.style } };
            }
            rules[r]!.style[property] = evaluate(templates[index]!, theme);
        }
        return { ...component, entries };
    });
};

// A value that reads the theme: its position among them, and its entry, rule, and property.
type ValuePath = readonly [number, number, number, string];

// Each component resolved when it's first read: a set of overrides is resolved for one
// component at a time, so its cost doesn't grow with the preset.
const lazily = (
    templates: Templates,
    build: (name: string) => ComponentStyles<Value>,
): Resolved => {
    const resolved: Resolved = {};
    for (const name of Object.keys(templates)) {
        let built: ComponentStyles<Value> | undefined;
        Object.defineProperty(resolved, name, {
            enumerable: true,
            get: () => (built ??= build(name)),
        });
    }
    return resolved;
};

const withOverrides = new WeakMap<Styles, Map<string, Resolved>>();

/** Styles resolved with overrides, kept per set of them, so every instance whose variants set
 *  the same tokens, and every component under one provider, shares one resolution. A few sets
 *  are in use at a time; the cache empties once many build up. */
export const resolvedWith = (
    styles: Styles,
    key: string,
    overrides: ThemeValues,
): Resolved => {
    let sets = withOverrides.get(styles);
    if (!sets) withOverrides.set(styles, (sets = new Map()));
    const id = `${key}|${JSON.stringify(overrides)}`;
    let resolved = sets.get(id);
    if (!resolved) {
        if (sets.size >= 256) sets.clear();
        resolved = stylesFor(styles, key, overrides);
        sets.set(id, resolved);
    }
    return resolved;
};

/** A selection with the tokens its variants and state set taken into account: when it sets
 *  any, the component is resolved again with them, under the provider's overrides and the
 *  instance's own `tokens`, and `selectFrom` selects from that, so every style reading them
 *  follows. */
export const withSetTokens = (
    selected: Selected,
    selectFrom: (component: ComponentStyles<Value>) => Selected,
    where: {
        styles: Styles;
        /** The theme's key, from `themeKey`. */
        key: string;
        /** The component's name. */
        name: string;
        scheme: Scheme;
        /** The provider's overrides. */
        overrides?: ThemeValues;
        /** The instance's own tokens, which win over the ones it sets. */
        tokens?: Overrides;
    },
): Selected => {
    // A token one variant sets may read one another sets (a size's corner reads the density's
    // offset), so it's resolved again until the tokens it sets settle.
    let current = selected;
    for (let pass = 0; pass < 4; pass++) {
        if (Object.keys(current.tokens).length === 0) return current;
        const again = resolvedWith(where.styles, where.key, {
            ...where.overrides,
            ...overridesFor(current.tokens, where.scheme),
            ...overridesFor(where.tokens, where.scheme),
        })[where.name];
        if (!again) return current;
        const next = selectFrom(again);
        if (sameValues(next.tokens, current.tokens)) return next;
        current = next;
    }
    return current;
};

const sameValues = (a: ThemeValues, b: ThemeValues) => {
    const keys = Object.keys(a);
    return (
        keys.length === Object.keys(b).length &&
        keys.every((key) => Object.is(a[key], b[key]))
    );
};
