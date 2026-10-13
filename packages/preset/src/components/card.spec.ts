import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { card } from "./card";
import { touchTarget } from "./shared";

describe("card", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(card)).not.toThrow();
    });

    it("only gives interactive cards a state layer", () => {
        expect(
            card.recipe.variants?.variant?.filled?.root?.backgroundColor,
        ).toEqual({
            type: "alias",
            path: ["components", "card", "filledContainer"],
        });
        const interactiveFilled = card.recipe.compoundVariants?.find(
            (c) =>
                c.match.interactive === "true" && c.match.variant === "filled",
        );
        expect(interactiveFilled?.style.root?.backgroundColor).toMatchObject({
            type: "conditional",
        });
    });

    it("compiles to a stable Panda slot recipe", () => {
        const preset = compilePreset(configWith(card));
        expect(preset.theme?.slotRecipes).toMatchSnapshot();
    });
});

describe("card touch target", () => {
    it("has a touch target slot styled like the buttons'", () => {
        expect(card.slots).toEqual(["root", "touchTarget"]);
        expect(card.recipe.base.touchTarget).toBe(touchTarget);
    });
});

describe("card tokens", () => {
    it("falls back to the foundation radius when the var is unset", () => {
        const preset = compilePreset(configWith(card));
        expect(preset.theme?.slotRecipes?.card?.base?.root).toMatchObject({
            borderRadius: "var(--components-card-radius, token(radii.medium))",
        });
    });
});
