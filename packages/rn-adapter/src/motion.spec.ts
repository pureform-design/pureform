import { describe, expect, it } from "vitest";

import {
    movingTokens,
    tokensAt,
    animatable,
    blend,
    channels,
    easingPoints,
    interpolates,
    offsetSpan,
    presenceFrames,
    sameUnits,
    slideAt,
    slideFrames,
    slideOffset,
    stops,
} from "./motion";

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
        expect(interpolates("-100%", "250%")).toBe(true);
    });

    it("changes a shadow at once, which Animated would read as its color", () => {
        expect(
            interpolates(
                "0px 1px 2px rgba(0, 0, 0, 0.3)",
                "0px 2px 6px rgba(0, 0, 0, 0.2)",
            ),
        ).toBe(false);
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

describe("channels", () => {
    it("moves each transform step and value through the frames' offsets", () => {
        expect(
            channels(
                [
                    {
                        offset: 0,
                        style: {
                            transform: [{ translateX: "-100%" }],
                            opacity: 0,
                        },
                    },
                    {
                        offset: 1,
                        style: {
                            transform: [{ translateX: "250%" }],
                            opacity: 1,
                        },
                    },
                ],
                {},
            ),
        ).toEqual([
            {
                property: "transform",
                step: [0, "translateX"],
                inputRange: [0, 1],
                outputRange: ["-100%", "250%"],
            },
            { property: "opacity", inputRange: [0, 1], outputRange: [0, 1] },
        ]);
    });

    it("fills the ends from the style, and skips what can't move", () => {
        expect(
            channels(
                [{ offset: 0.5, style: { opacity: 1, display: "none" } }],
                {
                    opacity: 0,
                    display: "flex",
                },
            ),
        ).toEqual([
            {
                property: "opacity",
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1, 0],
            },
        ]);
    });
});

describe("sameUnits", () => {
    it("resolves a percentage against the parent's size, by the property's axis", () => {
        expect(sameUnits("top", "50%", 0, { width: 300, height: 56 })).toEqual([
            28, 0,
        ]);
        expect(
            sameUnits("start", 16, "50%", { width: 300, height: 56 }),
        ).toEqual([16, 150]);
    });

    it("reads a zero as 0% without the parent's size, and leaves the rest", () => {
        expect(sameUnits("top", "50%", 0, undefined)).toEqual(["50%", "0%"]);
        expect(sameUnits("top", "50%", 8, {})).toEqual(["50%", 8]);
        expect(sameUnits("top", 4, 8, undefined)).toEqual([4, 8]);
    });
});

describe("token tweens", () => {
    const timing = { property: "", duration: 100, easing: "linear", delay: 0 };
    const transitions = new Map(
        ["n", "color", "length", "angle", "mixed", "word"].map((k) => [
            k,
            timing,
        ]),
    );
    const from = {
        n: 10,
        color: "rgba(0, 0, 0, 1)",
        length: "10px",
        angle: "0deg",
        mixed: "10px",
        word: "auto",
        still: 1,
    };
    const to = {
        n: 20,
        color: "rgba(255, 255, 255, 1)",
        length: "30px",
        angle: "90deg",
        mixed: "50%",
        word: "none",
        still: 2,
    };

    it("move numbers, colors, and values in one unit, and nothing else", () => {
        expect(movingTokens(from, to, transitions).map(([k]) => k)).toEqual([
            "n",
            "color",
            "length",
            "angle",
        ]);
    });

    it("blend each moving token, and take the rest as they end", () => {
        const moving = movingTokens(from, to, transitions);
        expect(tokensAt(from, to, moving, 0.5)).toEqual({
            n: 15,
            color: "rgba(128, 128, 128, 1)",
            length: "20px",
            angle: "45deg",
            mixed: "50%",
            word: "none",
            still: 2,
        });
    });
});

describe("presenceFrames", () => {
    it("gives both ends the same transform steps where either moves", () => {
        expect(
            presenceFrames({
                from: { opacity: 0, scale: 0.8 },
                to: { opacity: 1 },
                duration: 150,
                easing: "linear",
            }),
        ).toEqual([
            { opacity: 0, transform: [{ translateY: 0 }, { scale: 0.8 }] },
            { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
        ]);
    });

    it("leaves the transform out of a fade", () => {
        expect(
            presenceFrames({
                from: { opacity: 1, translateY: 0 },
                to: { opacity: 0 },
                duration: 100,
                easing: "linear",
            }),
        ).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    });
});

describe("an indicator's slide", () => {
    const from = { x: 0, width: 40 };
    const to = { x: 200, width: 100 };

    it("starts a view over another's box, scaled about its center", () => {
        const offset = slideOffset(from, to)!;
        expect(offset).toEqual({ translateX: -230, scaleX: 0.4 });
        expect(offsetSpan(to, offset)).toEqual(from);
        expect(slideOffset({ x: 0, width: 0 }, to)).toBeUndefined();
    });

    it("finds where a slide has got to, and the box it covers there", () => {
        const offset = slideOffset(from, to)!;
        expect(slideAt(offset, 0)).toEqual(offset);
        expect(slideAt(offset, 1)).toEqual({ translateX: 0, scaleX: 1 });
        expect(offsetSpan(to, slideAt(offset, 0.5))).toEqual({
            x: 100,
            width: 70,
        });
    });

    it("gives both ends the same transform steps", () => {
        expect(
            slideFrames({
                from: { translateX: -230, scaleX: 0.4 },
                duration: 250,
                delay: 0,
                easing: "linear",
            }),
        ).toEqual([
            { transform: [{ translateX: -230 }, { scaleX: 0.4 }] },
            { transform: [{ translateX: 0 }, { scaleX: 1 }] },
        ]);
    });
});
