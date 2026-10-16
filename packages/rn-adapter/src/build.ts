// Building styles from a config: templates and theme values for resolving at runtime, or
// every theme's styles resolved ahead of time.

import type { CoreConfig } from "@pureform/core/types";

import { lowerRn } from "./lower";
import type { RnOptions } from "./lower";
import { themeKey, themeTemplates } from "./resolve";
import type { PrecomputedStyles, RuntimeStyles } from "./resolve";
import { resolveTheme } from "./theme";
import type { Scheme } from "./theme";
import { dependencies, evaluate } from "./values";
import type { ThemeValues, Value } from "./values";

export interface BuildOptions extends RnOptions {
    /** Named themes to include besides the base. Default all of the config's. */
    themes?: string[];
    /** Default both. */
    schemes?: Scheme[];
}

const themeValues = (config: CoreConfig, options: BuildOptions) => {
    const themes: Record<string, ThemeValues> = {};
    const formulas: Record<string, Record<string, Value>> = {};
    for (const theme of [
        undefined,
        ...(options.themes ?? Object.keys(config.themes ?? {})),
    ]) {
        for (const scheme of options.schemes ?? (["light", "dark"] as const)) {
            const key = themeKey(theme, scheme);
            themes[key] = resolveTheme(
                config,
                { ...options, scheme, ...(theme ? { theme } : {}) },
                (formulas[key] = {}),
            );
        }
    }
    return { themes, formulas };
};

/** Templates and theme values, resolved when the app picks a theme. */
export const runtimeStyles = (
    config: CoreConfig,
    options: BuildOptions = {},
): RuntimeStyles => ({
    mode: "runtime",
    templates: lowerRn(config, options).components,
    ...themeValues(config, options),
});

/** Styles resolved ahead of time for every theme and scheme. */
export const precompute = (
    config: CoreConfig,
    options: BuildOptions = {},
): PrecomputedStyles => {
    const templates = lowerRn(config, options).components;
    const { themes, formulas } = themeValues(config, options);
    const found = themeTemplates(templates);
    const dependents: Record<string, number[]> = {};
    found.forEach((template, index) => {
        for (const key of dependencies(template)) {
            (dependents[key] ??= []).push(index);
        }
    });
    return {
        mode: "precomputed",
        templates,
        themes,
        formulas,
        values: Object.fromEntries(
            Object.entries(themes).map(([key, theme]) => [
                key,
                found.map((template) => evaluate(template, theme)),
            ]),
        ),
        dependents,
    };
};

/** Precomputed styles split by component, each as `precompute` gives it for that component
 *  alone. The themes and formulas are shared. */
export const splitPrecomputed = (
    styles: PrecomputedStyles,
): Record<string, PrecomputedStyles> => {
    const out: Record<string, PrecomputedStyles> = {};
    let offset = 0;
    for (const [name, component] of Object.entries(styles.templates)) {
        const templates = { [name]: component };
        const found = themeTemplates(templates);
        const dependents: Record<string, number[]> = {};
        found.forEach((template, index) => {
            for (const key of dependencies(template)) {
                (dependents[key] ??= []).push(index);
            }
        });
        const start = offset;
        offset += found.length;
        out[name] = {
            mode: "precomputed",
            templates,
            themes: styles.themes,
            ...(styles.formulas ? { formulas: styles.formulas } : {}),
            values: Object.fromEntries(
                Object.entries(styles.values).map(([key, values]) => [
                    key,
                    values.slice(start, offset),
                ]),
            ),
            dependents,
        };
    }
    return out;
};
