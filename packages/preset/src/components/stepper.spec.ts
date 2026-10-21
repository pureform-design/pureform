import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { STEPPER_ORIENTATIONS, stepper } from "./stepper";

const recipe = () =>
    compilePreset(configWith(stepper)).theme?.slotRecipes
        ?.stepper as unknown as {
        base: Record<string, Record<string, unknown>>;
        variants: {
            orientation: Record<string, Record<string, unknown>>;
            density: Record<string, unknown>;
        };
    };

describe("stepper", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(stepper)).not.toThrow();
    });

    it("has a header per step with an indicator, a label and a caption, a connector and content", () => {
        expect(stepper.slots).toEqual([
            "root",
            "list",
            "item",
            "trigger",
            "indicator",
            "label",
            "caption",
            "separator",
            "content",
        ]);
        expect(stepper.indication).toEqual([
            {
                trigger: "trigger",
                surface: "trigger",
                centered: false,
                focus: "trigger",
            },
        ]);
    });

    it("lays out horizontally by default or vertically, with no compound", () => {
        expect(Object.keys(stepper.recipe.variants?.orientation ?? {})).toEqual(
            [...STEPPER_ORIENTATIONS],
        );
        expect(stepper.recipe.defaultVariants).toMatchObject({
            orientation: "horizontal",
            density: "inherit",
        });
        expect(stepper.recipe.compoundVariants ?? []).toHaveLength(0);
    });

    it("reads the header's state for the indicator and label, and takes every color from a token", () => {
        const base = recipe().base;
        const indicator = JSON.stringify(base.indicator);
        expect(indicator).toContain(
            "--components-stepper-activeIndicatorContainer",
        );
        expect(indicator).toContain(
            "--components-stepper-errorIndicatorContainer",
        );
        expect(JSON.stringify(base.trigger)).toContain(
            "--components-stepper-errorContent",
        );
        expect(JSON.stringify(base.separator)).toContain(
            "--components-stepper-connector",
        );
    });

    it("draws the indicator's circle from the theme's full role and sizes the header at the density", () => {
        const base = recipe().base;
        expect(JSON.stringify(stepper.recipe.base?.indicator)).not.toContain(
            '"unit":"px","value":12',
        );
        expect(JSON.stringify(base.trigger)).toContain(
            "--components-stepper-densityOffset",
        );
    });

    it("runs the connector down beside the content when vertical, in logical insets", () => {
        const vertical = JSON.stringify(recipe().variants.orientation.vertical);
        expect(vertical).toContain("insetInlineStart");
        expect(vertical).not.toMatch(/"(left|right)"/);
    });
});
