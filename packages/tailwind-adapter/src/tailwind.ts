// A pureform config as Tailwind v4's pieces: theme variables in Tailwind's namespaces, custom
// variants for the color schemes, reduced motion, and named themes, and the CSS adapter's
// stylesheet inside Tailwind's components layer, so utilities override components.
//
// The theme is `@theme inline`: each Tailwind variable names the pureform var it stands for, and
// utilities read that var directly. Dark and named themes then switch utilities and components
// alike, through the CSS adapter's own token rules.

import { tokenValue } from "@pureform/core";
import type { ValueNode } from "@pureform/core/ast";
import type { CoreConfig, Token } from "@pureform/core/types";
import { compileCss } from "@pureform/css-adapter";
import type { CssOptions } from "@pureform/css-adapter";
import {
    REDUCED_MOTION_RULES,
    compileNodeToCSS,
    hyphenate,
    usesColorScheme,
    varTokenRef,
} from "@pureform/css-lowering";
import type { LowerCtx } from "@pureform/css-lowering";

export interface TailwindOptions extends Omit<CssOptions, "layer"> {
    /** The layer the stylesheet sits in, inside `components`. Default `pureform`. */
    layer?: string;
    /** Also map the raw color palette, not only the semantic colors. Default `false`. */
    palette?: boolean;
    /** Clear Tailwind's defaults in each namespace pureform fills, so only pureform's values
     *  generate utilities. Default `false`. */
    replace?: boolean;
    /** The variant name for a named theme. Default `theme-<name>`. */
    themeVariant?: (name: string) => string;
}

/** A custom variant: its name and the rules it wraps around `@slot`. */
export interface TailwindVariant {
    name: string;
    /** Each entry is a path of selectors and at-rules from the element to the slot. */
    paths: string[][];
}

/** The config as Tailwind's pieces. */
export interface TailwindParts {
    /** `@theme inline` variables, by Tailwind name. */
    theme: Record<string, string>;
    /** Variables pureform already defines under Tailwind's own name (spacing). Referencing
     *  them would be a cycle, so they go in a plain `@theme` with the token's value, and
     *  pureform's rule in the higher components layer still decides it at runtime. */
    shared: Record<string, string>;
    /** The namespaces to clear before the theme, when replacing Tailwind's defaults. */
    clear: string[];
    variants: TailwindVariant[];
    /** The components layer's contents. */
    components: string;
}

type Entries = Record<string, Token<ValueNode>> | undefined;

/** Ref groups from the config, in Tailwind's namespace for them. */
const NAMESPACES: [
    namespace: string,
    tiers: (config: CoreConfig, palette: boolean) => [string, Entries][],
][] = [
    [
        "color",
        (config, palette) => {
            const semantic = config.semanticTokens?.colors;
            const raw = config.tokens?.colors;
            if (!semantic) return [["colors", raw]];
            return palette
                ? [
                      ["colors", raw],
                      ["colors", semantic],
                  ]
                : [["colors", semantic]];
        },
    ],
    [
        "radius",
        (config) => [
            ["radii", config.tokens?.radii],
            ["radii", config.semanticTokens?.radii],
        ],
    ],
    [
        "spacing",
        (config) => [
            ["spacing", config.tokens?.spacing],
            ["spacing", config.semanticTokens?.spacing],
        ],
    ],
    [
        "shadow",
        (config) => [
            ["shadows", config.tokens?.shadows],
            ["shadows", config.semanticTokens?.shadows],
        ],
    ],
    ["font", (config) => [["fonts", config.fonts]]],
    ["ease", (config) => [["easings", config.easings]]],
];

// Text style properties Tailwind reads alongside `--text-<name>`.
const TEXT_PROPERTIES: Record<string, string> = {
    lineHeight: "line-height",
    letterSpacing: "letter-spacing",
    fontWeight: "font-weight",
};

const textTheme = (
    config: CoreConfig,
    ctx: LowerCtx,
): Record<string, string> => {
    const theme: Record<string, string> = {};
    for (const [name, style] of Object.entries(config.textStyles ?? {})) {
        const values = style as Record<string, ValueNode | undefined>;
        if (!values.fontSize) continue;
        const key = `--text-${hyphenate(name)}`;
        theme[key] = compileNodeToCSS(values.fontSize, ctx);
        for (const [property, suffix] of Object.entries(TEXT_PROPERTIES)) {
            const value = values[property];
            if (value)
                theme[`${key}--${suffix}`] = compileNodeToCSS(value, ctx);
        }
    }
    return theme;
};

const ELEMENT = (selector: string) => `&:where(${selector}, ${selector} *)`;

const schemeVariants = (config: CoreConfig): TailwindVariant[] =>
    usesColorScheme(config)
        ? (["dark", "light"] as const).map((scheme) => {
              const other = scheme === "dark" ? "light" : "dark";
              return {
                  name: scheme,
                  paths: [
                      [ELEMENT(`.${scheme}`)],
                      [
                          `@media (prefers-color-scheme: ${scheme})`,
                          ELEMENT(`:root:not(.${other})`),
                      ],
                  ],
              };
          })
        : [];

// Tailwind's own `motion-reduce` reads only the system preference; pureform's follows a
// provider's `data-pf-motion` too, as the components do.
const MOTION_VARIANT: TailwindVariant = {
    name: "motion-reduce",
    paths: REDUCED_MOTION_RULES.map((path) => [...path]),
};

/** Turn a config into Tailwind's pieces. */
export const toTailwind = (
    config: CoreConfig,
    options: TailwindOptions = {},
): TailwindParts => {
    const ctx: LowerCtx = {
        config,
        prefix: options.prefix,
        target: options.target ?? "css",
        tokenRef: varTokenRef(options.tokenPrefix),
    };
    const theme: Record<string, string> = {};
    const shared: Record<string, string> = {};
    const clear = new Set<string>();
    for (const [namespace, tiers] of NAMESPACES) {
        for (const [category, entries] of tiers(
            config,
            options.palette ?? false,
        )) {
            for (const [name, entry] of Object.entries(entries ?? {})) {
                const key = `--${namespace}-${hyphenate(name)}`;
                const ref = ctx.tokenRef(`${category}.${name}`);
                if (ref === `var(${key})`) {
                    const node = tokenValue(entry) as ValueNode;
                    if (node.type === "conditional") continue;
                    shared[key] = compileNodeToCSS(node, ctx);
                } else {
                    theme[key] = ref;
                }
                clear.add(namespace);
            }
        }
    }
    const text = textTheme(config, ctx);
    Object.assign(theme, text);
    if (Object.keys(text).length > 0) clear.add("text");
    // Media queries can't read vars, so breakpoints are their values.
    for (const [name, size] of Object.entries(config.breakpoints ?? {})) {
        theme[`--breakpoint-${hyphenate(name)}`] = compileNodeToCSS(size, ctx);
        clear.add("breakpoint");
    }
    const attribute = options.themeAttribute ?? "data-theme";
    const themeVariant = options.themeVariant ?? ((name) => `theme-${name}`);
    return {
        theme,
        shared,
        clear: options.replace ? [...clear] : [],
        variants: [
            ...schemeVariants(config),
            MOTION_VARIANT,
            ...Object.keys(config.themes ?? {}).map((name) => ({
                name: themeVariant(name),
                paths: [[ELEMENT(`[${attribute}="${name}"]`)]],
            })),
        ],
        components: compileCss(config, {
            ...options,
            layer: options.layer ?? "pureform",
        }),
    };
};

const INDENT = "    ";

const indent = (text: string): string =>
    text
        .trimEnd()
        .split("\n")
        .map((line) => (line ? `${INDENT}${line}` : line))
        .join("\n");

const variantRule = ({ name, paths }: TailwindVariant): string => {
    const nest = (path: string[]): string =>
        path.reduceRight(
            (inner, selector) => `${selector} {\n${indent(inner)}\n}`,
            "@slot;",
        );
    return paths.length === 1 && paths[0]!.length === 1
        ? `@custom-variant ${name} (${paths[0]![0]});`
        : `@custom-variant ${name} {\n${paths.map((path) => indent(nest(path))).join("\n")}\n}`;
};

/** Write Tailwind's pieces as one stylesheet, imported after `tailwindcss`. */
export const tailwindCss = (parts: TailwindParts): string => {
    const theme = [
        ...parts.clear.map((namespace) => `--${namespace}-*: initial;`),
        ...Object.entries(parts.theme).map(
            ([name, value]) => `${name}: ${value};`,
        ),
    ];
    const shared = Object.entries(parts.shared).map(
        ([name, value]) => `${name}: ${value};`,
    );
    return `${[
        ...(shared.length > 0
            ? [`@theme {\n${indent(shared.join("\n"))}\n}`]
            : []),
        ...(theme.length > 0
            ? [`@theme inline {\n${indent(theme.join("\n"))}\n}`]
            : []),
        ...parts.variants.map(variantRule),
        `@layer components {\n${indent(parts.components)}\n}`,
    ].join("\n\n")}\n`;
};

/** Compile a config straight to a Tailwind stylesheet. */
export const compileTailwind = (
    config: CoreConfig,
    options: TailwindOptions = {},
): string => tailwindCss(toTailwind(config, options));
