import { defineShape, px, roundedPolygon } from "@pureform/core/ast";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { MATERIAL_SHAPES } from "../shapes";
import { createIconButton, iconButton } from "./icon-button";

describe("iconButton", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(iconButton)).not.toThrow();
    });

    it("draws the standard variant with no container", () => {
        const standard = iconButton.recipe.compoundVariants?.find(
            (c) =>
                c.match.color === "primary" && c.match.variant === "standard",
        );
        expect(standard?.style.container?.backgroundColor).toMatchObject({
            type: "conditional",
            base: { type: "keyword", value: "transparent" },
        });
    });

    it("compiles to a stable Panda slot recipe", () => {
        // One shape keeps the snapshot readable; the shape tests cover the rest.
        const oneShape = createIconButton(undefined, undefined, {
            circle: MATERIAL_SHAPES.circle,
        });
        const preset = compilePreset(configWith(oneShape));
        expect(preset.theme?.slotRecipes).toMatchSnapshot();
    });
});

describe("iconButton shapes", () => {
    const recipe = () =>
        compilePreset(configWith(iconButton)).theme?.slotRecipes?.iconButton;

    it("offers none and Material's shapes", () => {
        const shapes = Object.keys(iconButton.recipe.variants?.shape ?? {});
        expect(shapes[0]).toBe("none");
        expect(shapes).toContain("cookie9Sided");
        expect(shapes).toHaveLength(36);
    });

    it("clips the container, keeping the corners where shapes aren't supported", () => {
        const circle = recipe()?.variants?.shape?.circle;
        expect(circle?.container?.clipPath).toMatch(/^shape\(from /);
        expect(circle?.container?.borderRadius).toMatchObject({
            "@supports (clip-path: shape(from 0 0, line to 0 0))": "0px",
        });
    });

    it("strokes a shaped outline as a ring", () => {
        const outline = recipe()?.variants?.shape?.heart?.outline;
        expect(outline?.clipPath).toMatch(/^shape\(evenodd from /);
    });

    it("leaves the root unclipped, casting elevation as drop shadows", () => {
        const { base, variants } = recipe() ?? {};
        expect(base?.root).not.toHaveProperty("clipPath");
        expect(variants?.variant?.filled?.root).toMatchObject({
            filterElevation: "level0",
        });
    });
});

describe("custom shapes", () => {
    it("come from pureform's shapes option", () => {
        const config = pureform({
            shapes: {
                ticket: defineShape(
                    roundedPolygon([
                        { at: [0, 0], rounding: 0.1 },
                        { at: [1, 0], rounding: 0.1 },
                        { at: [1, 1], rounding: 0.1 },
                        { at: [0, 1], rounding: 0.1 },
                    ]),
                    { fit: "fixed", size: px(40) },
                ),
            },
        });
        for (const name of ["iconButton", "fab"]) {
            const spec = config.components[name] as typeof iconButton;
            expect(
                Object.keys(spec.recipe.variants?.shape ?? {}),
                name,
            ).toEqual(["none", "ticket"]);
        }
        const css = compilePreset(config).theme?.slotRecipes?.iconButton;
        expect(css?.variants?.shape?.ticket?.container?.clipPath).toContain(
            "min(",
        );
    });
});
