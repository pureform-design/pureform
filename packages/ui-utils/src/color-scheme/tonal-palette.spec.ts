import { TonalPalette } from "./tonal-palette";
import { Hct } from "./hct";
import { describe, expect, it } from "vitest";

const GREEN_ARGB = 0xff00ff00;

describe("TonalPalette", () => {
    it("should be able to create a tonal palette instance", () => {
        const tp = TonalPalette.fromArgb(GREEN_ARGB);

        expect(tp).toBeInstanceOf(TonalPalette);
    });

    it("should be able to get a hex color from tone 0 to 100", () => {
        const tp = TonalPalette.fromArgb(GREEN_ARGB);

        for (let i = 0; i <= 100; i++) {
            const hex = tp.toneHex(i);
            expect(hex).toContain("#");
        }
    });

    it("should be able to get ARGB int color from tone 0 to 100", () => {
        const tp = TonalPalette.fromArgb(GREEN_ARGB);

        for (let i = 0; i <= 100; i++) {
            const argb = tp.toneArgb(i);
            expect(argb).toBeTypeOf("number");
        }
    });

    it("should be able to get HCT color from tone 0 to 100", () => {
        const tp = TonalPalette.fromArgb(GREEN_ARGB);

        for (let i = 0; i <= 100; i++) {
            const hct = tp.toneHct(i);
            expect(hct).toBeInstanceOf(Hct);
        }
    });

    it("should match snapshots hex colors from tone 0 to 100", () => {
        const tp = TonalPalette.fromArgb(GREEN_ARGB);
        for (let i = 0; i <= 100; i++) {
            const hex = tp.toneHex(i);
            expect(hex).toMatchSnapshot();
        }
    });

    it("should throw when trying to get a hex color from a tone outside of the range", () => {
        const tp = TonalPalette.fromArgb(GREEN_ARGB);

        expect(() => tp.toneHex(-1)).toThrow();
        expect(() => tp.toneHex(101)).toThrow();
    });

    it("should throw when trying to get an ARGB int color from a tone outside of the range", () => {
        const tp = TonalPalette.fromArgb(GREEN_ARGB);

        expect(() => tp.toneArgb(-1)).toThrow();
        expect(() => tp.toneArgb(101)).toThrow();
    });

    it("should throw when trying to get an HCT color from a tone outside of the range", () => {
        const tp = TonalPalette.fromArgb(GREEN_ARGB);

        expect(() => tp.toneHct(-1)).toThrow();
        expect(() => tp.toneHct(101)).toThrow();
    });
});
