import { describe, expect, it } from "vitest";

import { animatable, blend, easingPoints, interpolates } from "./motion";

describe("easingPoints", () => {
    it("reads Bézier points, and takes anything else as linear", () => {
        expect(easingPoints("cubic-bezier(0.2, 0, 0, 1)")).toEqual([
            0.2, 0, 0, 1,
        ]);
        expect(easingPoints("linear")).toBe("linear");
        expect(easingPoints("cubic-bezier(1, 2)")).toBe("linear");
    });
});

describe("interpolates", () => {
    it("moves numbers, colors, and strings of the same shape", () => {
        expect(interpolates(0, 10)).toBe(true);
        expect(interpolates("rgba(0, 0, 0, 1)", "transparent")).toBe(true);
        expect(
            interpolates(
                "0px 1px 2px rgba(0, 0, 0, 0.3)",
                "0px 2px 6px rgba(0, 0, 0, 0.2)",
            ),
        ).toBe(true);
    });

    it("changes the rest at once", () => {
        expect(interpolates("flex", "none")).toBe(false);
        expect(
            interpolates("0px 1px 2px red", "0px 1px 2px red, 0px 2px 4px red"),
        ).toBe(false);
        expect(interpolates(4, "50%")).toBe(false);
        // The same answer each time: no state carried between calls.
        expect([1, 2, 3].map(() => interpolates("1px 2px", "3px 4px"))).toEqual(
            [true, true, true],
        );
    });
});

describe("blend", () => {
    it("finds the value partway, channel by channel for colors", () => {
        expect(blend(0, 10, 0.25)).toBe(2.5);
        expect(blend("rgba(0, 0, 0, 1)", "rgba(200, 100, 0, 0)", 0.5)).toBe(
            "rgba(100, 50, 0, 0.5)",
        );
        expect(blend("0px 2px", "4px 6px", 0.5)).toBe("2px 4px");
    });

    it("holds a discrete value until the end", () => {
        expect(blend("flex", "none", 0.9)).toBe("flex");
        expect(blend("flex", "none", 1)).toBe("none");
    });
});

describe("animatable", () => {
    it("writes colors as rgba(), which Animated interpolates", () => {
        expect(animatable("transparent")).toBe("rgba(0, 0, 0, 0)");
        expect(animatable("#ff0000")).toBe("rgba(255, 0, 0, 1)");
        expect(animatable(4)).toBe(4);
    });
});
