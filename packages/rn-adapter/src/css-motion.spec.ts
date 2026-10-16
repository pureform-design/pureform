import { describe, expect, it } from "vitest";

import { cssMotion } from "./css-motion";

describe("cssMotion", () => {
    it("lists a slot's transitions as CSS's, leaving out what it draws with SVG", () => {
        expect(
            cssMotion([
                {
                    property: "backgroundColor",
                    duration: 150,
                    easing: "linear",
                    delay: 0,
                },
                {
                    property: "clipPath",
                    duration: 300,
                    easing: "linear",
                    delay: 0,
                },
                {
                    property: "transform",
                    duration: 300,
                    easing: "cubic-bezier(0.2, 0, 0, 1)",
                    delay: 50,
                },
            ]),
        ).toEqual({
            transitionProperty: ["backgroundColor", "transform"],
            transitionDuration: [150, 300],
            transitionTimingFunction: ["linear", "cubic-bezier(0.2, 0, 0, 1)"],
            transitionDelay: [0, 50],
        });
        expect(cssMotion([])).toEqual({});
    });

    it("writes a keyframe animation's frames by percentage, and its loops and direction", () => {
        expect(
            cssMotion([], {
                name: "spin",
                duration: 1000,
                easing: "linear",
                delay: 0,
                iterations: -1,
                direction: "alternateReverse",
                frames: [
                    { offset: 0, style: { opacity: 0 } },
                    { offset: 1 / 3, style: { opacity: 0.5 } },
                    { offset: 1, style: { opacity: 1 } },
                ],
            }),
        ).toEqual({
            animationName: {
                "0%": { opacity: 0 },
                "33.33%": { opacity: 0.5 },
                "100%": { opacity: 1 },
            },
            animationDuration: 1000,
            animationTimingFunction: "linear",
            animationDelay: 0,
            animationIterationCount: "infinite",
            animationDirection: "alternate-reverse",
        });
    });
});
