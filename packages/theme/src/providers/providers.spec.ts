import {
    alias,
    colorMix,
    none,
    oklch,
    pct,
    px,
    rem,
    transparent,
    when,
} from "@pureform/core/ast";
import { describe, expect, it } from "vitest";

import {
    flatElevation,
    gridLayout,
    modularScale,
    oklchPalette,
    roundedShape,
    tonalElevation,
} from ".";
import { providers } from "../__fixtures__/theme";
import { colorFromTokens } from "../provider";
import { colorRole } from "../refs";
import { resolveTheme } from "../resolve";

describe("tonalElevation", () => {
    it("tints each level with the first color group by default", () => {
        const theme = resolveTheme({
            ...providers(),
            elevation: tonalElevation(),
        });
        expect(theme.elevation.levels.level3).toEqual({
            shadow: none,
            tint: colorMix(transparent, colorRole("primary"), pct(11)),
        });
    });

    it("tints with the chosen group", () => {
        const theme = resolveTheme({
            ...providers(),
            elevation: tonalElevation({ group: "danger" }),
        });
        expect(theme.elevation.levels.level1.tint).toEqual(
            colorMix(transparent, colorRole("danger"), pct(5)),
        );
    });
});

describe("flatElevation", () => {
    it("draws nothing at any level", () => {
        const theme = resolveTheme({
            ...providers(),
            elevation: flatElevation(),
        });
        expect(Object.values(theme.elevation.levels)).toHaveLength(6);
        expect(theme.elevation.levels.level5).toEqual({
            shadow: none,
            tint: transparent,
        });
    });
});

describe("modularScale", () => {
    it("sizes styles from the base and ratio, close to Material's table", () => {
        const { typography } = resolveTheme({
            ...providers(),
            typography: modularScale(),
        });
        expect(typography.styles.bodyLarge.fontSize).toEqual(rem(1));
        expect(typography.styles.displayLarge.fontSize).toEqual(rem(3.583));
        expect(typography.styles.bodyLarge.lineHeight).toEqual(rem(1.5));
        expect(typography.styles.titleLarge.font).toBe("brand");
        expect(typography.styles.labelLarge.font).toBe("plain");
    });

    it("takes added font roles", () => {
        const scale = modularScale({
            ratio: 1.25,
            fonts: { mono: { type: "fontFamily", stack: ["Fira Code"] } },
        });
        const { config } = resolveTheme({ ...providers(), typography: scale });
        expect(config.fonts?.mono).toEqual({
            type: "fontFamily",
            stack: ["Fira Code"],
        });
        expect(config.fonts?.brand).toMatchObject({ stack: ["system-ui"] });
    });
});

describe("roundedShape", () => {
    it("matches Material's scale at a 4px base", () => {
        const { shape } = resolveTheme({
            ...providers(),
            shape: roundedShape(),
        });
        expect(shape.radii.medium).toEqual(px(12));
        expect(shape.radii.extraLarge).toEqual(px(28));
    });

    it("scales every radius but full from the base", () => {
        const { shape } = resolveTheme({
            ...providers(),
            shape: roundedShape({ base: 2 }),
        });
        expect(shape.radii.small).toEqual(px(4));
        expect(shape.radii.full).toEqual(px(9999));
    });
});

describe("gridLayout", () => {
    it("spaces on the grid and takes the sizes", () => {
        const sizes = {
            iconSmall: 16,
            iconMedium: 20,
            controlSmall: 28,
            controlMedium: 36,
            controlLarge: 44,
            touchTarget: 44,
        };
        const { layout, config } = resolveTheme({
            ...providers(),
            layout: gridLayout({ grid: 8, sizes }),
        });
        expect(layout.spacing["4"]).toEqual(px(32));
        expect(config.tokens.sizes?.touchTarget).toEqual(px(44));
        expect(config.tokens.spacing?.["16"]).toEqual(px(128));
    });
});

describe("oklchPalette", () => {
    const palette = oklchPalette({
        groups: { brand: { hue: 250 }, danger: { hue: 25, chroma: 0.2 } },
    });

    it("fills the color contract from hues", () => {
        const { color } = resolveTheme(
            { ...providers(), color: palette },
            { requireDark: true },
        );
        expect(color.groups).toEqual(["brand", "danger"]);
        expect(color.primitives?.dangerLight).toEqual(oklch(0.5, 0.2, 25));
        expect(color.primitives?.onDangerContainerDark).toEqual(
            oklch(0.92, 0.12, 25),
        );
        expect(color.roles.surface).toEqual(
            when(
                "dark",
                alias("tokens", "colors", "surfaceDark"),
                alias("tokens", "colors", "surfaceLight"),
            ),
        );
    });

    it("takes changed neutral tones", () => {
        const theme = resolveTheme({
            ...providers(),
            color: oklchPalette({
                groups: { primary: { hue: 140 } },
                tones: { surface: { light: 1 } },
            }),
        });
        expect(theme.color.primitives?.surfaceLight).toMatchObject({
            components: [1, 0.006, 270],
        });
    });
});

describe("requireDark", () => {
    it("rejects a role with no dark value", () => {
        expect(() => resolveTheme(providers(), { requireDark: true })).toThrow(
            'color provider "tokens" gives color role',
        );
    });

    it("accepts keywords and aliases to roles with dark values", () => {
        const base = resolveTheme({
            ...providers(),
            color: oklchPalette({ groups: { primary: { hue: 1 } } }),
        }).color;
        const withAlias = colorFromTokens({
            groups: base.groups,
            roles: {
                ...base.roles,
                brand: colorRole("primary"),
                clear: transparent,
            },
            primitives: base.primitives ?? {},
        });
        expect(() =>
            resolveTheme(
                { ...providers(), color: withAlias },
                { requireDark: true },
            ),
        ).not.toThrow();
    });
});
