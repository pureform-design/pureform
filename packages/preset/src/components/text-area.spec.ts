import type { SlottedComponentSpec } from "@pureform/core/types";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { textArea } from "./text-area";
import { textField } from "./text-field";

type Slots = Record<
    string,
    {
        base: Record<string, Record<string, unknown>>;
        variants: Record<string, Record<string, Record<string, unknown>>>;
    }
>;

const compile = (spec: SlottedComponentSpec, name: string) => {
    const preset = compilePreset(configWith(spec));
    const recipes = preset.theme?.slotRecipes as Slots;
    return recipes[name]!;
};

describe("textArea", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(textArea)).not.toThrow();
    });

    it("grows with the textarea and resizes vertically", () => {
        const { base, variants } = compile(textArea, "textArea");
        expect(variants.variant?.filled?.container).toMatchObject({
            minHeight:
                "calc(var(--components-textArea-height, 56px) + token(sizes.densityOffset))",
        });
        expect(base.container).not.toHaveProperty("height");
        expect(base.input).toMatchObject({ resize: "vertical" });
    });

    it("rests the label on the first line", () => {
        const label = compile(textArea, "textArea").variants.variant?.filled
            ?.label as Record<string, Record<string, string>>;
        expect(label.top?.base).toBe(
            "calc(calc(var(--components-textArea-height, 56px) * 0.5) + calc(token(sizes.densityOffset) * 0.5))",
        );
    });

    it("shares the text field's label, states, and supporting text", () => {
        const area = compile(textArea, "textArea").base;
        const field = compile(textField, "textField").base;
        const rename = (v: unknown) =>
            JSON.stringify(v).replaceAll("textField", "textArea");
        expect(JSON.stringify(area.label)).toBe(rename(field.label));
        expect(JSON.stringify(area.supportingText)).toBe(
            rename(field.supportingText),
        );
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compile(textArea, "textArea")).toMatchSnapshot();
    });
});
