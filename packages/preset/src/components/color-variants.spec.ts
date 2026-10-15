import { describe, expect, it } from "vitest";

import { createCheckbox } from "./checkbox";
import { createChip } from "./chip";
import { createRadio } from "./radio";
import { createSupportingText } from "./supporting-text";
import { createSwitch } from "./switch";
import { createTextArea } from "./text-area";
import { createTextField } from "./text-field";

const GROUPS = ["primary", "negative", "brand"];

describe.each([
    ["checkbox", createCheckbox],
    ["radio", createRadio],
    ["switchControl", createSwitch],
    ["chip", createChip],
    ["textField", createTextField],
    ["textArea", createTextArea],
] as const)("%s color", (_, create) => {
    const spec = create(GROUPS);

    it("has a color variant per group, defaulting to primary", () => {
        expect(Object.keys(spec.recipe.variants?.color ?? {})).toEqual(GROUPS);
        expect(spec.recipe.defaultVariants?.color).toBe("primary");
    });

    it("leaves primary to the tokens and reads other groups' roles", () => {
        const variants = spec.recipe.variants?.color ?? {};
        expect(variants.primary).toEqual({});
        const brand = JSON.stringify([
            variants.brand,
            spec.recipe.compoundVariants?.filter(
                (c) => c.match.color === "brand",
            ),
        ]);
        expect(brand).toContain('"brand');
        expect(brand).not.toContain('"negative');
    });
});

describe("supportingText tone", () => {
    it("has neutral, error, and a tone per group", () => {
        const spec = createSupportingText(GROUPS);
        expect(Object.keys(spec.recipe.variants?.tone ?? {})).toEqual([
            "neutral",
            "error",
            ...GROUPS,
        ]);
    });
});
