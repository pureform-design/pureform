import type { SlottedComponentSpec } from "@pureform/core/types";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { checkbox } from "./checkbox";
import { radio } from "./radio";
import { separator } from "./separator";
import { switchControl } from "./switch";

type Slots = Record<string, { base: Record<string, Record<string, unknown>> }>;
const slotRecipe = (spec: SlottedComponentSpec) => {
    const preset = compilePreset(configWith(spec));
    const recipes = preset.theme?.slotRecipes as Slots;
    return recipes[spec.name]!;
};

const CHECKED = ":is(:checked, :has(:checked), [aria-checked=true])";
const INVALID = ":is([aria-invalid=true], :has([aria-invalid=true]))";

describe.each([checkbox, radio, switchControl])("$name", (spec) => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(spec)).not.toThrow();
    });

    it("lays the native input invisibly over the control", () => {
        expect(slotRecipe(spec).base.input).toMatchObject({
            position: "absolute",
            opacity: "0",
            width: "100%",
            height: "100%",
        });
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(slotRecipe(spec)).toMatchSnapshot();
    });
});

describe("checkbox", () => {
    it("fills the box when checked, with the error color when also invalid", () => {
        const fill = slotRecipe(checkbox).base.box?.backgroundColor as Record<
            string,
            string
        >;
        expect(fill[`.checkbox__root${CHECKED} &`]).toContain("checkedColor");
        expect(
            fill[
                `.checkbox__root${INVALID}${INVALID}${INVALID}${INVALID}${CHECKED} &`
            ],
        ).toContain("errorColor");
    });

    it("shows the check when checked and the dash when indeterminate", () => {
        const { base } = slotRecipe(checkbox);
        expect(base.checkIcon?.opacity).toMatchObject({ base: "0" });
        expect(base.indeterminateIcon?.opacity).toMatchObject({ base: "0" });
    });
});

describe("radio", () => {
    it("grows the dot in when checked", () => {
        expect(slotRecipe(radio).base.dot?.transform).toEqual({
            base: "scale(0)",
            [`.radio__root${CHECKED} &`]: "scale(1)",
        });
    });
});

describe("switchControl", () => {
    it("moves and grows the handle when on", () => {
        const handle = slotRecipe(switchControl).base.handle as Record<
            string,
            Record<string, string>
        >;
        expect(
            handle.insetInlineStart?.[`.switchControl__root${CHECKED} &`],
        ).toContain("handleOn");
        expect(handle.width?.[`.switchControl__root${CHECKED} &`]).toContain(
            "handleSizeChecked",
        );
    });

    it("centers the handle and state layer on their inline start, flipped under rtl", () => {
        const { base } = slotRecipe(switchControl);
        for (const slot of ["handle", "stateLayer"]) {
            expect(base[slot]?.transform).toEqual({
                base: "translate(-50%, -50%)",
                _rtl: "translate(50%, -50%)",
            });
        }
    });
});

describe("separator", () => {
    it("draws a filled line and insets it", () => {
        const preset = compilePreset(configWith(separator));
        const recipes = preset.theme?.recipes as Record<
            string,
            { base: object; variants: Record<string, Record<string, object>> }
        >;
        const recipe = recipes.separator!;
        expect(recipe.base).toMatchObject({
            borderWidth: "0px",
            height: "var(--components-separator-thickness, 1px)",
        });
        expect(recipe.variants.inset?.middle).toHaveProperty("marginInlineEnd");
    });
});
