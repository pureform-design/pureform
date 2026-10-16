import { describe, expect, it } from "vitest";

import { dynamic, px } from "./ast";
import { MOTION_ATTRIBUTE, transitionMoves, valueTypeMoves } from "./motion";

describe("transitionMoves", () => {
    it("keeps color, opacity, and elevation fades", () => {
        for (const property of [
            "color",
            "backgroundColor",
            "borderColor",
            "outlineColor",
            "borderInlineStartColor",
            "fill",
            "stroke",
            "opacity",
            "boxShadow",
            "filter",
        ]) {
            expect(transitionMoves(property), property).toBe(false);
        }
    });

    it("stops position, size, and shape", () => {
        for (const property of [
            "transform",
            "left",
            "insetInlineStart",
            "top",
            "width",
            "height",
            "paddingInlineStart",
            "fontSize",
            "clipPath",
            "all",
        ]) {
            expect(transitionMoves(property), property).toBe(true);
        }
    });

    it("judges a dynamic value by its type", () => {
        const token = (valueType?: Parameters<typeof dynamic>[2]) =>
            dynamic(["components", "x", "y"], px(0), valueType);
        expect(transitionMoves(token("number"))).toBe(true);
        expect(transitionMoves(token("length"))).toBe(true);
        expect(transitionMoves(token("angle"))).toBe(true);
        expect(transitionMoves(token("percentage"))).toBe(true);
        expect(transitionMoves(token("lengthPercentage"))).toBe(true);
        expect(transitionMoves(token("color"))).toBe(false);
        expect(transitionMoves(token("time"))).toBe(false);
        expect(transitionMoves(token())).toBe(false);
    });
});

describe("valueTypeMoves", () => {
    it("moves lengths, angles, numbers, and percentages only", () => {
        expect(valueTypeMoves("color")).toBe(false);
        expect(valueTypeMoves(undefined)).toBe(false);
        expect(valueTypeMoves("number")).toBe(true);
    });
});

it("names the motion attribute", () => {
    expect(MOTION_ATTRIBUTE).toBe("data-pf-motion");
});
