import { describe, expect, it } from "vitest";

import {
    colorPickerFraction,
    colorPickerHex,
    colorPickerHexText,
} from "./color-picker";

describe("colorPickerHex", () => {
    it("reads six and eight digits, with or without #", () => {
        expect(colorPickerHex("#6750A4")).toBe("#6750a4");
        expect(colorPickerHex("6750a4")).toBe("#6750a4");
        expect(colorPickerHex("6750a480")).toBe("#6750a480");
    });

    it("expands three and four digits, and drops an opaque alpha", () => {
        expect(colorPickerHex("#abc")).toBe("#aabbcc");
        expect(colorPickerHex("abcd")).toBe("#aabbccdd");
        expect(colorPickerHex("#6750a4ff")).toBe("#6750a4");
    });

    it("refuses anything else", () => {
        expect(colorPickerHex("")).toBeUndefined();
        expect(colorPickerHex("#12345")).toBeUndefined();
        expect(colorPickerHex("purple")).toBeUndefined();
    });
});

describe("colorPickerHexText", () => {
    it("shows the digits upper case, without #", () => {
        expect(colorPickerHexText("#6750a4")).toBe("6750A4");
    });
});

describe("colorPickerFraction", () => {
    it("clamps to the ends and counts from the right under rtl", () => {
        expect(colorPickerFraction(50, 200)).toBe(0.25);
        expect(colorPickerFraction(-10, 200)).toBe(0);
        expect(colorPickerFraction(300, 200)).toBe(1);
        expect(colorPickerFraction(50, 200, true)).toBe(0.75);
        expect(colorPickerFraction(10, 0)).toBe(0);
    });
});
