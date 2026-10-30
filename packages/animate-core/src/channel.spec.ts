import { describe, expect, it } from "vitest";

import { channelAt } from "./channel";

describe("derived motion channels", () => {
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
