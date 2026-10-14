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
import {
    DURATION_ROLES,
    EASING_ROLES,
    ELEVATION_LEVELS,
    SHAPE_ROLES,
    STATE_ROLES,
} from "./contracts/foundations";
import type { ElevationContract } from "./contracts/foundations";
import { BASE_FONT_ROLES, BASE_TEXT_STYLES } from "./contracts/typography";
import type { TextStyleNode, TypographyContract } from "./contracts/typography";
import type {
    ColorProvider,
    DomainContext,
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

/** Run every provider in domain order, check each contract, and lower them all to config. */
export const resolveTheme = <
    G extends string,
    TFont extends string,
    TStyle extends string,
>(
    providers: ThemeProviders<G, TFont, TStyle>,
): Theme<G, TFont, TStyle> => {
    const extras: (ThemeFragment | undefined)[] = [];

    const color = run(providers.color, "color", {});
    requireNames(color.where, "color role", color.contract.roles, [
        ...NEUTRAL_ROLES,
        ...color.contract.groups.flatMap(groupRoles),
    ]);
    extras.push(color.extra);

    const typography = run(providers.typography, "typography", {
        color: color.contract,
    });
    requireNames(
        typography.where,
        "font role",
        typography.contract.fonts,
        BASE_FONT_ROLES,
    );
    requireNames(
        typography.where,
        "text style",
        typography.contract.styles,
        BASE_TEXT_STYLES,
    );
    for (const [name, style] of Object.entries(typography.contract.styles)) {
        const { font } = style as { font: string };
        if (!(font in typography.contract.fonts)) {
            throw new ContractError(
                `${typography.where} sets text style "${name}" in undeclared font role "${font}"`,
            );
        }
    }
    extras.push(typography.extra);

    const shape = run(providers.shape, "shape", {
        color: color.contract,
        typography: typography.contract,
    });
    requireNames(shape.where, "radius", shape.contract.radii, SHAPE_ROLES);
    extras.push(shape.extra);

    const state = run(providers.state, "state", {
        color: color.contract,
        typography: typography.contract,
        shape: shape.contract,
    });
    requireNames(state.where, "opacity", state.contract.opacities, STATE_ROLES);
    extras.push(state.extra);

    const motion = run(providers.motion, "motion", {
        color: color.contract,
        typography: typography.contract,
        shape: shape.contract,
        state: state.contract,
    });
    requireNames(
        motion.where,
        "duration",
        motion.contract.durations,
        DURATION_ROLES,
    );
    requireNames(motion.where, "easing", motion.contract.easings, EASING_ROLES);
    extras.push(motion.extra);

    const elevation = run(providers.elevation, "elevation", {
        color: color.contract,
        typography: typography.contract,
        shape: shape.contract,
        state: state.contract,
        motion: motion.contract,
    });
    requireNames(
        elevation.where,
        "level",
        elevation.contract.levels,
        ELEVATION_LEVELS,
    );
    extras.push(elevation.extra);

    const lowered: Partial<CoreConfig> = {
        tokens: {
            colors: color.contract.primitives ?? {},
            radii: shape.contract.radii,
            opacity: state.contract.opacities,
        },
        semanticTokens: { colors: color.contract.roles },
        durations: motion.contract.durations,
        easings: motion.contract.easings,
    };

    const { components: _, ...config } = mergeConfigs(
        { tokens: {}, semanticTokens: {}, components: {} },
        lowered,
        typographyFragment(
            typography.contract as TypographyContract<string, string>,
        ),
        elevationFragment(elevation.contract),
        ...extras.filter((e): e is ThemeFragment => e !== undefined),
    );

    return {
        color: color.contract,
        typography: typography.contract,
        shape: shape.contract,
        state: state.contract,
        motion: motion.contract,
        elevation: elevation.contract,
        config,
    };
};
