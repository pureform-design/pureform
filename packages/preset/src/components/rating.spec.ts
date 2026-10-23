import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { rating } from "./rating";

const compiled = () =>
    compilePreset(configWith(rating)).theme?.slotRecipes?.rating;

describe("rating", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(rating)).not.toThrow();
    });

    it("has an empty icon and the filled and half-filled stars over it", () => {
        expect(rating.slots).toEqual([
            "root",
            "label",
            "control",
            "item",
            "icon",
            "fill",
            "halfFill",
        ]);
    });

    it("clips the half star to half the icon, from the inline start", () => {
        const base = compiled()?.base;
        expect(JSON.stringify(base?.halfFill?.width)).toBe('"50%"');
        expect(base?.halfFill?.insetInlineStart).toBeDefined();
        expect(base?.halfFill?.overflow).toBe("hidden");
    });

    it("draws the filled stars in the color group and the empty ones apart", () => {
        const base = compiled()?.base;
        expect(JSON.stringify(base?.fill?.color)).toContain("rating-accent");
        expect(JSON.stringify(base?.icon?.color)).toContain(
            "rating-emptyColor",
        );
    });

    it("has no compound variants", () => {
        expect(rating.recipe.compoundVariants ?? []).toHaveLength(0);
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
