import { materialMotion } from "@pureform/material";
import { compilePreset } from "@pureform/panda-adapter";
import { duration, easing, spring } from "@pureform/theme";
import { describe, expect, it } from "vitest";

import { pureform } from "../pureform";
import { timedAnimation } from "./overlay";
import type { OverlayMotionStep } from "./overlay";
import { tweens } from "./shared";

const config = pureform({
    themes: {
        expressive: { motion: materialMotion({ scheme: "expressive" }) },
    },
});

describe("spring plumbing", () => {
    it("wires the motion provider's springs into the config and its themes", () => {
        expect(Object.keys(config.springs ?? {})).toEqual([
            "spatialFast",
            "spatialDefault",
            "spatialSlow",
            "effectsFast",
            "effectsDefault",
            "effectsSlow",
        ]);
        // The expressive theme changes only the spatial springs.
        expect(Object.keys(config.themes?.expressive?.springs ?? {})).toEqual([
            "spatialFast",
            "spatialDefault",
            "spatialSlow",
        ]);
        const tokens = compilePreset(config).theme?.tokens as Record<
            string,
            Record<string, Record<string, { value: string }>>
        >;
        expect(tokens.springs?.spatialFast?.duration?.value).toMatch(/^\d+ms$/);
        expect(tokens.springs?.effectsSlow?.easing?.value).toMatch(/^linear\(/);
    });

    it("lets tweens take a spring, still dropping the moving parts under reduced motion", () => {
        expect(tweens("width", "opacity")).toMatchObject({
            base: {
                parts: [
                    {
                        property: "width",
                        duration: duration("short3"),
                        easing: easing("standard"),
                    },
                    { property: "opacity" },
                ],
            },
        });
        const springy = tweens(
            { spring: spring("spatialFast") },
            "width",
            "opacity",
        );
        expect(springy).toMatchObject({
            type: "conditional",
            base: {
                type: "transition",
                parts: [
                    { property: "width", spring: spring("spatialFast") },
                    { property: "opacity", spring: spring("spatialFast") },
                ],
            },
            cases: [
                {
                    on: "reducedMotion",
                    value: {
                        parts: [
                            {
                                property: "opacity",
                                spring: spring("spatialFast"),
                            },
                        ],
                    },
                },
            ],
        });
    });

    it("times an overlay step by a spring", () => {
        const step: OverlayMotionStep = {
            keyframes: "overlayGrowIn",
            spring: "spatialFast",
        };
        const { keyframes, ...timing } = step;
        expect(timedAnimation(keyframes, timing, "forwards")).toEqual({
            type: "animation",
            name: "overlayGrowIn",
            spring: spring("spatialFast"),
            fillMode: "forwards",
        });
        const both: OverlayMotionStep = {
            keyframes: "overlayGrowIn",
            spring: "spatialFast",
            // @ts-expect-error a spring step has no duration
            duration: "short3",
        };
        expect(both).toBeDefined();
    });
});
