import { describe, expect, it } from "vitest";

import { stagger } from "./stagger";

// Compose's SlowEffects: stiffness 800, critically damped.
const SLOW_EFFECTS = {
    type: "spring",
    stiffness: 800,
    damping: 1,
    mass: 1,
} as const;

describe("stagger", () => {
    it("gives each item its wait on the spring, nearest the FAB first when entering", () => {
        const { delays } = stagger({
            count: 4,
            spring: SLOW_EFFECTS,
            phase: "enter",
        });
        expect(delays[3]).toBe(0);
        for (let i = 3; i > 0; i--) {
            expect(delays[i - 1]!).toBeGreaterThan(delays[i]!);
        }
    });

    it("leaves in reverse, and says how long the whole sequence can take", () => {
        const { delays, duration } = stagger({
            count: 4,
            spring: SLOW_EFFECTS,
            phase: "exit",
        });
        expect(delays[0]).toBe(0);
        expect(delays[3]!).toBeGreaterThan(delays[0]!);
        expect(Math.max(...delays)).toBeLessThanOrEqual(duration);
    });

    it("gives the same waits as the web's, from the same spring", async () => {
        const web = (await import("@pureform/animate-web")).stagger({
            count: 6,
            spring: SLOW_EFFECTS,
            phase: "enter",
        });
        expect(
            stagger({ count: 6, spring: SLOW_EFFECTS, phase: "enter" }).delays,
        ).toEqual(web.delays);
    });

    it("applies the time scale and drops the stagger under reduced motion", () => {
        const normal = stagger({
            count: 3,
            spring: SLOW_EFFECTS,
            phase: "enter",
        }).delays;
        const slowed = stagger({
            count: 3,
            spring: SLOW_EFFECTS,
            phase: "enter",
            timeScale: 2,
        }).delays;
        expect(slowed.map((delay) => delay / 2)).toEqual(normal);
        expect(
            stagger({
                count: 3,
                spring: SLOW_EFFECTS,
                phase: "enter",
                reducedMotion: true,
            }).delays,
        ).toEqual([0, 0, 0]);
    });
});
