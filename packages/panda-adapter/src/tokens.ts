// Lower the config's value tiers to Panda shapes: tokens, semantic tokens, breakpoints, text
// styles, keyframes, and utilities.

import { tokenValue } from "@pureform/core";
import type { SpringNode, ValueNode } from "@pureform/core/ast";
import type { Token, UtilityDef } from "@pureform/core/types";
import {
    compileConditional,
    compileNodeToCSS,
    compileStyleMap,
    compileTemplate,
    springTokenGroups,
} from "@pureform/css-lowering";
import type { CondObject } from "@pureform/css-lowering";

import { tokenCurly } from "./options";
import type { CompileCtx } from "./options";

// Core token group to Panda token category. Groups not listed keep their name (`colors`,
// `spacing`, `radii`, `sizes` are already Panda categories).
const CATEGORY: Record<string, string> = {
    fontSize: "fontSizes",
    fontWeight: "fontWeights",
    lineHeight: "lineHeights",
    letterSpacing: "letterSpacings",
    borderWidth: "borderWidths",
};

/** The Panda token category a core token group lowers to. */
export const pandaCategory = (group: string): string =>
    CATEGORY[group] ?? group;

type PandaToken = { value: string | CondObject };
type PandaTokenGroup = Record<string, PandaToken>;

// A conditional token, for example a color with a dark-scheme case, becomes Panda's
// conditional token value (`{ base, _dark }`), which Panda emits as one CSS var per condition.
export const tokenEntry = (
    entry: Token<ValueNode>,
    ctx: CompileCtx,
): PandaToken => {
    const node = tokenValue(entry) as ValueNode;
    return {
        value:
            node.type === "conditional"
                ? compileConditional(node, ctx)
                : compileNodeToCSS(node, ctx),
    };
};

const groupToPanda = (
    group: Record<string, Token<ValueNode>>,
    ctx: CompileCtx,
): PandaTokenGroup =>
    Object.fromEntries(
        Object.entries(group).map(([name, entry]) => [
            name,
            tokenEntry(entry, ctx),
        ]),
    );

/** A spring's two web tokens, nested under `springs.<name>` as `duration` and `easing`, so
 *  Panda writes `--springs-<name>-duration` and `--springs-<name>-easing`. */
export const springsToPanda = (
    springs: Record<string, Token<SpringNode>>,
    ctx: CompileCtx,
): { springs: Record<string, PandaTokenGroup> } => ({
    springs: Object.fromEntries(
        Object.entries(springTokenGroups(springs)).map(([name, group]) => [
            name,
            groupToPanda(group, ctx),
        ]),
    ),
});

/** `theme.tokens`: primitive color/space/radius groups plus the motion, stacking, and font
 *  tiers, each remapped to its Panda category. */
export const compileThemeTokens = (
    ctx: CompileCtx,
): Record<string, PandaTokenGroup> => {
    const { config } = ctx;
    // Token definitions resolve the curly `{...}` ref form, not `token(...)`.
    const tctx: CompileCtx = { ...ctx, tokenRef: tokenCurly };
    const out: Record<string, PandaTokenGroup> = {};
    for (const [group, entries] of Object.entries(config.tokens)) {
        out[CATEGORY[group] ?? group] = groupToPanda(entries, tctx);
    }
    if (config.durations) out.durations = groupToPanda(config.durations, tctx);
    if (config.easings) out.easings = groupToPanda(config.easings, tctx);
    if (config.springs)
        Object.assign(out, springsToPanda(config.springs, tctx));
    if (config.zIndices) out.zIndex = groupToPanda(config.zIndices, tctx);
    if (config.fonts) out.fonts = groupToPanda(config.fonts, tctx);
    return out;
};

/** `theme.semanticTokens`: each group keyed by its Panda category namespace. */
export const compileSemanticTokens = (
    ctx: CompileCtx,
): Record<string, PandaTokenGroup> => {
    const tctx: CompileCtx = { ...ctx, tokenRef: tokenCurly };
    return Object.fromEntries(
        Object.entries(ctx.config.semanticTokens).map(([group, entries]) => [
            CATEGORY[group] ?? group,
            groupToPanda(entries, tctx),
        ]),
    );
};

/** `theme.breakpoints`: a flat name-to-size map (not token envelopes). */
export const compileBreakpoints = (
    ctx: CompileCtx,
): Record<string, string> | undefined => {
    if (!ctx.config.breakpoints) return undefined;
    return Object.fromEntries(
        Object.entries(ctx.config.breakpoints).map(([name, size]) => [
            name,
            size.unit === "none"
                ? String(size.value)
                : `${size.value}${size.unit}`,
        ]),
    );
};

/** `theme.textStyles`: each role's `StyleMap` wrapped in a `{ value }` envelope. */
export const compileTextStyles = (
    ctx: CompileCtx,
): Record<string, { value: Record<string, unknown> }> | undefined => {
    if (!ctx.config.textStyles) return undefined;
    return Object.fromEntries(
        Object.entries(ctx.config.textStyles).map(([name, style]) => [
            name,
            { value: compileStyleMap(style, ctx) },
        ]),
    );
};

/** `theme.keyframes`: each set is a map of stop to compiled styles. */
export const compileKeyframes = (
    ctx: CompileCtx,
): Record<string, Record<string, Record<string, unknown>>> | undefined => {
    if (!ctx.config.keyframes) return undefined;
    return Object.fromEntries(
        Object.entries(ctx.config.keyframes).map(([name, stops]) => [
            name,
            Object.fromEntries(
                Object.entries(stops).map(([stop, style]) => [
                    stop,
                    compileStyleMap(style, ctx),
                ]),
            ),
        ]),
    );
};

type PandaUtility = {
    values?: string[] | string;
    transform: (value: string) => Record<string, unknown>;
};

/** A static utility becomes a fixed value-to-style map; a dynamic utility becomes a
 *  value-parameterized transform, with its token scale (if any) exposed to Panda through
 *  `values`. */
export const compileUtilities = (
    ctx: CompileCtx,
): Record<string, PandaUtility> | undefined => {
    const { config } = ctx;
    if (!config.utilities) return undefined;
    const out: Record<string, PandaUtility> = {};
    for (const [name, def] of Object.entries(config.utilities)) {
        out[name] = compileUtility(def, ctx);
    }
    return out;
};

const compileUtility = (def: UtilityDef, ctx: CompileCtx): PandaUtility => {
    if (def.kind === "static") {
        const compiled: Record<
            string,
            Record<string, unknown>
        > = Object.fromEntries(
            Object.entries(def.values).map(([step, style]) => [
                step,
                compileStyleMap(style, ctx),
            ]),
        );
        return {
            values: Object.keys(def.values),
            transform: (value: string) => compiled[value] ?? {},
        };
    }
    // Dynamic: a scale exposes a Panda token category; the template is compiled per call-site
    // value. The scale's last path segment is its Panda category name.
    const scaleCategory = def.scale
        ? (CATEGORY[def.scale.at(-1) ?? ""] ?? def.scale.at(-1))
        : undefined;
    return {
        ...(scaleCategory ? { values: scaleCategory } : {}),
        transform: (value: string) => compileTemplate(def.template, value, ctx),
    };
};
