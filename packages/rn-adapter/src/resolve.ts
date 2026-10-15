// Turning templates into styles against a theme's values, and applying runtime overrides to
// precomputed styles: each value that reads a token kept its template, indexed by the tokens
// it reads, so an override recomputes only those. Building the styles is in `build.ts`, so
// the runtime needs no lowering or color library.

import type { ComponentStyles } from "./lower";
import type { Scheme } from "./theme";
import { evaluate, isExpr } from "./values";
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
}

/** Styles resolved for each theme, with what an override needs to recompute them. */
export interface PrecomputedStyles {
    mode: "precomputed";
    sets: Record<string, Resolved>;
    themes: Record<string, ThemeValues>;
    /** Every value that reads the theme: where it is, and its template. */
    templates: [path: [string, number, number, string], template: Value][];
    /** The indices into `templates` of the values reading each token. */
    dependents: Record<string, number[]>;
}

export type Styles = RuntimeStyles | PrecomputedStyles;

/** A theme's styles with runtime overrides of token or component token values applied. */
export const stylesFor = (
    styles: Styles,
    key: string,
    overrides: ThemeValues = {},
): Resolved => {
    const base = styles.themes[key];
    if (!base) throw new Error(`no styles for theme "${key}"`);
    const theme = { ...base, ...overrides };
    if (styles.mode === "runtime") return resolve(styles.templates, theme);
    const set = styles.sets[key]!;
    const affected = new Set(
        Object.keys(overrides).flatMap((k) => styles.dependents[k] ?? []),
    );
    if (affected.size === 0) return set;
    // Copy only the components the overrides reach, then recompute their values.
    const out: Resolved = { ...set };
    for (const index of affected) {
        const [[name, e, r, property], template] = styles.templates[index]!;
        if (out[name] === set[name]) out[name] = structuredClone(set[name]!);
        out[name]!.entries[e]!.rules[r]!.style[property] = evaluate(
            template,
            theme,
        ) as Concrete;
    }
    return out;
};
