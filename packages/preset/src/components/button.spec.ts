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

describe("button corners", () => {
    it("rounds fully at half its height, so the press morph runs over the corners that show", () => {
        const small = (recipe().variants?.size?.small?.root ?? {}) as Record<
            string,
            unknown
        >;
        const radius = String(small["--components-button-radius"]);
        expect(radius).toMatch(/^min\(/);
        expect(radius).toContain("token(radii.full)");
        expect(radius).toContain("--components-button-heightSmall");
        expect(radius).toContain("0.5");
    });
});

describe("button secondary icon", () => {
    it("sizes the secondary icon like the icon, per size, with its own spacing token", () => {
        const r = recipe();
        expect(r?.variants?.size?.large?.root).toMatchObject({
            "--components-button-secondaryIconSize": "32px",
        });
        const slot = JSON.stringify(r?.base?.secondaryIcon);
        expect(slot).toContain("components-button-secondaryIconSize");
        expect(slot).toContain("components-button-secondaryIconSpacing");
    });

    it("puts the spacing on the side facing the label, by a flag and no compound", () => {
        expect(recipe()?.variants?.secondaryIconPosition?.start?.root).toEqual({
            "--components-button-secondaryStart": "1",
        });
        expect(button.recipe.defaultVariants?.secondaryIconPosition).toBe(
            "end",
        );
        for (const compound of button.recipe.compoundVariants ?? []) {
            expect(compound.match).not.toHaveProperty("secondaryIconPosition");
        }
    });

    it("keeps the deprecated compact size, which no Expressive size replaces", () => {
        expect(Object.keys(button.recipe.variants?.size ?? {})).toContain(
            "compact",
        );
    });
});
