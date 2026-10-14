import { px } from "@pureform/core/ast";
import {
    materialColor,
    materialLayout,
    materialShape,
} from "@pureform/material";
import { compilePreset } from "@pureform/panda-adapter";
import { extend } from "@pureform/theme";
import { describe, expect, it } from "vitest";

import { scrim } from "./components/scrim";
import { pureform } from "./pureform";

describe("pureform", () => {
    it("includes every component", () => {
        expect(Object.keys(pureform().components)).toEqual([
            "button",
            "iconButton",
            "card",
            "scrim",
            "ripple",
        ]);
    });

    it("regenerates the palette from the seed", () => {
        expect(
            pureform({ color: materialColor({ seed: "#006A60" }) }).tokens
                .colors?.primaryLight,
        ).not.toEqual(pureform().tokens.colors?.primaryLight);
    });

    it("ships both schemes by default", () => {
        const preset = compilePreset(pureform());
        const colors = (preset.theme?.semanticTokens?.colors ?? {}) as Record<
            string,
            { value: unknown }
        >;
        expect(colors.primary?.value).toEqual({
            base: "{colors.primaryLight}",
            _dark: "{colors.primaryDark}",
        });
    });

    it("compiles to a Panda preset with every slot recipe", () => {
        const preset = compilePreset(pureform());
        expect(Object.keys(preset.theme?.slotRecipes ?? {})).toEqual([
            "button",
            "iconButton",
            "card",
            "scrim",
            "ripple",
        ]);
    });
});

describe("pureform color options", () => {
    const config = pureform({
        color: materialColor({
            customSeeds: { coral: "#FF7F50" },
            overrides: { surface: { light: "#FFFFFF" } },
        }),
    });

    it("gives the components a color variant for each custom group", () => {
        for (const name of ["button", "iconButton"]) {
            const spec = config.components[name];
            expect(
                spec && "recipe" in spec
                    ? Object.keys(spec.recipe.variants?.color ?? {})
                    : [],
                name,
            ).toContain("coral");
        }
    });

    it("compiles the custom group's compound colors", () => {
        const recipe = compilePreset(config).theme?.slotRecipes?.button;
        const compound = recipe?.compoundVariants?.find(
            (c) => c.color === "coral" && c.variant === "filled",
        );
        expect(compound?.css?.root).toMatchObject({
            color: "token(colors.onCoral)",
        });
    });

    it("passes overrides to the palette", () => {
        expect(config.tokens.colors?.surfaceLight).not.toEqual(
            pureform().tokens.colors?.surfaceLight,
        );
    });

    it("keeps the built-in groups when no custom seeds are given", () => {
        const spec = pureform().components.button;
        expect(
            spec && "recipe" in spec
                ? Object.keys(spec.recipe.variants?.color ?? {})
                : [],
        ).not.toContain("coral");
    });
});

describe("pureform providers", () => {
    it("replaces a domain with another provider", () => {
        const config = pureform({ shape: materialShape({ medium: 10 }) });
        expect(config.tokens.radii?.medium).toEqual(px(10));
    });

    it("takes a layout provider for spacing and sizes", () => {
        const config = pureform({
            layout: materialLayout({ grid: 8, sizes: { touchTarget: 56 } }),
        });
        expect(config.tokens.spacing?.["2"]).toEqual(px(16));
        expect(config.tokens.sizes?.touchTarget).toEqual(px(56));
    });

    it("takes an extended provider", () => {
        const config = pureform({
            shape: extend(materialShape(), (out) => ({
                ...out,
                radii: { ...out.radii, full: px(24) },
            })),
        });
        expect(config.tokens.radii?.full).toEqual(px(24));
    });

    it("lets the components function drop and add components", () => {
        const config = pureform({
            components: ({ defaults, theme }) => ({
                ...defaults,
                card: undefined,
                groups: { ...scrim, name: theme.color.groups.join() },
            }),
        });
        expect(Object.keys(config.components)).not.toContain("card");
        expect(config.components.groups).toBeDefined();
    });

    it("names the provider when a contract is not met", () => {
        const broken = extend(materialShape(), (out) => {
            const { medium: _, ...radii } = out.radii;
            return { radii: radii as typeof out.radii };
        });
        expect(() => pureform({ shape: broken })).toThrow(
            'shape provider "material+" is missing radius "medium"',
        );
    });
});
