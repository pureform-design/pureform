import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { codeField } from "./code-field";

const compiled = () =>
    compilePreset(configWith(codeField)).theme?.slotRecipes?.codeField;

type Styles = Record<string, Record<string, unknown>>;

describe("codeField", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(codeField)).not.toThrow();
    });

    it("lays the label, the row of cells and the supporting text in a column", () => {
        expect(codeField.structure).toEqual({
            root: ["label", "control", "supportingText"],
            control: ["input"],
        });
        const base = compiled()?.base as Styles;
        expect(base.root).toMatchObject({
            display: "flex",
            flexDirection: "column",
        });
        expect(base.control).toMatchObject({ display: "flex" });
    });

    it("sizes each cell from its tokens and density, its text centered", () => {
        const input = compiled()?.base?.input as Record<string, unknown>;
        expect(input.width).toBe("var(--components-codeField-cellWidth, 48px)");
        expect(String(input.height)).toContain("densityOffset");
        expect(input.textAlign).toBe("center");
    });

    it("draws each cell's own states: the filled indicator and the outlined stroke", () => {
        const recipe = compiled();
        const filled = JSON.stringify(recipe?.variants?.variant?.filled?.input);
        expect(filled).toContain("focusIndicatorWidth");
        expect(filled).toContain("errorColor");
        const outlined = JSON.stringify(
            recipe?.variants?.variant?.outlined?.input,
        );
        expect(outlined).toContain("outlineColor");
        expect(outlined).toContain("focusColor");
    });

    it("colors the label and supporting text from the root", () => {
        const base = compiled()?.base as Styles;
        expect(JSON.stringify(base.label?.color)).toContain("errorColor");
        expect(JSON.stringify(base.label?.color)).toContain("focusColor");
        expect(JSON.stringify(base.supportingText?.color)).toContain(
            "errorColor",
        );
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
