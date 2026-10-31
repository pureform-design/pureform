import { describe, expect, it } from "vitest";

import { channelAt } from "./channel";

describe("derived motion channels", () => {
    it("samples piecewise channels on a shared clock, including exact frame boundaries", () => {
        const channel = {
            unit: "deg" as const,
            terms: [
                {
                    clock: "cycle",
                    stops: [
                        { offset: 0, value: 10 },
                        { offset: 0.25, value: 80 },
                        { offset: 0.5, value: 87 },
                        { offset: 1, value: 10 },
                    ],
                },
            ],
        };
        expect(channelAt(channel, {})).toBe(10);
        expect(channelAt(channel, { cycle: 0.125 })).toBe(45);
        expect(channelAt(channel, { cycle: 0.5 })).toBe(87);
        expect(channelAt(channel, { cycle: 0.75 })).toBe(48.5);
        expect(channelAt(channel, { cycle: 1 })).toBe(10);
    });
    it("shares one slide across edges and its inverse while the wave advances independently", () => {
        const slide = { terms: [{ clock: "slide", from: -80, to: 200 }] };
        const wave = {
            offset: -40,
            terms: [
                { clock: "slide", from: 80, to: -200 },
                { clock: "wave", from: 0, to: 40 },
            ],
        };
        for (const progress of [0, 0.25, 0.5, 0.9]) {
            expect(
                channelAt(slide, { slide: progress }) +
                    channelAt(wave, { slide: progress, wave: 0.25 }),
            ).toBeCloseTo(-30);
        }
        expect(channelAt(wave, {})).toBe(40);
        expect(channelAt({ offset: 7 }, {})).toBe(7);
    });
});
