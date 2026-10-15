import { describe, expect, it } from "vitest";

import { animatable, blend, easingPoints, interpolates, stops } from "./motion";

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
    it("finds the value partway, premultiplied for colors", () => {
        expect(blend(0, 10, 0.25)).toBe(2.5);
        expect(blend("rgba(0, 0, 0, 1)", "rgba(200, 100, 0, 0.5)", 0.5)).toBe(
            "rgba(67, 33, 0, 0.75)",
        );
        expect(blend("0px 2px", "4px 6px", 0.5)).toBe("2px 4px");
    });

    it("fades to and from transparent without passing through black", () => {
        expect(blend("rgba(200, 100, 0, 1)", "transparent", 0.5)).toBe(
            "rgba(200, 100, 0, 0.5)",
        );
        expect(blend("transparent", "rgba(200, 100, 0, 1)", 0.5)).toBe(
            "rgba(200, 100, 0, 0.5)",
        );
        // A faint dark color to an opaque light one stays light, where a channel-by-channel
        // blend would be rgba(142, 138, 144, 0.56): gray.
        expect(blend("rgba(73, 69, 78, 0.11)", "rgb(216, 207, 232)", 0.5)).toBe(
            "rgba(202, 193, 217, 0.555)",
        );
    });

    it("gives Animated stops along a color's blend, and the ends otherwise", () => {
        const color = stops("transparent", "rgb(200, 100, 0)");
        expect(color.inputRange).toHaveLength(9);
        expect(color.outputRange[4]).toBe("rgba(200, 100, 0, 0.5)");
        expect(color.outputRange[0]).toBe("rgba(200, 100, 0, 0)");
        expect(stops(0, 10)).toEqual({
            inputRange: [0, 1],
            outputRange: [0, 10],
        });
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
