import { describe, expect, it } from "vitest";

import { STAGGER_DELAY_VAR, stagger } from "./stagger";

// Compose's SlowEffects: stiffness 800, critically damped.
const SLOW_EFFECTS = {
    type: "spring",
    stiffness: 800,
    damping: 1,
    mass: 1,
} as const;

describe("stagger", () => {
    it("gives each item a wait from the spring, the last item first when entering", () => {
        const { delays } = stagger({
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

    it("runs the same spring in reverse when leaving", () => {
        const entering = stagger({
            count: 5,
            spring: SLOW_EFFECTS,
            phase: "enter",
        }).delays;
        const leaving = stagger({
            count: 5,
            spring: SLOW_EFFECTS,
            phase: "exit",
        }).delays;
        expect(leaving[0]).toBe(0);
        for (let i = 0; i < 4; i++) {
            expect(leaving[i + 1]!).toBeGreaterThan(leaving[i]!);
        }
        // The whole sequence takes as long either way.
        expect(Math.max(...leaving)).toBeGreaterThan(0);
        expect(Math.max(...entering)).toBeGreaterThan(0);
    });

    it("stays inside the spring's own settle time", () => {
        const { delays, duration } = stagger({
            count: 8,
            spring: SLOW_EFFECTS,
            phase: "enter",
        });
        expect(duration).toBeGreaterThan(0);
        expect(Math.max(...delays)).toBeLessThanOrEqual(duration);
    });

    it("takes a stiffer spring as a faster sequence", () => {
        const slow = stagger({
            count: 6,
            spring: { ...SLOW_EFFECTS, stiffness: 200 },
            phase: "enter",
        });
        const fast = stagger({
            count: 6,
            spring: { ...SLOW_EFFECTS, stiffness: 1600 },
            phase: "enter",
        });
        expect(Math.max(...fast.delays)).toBeLessThan(Math.max(...slow.delays));
    });

    it("hands each item its wait as a CSS custom property, for the browser to run", () => {
        const { style } = stagger({
            count: 3,
            spring: SLOW_EFFECTS,
            phase: "enter",
        });
        expect(STAGGER_DELAY_VAR).toBe("--pf-stagger-delay");
        expect(style(2)).toEqual({ [STAGGER_DELAY_VAR]: "0ms" });
        expect(style(0)[STAGGER_DELAY_VAR]).toMatch(/^\d+(\.\d+)?ms$/);
    });

    it("drops the stagger under reduced motion, and scales it with the time scale", () => {
        const reduced = stagger({
            count: 4,
            spring: SLOW_EFFECTS,
            phase: "enter",
            reducedMotion: true,
        });
        expect(reduced.delays).toEqual([0, 0, 0, 0]);
        expect(reduced.style(0)[STAGGER_DELAY_VAR]).toBe("0ms");
        const normal = stagger({
            count: 4,
            spring: SLOW_EFFECTS,
            phase: "enter",
        });
        const slowed = stagger({
            count: 4,
            spring: SLOW_EFFECTS,
            phase: "enter",
            timeScale: 2,
        });
        expect(slowed.delays.map((delay) => delay / 2)).toEqual(normal.delays);
    });

    it("rejects a spring that can't run, naming why", () => {
        expect(() =>
            stagger({
                count: 3,
                spring: { ...SLOW_EFFECTS, stiffness: 0 },
                phase: "enter",
            }),
        ).toThrow("stiffness");
    });

    it("is empty for no items", () => {
        const result = stagger({
            count: 0,
            spring: SLOW_EFFECTS,
            phase: "enter",
        });
        expect(result.delays).toEqual([]);
    });
});
