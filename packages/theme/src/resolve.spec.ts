import {
    cubicBezier,
    fontFamily,
    hex,
    none,
    numeric,
    pct,
    px,
    rem,
    unitless,
    when,
} from "@pureform/core/ast";
import type { ColorValue } from "@pureform/core/ast";
import { describe, expect, it } from "vitest";

import { NEUTRAL_ROLES, groupRoles } from "./contracts/color";
import type { ColorContract } from "./contracts/color";
import {
    DURATION_ROLES,
    EASING_ROLES,
    ELEVATION_LEVELS,
    SHAPE_ROLES,
    STATE_ROLES,
} from "./contracts/foundations";
import { BASE_TEXT_STYLES } from "./contracts/typography";
import type { TextStyleNode } from "./contracts/typography";
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
import { colorRole } from "./refs";
import { ContractError, resolveTheme } from "./resolve";

const fill = <K extends string, V>(
    names: readonly K[],
    value: (name: K) => V,
) =>
    Object.fromEntries(names.map((name) => [name, value(name)])) as Record<
        K,
        V
    >;

const GROUPS = ["primary", "danger"] as const;

const colorRoles = fill(
    [...NEUTRAL_ROLES, ...GROUPS.flatMap(groupRoles)],
    (): ColorValue => hex("#808080"),
) as ColorContract<(typeof GROUPS)[number]>["roles"];

const label: TextStyleNode = {
    font: "plain",
    fontSize: rem(0.875),
    lineHeight: rem(1.25),
    letterSpacing: rem(0),
    fontWeight: unitless(500),
};

const providers = () => ({
    color: colorFromTokens({ groups: GROUPS, roles: colorRoles }),
    typography: typographyFromTokens({
        fonts: {
            brand: fontFamily(["Fraunces"], "serif"),
            plain: fontFamily(["Inter"], "sans-serif"),
        },
        styles: fill(BASE_TEXT_STYLES, () => label),
    }),
    shape: shapeFromTokens({ radii: fill(SHAPE_ROLES, () => px(4)) }),
    state: stateFromTokens({ opacities: fill(STATE_ROLES, () => pct(10)) }),
    motion: motionFromTokens({
        durations: fill(DURATION_ROLES, () => numeric(200, "ms")),
        easings: fill(EASING_ROLES, () => cubicBezier([0.2, 0, 0, 1])),
    }),
    elevation: elevationFromTokens({
        levels: fill(ELEVATION_LEVELS, () => ({ boxShadow: none })),
    }),
});

describe("resolveTheme", () => {
    it("lowers every contract to core config", () => {
        const { config } = resolveTheme(providers());
        expect(config.semanticTokens.colors?.onDangerContainer).toBeDefined();
        expect(config.tokens.radii?.extraLarge).toEqual(px(4));
        expect(config.tokens.opacity?.stateDragged).toEqual(pct(10));
        expect(config.durations?.medium2).toEqual(numeric(200, "ms"));
        expect(config.easings?.emphasized).toBeDefined();
        expect(config.fonts?.brand).toEqual(fontFamily(["Fraunces"], "serif"));
        expect(config.textStyles?.labelLarge).toEqual({
            fontFamily: { type: "alias", path: ["fonts", "plain"] },
            fontSize: rem(0.875),
            lineHeight: rem(1.25),
            letterSpacing: rem(0),
            fontWeight: unitless(500),
        });
        expect(config.utilities?.shadowElevation).toMatchObject({
            kind: "static",
            property: "boxShadow",
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
                    backgroundColor: colorRole(color.groups[0] ?? "primary"),
                })),
            }),
        });
        const theme = resolveTheme({ ...providers(), elevation: tinted });
        expect(theme.elevation.levels.level3).toEqual({
            backgroundColor: colorRole("primary"),
        });
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

    it("rejects a provider passed for the wrong domain", () => {
        expect(() =>
            resolveTheme({
                ...providers(),
                shape: providers().state as never,
            }),
        ).toThrow("provides state, not shape");
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
