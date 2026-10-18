import { stack } from "@pureform/core";
import {
    alias,
    fontFamily,
    hex,
    linearGradient,
    none,
    numeric,
    pct,
    px,
    rem,
    stop,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import { describe, expect, it } from "vitest";

import {
    GROUPS,
    colorRoles,
    fill,
    label,
    providers,
} from "./__fixtures__/theme";
import {
    ELEVATION_LEVELS,
    MATERIAL_STACKING,
    SHAPE_ROLES,
    STACKING_ROLES,
} from "./contracts/foundations";
import { BASE_TEXT_STYLES } from "./contracts/typography";
import {
    colorFromTokens,
    defineProvider,
    elevationFromTokens,
    extend,
    motionFromTokens,
    shapeFromTokens,
    stateFromTokens,
    typographyFromTokens,
} from "./provider";
import { colorRole, zIndex } from "./refs";
import { ContractError, resolveTheme } from "./resolve";

describe("resolveTheme", () => {
    it("lowers every contract to core config", () => {
        const { config } = resolveTheme(providers());
        expect(config.semanticTokens.colors?.onDangerContainer).toBeDefined();
        expect(config.tokens.radii?.extraLarge).toEqual(px(4));
        expect(config.tokens.spacing?.["4"]).toEqual(px(16));
        expect(config.tokens.sizes?.touchTarget).toEqual(px(40));
        expect(config.tokens.opacity?.stateDragged).toEqual(pct(10));
        expect(config.tokens.sizes?.focusIndicatorThickness).toEqual(px(3));
        expect(config.durations?.medium2).toEqual(numeric(200, "ms"));
        expect(config.easings?.emphasized).toBeDefined();
        expect(config.fonts?.brand).toEqual(fontFamily(["Fraunces"], "serif"));
    });

    it("lowers each text style value to a token the style reads", () => {
        const { config } = resolveTheme(providers());
        expect(config.tokens.fontSize?.labelLarge).toEqual(rem(0.875));
        expect(config.tokens.lineHeight?.labelLarge).toEqual(rem(1.25));
        expect(config.tokens.letterSpacing?.labelLarge).toEqual(rem(0));
        expect(config.tokens.fontWeight?.labelLarge).toEqual(unitless(500));
        expect(config.textStyles?.labelLarge).toEqual({
            fontFamily: alias("fonts", "plain"),
            fontSize: alias("tokens", "fontSize", "labelLarge"),
            lineHeight: alias("tokens", "lineHeight", "labelLarge"),
            letterSpacing: alias("tokens", "letterSpacing", "labelLarge"),
            fontWeight: alias("tokens", "fontWeight", "labelLarge"),
        });
    });

    it("lowers each elevation level to a shadow and a tint the utility reads", () => {
        const { config } = resolveTheme(providers());
        expect(config.semanticTokens.shadows?.level2).toEqual(none);
        expect(config.semanticTokens.colors?.elevationTintLevel2).toEqual(
            transparent,
        );
        const tint = stop(
            alias("semanticTokens", "colors", "elevationTintLevel2"),
        );
        expect(config.utilities?.shadowElevation).toEqual({
            kind: "static",
            property: "boxShadow",
            values: expect.objectContaining({
                level2: {
                    boxShadow: alias("semanticTokens", "shadows", "level2"),
                    backgroundImage: linearGradient([tint, tint]),
                },
            }),
        });
    });

    it("draws each elevation level as drop shadows for clipped shapes", () => {
        const { config } = resolveTheme(providers());
        expect(config.utilities?.filterElevation).toMatchObject({
            kind: "static",
            property: "filter",
            values: { level2: { filter: { type: "literal", value: "none" } } },
        });
    });

    it("returns the resolved contracts, including the color groups", () => {
        expect(resolveTheme(providers()).color.groups).toEqual([
            "primary",
            "danger",
        ]);
    });

    it("merges a provider's extras after the contracts", () => {
        const theme = resolveTheme({
            ...providers(),
            color: colorFromTokens({
                groups: GROUPS,
                roles: colorRoles,
                extra: {
                    semanticTokens: { colors: { brand: colorRole("primary") } },
                },
            }),
        });
        expect(theme.config.semanticTokens.colors?.brand).toEqual(
            colorRole("primary"),
        );
        expect(theme.config.semanticTokens.colors?.surface).toBeDefined();
    });

    it("gives later providers the earlier contracts", () => {
        const tinted = defineProvider({
            domain: "elevation",
            name: "tinted",
            generate: ({ color }) => ({
                levels: fill(ELEVATION_LEVELS, () => ({
                    shadow: none,
                    tint: colorRole(color.groups[0] ?? "primary"),
                })),
            }),
        });
        const theme = resolveTheme({ ...providers(), elevation: tinted });
        expect(theme.elevation.levels.level3.tint).toEqual(
            colorRole("primary"),
        );
    });

    it("keeps the contract through extend", () => {
        const outlined = extend(providers().color, (out) => ({
            ...out,
            roles: {
                ...out.roles,
                outline: when("dark", hex("#5c5c5c"), hex("#c4c4c4")),
            },
        }));
        const theme = resolveTheme({ ...providers(), color: outlined });
        expect(theme.color.roles.outline).toMatchObject({
            type: "conditional",
        });
        expect(outlined.name).toBe("tokens+");
    });

    it("names the provider and the missing role", () => {
        const { onDangerContainer: _, ...rest } = colorRoles;
        expect(() =>
            resolveTheme({
                ...providers(),
                color: colorFromTokens(
                    { groups: GROUPS, roles: rest as typeof colorRoles },
                    "brand",
                ),
            }),
        ).toThrow(
            new ContractError(
                'color provider "brand" is missing color role "onDangerContainer"',
            ),
        );
    });

    it("rejects a text style set in an undeclared font role", () => {
        const styles = fill(BASE_TEXT_STYLES, () => label);
        expect(() =>
            resolveTheme({
                ...providers(),
                typography: typographyFromTokens({
                    fonts: providers().typography.generate({} as never).fonts,
                    styles: {
                        ...styles,
                        code: { ...label, font: "mono" as "plain" },
                    },
                }),
            }),
        ).toThrow('sets text style "code" in undeclared font role "mono"');
    });

    it("names a value of the wrong kind", () => {
        const radii = fill(SHAPE_ROLES, () => px(4));
        expect(() =>
            resolveTheme({
                ...providers(),
                shape: shapeFromTokens({
                    radii: { ...radii, small: hex("#fff") as never },
                }),
            }),
        ).toThrow(
            'shape provider "tokens" gives radius "small" a color value, not a length in px, rem, em, or %',
        );
    });

    it("checks durations, opacities, and elevation shadows by kind", () => {
        const theme = providers();
        const bad = (patch: object, message: string) =>
            expect(() => resolveTheme({ ...theme, ...patch })).toThrow(message);
        bad(
            {
                state: stateFromTokens({
                    ...theme.state.generate({} as never),
                    opacities: {
                        ...theme.state.generate({} as never).opacities,
                        stateHover: px(8),
                    },
                }),
            },
            'gives opacity "stateHover" a numeric value, not a percentage',
        );
        bad(
            {
                motion: motionFromTokens({
                    ...theme.motion.generate({} as never),
                    durations: {
                        ...theme.motion.generate({} as never).durations,
                        short1: px(50),
                    },
                }),
            },
            'gives duration "short1" a numeric value, not a duration in ms or s',
        );
        bad(
            {
                elevation: elevationFromTokens({
                    levels: fill(ELEVATION_LEVELS, () => ({
                        shadow: hex("#000") as never,
                        tint: transparent,
                    })),
                }),
            },
            'gives level "level0" "shadow" a color value, not a shadow or none',
        );
    });

    it("rejects a provider passed for the wrong domain", () => {
        expect(() =>
            resolveTheme({
                ...providers(),
                shape: providers().state as never,
            }),
        ).toThrow("provides state, not shape");
    });

    it("stacks the layers in Material's order by default", () => {
        const { layout, config } = resolveTheme(providers());
        expect(Object.keys(layout.zIndices)).toEqual([...STACKING_ROLES]);
        expect(config.zIndices).toEqual(MATERIAL_STACKING);
        const order = STACKING_ROLES.map(
            (role) => (config.zIndices[role] as { value: number }).value,
        );
        expect(order).toEqual([...order].sort((a, b) => a - b));
        expect(new Set(order).size).toBe(order.length);
        expect(zIndex("menu")).toEqual(alias("zIndices", "menu"));
    });

    it("takes a layout's own stacking scale, and checks it", () => {
        const theme = providers();
        const layout = (zIndices: object) =>
            extend(theme.layout, (generated) => ({
                ...generated,
                zIndices: zIndices as never,
            }));
        const own = stack([...STACKING_ROLES, "debug"], { base: 10, step: 10 });
        const { config } = resolveTheme({ ...theme, layout: layout(own) });
        expect(config.zIndices.tooltip).toEqual(unitless(70));
        expect(config.zIndices.debug).toEqual(unitless(80));
        expect(() =>
            resolveTheme({
                ...theme,
                layout: layout({ ...own, menu: undefined }),
            }),
        ).toThrow('is missing stacking layer "menu"');
        expect(() =>
            resolveTheme({
                ...theme,
                layout: layout({ ...own, menu: px(4) }),
            }),
        ).toThrow(
            'gives stacking layer "menu" a numeric value, not a unitless whole number',
        );
    });
});

describe("contract types", () => {
    it("rejects missing or mistyped names at compile time", () => {
        colorFromTokens({
            groups: ["accent"],
            // @ts-expect-error: a color group without its container roles
            roles: { ...colorRoles, accent: hex("#fff") },
        });

        shapeFromTokens({
            // @ts-expect-error: a radius must be a length, not a color
            radii: { ...fill(SHAPE_ROLES, () => px(4)), small: hex("#fff") },
        });

        typographyFromTokens({
            fonts: { brand: fontFamily(["A"]), plain: fontFamily(["B"]) },
            styles: {
                ...fill(BASE_TEXT_STYLES, () => label),
                // @ts-expect-error: "mono" is not a declared font role
                code: { ...label, font: "mono" },
            },
        });

        const mono = typographyFromTokens({
            fonts: {
                brand: fontFamily(["A"]),
                plain: fontFamily(["B"]),
                mono: fontFamily(["C"], "monospace"),
            },
            styles: {
                ...fill(BASE_TEXT_STYLES, () => label),
                code: { ...label, font: "mono" },
            },
        });
        expect(mono.generate({} as never).styles.code.font).toBe("mono");
        expect(true).toBe(true);
    });
});
