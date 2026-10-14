// CSS spelling primitives shared by the node and style compilers: the keyword table, name
// hyphenation, color formatting, var naming, and the alias-to-Panda-token mapping.

import type { ColorNode } from "@pureform/core/ast";

import type { VarPrefix } from "./options";

/** Canonical camelCase keyword to its web spelling. Only tokens whose CSS form differs from
 *  the token appear here; everything else (`center`, `flex`, `solid`, `transparent`, `start`,
 *  `end`) is valid CSS verbatim and passes through. Modern CSS box alignment accepts bare
 *  `start` / `end`, so those are left alone and stay correct for both flex and text-align. */
export const KEYWORD_CSS: Record<string, string> = {
    inlineFlex: "inline-flex",
    spaceBetween: "space-between",
    spaceAround: "space-around",
    spaceEvenly: "space-evenly",
    rowReverse: "row-reverse",
    columnReverse: "column-reverse",
    notAllowed: "not-allowed",
};

/** camelCase to kebab-case, for property names in `transition` and keyword easing names
 *  (`backgroundColor` becomes `background-color`, `easeInOut` becomes `ease-in-out`). */
export const hyphenate = (name: string): string =>
    name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const withAlpha = (body: string, alpha: number | undefined): string =>
    alpha != null && alpha !== 1 ? `${body} / ${alpha}` : body;

/** Render a color node to a CSS color in its own space, gamut-downgrading only where a target
 *  lacks the syntax. `hct` is Material's generation space with no CSS form; convert it upstream
 *  (for example `palette(seed, { space: "oklch" })`) or through a Material adapter before
 *  lowering. */
export const formatColor = (node: ColorNode): string => {
    const [a, b, c] = node.components;
    switch (node.space) {
        case "srgb":
            return `rgb(${withAlpha(`${a} ${b} ${c}`, node.alpha)})`;
        case "display-p3":
            return `color(${withAlpha(`display-p3 ${(a ?? 0) / 255} ${(b ?? 0) / 255} ${(c ?? 0) / 255}`, node.alpha)})`;
        case "hsl":
            return `hsl(${withAlpha(`${a} ${b}% ${c}%`, node.alpha)})`;
        case "oklch":
            return `oklch(${withAlpha(`${a} ${b} ${c}`, node.alpha)})`;
        case "lch":
            return `lch(${withAlpha(`${a} ${b} ${c}`, node.alpha)})`;
        case "oklab":
            return `oklab(${withAlpha(`${a} ${b} ${c}`, node.alpha)})`;
        case "lab":
            return `lab(${withAlpha(`${a} ${b} ${c}`, node.alpha)})`;
        case "hct":
            throw new Error(
                "hct has no CSS color syntax; generate colors in oklch (or convert via a Material adapter) before lowering",
            );
    }
};

const prefixFor = (
    tier: string,
    prefix: VarPrefix | undefined,
): string | undefined => {
    if (!prefix) return undefined;
    if (typeof prefix === "string") return prefix;
    return prefix[tier as "ui" | "components" | "global"];
};

/** CSS var name for a dynamic path, applying the per-tier prefix. The tier segment (`ui`,
 *  `components`, `global`) is always emitted; the prefix, when set, comes first. */
export const varName = (
    path: string[],
    prefix: VarPrefix | undefined,
): string => {
    const [tier, ...rest] = path;
    const p = prefixFor(tier ?? "", prefix);
    return `--${[p, tier, ...rest].filter(Boolean).join("-")}`;
};

/** Core token group to the Panda token category it lowers to. Groups not listed pass through
 *  unchanged (for example `colors`, `spacing`, `radii`, `sizes` are already Panda categories). */
const TOKEN_CATEGORY: Record<string, string> = {
    fontSize: "fontSizes",
    fontWeight: "fontWeights",
    lineHeight: "lineHeights",
    letterSpacing: "letterSpacings",
    borderWidth: "borderWidths",
};

/** Where an `alias` path lowers to in Panda. A `token` ref preserves dark-mode and conditions
 *  (never inlined); its `ref` is the bare `category.name` path, which the caller spells as
 *  `token(ref)` or `{ref}` depending on context. A `textStyle` alias becomes the bare style
 *  name the `textStyle` property takes; `resolve` means the compiler should follow the alias
 *  and inline the result (component-token aliases resolve to a dynamic var, as does any
 *  unmapped path). */
export type AliasTarget =
    | { kind: "token"; ref: string }
    | { kind: "textStyle"; name: string }
    | { kind: "resolve" };

/** Map an alias path to its Panda lowering. */
export const aliasTarget = (path: string[]): AliasTarget => {
    const [ns, ...rest] = path;
    switch (ns) {
        case "tokens": {
            const [group, ...name] = rest;
            const category = TOKEN_CATEGORY[group ?? ""] ?? group;
            return { kind: "token", ref: `${category}.${name.join(".")}` };
        }
        case "semanticTokens": {
            // Panda folds semantic tokens into their category namespace, so a semantic color
            // `brand` is referenced as `colors.brand`.
            const [group, ...name] = rest;
            return { kind: "token", ref: `${group}.${name.join(".")}` };
        }
        case "zIndices":
            return { kind: "token", ref: `zIndex.${rest.join(".")}` };
        case "durations":
            return { kind: "token", ref: `durations.${rest.join(".")}` };
        case "easings":
            return { kind: "token", ref: `easings.${rest.join(".")}` };
        case "fonts":
            return { kind: "token", ref: `fonts.${rest.join(".")}` };
        case "textStyles":
            return { kind: "textStyle", name: rest.join(".") };
        default:
            // Component-token aliases and anything unmapped: follow and inline.
            return { kind: "resolve" };
    }
};

/** The CSS var Panda emits for a token ref: `colors.primaryLight` is
 *  `--colors-primary-light`, after Panda's own prefix if one is set. */
export const tokenVarName = (ref: string, tokenPrefix?: string): string =>
    `--${[tokenPrefix, ...ref.split(".").map(hyphenate)].filter(Boolean).join("-")}`;

/** Spell a token ref for the given context: `token(ref)` in a style value, `{ref}` in a token
 *  definition, and `var(--ref)` at runtime. */
export const formatTokenRef = (
    ref: string,
    refStyle: "fn" | "curly" | "var",
    tokenPrefix?: string,
): string => {
    if (refStyle === "curly") return `{${ref}}`;
    if (refStyle === "var") return `var(${tokenVarName(ref, tokenPrefix)})`;
    return `token(${ref})`;
};
