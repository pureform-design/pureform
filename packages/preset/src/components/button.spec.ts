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

    it("pairs every color group with every fill", () => {
        expect(button.recipe.compoundVariants).toHaveLength(7 * 5);
    });

    it("tints a filled primary button with its on-color on hover", () => {
        const filledPrimary = button.recipe.compoundVariants?.find(
            (c) => c.match.color === "primary" && c.match.variant === "filled",
        );
        expect(filledPrimary?.style.root?.color).toEqual({
            type: "alias",
            path: ["tokens", "colors", "onPrimary"],
        });
        expect(filledPrimary?.style.root?.backgroundColor).toMatchObject({
            type: "conditional",
            base: { type: "alias", path: ["tokens", "colors", "primary"] },
        });
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(recipe()).toMatchSnapshot();
    });
});
