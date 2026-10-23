import { materialColor } from "@pureform/material";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { CAROUSEL_LAYOUTS, carousel } from "./carousel";

const recipe = (config = configWith(carousel)) =>
    compilePreset(config).theme?.slotRecipes?.carousel as unknown as {
        base: Record<string, Record<string, unknown>>;
        variants: { layout: Record<string, Record<string, unknown>> };
    };

describe("carousel", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(carousel)).not.toThrow();
    });

    it("has a row of items, each a mask over its content", () => {
        expect(carousel.slots).toEqual([
            "root",
            "itemGroup",
            "item",
            "mask",
            "content",
        ]);
        expect(carousel.indication).toEqual([
            {
                trigger: "mask",
                surface: "mask",
                centered: false,
                focus: "mask",
            },
        ]);
    });

    it("takes a layout per Material strategy, multi-browse by default, with no compound", () => {
        expect(Object.keys(carousel.recipe.variants?.layout ?? {})).toEqual([
            ...CAROUSEL_LAYOUTS,
        ]);
        expect(carousel.recipe.defaultVariants).toEqual({
            layout: "multiBrowse",
        });
        expect(carousel.recipe.compoundVariants ?? []).toHaveLength(0);
    });

    it("rounds the mask from the theme's extra-large role and spaces items by tokens", () => {
        const base = recipe().base;
        expect(JSON.stringify(base.mask)).toContain(
            "--components-carousel-radius",
        );
        expect(JSON.stringify(carousel.recipe.base?.mask)).not.toContain(
            '"unit":"px","value":28',
        );
        expect(JSON.stringify(base.itemGroup)).toContain(
            "--components-carousel-gap",
        );
        expect(JSON.stringify(base.itemGroup)).toContain(
            "--components-carousel-padding",
        );
    });

    it("drops the padding and fills its parent full screen", () => {
        const fullScreen = JSON.stringify(recipe().variants.layout.fullScreen);
        expect(fullScreen).toContain("--components-carousel-padding");
        expect(fullScreen).toContain("100%");
    });

    it(
        "draws from a named theme's colors and a runtime seed's",
        { timeout: 30_000 },
        () => {
            for (const config of [
                pureform(),
                pureform({ color: materialColor({ seed: "#006A60" }) }),
            ]) {
                const mask = JSON.stringify(recipe(config).base.mask);
                expect(mask).toContain("surfaceContainerHighest");
                expect(mask).toContain("onSurface");
            }
        },
    );
});
