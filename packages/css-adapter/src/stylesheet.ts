// Compile a pureform config to one stylesheet: token vars on the root, named themes under their
// attribute, keyframes, and each component's classes, in cascade layers that give recipes the
// same precedence as in Panda: base, then variants, then compound variants.

import { tokenValue, validateConfig } from "@pureform/core";
import type { StyleMap, ValueNode } from "@pureform/core/ast";
import type {
    AnyComponentSpec,
    CoreConfig,
    ThemeOverride,
    Token,
} from "@pureform/core/types";
import {
    aliasTarget,
    compileConditional,
    compileNodeToCSS,
    compileStyleMap,
    componentTokenVars,
    slotAncestors,
    tokenVarName,
    usesColorScheme,
} from "@pureform/css-lowering";
import type { LowerCtx } from "@pureform/css-lowering";

import { inlineStyles } from "./inline";
import { className, cssContext } from "./options";
import type { CssOptions } from "./options";
import { ROOT_SCHEMES, addStyle, block, printRule } from "./serialize";
import type { Block, SchemeRules } from "./serialize";

type Tiers = Record<string, Record<string, Token<ValueNode>>>;

// Every token as its var: the token tiers by category and name, and the single-level tiers.
const tokenVars = (
    parts: {
        tokens?: Tiers;
        semanticTokens?: Tiers;
        fonts?: Record<string, Token<ValueNode>>;
        durations?: Record<string, Token<ValueNode>>;
        easings?: Record<string, Token<ValueNode>>;
        zIndices?: Record<string, Token<ValueNode>>;
    },
    ctx: LowerCtx,
    tokenPrefix: string | undefined,
): Record<string, unknown> => {
    const vars: Record<string, unknown> = {};
    const add = (path: string[], entry: Token<ValueNode>) => {
        const target = aliasTarget(path);
        if (target.kind !== "token") return;
        const node = tokenValue(entry) as ValueNode;
        vars[tokenVarName(target.ref, tokenPrefix)] =
            node.type === "conditional"
                ? compileConditional(node, ctx)
                : compileNodeToCSS(node, ctx);
    };
    for (const ns of ["tokens", "semanticTokens"] as const) {
        for (const [group, entries] of Object.entries(parts[ns] ?? {})) {
            for (const [name, entry] of Object.entries(entries)) {
                add([ns, group, name], entry);
            }
        }
    }
    for (const tier of ["fonts", "durations", "easings", "zIndices"] as const) {
        for (const [name, entry] of Object.entries(parts[tier] ?? {})) {
            add([tier, name], entry);
        }
    }
    return vars;
};

const rule = (
    selector: string,
    style: Record<string, unknown>,
    schemes?: SchemeRules,
): string[] => printRule(selector, addStyle(block(), style, schemes));

const themeRules = (
    name: string,
    override: ThemeOverride,
    ctx: LowerCtx,
    options: CssOptions,
): string[] =>
    rule(`[${options.themeAttribute ?? "data-theme"}="${name}"]`, {
        ...tokenVars(override, ctx, options.tokenPrefix),
        ...componentTokenVars(override, ctx),
    });

const keyframes = (config: CoreConfig, ctx: LowerCtx): string[] =>
    Object.entries(config.keyframes ?? {}).flatMap(([name, stops]) => {
        const body = block();
        for (const [stop, style] of Object.entries(stops)) {
            body.rules.set(
                stop,
                addStyle(
                    block(),
                    compileStyleMap(inlineStyles(style, config), ctx),
                ),
            );
        }
        return printRule(`@keyframes ${name}`, body);
    });

const tokenRules = (config: CoreConfig, ctx: LowerCtx, options: CssOptions) => [
    ...rule(
        ":root",
        {
            ...(usesColorScheme(config) ? { colorScheme: "light dark" } : {}),
            ...tokenVars(config, ctx, options.tokenPrefix),
            ...(usesColorScheme(config)
                ? {
                      "&.light": { colorScheme: "light" },
                      "&.dark": { colorScheme: "dark" },
                  }
                : {}),
        },
        ROOT_SCHEMES,
    ),
    ...Object.entries(config.themes ?? {}).flatMap(([name, override]) =>
        themeRules(name, override, ctx, options),
    ),
    ...keyframes(config, ctx),
];

/** The layers a component's styles go in. */
interface RecipeLayers {
    base: Block;
    variants: Block;
    compounds: Block;
}

const variantClass = (base: string, group: string, value: string) =>
    `${base}--${group}_${value}`;

// One part of a component (the component itself, or a slot) with its class: its base, a class
// per variant value, and a chained class per compound variant.
const addPart = (
    layers: RecipeLayers,
    base: string,
    styles: {
        base: StyleMap | undefined;
        variants: [group: string, value: string, style: StyleMap][];
        compounds: [match: Record<string, string>, style: StyleMap][];
    },
    config: CoreConfig,
    ctx: LowerCtx,
) => {
    const lower = (style: StyleMap) =>
        compileStyleMap(inlineStyles(style, config), ctx);
    const add = (target: Block, selector: string, style: StyleMap) => {
        const at = target.rules.get(selector) ?? block();
        target.rules.set(selector, addStyle(at, lower(style)));
    };
    if (styles.base) add(layers.base, `.${base}`, styles.base);
    for (const [group, value, style] of styles.variants) {
        add(layers.variants, `.${variantClass(base, group, value)}`, style);
    }
    for (const [match, style] of styles.compounds) {
        const selector = Object.entries(match)
            .map(([group, value]) => `.${variantClass(base, group, value)}`)
            .join("");
        add(layers.compounds, selector, style);
    }
};

const addComponent = (
    layers: RecipeLayers,
    spec: AnyComponentSpec,
    ctx: LowerCtx,
    options: CssOptions,
) => {
    const { config } = ctx;
    const name = className(spec.name, options);
    const shared = config.componentBaseStyles;
    if (spec.kind !== "slotComponent") {
        const { recipe } = spec;
        addPart(
            layers,
            name,
            {
                base: { ...shared, ...recipe.base },
                variants: Object.entries(recipe.variants ?? {}).flatMap(
                    ([group, values]) =>
                        Object.entries(values).map(
                            ([value, style]) =>
                                [group, value, style] as [
                                    string,
                                    string,
                                    StyleMap,
                                ],
                        ),
                ),
                compounds: (recipe.compoundVariants ?? []).map((compound) => [
                    compound.match,
                    compound.style,
                ]),
            },
            config,
            ctx,
        );
        return;
    }
    const { recipe } = spec;
    const ancestors = slotAncestors(spec.structure ?? {});
    // Shared base styles land on the root slot, or the first slot if there is no `root`.
    const rootSlot = spec.slots.includes("root") ? "root" : spec.slots[0];
    for (const slot of spec.slots) {
        const slotCtx: LowerCtx = {
            ...ctx,
            slot: {
                className: spec.name,
                name: slot,
                ancestors: ancestors.get(slot) ?? [],
            },
            slotAncestors: ancestors,
        };
        const own = recipe.base[slot];
        addPart(
            layers,
            `${name}__${slot}`,
            {
                base: slot === rootSlot && shared ? { ...shared, ...own } : own,
                variants: Object.entries(recipe.variants ?? {}).flatMap(
                    ([group, values]) =>
                        Object.entries(values).flatMap(([value, bySlot]) =>
                            bySlot[slot]
                                ? [
                                      [group, value, bySlot[slot]] as [
                                          string,
                                          string,
                                          StyleMap,
                                      ],
                                  ]
                                : [],
                        ),
                ),
                compounds: (recipe.compoundVariants ?? []).flatMap(
                    (compound) =>
                        compound.style[slot]
                            ? [
                                  [compound.match, compound.style[slot]] as [
                                      Record<string, string>,
                                      StyleMap,
                                  ],
                              ]
                            : [],
                ),
            },
            config,
            slotCtx,
        );
    }
};

const recipeRules = (ctx: LowerCtx, options: CssOptions): string[] => {
    const layers: RecipeLayers = {
        base: block(),
        variants: block(),
        compounds: block(),
    };
    for (const spec of Object.values(ctx.config.components)) {
        addComponent(layers, spec, ctx, options);
    }
    return [
        "@layer base, variants, compounds;",
        ...printRule("@layer base", layers.base),
        ...printRule("@layer variants", layers.variants),
        ...printRule("@layer compounds", layers.compounds),
    ];
};

const inLayer = (name: string | false, lines: string[]): string[] =>
    name === false || lines.length === 0
        ? lines
        : [`@layer ${name} {`, ...lines.map((line) => `    ${line}`), "}"];

/** Compile a `CoreConfig` to a stylesheet. Validation runs first, so a bad config fails
 *  before any output. */
export const compileCss = (
    config: CoreConfig,
    options: CssOptions = {},
): string => {
    validateConfig(config);
    const ctx = cssContext(config, options);
    const layer = options.layer ?? "pureform";
    const sub = (name: string) =>
        layer === false ? false : `${layer}.${name}`;
    const lines = [
        ...(layer === false
            ? []
            : [
                  `@layer ${layer}.reset, ${layer}.tokens, ${layer}.recipes;`,
                  "",
              ]),
        ...inLayer(sub("tokens"), tokenRules(config, ctx, options)),
        "",
        ...inLayer(sub("recipes"), recipeRules(ctx, options)),
    ];
    return `${lines.join("\n")}\n`;
};
