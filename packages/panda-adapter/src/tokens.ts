// Lower the config's value tiers to Panda shapes: tokens, semantic tokens, breakpoints, text
// styles, keyframes, and utilities.

import { tokenValue } from "@pureform/core";
import type { StyleMap, ValueNode } from "@pureform/core/ast";
import type { Token, UtilityDef } from "@pureform/core/types";

import { compileNodeToCSS } from "./compile-node";
import type { CompileCtx } from "./options";
import { compileStyleMap } from "./style-map";

// Core token group to Panda token category. Groups not listed keep their name (`colors`,
// `spacing`, `radii`, `sizes` are already Panda categories).
const CATEGORY: Record<string, string> = {
    fontSize: "fontSizes",
    fontWeight: "fontWeights",
    lineHeight: "lineHeights",
    letterSpacing: "letterSpacings",
    borderWidth: "borderWidths",
};

type PandaToken = { value: string };
type PandaTokenGroup = Record<string, PandaToken>;

const tokenEntry = (entry: Token<ValueNode>, ctx: CompileCtx): PandaToken => ({
    value: compileNodeToCSS(tokenValue(entry) as ValueNode, ctx),
});

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

/** `theme.tokens`: primitive color/space/radius groups plus the motion, stacking, and font
 *  tiers, each remapped to its Panda category. */
export const compileThemeTokens = (
    ctx: CompileCtx,
): Record<string, PandaTokenGroup> => {
    const { config } = ctx;
    // Token definitions resolve the curly `{...}` ref form, not `token(...)`.
    const tctx: CompileCtx = { ...ctx, refStyle: "curly" };
    const out: Record<string, PandaTokenGroup> = {};
    for (const [group, entries] of Object.entries(config.tokens)) {
        out[CATEGORY[group] ?? group] = groupToPanda(entries, tctx);
    }
    if (config.durations) out.durations = groupToPanda(config.durations, tctx);
    if (config.easings) out.easings = groupToPanda(config.easings, tctx);
    if (config.zIndices) out.zIndex = groupToPanda(config.zIndices, tctx);
    if (config.fonts) out.fonts = groupToPanda(config.fonts, tctx);
    return out;
};

/** `theme.semanticTokens`: each group keyed by its Panda category namespace. */
export const compileSemanticTokens = (
    ctx: CompileCtx,
): Record<string, PandaTokenGroup> => {
    const tctx: CompileCtx = { ...ctx, refStyle: "curly" };
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

// Replace every utilityArg in a template with the call-site value, so a dynamic utility's
// transform can compile a concrete style. Single-arg only (what Panda passes); object/array
// args pick a member by key.
const substituteArgs = (node: ValueNode, value: string): ValueNode => {
    if (node.type === "utilityArg") {
        return { type: "literal", value };
    }
    const clone = structuredClone(node) as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(clone)) {
        if (Array.isArray(v)) {
            clone[k] = v.map((item) =>
                isNode(item) ? substituteArgs(item, value) : item,
            );
        } else if (isNode(v)) {
            clone[k] = substituteArgs(v, value);
        }
    }
    return clone as unknown as ValueNode;
};

const isNode = (v: unknown): v is ValueNode =>
    typeof v === "object" &&
    v !== null &&
    typeof (v as ValueNode).type === "string";

const compileTemplate = (
    template: StyleMap,
    value: string,
    ctx: CompileCtx,
): Record<string, unknown> => {
    const substituted = Object.fromEntries(
        Object.entries(template as Record<string, unknown>).map(([k, v]) => [
            k,
            isNode(v) ? substituteArgs(v, value) : v,
        ]),
    ) as StyleMap;
    return compileStyleMap(substituted, ctx);
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
