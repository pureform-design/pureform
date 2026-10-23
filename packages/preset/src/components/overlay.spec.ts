import { compilePreset } from "@pureform/panda-adapter";
import { MATERIAL_STACKING } from "@pureform/theme";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { dialog } from "./dialog";
import { menu } from "./menu";
import { OVERLAY_KEYFRAMES } from "./overlay";
import { popover } from "./popover";
import { richTooltip } from "./rich-tooltip";
import { scrim } from "./scrim";
import { snackbar } from "./snackbar";
import { tooltip } from "./tooltip";

const OVERLAYS = [
    ["menu", menu, "menu"],
    ["tooltip", tooltip, "tooltip"],
    ["richTooltip", richTooltip, "tooltip"],
    ["popover", popover, "menu"],
    ["dialog", dialog, "dialog"],
    ["scrim", scrim, "scrim"],
    ["snackbar", snackbar, "snackbar"],
] as const;

const rootOf = (component: (typeof OVERLAYS)[number][1]) =>
    compilePreset(configWith(component)).theme?.slotRecipes?.[component.name]
        ?.base?.root as Record<string, unknown>;

const OPEN = "&[data-state=open]";
// The growth on the fast spatial spring, and the fade alongside on the fast effects spring.
const FAST_EFFECTS =
    "token(springs.effectsFast.duration) token(springs.effectsFast.easing)";
const FADE_IN = `${FAST_EFFECTS} overlayFadeIn`;
const FADE_OUT = `${FAST_EFFECTS} forwards overlayFadeOut`;
const GROW = `token(springs.spatialFast.duration) token(springs.spatialFast.easing) overlayGrowIn, ${FADE_IN}`;
// Shrinking back to 80% as it fades out, as Compose's menu, tooltip and snackbar do.
const SHRINK = `token(springs.spatialFast.duration) token(springs.spatialFast.easing) forwards overlayShrinkOut, ${FADE_OUT}`;
const CLOSED = "&[data-state=closed]";

describe("overlays", () => {
    it.each(OVERLAYS)(
        "stacks the %s at its layer of the theme's scale",
        (_, component, layer) => {
            expect(rootOf(component).zIndex).toBe(`token(zIndex.${layer})`);
        },
    );

    it("orders the layers so each overlay draws over the ones it opens from", () => {
        const z = (layer: keyof typeof MATERIAL_STACKING) =>
            MATERIAL_STACKING[layer].value;
        expect(z("raised")).toBeGreaterThan(z("base"));
        expect(z("menu")).toBeGreaterThan(z("raised"));
        expect(z("scrim")).toBeGreaterThan(z("menu"));
        expect(z("dialog")).toBeGreaterThan(z("scrim"));
        expect(z("snackbar")).toBeGreaterThan(z("dialog"));
        expect(z("tooltip")).toBeGreaterThan(z("snackbar"));
    });

    it("grows a menu and a tooltip in from the side they open on, and shrinks them as they fade out", () => {
        for (const component of [menu, tooltip, richTooltip, popover]) {
            const root = rootOf(component);
            expect(root[OPEN]).toEqual({
                animation: {
                    base: GROW,
                    _motionReduce: FADE_IN,
                },
                transformOrigin: "var(--transform-origin)",
            });
            expect(root[CLOSED]).toEqual({
                animation: { base: SHRINK, _motionReduce: FADE_OUT },
                transformOrigin: "var(--transform-origin)",
            });
        }
    });

    it("grows a snackbar in from its center, and shrinks it as it fades out", () => {
        const root = rootOf(snackbar);
        expect(root[OPEN]).toEqual({
            animation: { base: GROW, _motionReduce: FADE_IN },
        });
        expect(root[CLOSED]).toEqual({
            animation: { base: SHRINK, _motionReduce: FADE_OUT },
        });
    });

    it("slides a dialog in and out on springs, and only fades it under reduced motion", () => {
        const root = rootOf(dialog);
        expect(root[OPEN]).toEqual({
            animation: {
                base:
                    "token(springs.spatialDefault.duration) token(springs.spatialDefault.easing) dialogSlideIn, " +
                    FADE_IN,
                _motionReduce: FADE_IN,
            },
        });
        expect(root[CLOSED]).toEqual({
            animation: {
                base:
                    "token(springs.effectsFast.duration) token(springs.effectsFast.easing) forwards dialogSlideOut, " +
                    FADE_OUT,
                _motionReduce: FADE_OUT,
            },
        });
    });

    it("fades the scrim on the default effects spring, the same under reduced motion", () => {
        const root = rootOf(scrim);
        expect(root[OPEN]).toEqual({
            animation:
                "token(springs.effectsDefault.duration) token(springs.effectsDefault.easing) overlayFadeIn",
        });
        expect(root[CLOSED]).toEqual({
            animation:
                "token(springs.effectsDefault.duration) token(springs.effectsDefault.easing) forwards overlayFadeOut",
        });
    });

    it("adds the keyframes to the pureform config; the fades only fade and the rest only move", () => {
        const keyframes = pureform().keyframes ?? {};
        for (const name of Object.keys(OVERLAY_KEYFRAMES)) {
            expect(keyframes[name]).toBe(OVERLAY_KEYFRAMES[name]);
        }
        for (const name of ["overlayFadeIn", "overlayFadeOut"]) {
            for (const stop of Object.values(OVERLAY_KEYFRAMES[name]!)) {
                expect(Object.keys(stop)).toEqual(["opacity"]);
            }
        }
        // The popups scale with the `scale` property, which composes with an overlay's own
        // transform (a toast's stacking).
        for (const name of ["overlayGrowIn", "overlayShrinkOut"]) {
            for (const stop of Object.values(OVERLAY_KEYFRAMES[name]!)) {
                expect(Object.keys(stop)).toEqual(["scale"]);
            }
        }
        for (const name of ["dialogSlideIn", "dialogSlideOut"]) {
            for (const stop of Object.values(OVERLAY_KEYFRAMES[name]!)) {
                expect(Object.keys(stop)).toEqual(["transform"]);
            }
        }
    });
});
