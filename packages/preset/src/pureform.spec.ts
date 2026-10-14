import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

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
            pureform({ seed: "#006A60" }).tokens.colors?.primaryLight,
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
        customSeeds: { coral: "#FF7F50" },
        overrides: { surface: { light: "#FFFFFF" } },
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
