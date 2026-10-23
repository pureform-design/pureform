import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { FADE_THROUGH_KEYFRAMES, fadeThrough } from "./fade-through";

const recipe = () =>
    compilePreset(configWith(fadeThrough)).theme?.slotRecipes?.fadeThrough
        ?.base as Record<string, Record<string, unknown>>;

const SPATIAL =
    "token(springs.spatialDefault.duration) token(springs.spatialDefault.easing)";
const FADE_IN =
    "token(durations.short4) token(easings.linear) token(durations.short2) backwards overlayFadeIn";
const FADE_OUT =
    "token(durations.short2) token(easings.linear) forwards overlayFadeOut";

describe("fadeThrough", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(fadeThrough)).not.toThrow();
    });

    it("fades the incoming page in once the outgoing one is gone, growing it from 80% on the default spatial spring", () => {
        expect(recipe().page!["&[data-state=open]"]).toEqual({
            animation: {
                base: `${SPATIAL} fadeThroughGrowIn, ${FADE_IN}`,
                _motionReduce: FADE_IN,
            },
        });
    });

    it("fades the outgoing page out as it grows to 105%, out of the flow and taking no input", () => {
        expect(recipe().page!["&[data-state=closed]"]).toEqual({
            animation: {
                base: `${SPATIAL} forwards fadeThroughGrowOut, ${FADE_OUT}`,
                _motionReduce: FADE_OUT,
            },
            position: "absolute",
            top: "0px",
            right: "0px",
            left: "0px",
            pointerEvents: "none",
        });
    });

    it("positions the root for the outgoing page, and clips it only while a page leaves", () => {
        expect(recipe().root).toMatchObject({ position: "relative" });
        expect(recipe().root!["&[data-transitioning]"]).toEqual({
            overflow: "clip",
        });
        expect(recipe().root!["overflow"]).toBeUndefined();
    });

    it("adds its keyframes to the pureform config; they only scale", () => {
        const keyframes = pureform().keyframes ?? {};
        for (const [name, frames] of Object.entries(FADE_THROUGH_KEYFRAMES)) {
            expect(keyframes[name]).toBe(frames);
            for (const stop of Object.values(frames)) {
                expect(Object.keys(stop)).toEqual(["scale"]);
            }
        }
    });
});
