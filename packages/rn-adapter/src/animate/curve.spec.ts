import { Animated } from "react-native";
import { describe, expect, it, vi } from "vitest";

import { animate, curve } from "./curve";

describe("curve", () => {
    it("runs a linear() curve through its points", () => {
        const ease = curve("linear(0, 1.2 50%, 1)");
        expect(ease(0)).toBe(0);
        expect(ease(0.25)).toBeCloseTo(0.6, 10);
        expect(ease(0.5)).toBeCloseTo(1.2, 10);
        expect(ease(0.75)).toBeCloseTo(1.1, 10);
        expect(ease(1)).toBe(1);
    });

    it("keeps cubic Béziers", () => {
        const ease = curve("cubic-bezier(0.42, 0, 0.58, 1)");
        expect(ease(0.5)).toBeCloseTo(0.5, 3);
    });
});

describe("animate", () => {
    it("runs a spring through Animated.spring and the rest through Animated.timing", () => {
        const spring = vi.spyOn(Animated, "spring");
        const timing = vi.spyOn(Animated, "timing");
        const progress = new Animated.Value(0);
        animate(
            progress,
            {
                duration: 300,
                easing: "linear(0, 1)",
                delay: 10,
                spring: {
                    type: "spring",
                    stiffness: 800,
                    damping: 34,
                    mass: 1,
                },
            },
            false,
        );
        expect(spring).toHaveBeenCalledWith(
            progress,
            expect.objectContaining({
                toValue: 1,
                stiffness: 800,
                damping: 34,
                mass: 1,
                delay: 10,
            }),
        );
        animate(progress, { duration: 300, easing: "linear" }, false);
        expect(timing).toHaveBeenCalledWith(
            progress,
            expect.objectContaining({ toValue: 1, duration: 300 }),
        );
        spring.mockRestore();
        timing.mockRestore();
    });
});
