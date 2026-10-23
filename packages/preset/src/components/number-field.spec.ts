import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { numberField } from "./number-field";

const compiled = () =>
    compilePreset(configWith(numberField)).theme?.slotRecipes?.numberField;

type Styles = Record<string, Record<string, unknown>>;

describe("numberField", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(numberField)).not.toThrow();
    });

    it("puts the control, holding the two buttons, where the trailing icon would be", () => {
        expect(numberField.structure).toEqual({
            root: ["container", "supportingText"],
            container: [
                "leadingIcon",
                "prefixText",
                "input",
                "suffixText",
                "label",
                "control",
            ],
            control: ["decrementTrigger", "incrementTrigger"],
        });
        expect(Object.keys(numberField.recipe.variants ?? {})).not.toContain(
            "trailingIcon",
        );
    });

    it("ends the input, or the suffix, clear of the control", () => {
        const base = compiled()?.base as Styles;
        expect(String(base.input?.paddingInlineEnd)).toContain("triggerSize");
        expect(String(base.input?.paddingInlineEnd)).toContain("suffixed");
        expect(String(base.suffixText?.paddingInlineEnd)).toContain(
            "triggerSize",
        );
        expect(base.control).toMatchObject({
            position: "absolute",
            insetInlineEnd:
                "var(--components-numberField-controlInset, token(spacing.1))",
        });
    });

    it("draws each button round, with a state layer, a focus ring and the field's icon size", () => {
        const base = compiled()?.base as Styles;
        for (const part of ["decrementTrigger", "incrementTrigger"]) {
            const trigger = base[part]!;
            expect(trigger.width).toBe(
                "var(--components-numberField-triggerSize, 40px)",
            );
            expect(String(trigger.fontSize)).toContain("iconSize");
            expect(String(trigger.borderRadius)).toContain("full");
            expect(JSON.stringify(trigger.outlineStyle)).toContain(
                "focus-visible",
            );
            expect(JSON.stringify(trigger.color)).toContain("disabled");
        }
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
