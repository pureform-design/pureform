import { describe, expect, it } from "vitest";

import { rippleGeometry, ripplePress } from "./ripple-core";

describe("rippleGeometry", () => {
    it("starts at a fifth of the larger side, centered on the press", () => {
        const g = rippleGeometry({ width: 200, height: 40 }, { x: 30, y: 10 });
        expect(g.size).toBe(40);
        expect(g.start).toEqual({ x: 10, y: -10 });
    });

    it("ends centered in the layer", () => {
        const g = rippleGeometry({ width: 200, height: 40 }, { x: 30, y: 10 });
        expect(g.end).toEqual({ x: 80, y: 0 });
    });

    it("grows past the far corner by the padding and the soft edge", () => {
        const { size, scale } = rippleGeometry(
            { width: 200, height: 40 },
            { x: 0, y: 0 },
        );
        const softEdge = 75; // max(0.35 * 200, 75)
        expect(size * scale).toBeCloseTo(Math.hypot(200, 40) + 10 + softEdge);
    });

    it("scales the soft edge with large surfaces", () => {
        const { size, scale } = rippleGeometry(
            { width: 1000, height: 500 },
            { x: 0, y: 0 },
        );
        expect(size * scale).toBeCloseTo(Math.hypot(1000, 500) + 10 + 350);
    });
});

describe("ripplePress", () => {
    const timing = { grow: 400, fade: 300, easing: "linear" };
    const clock = () => {
        let t = 0;
        return { now: () => t, wait: (ms: number) => void (t += ms) };
    };
    const drawn = (log: number[]) => ({
        release: (delay: number) => log.push(delay),
    });

    it("waits out half the grow before a quick release fades", () => {
        const { now, wait } = clock();
        const press = ripplePress(now);
        const released: number[] = [];
        press.begin(drawn(released), timing);
        wait(50);
        press.end();
        expect(released).toEqual([150]);
    });

    it("fades at once after a long press, and releases the last press when a new one starts", () => {
        const { now, wait } = clock();
        const press = ripplePress(now);
        const first: number[] = [];
        const second: number[] = [];
        press.begin(drawn(first), timing);
        wait(500);
        press.begin(drawn(second), timing);
        expect(first).toEqual([0]);
        press.end();
        press.end();
        expect(second).toEqual([200]);
    });
});
