import { describe, expect, it } from "vitest";

import { defineConfig } from "../define";
import { buttonConfig } from "./button";

// Phase 2 coverage check: a real, full slotted button must be expressible as a CoreConfig and
// pass validation with no errors. If this breaks, the config contract has a gap to record.
describe("canonical button fixture", () => {
    it("passes defineConfig validation", () => {
        expect(() => defineConfig(buttonConfig)).not.toThrow();
    });

    it("is a slot component with the expected slots and variant groups", () => {
        const button = buttonConfig.components.button;
        if (!button || button.kind !== "slotComponent") {
            throw new Error("expected a slot component named button");
        }
        expect(button.slots).toEqual([
            "root",
            "label",
            "leadingIcon",
            "trailingIcon",
        ]);
        expect(Object.keys(button.recipe.variants ?? {})).toEqual([
            "color",
            "variant",
            "size",
        ]);
        expect(button.recipe.compoundVariants).toHaveLength(2);
    });
});
