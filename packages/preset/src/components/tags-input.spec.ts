import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { FIELD_SLOTS } from "./field";
import { tagsInput } from "./tags-input";

const compiled = () =>
    compilePreset(configWith(tagsInput)).theme?.slotRecipes?.tagsInput;

describe("tags input", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(tagsInput)).not.toThrow();
    });

    it("has the text field's parts", () => {
        expect(tagsInput.slots).toEqual([...FIELD_SLOTS]);
    });

    it("wraps the chips and the input in the container's row", () => {
        const container = compiled()?.base?.container as Record<
            string,
            unknown
        >;
        expect(container.flexWrap).toBe("wrap");
        expect(container.flexDirection).toBe("row");
        expect(JSON.stringify(container.gap)).toContain(
            "components-tagsInput-chipGap",
        );
    });

    it("grows from the field's height and pads the row per fill", () => {
        const variant = compiled()?.variants?.variant;
        for (const fill of ["filled", "outlined"]) {
            const container = JSON.stringify(variant?.[fill]?.container);
            expect(container).toContain("minHeight");
            expect(container).toContain("components-tagsInput-densityOffset");
        }
    });

    it("floats the label once the container holds a chip", () => {
        const label = JSON.stringify(compiled()?.base?.label);
        expect(label).toContain("data-pf-filled");
    });

    it("keeps one compound, the outlined label beside a leading icon", () => {
        expect(tagsInput.recipe.compoundVariants).toHaveLength(1);
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
