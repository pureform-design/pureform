// Building styles from a config: templates and theme values for resolving at runtime, or
// every theme's styles resolved ahead of time.

import type { CoreConfig } from "@pureform/core/types";

import { lowerRn } from "./lower";
import type { RnOptions } from "./lower";
import { mapValues, readsTheme, resolve, themeKey } from "./resolve";
import type { PrecomputedStyles, RuntimeStyles } from "./resolve";
import { resolveTheme } from "./theme";
import type { Scheme } from "./theme";
import { dependencies } from "./values";
import type { ThemeValues } from "./values";

export interface BuildOptions extends RnOptions {
    /** Named themes to include besides the base. Default all of the config's. */
    themes?: string[];
    /** Default both. */
    schemes?: Scheme[];
}

const themeValues = (config: CoreConfig, options: BuildOptions) => {
    const themes: Record<string, ThemeValues> = {};
    for (const theme of [
        undefined,
        ...(options.themes ?? Object.keys(config.themes ?? {})),
    ]) {
        for (const scheme of options.schemes ?? (["light", "dark"] as const)) {
            themes[themeKey(theme, scheme)] = resolveTheme(config, {
                ...options,
                scheme,
                ...(theme ? { theme } : {}),
            });
        }
    }
    return themes;
};

/** Templates and theme values, resolved when the app picks a theme. */
export const runtimeStyles = (
    config: CoreConfig,
    options: BuildOptions = {},
): RuntimeStyles => ({
    mode: "runtime",
    templates: lowerRn(config, options).components,
    themes: themeValues(config, options),
});

/** Styles resolved ahead of time for every theme and scheme. */
export const precompute = (
    config: CoreConfig,
    options: BuildOptions = {},
): PrecomputedStyles => {
    const templates = lowerRn(config, options).components;
    const themes = themeValues(config, options);
    const found: PrecomputedStyles["templates"] = [];
    const dependents: Record<string, number[]> = {};
    mapValues(templates, (value, path) => {
        if (!readsTheme(value)) return value;
        for (const key of dependencies(value))
            (dependents[key] ??= []).push(found.length);
        found.push([path, value]);
        return value;
    });
    return {
        mode: "precomputed",
        sets: Object.fromEntries(
            Object.entries(themes).map(([key, theme]) => [
                key,
                resolve(templates, theme),
            ]),
        ),
        themes,
        templates: found,
        dependents,
    };
};
