import {
    numberFieldCanStep,
    numberFieldClamp,
    numberFieldFormat,
    numberFieldLocale,
    numberFieldOutOfRange,
    numberFieldParse,
    numberFieldRange,
    numberFieldStep,
} from "@pureform/binding-core";
import { numberFieldMachineProps } from "@pureform/binding-web";
import { describe, expect, it } from "vitest";

describe("number field", () => {
    const range = numberFieldRange({ min: 0, max: 10, step: 0.1 });

    it("steps by the step, rounded to its decimals, and stops at the limits", () => {
        expect(numberFieldStep(0.2, 1, range)).toBe(0.3);
        expect(numberFieldStep(9.95, 1, range)).toBe(10);
        expect(numberFieldStep(0.05, -1, range)).toBe(0);
        expect(numberFieldStep(5, 1, range, 2)).toBe(7);
    });

    it("steps an empty value from the minimum, or from 0 without one", () => {
        expect(
            numberFieldStep(Number.NaN, 1, numberFieldRange({ min: 3 })),
        ).toBe(4);
        expect(numberFieldStep(Number.NaN, -1, numberFieldRange({}))).toBe(-1);
    });

    it("clamps, and knows when a step can still move", () => {
        expect(numberFieldClamp(12, range)).toBe(10);
        expect(numberFieldClamp(-1, range)).toBe(0);
        expect(numberFieldClamp(Number.NaN, range)).toBeNaN();
        expect(numberFieldCanStep(10, 1, range)).toBe(false);
        expect(numberFieldCanStep(10, -1, range)).toBe(true);
        expect(numberFieldOutOfRange(11, range)).toBe(true);
    });

    it("formats and parses in the locale", () => {
        expect(numberFieldFormat(1234.5, "en-US")).toBe("1,234.5");
        expect(numberFieldFormat(1234.5, "de-DE")).toBe("1.234,5");
        expect(numberFieldFormat(Number.NaN)).toBe("");
        expect(numberFieldParse("1,234.5", "en-US")).toBe(1234.5);
        expect(numberFieldParse("1.234,5", "de-DE")).toBe(1234.5);
        expect(numberFieldParse("-€12", "en-US")).toBe(-12);
        expect(numberFieldParse("50%", "en-US", { style: "percent" })).toBe(
            0.5,
        );
        expect(numberFieldParse("", "en-US")).toBeNaN();
        expect(numberFieldParse("abc", "en-US")).toBeNaN();
    });

    it("marks the machine invalid for an error, and names the buttons when asked", () => {
        expect(numberFieldMachineProps({ error: "Too many" }).invalid).toBe(
            true,
        );
        expect(
            numberFieldMachineProps({ decrementLabel: "Fewer" }).translations,
        ).toEqual({ decrementLabel: "Fewer" });
    });

    it("takes `locale` over the environment's, so a server render matches the client's", () => {
        expect(numberFieldLocale({ locale: "de-DE" })).toBe("de-DE");
        expect(numberFieldMachineProps({ locale: "de-DE" }).locale).toBe(
            "de-DE",
        );
        expect(numberFieldLocale()).toBeTruthy();
    });
});
