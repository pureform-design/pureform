import { materialLayout } from "@pureform/material";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { button } from "./button";
import { checkbox } from "./checkbox";
import { chip } from "./chip";
import { iconButton } from "./icon-button";
import { listItem } from "./list-item";
import { menu } from "./menu";
import { radio } from "./radio";
import { select } from "./select";
import { textArea } from "./text-area";
import { textField } from "./text-field";

describe.each([
    ["button", button],
    ["iconButton", iconButton],
    ["chip", chip],
    ["checkbox", checkbox],
    ["radio", radio],
    ["textField", textField],
    ["select", select],
    ["listItem", listItem],
    ["menu", menu],
] as const)("%s density", (_, spec) => {
    it("follows the theme by default and takes each step", () => {
        // Object keys put "0" first, as an integer.
        expect(Object.keys(spec.recipe.variants?.density ?? {}).sort()).toEqual(
            ["-1", "-2", "-3", "0", "inherit"],
        );
        expect(spec.recipe.defaultVariants?.density).toBe("inherit");
    });

    it("reads the theme's density offset", () => {
        expect(
            JSON.stringify([spec.recipe.base, spec.recipe.variants]),
        ).toContain("densityOffset");
    });
});

describe("density", () => {
    it("leaves the text area alone", () => {
        expect(textArea.recipe.variants?.density).toBeUndefined();
    });

    it("takes 4px per step off a Material layout", () => {
        const config = pureform({ layout: materialLayout({ density: -2 }) });
        expect(config.tokens.sizes?.densityOffset).toMatchObject({
            value: -8,
            unit: "px",
        });
    });

    it("restates a button size one grid unit per step", () => {
        const compound = compilePreset(
            configWith(button),
        ).theme?.slotRecipes?.button?.compoundVariants?.find(
            (c) => c.size === "medium" && c.density === "-2",
        );
        expect(compound?.css?.root?.height).toBe(
            "calc(var(--components-button-heightMedium, token(sizes.controlMedium)) + calc(token(spacing.1) * -2))",
        );
    });
});

describe("named density steps", () => {
    const STEPS = { comfortable: 1, standard: 0, compact: -2 };
    const config = pureform({
        layout: materialLayout({ densities: STEPS, density: "standard" }),
    });

    it("become every dense component's density variant", () => {
        for (const name of [
            "button",
            "chip",
            "textField",
            "listItem",
            "menu",
        ]) {
            const spec = config.components[name] as typeof button;
            expect(
                Object.keys(spec.recipe.variants?.density ?? {}),
                name,
            ).toEqual(["inherit", "comfortable", "standard", "compact"]);
        }
    });

    it("restate sizes at each step's grid units, larger ones too", () => {
        const recipe = compilePreset(config).theme?.slotRecipes?.chip;
        expect(recipe?.variants?.density?.comfortable?.root?.height).toBe(
            "calc(var(--components-chip-height, token(sizes.controlSmall)) + calc(token(spacing.1) * 1))",
        );
    });

    it("let a named theme pick another step", () => {
        const themed = pureform({
            layout: materialLayout({ densities: STEPS, density: "standard" }),
            themes: {
                roomy: {
                    layout: materialLayout({
                        densities: STEPS,
                        density: "comfortable",
                    }),
                },
            },
        });
        expect(
            themed.themes?.roomy?.tokens?.sizes?.densityOffset,
        ).toMatchObject({
            value: 4,
        });
    });

    it("reject a named theme with other steps", () => {
        expect(() =>
            pureform({
                layout: materialLayout({
                    densities: STEPS,
                    density: "standard",
                }),
                themes: { dense: { layout: materialLayout({ density: -3 }) } },
            }),
        ).toThrow(/theme "dense" declares density steps 0, -1, -2, -3/);
    });
});
