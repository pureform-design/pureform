import { colorMix, none, pct, px, rem, transparent } from "@pureform/core/ast";
import { describe, expect, it } from "vitest";

import {
    flatElevation,
    gridLayout,
    modularScale,
    roundedShape,
    tonalElevation,
} from ".";
import { providers } from "../__fixtures__/theme";
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
