// Assemble a Panda preset from a CoreConfig.

import type { Preset } from "@pandacss/types";
import { tokenValue, validateConfig } from "@pureform/core";
import type { ValueNode } from "@pureform/core/ast";
import type { CoreConfig, ThemeOverride, Token } from "@pureform/core/types";

import type { CompileCtx, CompileOptions } from "./options";
import { compileRecipes } from "./recipes";
import {
    compileBreakpoints,
    compileKeyframes,
    compileSemanticTokens,
    compileTextStyles,
    compileThemeTokens,
    compileUtilities,
    tokenEntry,
} from "./tokens";

const compileTokenGroups = (
    groups: Record<string, Record<string, Token<ValueNode>>> | undefined,
    ctx: CompileCtx,
) => {
    if (!groups) return undefined;
    // Token definitions use the curly ref form.
    const tctx: CompileCtx = { ...ctx, refStyle: "curly" };
    return Object.fromEntries(
        Object.entries(groups).map(([group, entries]) => [
            group,
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
    const tokens = compileTokenGroups(override.tokens, ctx);
    const semanticTokens = compileTokenGroups(override.semanticTokens, ctx);
    return {
        ...(tokens ? { tokens } : {}),
        ...(semanticTokens ? { semanticTokens } : {}),
    };
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
        globalCss: colorSchemeCss(config),
        utilities: compileUtilities(ctx),
        themes,
    }) as unknown as Preset;
};
