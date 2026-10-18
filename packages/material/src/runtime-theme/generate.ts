// The seed theme's generator, loaded on demand: Material's palette from the seed, lowered to the
// CSS vars the stylesheet's color tokens use, per scheme.

import type { CoreConfig } from "@pureform/core/types";
import type {
    CssVars,
    ThemeGenerator,
    ThemeSchemeVars,
} from "@pureform/styling";
import { themeVars } from "@pureform/styling/theme-vars";
import { resolveTheme } from "@pureform/theme";

import {
    materialColor,
    materialElevation,
    materialLayout,
    materialMotion,
    materialShape,
    materialState,
    materialTypescale,
} from "../providers";
import type { SeedThemeInput } from "./index";

// Numbers in a value, rounded to 10 significant digits. The color math gives slightly different
// last digits in different engines (Node and Chromium), and the server's block and the client's
// must match; 10 digits are still far finer than a color can show.
const NUMBER = /-?\d*\.\d+(?:e[-+]?\d+)?/gi;

const rounded = (vars: CssVars): CssVars =>
    Object.fromEntries(
        Object.entries(vars).map(([name, value]) => [
            name,
            value.replace(NUMBER, (n) =>
                String(Number(Number(n).toPrecision(10))),
            ),
        ]),
    );

// The entries of `dark` whose value differs from `light`'s.
const darkOnly = (light: CssVars, dark: CssVars): CssVars =>
    Object.fromEntries(
        Object.entries(dark).filter(
            ([name, value]) => light[name as `--${string}`] !== value,
        ),
    );

// Keys sorted and `undefined` left out, so equal inputs give equal keys.
const stable = (value: unknown): string => {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value) ?? "null";
    }
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
        .join(",")}}`;
};

/** How many themes `generateSeedTheme` keeps: a page's swatches and the theme in use, with room. */
export const SEED_THEME_CACHE_SIZE = 16;

// The themes generated last, by input and var options, least recently used first. A theme is
// frozen, so every caller can share it.
const cache = new Map<string, ThemeSchemeVars>();

const remember = (key: string, theme: ThemeSchemeVars): ThemeSchemeVars => {
    cache.set(key, theme);
    if (cache.size > SEED_THEME_CACHE_SIZE) {
        cache.delete(cache.keys().next().value!);
    }
    return theme;
};

/** Material's palette for a seed: every color token, and every color role (elevation tints
 *  too, which read the roles), so the roles declared at the root are declared again inside the
 *  theme and follow it. Equal inputs give the same frozen object: the last
 *  `SEED_THEME_CACHE_SIZE` themes are kept, since generating one takes milliseconds and a page
 *  asks for the same theme from several providers (and a server on every request). */
export const generateSeedTheme: ThemeGenerator<SeedThemeInput> = (
    input,
    vars,
) => {
    const key = `${stable(input)}\u0000${stable(vars)}`;
    const cached = cache.get(key);
    if (cached) {
        // Most recently used: to the end.
        cache.delete(key);
        return remember(key, cached);
    }
    return remember(key, generate(input, vars));
};

const generate: ThemeGenerator<SeedThemeInput> = (input, vars) => {
    const theme = resolveTheme({
        color: materialColor({ ...input, space: "oklch" }),
        typography: materialTypescale(),
        shape: materialShape(),
        layout: materialLayout(),
        state: materialState(),
        motion: materialMotion(),
        elevation: materialElevation(),
    });
    const config: CoreConfig = {
        tokens: { colors: theme.config.tokens?.colors ?? {} },
        semanticTokens: { colors: theme.config.semanticTokens?.colors ?? {} },
        components: {},
    } as CoreConfig;
    const light = rounded(
        themeVars(config, { ...vars, scheme: "light" }) as CssVars,
    );
    const dark = rounded(
        themeVars(config, { ...vars, scheme: "dark" }) as CssVars,
    );
    return Object.freeze({
        light: Object.freeze(light),
        dark: Object.freeze(darkOnly(light, dark)),
    });
};

/** Forgets every theme `generateSeedTheme` kept. For tests. */
export const clearSeedThemeCache = (): void => cache.clear();

export default generateSeedTheme;
