import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import {
    description,
    errorText,
    field,
    input,
    label,
    plainTextarea,
} from "./field-primitives";

const PIECES = {
    field,
    label,
    input,
    plainTextarea,
    description,
    errorText,
};

const recipe = (name: keyof typeof PIECES) =>
    (compilePreset(configWith(PIECES[name])).theme?.slotRecipes ?? {})[name];

describe.each(Object.keys(PIECES) as (keyof typeof PIECES)[])("%s", (name) => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(PIECES[name])).not.toThrow();
    });

    it("has one look: no variants", () => {
        expect(Object.keys(PIECES[name].recipe.variants ?? {})).toEqual([]);
    });

    it("compiles to a stable Panda recipe", () => {
        expect(recipe(name)).toMatchSnapshot();
    });
});

describe("the plain box", () => {
    it.each(["input", "plainTextarea"] as const)(
        "%s draws the error color while invalid, and the focus ring",
        (name) => {
            const root = JSON.stringify(recipe(name)?.base?.root);
            expect(root).toContain("errorColor");
            expect(root).toContain("focusIndicatorColor");
            expect(root).toContain("aria-invalid");
        },
    );

    it("colors the date and time pickers' indicator from a token", () => {
        const root = JSON.stringify(recipe("input")?.base?.root);
        expect(root).toContain("::-webkit-calendar-picker-indicator");
        expect(root).toContain("indicatorColor");
        expect(root).toContain("[type=time]");
    });

    it("lets the textarea resize vertically only", () => {
        expect(recipe("plainTextarea")?.base?.root).toMatchObject({
            resize: "vertical",
        });
    });
});

describe("the label", () => {
    it("draws the required mark in the error color", () => {
        expect(
            JSON.stringify(recipe("label")?.base?.requiredIndicator),
        ).toContain("requiredColor");
    });
});
