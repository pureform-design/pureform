import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { button } from "./button";

const recipe = () => {
    const preset = compilePreset(configWith(button));
    const slotRecipes = preset.theme?.slotRecipes ?? {};
    const compiled = Object.values(slotRecipes)[0];
    if (!compiled) throw new Error("expected a button slot recipe");
    return compiled;
};

describe("button", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(button)).not.toThrow();
    });

    it("draws every group with one rule per fill, through its group tokens", () => {
        // Compounds pair sizes with corners and fills with the toggle, never a color group.
        for (const compound of button.recipe.compoundVariants ?? []) {
            expect(compound.match).not.toHaveProperty("color");
        }
        expect(button.recipe.variants?.color?.secondary?.root?.tokens).toEqual({
            "components.button.accent": {
                type: "alias",
                path: ["semanticTokens", "colors", "secondary"],
            },
            "components.button.onAccent": {
                type: "alias",
                path: ["semanticTokens", "colors", "onSecondary"],
            },
            "components.button.accentContainer": {
                type: "alias",
                path: ["semanticTokens", "colors", "secondaryContainer"],
            },
            "components.button.onAccentContainer": {
                type: "alias",
                path: ["semanticTokens", "colors", "onSecondaryContainer"],
            },
        });
        expect(button.recipe.variants?.color?.primary).toEqual({ root: {} });
    });

    it("tints a filled button with its on-color on hover, through its tokens", () => {
        const filled = button.recipe.variants?.variant?.filled?.root;
        expect(filled?.color).toEqual({
            type: "alias",
            path: ["components", "button", "onAccent"],
        });
        expect(filled?.backgroundColor).toMatchObject({
            type: "conditional",
            base: { type: "alias", path: ["components", "button", "accent"] },
        });
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(recipe()).toMatchSnapshot();
    });
});
