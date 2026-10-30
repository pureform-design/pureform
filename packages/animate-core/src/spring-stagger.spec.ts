import { describe, expect, it } from "vitest";

import { staggerOnSpring } from "./spring-stagger";

// Compose's SlowEffects: stiffness 800, critically damped.
const SLOW_EFFECTS = {
    type: "spring",
    stiffness: 800,
    damping: 1,
    mass: 1,
} as const;

describe("staggerOnSpring", () => {
    it("samples a spring into one wait per item, with the first to move at once", () => {
        const { delays } = staggerOnSpring({
            count: 5,
            spring: SLOW_EFFECTS,
            phase: "enter",
        });
        expect(delays).toHaveLength(5);
        expect(delays[4]).toBe(0);
        for (let i = 4; i > 0; i--) {
            expect(delays[i - 1]!).toBeGreaterThan(delays[i]!);
        }
    });

    it("reports how long the spring takes to settle, which bounds the sequence", () => {
        const { delays, duration } = staggerOnSpring({
            count: 8,
            spring: SLOW_EFFECTS,
            phase: "exit",
        });
        expect(duration).toBeGreaterThan(0);
        expect(Math.max(...delays)).toBeLessThanOrEqual(duration);
    });

    it("rejects a spring that can't run, naming why", () => {
        expect(() =>
            staggerOnSpring({
                count: 3,
                spring: { ...SLOW_EFFECTS, mass: 0 },
                phase: "enter",
            }),
        ).toThrow("mass");
    });

    it("passes the order, time scale and reduced motion through", () => {
        const start = staggerOnSpring({
            count: 4,
            spring: SLOW_EFFECTS,
            phase: "enter",
            from: "start",
        }).delays;
        expect(start[0]).toBe(0);
        expect(start[3]!).toBeGreaterThan(start[0]!);
        expect(
            staggerOnSpring({
                count: 4,
                spring: SLOW_EFFECTS,
                phase: "enter",
                reducedMotion: true,
            }).delays,
        ).toEqual([0, 0, 0, 0]);
    });
});
