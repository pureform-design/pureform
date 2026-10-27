import { describe, expect, expectTypeOf, it } from "vitest";

import {
    DEFAULT_RIPPLE_CURVE,
    DEFAULT_RIPPLE_TIMING,
    rippleGeometry,
    ripplePress,
} from "./core";
import type { RippleCurve, RippleTiming } from "./core";

describe("the neutral ripple entry", () => {
    it("defaults to semantic points and durations, never a CSS easing string", () => {
        expect(DEFAULT_RIPPLE_TIMING).toEqual({
            grow: 450,
            fade: 375,
            easing: [0.2, 0, 0, 1],
        });
        expect(DEFAULT_RIPPLE_TIMING.easing).toBe(DEFAULT_RIPPLE_CURVE);
        expectTypeOf<RippleTiming["easing"]>().toEqualTypeOf<RippleCurve>();
        expectTypeOf(DEFAULT_RIPPLE_TIMING.easing).toEqualTypeOf<RippleCurve>();
    });
});

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
    it("shares press timing without depending on the drawing target's curve", () => {
        const timing: RippleTiming<{ points: number[] }> = {
            grow: 400,
            fade: 300,
            easing: { points: [0.2, 0, 0, 1] },
        };
        const released: number[] = [];
        const press = ripplePress(() => 0);
        press.begin({ release: (delay) => released.push(delay) }, timing);
        press.end();
        expect(released).toEqual([200]);
        // A duration-only caller also satisfies the semantic press seam.
        press.begin(
            { release: (delay) => released.push(delay) },
            { grow: 100 },
        );
        press.end();
        expect(released).toEqual([200, 50]);
    });
    const timing = { grow: 400 };
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
