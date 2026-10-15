// Resolve providers into contracts and lower the contracts to core config.
//
// The types catch a missing name at compile time. `resolveTheme` checks again at runtime, for
// plain JavaScript callers and casts, and names the provider and the missing name.

import { defineStaticUtility, mergeConfigs } from "@pureform/core";
import { alias, linearGradient, stop } from "@pureform/core/ast";
import type {
    NumericScalarNode,
    StyleMap,
    ValueNode,
} from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

import { NEUTRAL_ROLES, groupRoles } from "./contracts/color";
import type { ColorContract } from "./contracts/color";
import {
    DURATION_ROLES,
    EASING_ROLES,
    ELEVATION_LEVELS,
    SHAPE_ROLES,
    SIZE_ROLES,
    SPACING_STEPS,
    STATE_ROLES,
} from "./contracts/foundations";
import type { ElevationContract } from "./contracts/foundations";
import { BASE_FONT_ROLES, BASE_TEXT_STYLES } from "./contracts/typography";
import type { TextStyleNode, TypographyContract } from "./contracts/typography";
import { contrastFailures } from "./contrast";
import type {
    ColorProvider,
    Domain,
    DomainContext,
    LayoutProvider,
    Provider,
    ElevationProvider,
    MotionProvider,
    Provided,
    ResolvedTheme,
    ShapeProvider,
    StateProvider,
    ThemeFragment,
    TypographyProvider,
} from "./provider";
import { ELEVATION_UTILITY, PATHS, elevationTintName } from "./refs";

export interface ThemeProviders<
    G extends string,
    TFont extends string,
    TStyle extends string,
> {
    color: ColorProvider<G>;
    typography: TypographyProvider<TFont, TStyle>;
    shape: ShapeProvider;
    layout: LayoutProvider;
    state: StateProvider;
    motion: MotionProvider;
    elevation: ElevationProvider;
}

export interface Theme<
    G extends string,
    TFont extends string,
    TStyle extends string,
> extends ResolvedTheme<G, TFont, TStyle> {
    /** Every contract lowered to core config, with each provider's extras merged in. */
    config: ThemeFragment & Pick<CoreConfig, "tokens" | "semanticTokens">;
}

export class ContractError extends Error {
    override name = "ContractError";
}

const requireNames = (
    where: string,
    group: string,
    record: Record<string, unknown> | undefined,
    names: readonly string[],
) => {
    for (const name of names) {
        if (record?.[name] === undefined) {
            throw new ContractError(`${where} is missing ${group} "${name}"`);
        }
    }
};

type Kind = { label: string; test: (node: unknown) => boolean };

const nodeType = (node: unknown) => (node as { type?: string } | null)?.type;

const numericIn = (label: string, units: readonly string[]): Kind => ({
    label,
    test: (node) =>
        nodeType(node) === "numeric" &&
        units.includes((node as { unit: string }).unit),
});

const COLOR_TYPES = [
    "color",
    "colorMix",
    "keyword",
    "literal",
    "alias",
    "dynamic",
];

// The value kinds each contract slot accepts. The types enforce these at compile time; this
// repeats the check for plain JavaScript callers and casts.
const KINDS = {
    color: {
        label: "a color",
        test: (node: unknown): boolean =>
            COLOR_TYPES.includes(nodeType(node) ?? "") ||
            (nodeType(node) === "conditional" &&
                [
                    (node as { base: unknown }).base,
                    ...(node as { cases: { value: unknown }[] }).cases.map(
                        (c) => c.value,
                    ),
                ].every((v) => KINDS.color.test(v))),
    },
    length: numericIn("a length in px, rem, em, or %", [
        "px",
        "rem",
        "em",
        "%",
    ]),
    percent: numericIn("a percentage", ["%"]),
    duration: numericIn("a duration in ms or s", ["ms", "s"]),
    weight: numericIn("a unitless number", ["none"]),
    easing: {
        label: "an easing",
        test: (node: unknown) => nodeType(node) === "easing",
    },
    font: {
        label: "a font family",
        test: (node: unknown) => nodeType(node) === "fontFamily",
    },
    shadow: {
        label: "a shadow or none",
        test: (node: unknown) =>
            nodeType(node) === "shadow" || nodeType(node) === "keyword",
    },
} satisfies Record<string, Kind>;

const requireKind = (
    where: string,
    group: string,
    record: Record<string, unknown>,
    kind: Kind,
) => {
    for (const [name, value] of Object.entries(record)) {
        if (!kind.test(value)) {
            throw new ContractError(
                `${where} gives ${group} "${name}" a ${nodeType(value) ?? typeof value} value, not ${kind.label}`,
            );
        }
    }
};

const run = <D extends keyof DomainContext, T>(
    provider: {
        domain: D;
        name: string;
        generate: (ctx: DomainContext[D]) => Provided<T>;
    },
    domain: D,
    ctx: DomainContext[D],
): { contract: T; extra: ThemeFragment | undefined; where: string } => {
    const where = `${domain} provider "${provider.name}"`;
    if (provider.domain !== domain) {
        throw new ContractError(
            `${where} provides ${provider.domain}, not ${domain}`,
        );
    }
    const { extra, ...contract } = provider.generate(ctx);
    return { contract: contract as T, extra, where };
};

const TEXT_PROPERTIES = [
    "fontSize",
    "lineHeight",
    "letterSpacing",
    "fontWeight",
] as const;

// Each text style value becomes a token named after the style, and the style reads the
// tokens, so the whole scale is CSS vars.
const lowerTypography = (styles: Record<string, TextStyleNode<string>>) => {
    const tokens: Record<string, Record<string, NumericScalarNode>> = {};
    const textStyles: Record<string, StyleMap> = {};
    for (const [name, style] of Object.entries(styles)) {
        const map: StyleMap = { fontFamily: alias(...PATHS.font, style.font) };
        for (const property of TEXT_PROPERTIES) {
            (tokens[property] ??= {})[name] = style[property];
            map[property] = alias(...PATHS[property], name);
        }
        textStyles[name] = map;
    }
    return { tokens, textStyles };
};

// Each level's shadow and tint become semantic tokens, and the utility reads them, so every
// level is CSS vars and always sets both properties.
const lowerElevation = (levels: ElevationContract["levels"]) => {
    const shadows: Record<string, ValueNode> = {};
    const tints: Record<string, ValueNode> = {};
    const values: Record<string, StyleMap> = {};
    for (const [level, { shadow, tint }] of Object.entries(levels)) {
        shadows[level] = shadow;
        tints[elevationTintName(level)] = tint;
        const tintRef = alias(...PATHS.color, elevationTintName(level));
        values[level] = {
            boxShadow: alias(...PATHS.shadow, level),
            backgroundImage: linearGradient([stop(tintRef), stop(tintRef)]),
        };
    }
    return { shadows, tints, values };
};

/** Lower a typography contract to core config: a font token per role, a token per text style
 *  value, and text styles that read them. */
export const typographyFragment = (
    contract: TypographyContract<string, string>,
): Required<Pick<CoreConfig, "tokens" | "fonts" | "textStyles">> => {
    const { tokens, textStyles } = lowerTypography(
        contract.styles as Record<string, TextStyleNode<string>>,
    );
    return { tokens, fonts: contract.fonts, textStyles };
};

/** Lower an elevation contract to core config: a shadow and a tint token per level, and the
 *  `shadowElevation` utility that reads them. */
export const elevationFragment = (
    contract: ElevationContract,
): Required<Pick<CoreConfig, "semanticTokens" | "utilities">> => {
    const { shadows, tints, values } = lowerElevation(contract.levels);
    return {
        semanticTokens: { colors: tints, shadows },
        utilities: {
            [ELEVATION_UTILITY]: defineStaticUtility({
                property: "boxShadow",
                values,
            }),
        },
    };
};

export interface ResolveOptions {
    /** Require every color role to have a dark value: a `when("dark", …)` case, a keyword
     *  such as `transparent`, or an alias to a role that has one. Set it when the page offers
     *  both schemes, so a hand-authored palette cannot leave a role fixed. Default `false`. */
    requireDark?: boolean;
    /** Require every content role to reach this WCAG contrast ratio against the role it sits
     *  on (`onPrimary` on `primary`, `onSurface` on each surface, …) in light and dark. `4.5`
     *  is WCAG AA for body text. Pairs whose colors cannot be evaluated (mixes, dynamic
     *  values) are skipped. Default off. */
    requireContrast?: number;
}

// Whether a role looks right in the dark scheme: it has a dark case, is scheme-independent
// (a keyword), or aliases a role that does.
const hasDark = (
    roles: Record<string, unknown>,
    value: unknown,
    seen = new Set<unknown>(),
): boolean => {
    if (seen.has(value)) return false;
    seen.add(value);
    const node = value as {
        type?: string;
        path?: string[];
        cases?: { on: unknown }[];
    };
    if (node?.type === "keyword") return true;
    if (node?.type === "conditional") {
        return (node.cases ?? []).some((c) =>
            Array.isArray(c.on) ? c.on.includes("dark") : c.on === "dark",
        );
    }
    if (node?.type === "alias" && node.path?.[0] === "semanticTokens") {
        const target = roles[node.path.at(-1) ?? ""];
        return target !== undefined && hasDark(roles, target, seen);
    }
    return false;
};

/** Run every provider in domain order, check each contract, and lower them all to config. */
export const resolveTheme = <
    G extends string,
    TFont extends string,
    TStyle extends string,
>(
    providers: ThemeProviders<G, TFont, TStyle>,
    options: ResolveOptions = {},
): Theme<G, TFont, TStyle> => {
    const extras: (ThemeFragment | undefined)[] = [];
    const resolved: Partial<ResolvedTheme> = {};

    // Run one domain's provider with every contract resolved before it, check the result,
    // and record it for the domains after.
    const step = <D extends Domain, T>(
        domain: D,
        provider: Provider<D, T>,
        check: (contract: T, where: string) => void,
    ): T => {
        const result = run(provider, domain, {
            ...resolved,
        } as DomainContext[D]);
        check(result.contract, result.where);
        extras.push(result.extra);
        (resolved as Record<string, unknown>)[domain] = result.contract;
        return result.contract;
    };

    const color = step("color", providers.color, (c, where) => {
        requireNames(where, "color role", c.roles, [
            ...NEUTRAL_ROLES,
            ...c.groups.flatMap(groupRoles),
        ]);
        requireKind(where, "color role", c.roles, KINDS.color);
        requireKind(where, "primitive color", c.primitives ?? {}, KINDS.color);
        if (options.requireContrast !== undefined) {
            const failures = contrastFailures(
                c as ColorContract<string>,
                options.requireContrast,
            );
            if (failures.length > 0) {
                const list = failures
                    .map(
                        (f) =>
                            `${f.content} on ${f.background} (${f.scheme}) is ${f.ratio.toFixed(2)}:1`,
                    )
                    .join(", ");
                throw new ContractError(
                    `${where} falls below ${options.requireContrast}:1 contrast: ${list}`,
                );
            }
        }
        if (options.requireDark) {
            for (const [role, value] of Object.entries(c.roles)) {
                if (!hasDark(c.roles, value)) {
                    throw new ContractError(
                        `${where} gives color role "${role}" no dark value`,
                    );
                }
            }
        }
    });
    const typography = step("typography", providers.typography, (t, where) => {
        requireNames(where, "font role", t.fonts, BASE_FONT_ROLES);
        requireNames(where, "text style", t.styles, BASE_TEXT_STYLES);
        requireKind(where, "font role", t.fonts, KINDS.font);
        for (const [name, style] of Object.entries(t.styles)) {
            const { font, ...values } = style as TextStyleNode<string>;
            const { fontWeight, ...lengths } = values;
            requireKind(
                where,
                `text style "${name}" value`,
                lengths,
                KINDS.length,
            );
            requireKind(
                where,
                `text style "${name}" value`,
                { fontWeight },
                KINDS.weight,
            );
            if (!(font in t.fonts)) {
                throw new ContractError(
                    `${where} sets text style "${name}" in undeclared font role "${font}"`,
                );
            }
        }
    });
    const shape = step("shape", providers.shape, (c, where) => {
        requireNames(where, "radius", c.radii, SHAPE_ROLES);
        requireKind(where, "radius", c.radii, KINDS.length);
    });
    const layout = step("layout", providers.layout, (c, where) => {
        requireNames(where, "spacing step", c.spacing, SPACING_STEPS);
        requireNames(where, "size", c.sizes, SIZE_ROLES);
        requireKind(where, "spacing step", c.spacing, KINDS.length);
        requireKind(where, "size", c.sizes, KINDS.length);
    });
    const state = step("state", providers.state, (c, where) => {
        requireNames(where, "opacity", c.opacities, STATE_ROLES);
        requireKind(where, "opacity", c.opacities, KINDS.percent);
    });
    const motion = step("motion", providers.motion, (c, where) => {
        requireNames(where, "duration", c.durations, DURATION_ROLES);
        requireNames(where, "easing", c.easings, EASING_ROLES);
        requireKind(where, "duration", c.durations, KINDS.duration);
        requireKind(where, "easing", c.easings, KINDS.easing);
    });
    const elevation = step("elevation", providers.elevation, (c, where) => {
        requireNames(where, "level", c.levels, ELEVATION_LEVELS);
        for (const [level, { shadow, tint }] of Object.entries(c.levels)) {
            requireKind(where, `level "${level}"`, { shadow }, KINDS.shadow);
            requireKind(where, `level "${level}"`, { tint }, KINDS.color);
        }
    });

    const lowered: Partial<CoreConfig> = {
        tokens: {
            colors: color.primitives ?? {},
            radii: shape.radii,
            spacing: layout.spacing,
            sizes: layout.sizes,
            opacity: state.opacities,
        },
        semanticTokens: { colors: color.roles },
        durations: motion.durations,
        easings: motion.easings,
    };

    const { components: _, ...config } = mergeConfigs(
        { tokens: {}, semanticTokens: {}, components: {} },
        lowered,
        typographyFragment(typography as TypographyContract<string, string>),
        elevationFragment(elevation),
        ...extras.filter((e): e is ThemeFragment => e !== undefined),
    );

    return {
        color,
        typography,
        shape,
        layout,
        state,
        motion,
        elevation,
        config,
    };
};
