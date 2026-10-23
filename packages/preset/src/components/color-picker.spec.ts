import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { colorPicker } from "./color-picker";

const json = (value: unknown) => JSON.stringify(value);

describe("colorPicker", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(colorPicker)).not.toThrow();
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(
            compilePreset(configWith(colorPicker)).theme?.slotRecipes
                ?.colorPicker,
        ).toMatchSnapshot();
    });

    it("has no variants, so no compound variants", () => {
        expect(colorPicker.recipe.compoundVariants ?? []).toEqual([]);
        expect(colorPicker.recipe.variants ?? {}).toEqual({});
    });

    it("has Zag's parts, and the value's swatch", () => {
        expect(colorPicker.structure).toEqual({
            root: ["label", "content"],
            content: ["area", "channelSlider", "control", "swatchGroup"],
            area: ["areaBackground", "areaThumb"],
            channelSlider: [
                "transparencyGrid",
                "channelSliderTrack",
                "channelSliderThumb",
            ],
            control: ["valueSwatch"],
            swatchGroup: ["swatchTrigger"],
            swatchTrigger: ["swatch"],
        });
    });

    it("takes its corners from the theme's roles", () => {
        const corners = json(colorPicker.tokens);
        expect(corners).toContain('"medium"');
        expect(corners).toContain('"full"');
    });

    it("rings the selected swatch in onSurface", () => {
        expect(json(colorPicker.recipe.base!.swatchTrigger)).toContain(
            "selected",
        );
        expect(json(colorPicker.tokens)).toContain('"onSurface"');
    });
});
