// Assemble a Panda preset from a CoreConfig.

import type { Preset } from "@pandacss/types";
import { tokenValue, validateConfig } from "@pureform/core";
import type { ValueNode } from "@pureform/core/ast";
import type { CoreConfig, ThemeOverride, Token } from "@pureform/core/types";

import { compileNodeToCSS } from "./compile-node";
import { varName } from "./css";
import type { CompileCtx, CompileOptions } from "./options";
import { compileRecipes } from "./recipes";
import {
    compileBreakpoints,
    compileKeyframes,
    compileSemanticTokens,
    compileTextStyles,
    compileThemeTokens,
    compileUtilities,
    pandaCategory,
    tokenEntry,
} from "./tokens";

const compileTokenGroups = (
    groups: Record<string, Record<string, Token<ValueNode>>> | undefined,
    ctx: CompileCtx,
) => {
    if (!groups || Object.keys(groups).length === 0) return undefined;
    // Token definitions use the curly ref form.
    const tctx: CompileCtx = { ...ctx, refStyle: "curly" };
    return Object.fromEntries(
        Object.entries(groups).map(([group, entries]) => [
            pandaCategory(group),
            Object.fromEntries(
                Object.entries(entries).map(([name, entry]) => [
                    name,
                    tokenEntry(entry, tctx),
                ]),
            ),
        ]),
    );
};

// Core's color-scheme conditions follow the system preference, and a `.light` or `.dark` class
// on an ancestor (usually `<html>`) overrides it, so an app can offer a toggle. Panda's own
// `dark` condition only reads a class, so the preset replaces both.
const COLOR_SCHEME_CONDITIONS = {
    dark: {
        "@media (prefers-color-scheme: dark)": {
            ":root:not(.light) &": "@slot",
        },
        ".dark &": "@slot",
    },
    light: {
        "@media (prefers-color-scheme: light)": {
            ":root:not(.dark) &": "@slot",
        },
        ".light &": "@slot",
    },
};

const hasDarkCase = (node: ValueNode): boolean =>
    node.type === "conditional" &&
    node.cases.some((c) =>
        (Array.isArray(c.on) ? c.on : [c.on]).some(
            (on) => on === "dark" || on === "light",
        ),
    );

// Tell the browser which schemes the page supports, so its own controls and scrollbars match.
// Only emitted when some semantic token actually varies by scheme.
const colorSchemeCss = (config: CoreConfig) =>
    Object.values(config.semanticTokens).some((group) =>
        Object.values(group).some((entry) =>
            hasDarkCase(tokenValue(entry) as ValueNode),
        ),
    )
        ? {
              ":root": { colorScheme: "light dark" },
              ":root.light": { colorScheme: "light" },
              ":root.dark": { colorScheme: "dark" },
          }
        : undefined;

const compileThemeOverride = (override: ThemeOverride, ctx: CompileCtx) => {
    // Fonts and motion live beside the token groups in core, and among them in Panda.
    const tokenGroups: Record<string, Record<string, Token<ValueNode>>> = {
        ...override.tokens,
        ...(override.fonts ? { fonts: override.fonts } : {}),
        ...(override.durations ? { durations: override.durations } : {}),
        ...(override.easings ? { easings: override.easings } : {}),
    };
    const tokens = compileTokenGroups(tokenGroups, ctx);
    const semanticTokens = compileTokenGroups(override.semanticTokens, ctx);
    return {
        ...(tokens ? { tokens } : {}),
        ...(semanticTokens ? { semanticTokens } : {}),
    };
};

// Panda themes carry tokens only, so a theme's component token overrides become the
// components' vars, set under the theme's selector, which is where Panda applies the theme.
const themeComponentVars = (config: CoreConfig, ctx: CompileCtx) => {
    const rules: Record<string, Record<string, string>> = {};
    for (const [name, override] of Object.entries(config.themes ?? {})) {
        const vars: Record<string, string> = {};
        for (const [component, { tokens = {} }] of Object.entries(
            override.components ?? {},
        )) {
            for (const [token, entry] of Object.entries(tokens)) {
                vars[varName(["components", component, token], ctx.prefix)] =
                    compileNodeToCSS(tokenValue(entry) as ValueNode, ctx);
            }
        }
        if (Object.keys(vars).length > 0) {
            rules[`[data-panda-theme=${name}]`] = vars;
        }
    }
    return Object.keys(rules).length > 0 ? rules : undefined;
};

const defined = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
    Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as Partial<T>;

/** Compile a `CoreConfig` to a Panda `definePreset`-shaped object. Validation runs first so a
 *  bad config fails before any output is produced. */
export const compilePreset = (
    config: CoreConfig,
    options: CompileOptions = {},
): Preset => {
    validateConfig(config);
    const ctx: CompileCtx = {
        config,
        prefix: options.prefix,
        ...(options.pandaPrefix ? { tokenPrefix: options.pandaPrefix } : {}),
        target: options.target ?? "css",
        refStyle: "fn",
    };

    const { recipes, slotRecipes } = compileRecipes(ctx);
    const themes = config.themes
        ? Object.fromEntries(
              Object.entries(config.themes).map(([name, override]) => [
                  name,
                  compileThemeOverride(override, ctx),
              ]),
          )
        : undefined;

    return defined({
        name: options.name ?? "pureform",
        theme: defined({
            tokens: compileThemeTokens(ctx),
            semanticTokens: compileSemanticTokens(ctx),
            breakpoints: compileBreakpoints(ctx),
            textStyles: compileTextStyles(ctx),
            keyframes: compileKeyframes(ctx),
            recipes,
            slotRecipes,
        }),
        conditions: { extend: COLOR_SCHEME_CONDITIONS },
        globalCss: (() => {
            const css = {
                ...colorSchemeCss(config),
                ...themeComponentVars(config, ctx),
            };
            return Object.keys(css).length > 0 ? css : undefined;
        })(),
        utilities: compileUtilities(ctx),
        themes,
    }) as unknown as Preset;
};
