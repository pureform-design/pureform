import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { autocomplete } from "./autocomplete";
import { AFFIX_FIELD_SLOTS } from "./field";
import { select } from "./select";

const compiled = () =>
    compilePreset(configWith(autocomplete)).theme?.slotRecipes?.autocomplete;

describe("autocomplete", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(autocomplete)).not.toThrow();
    });

    it("has the select's field parts, prefix and suffix included", () => {
        expect(autocomplete.slots).toEqual([...AFFIX_FIELD_SLOTS]);
        expect(autocomplete.structure).toEqual(select.structure);
    });

    it("keeps the select's variants and compounds", () => {
        expect(Object.keys(autocomplete.recipe.variants ?? {})).toEqual(
            Object.keys(select.recipe.variants ?? {}),
        );
        expect(autocomplete.recipe.compoundVariants).toHaveLength(
            select.recipe.compoundVariants?.length ?? 0,
        );
    });

    it("types into its input: no pointer cursor, unlike the select's", () => {
        expect(autocomplete.recipe.base.input).not.toHaveProperty("cursor");
        expect(select.recipe.base.input).toHaveProperty("cursor");
    });

    it("turns the arrow over while the suggestions are open", () => {
        expect(JSON.stringify(compiled()?.base?.trailingIcon)).toContain(
            "aria-expanded",
        );
        expect(autocomplete.recipe.defaultVariants?.trailingIcon).toBe("true");
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});
