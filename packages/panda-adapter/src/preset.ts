// Assemble a Panda preset from a CoreConfig.

import { tokenValue, validateConfig } from "@pureform/core";
import type { ValueNode } from "@pureform/core/ast";
import type { CoreConfig, ThemeOverride, Token } from "@pureform/core/types";

import { compileNodeToCSS } from "./compile-node";
import type { CompileCtx, CompileOptions } from "./options";
import { compileRecipes } from "./recipes";
import {
    compileBreakpoints,
    compileKeyframes,
    compileSemanticTokens,
    compileTextStyles,
    compileThemeTokens,
    compileUtilities,
} from "./tokens";

const compileTokenGroups = (
    groups: Record<string, Record<string, Token<ValueNode>>> | undefined,
    ctx: CompileCtx,
): Record<string, Record<string, { value: string }>> | undefined => {
    if (!groups) return undefined;
    return Object.fromEntries(
        Object.entries(groups).map(([group, entries]) => [
            group,
            Object.fromEntries(
                Object.entries(entries).map(([name, entry]) => [
                    name,
                    {
                        value: compileNodeToCSS(
                            tokenValue(entry) as ValueNode,
                            ctx,
                        ),
                    },
                ]),
            ),
        ]),
    );
};

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
) => {
    validateConfig(config);
    const ctx: CompileCtx = {
        config,
        prefix: options.prefix,
        target: options.target ?? "css",
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
        utilities: compileUtilities(ctx),
        themes,
    });
};
