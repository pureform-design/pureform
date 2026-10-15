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
