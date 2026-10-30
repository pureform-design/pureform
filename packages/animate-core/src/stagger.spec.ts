import { describe, expect, it } from "vitest";

import { staggerDelays } from "./stagger";

// A count that runs from 0 to 1 evenly over `ms`.
const over =
    (ms: number) =>
    (t: number): number =>
        Math.min(Math.max(t / ms, 0), 1);

describe("staggerDelays", () => {
    it("reveals the last item first when entering, spacing the rest by the curve", () => {
        // Four items over 400ms on an even curve: the count rounds up at 50, 150, 250, 350ms, and
        // the first item to show starts at once.
        const delays = staggerDelays({
            count: 4,
            curve: over(400),
            duration: 400,
            phase: "enter",
        });
        expect(delays).toHaveLength(4);
        expect(delays[3]).toBeLessThan(delays[2]!);
        expect(delays[2]).toBeLessThan(delays[1]!);
        expect(delays[1]).toBeLessThan(delays[0]!);
        expect(delays[3]).toBe(0);
        expect(delays[0]).toBe(300);
    });

    it("hides the farthest item first when leaving, the reverse sequence", () => {
        const delays = staggerDelays({
            count: 4,
            curve: over(400),
            duration: 400,
            phase: "exit",
        });
        expect(delays[0]!).toBeLessThan(delays[1]!);
        expect(delays[1]!).toBeLessThan(delays[2]!);
        expect(delays[2]!).toBeLessThan(delays[3]!);
        expect(delays[0]).toBe(0);
        expect(delays[3]).toBe(300);
    });

    it("can start from the first item instead", () => {
        const delays = staggerDelays({
            count: 3,
            curve: over(300),
            duration: 300,
            phase: "enter",
            from: "start",
        });
        expect(delays[0]!).toBeLessThan(delays[1]!);
        expect(delays[1]!).toBeLessThan(delays[2]!);
    });

    it("follows a curve that isn't linear: a fast start crowds the first items", () => {
        const eased = (t: number) => 1 - (1 - over(400)(t)) ** 3;
        const even = staggerDelays({
            count: 4,
            curve: over(400),
            duration: 400,
            phase: "enter",
        });
        const fast = staggerDelays({
            count: 4,
            curve: eased,
            duration: 400,
            phase: "enter",
        });
        expect(fast[0]!).toBeLessThan(even[0]!);
        // A fast start with a slow tail: each gap is wider than the one before it.
        expect(fast[2]! - fast[3]!).toBeLessThan(fast[1]! - fast[2]!);
        expect(fast[1]! - fast[2]!).toBeLessThan(fast[0]! - fast[1]!);
    });

    it("starts the first item to move at once, whatever the curve", () => {
        for (const phase of ["enter", "exit"] as const) {
            const delays = staggerDelays({
                count: 5,
                curve: over(500),
                duration: 500,
                phase,
            });
            expect(Math.min(...delays)).toBe(0);
        }
    });

    it("scales by a time scale and drops every delay without motion", () => {
        const slow = staggerDelays({
            count: 3,
            curve: over(300),
            duration: 300,
            phase: "enter",
            timeScale: 2,
        });
        const normal = staggerDelays({
            count: 3,
            curve: over(300),
            duration: 300,
            phase: "enter",
        });
        expect(slow.map((delay) => delay / 2)).toEqual(normal);
        expect(
            staggerDelays({
                count: 3,
                curve: over(300),
                duration: 300,
                phase: "enter",
                reducedMotion: true,
            }),
        ).toEqual([0, 0, 0]);
    });

    it("handles no items, one item, and a curve that overshoots", () => {
        expect(
            staggerDelays({
                count: 0,
                curve: over(100),
                duration: 100,
                phase: "enter",
            }),
        ).toEqual([]);
        expect(
            staggerDelays({
                count: 1,
                curve: over(100),
                duration: 100,
                phase: "enter",
            }),
        ).toEqual([0]);
        const overshoot = (t: number) => 1.2 * over(300)(t);
        const delays = staggerDelays({
            count: 3,
            curve: overshoot,
            duration: 300,
            phase: "enter",
        });
        expect(delays.every((delay) => delay <= 300)).toBe(true);
    });

    it("rejects a count that isn't a whole number of items", () => {
        expect(() =>
            staggerDelays({
                count: 2.5,
                curve: over(100),
                duration: 100,
                phase: "enter",
            }),
        ).toThrow("count");
    });
});
