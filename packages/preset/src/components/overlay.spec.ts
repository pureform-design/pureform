import { compilePreset } from "@pureform/panda-adapter";
import { MATERIAL_STACKING } from "@pureform/theme";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { dialog } from "./dialog";
import { menu } from "./menu";
import { OVERLAY_KEYFRAMES } from "./overlay";
import { scrim } from "./scrim";
import { snackbar } from "./snackbar";
import { tooltip } from "./tooltip";

const OVERLAYS = [
    ["menu", menu, "menu"],
    ["tooltip", tooltip, "tooltip"],
    ["dialog", dialog, "dialog"],
    ["scrim", scrim, "scrim"],
    ["snackbar", snackbar, "snackbar"],
] as const;

const rootOf = (component: (typeof OVERLAYS)[number][1]) =>
    compilePreset(configWith(component)).theme?.slotRecipes?.[component.name]
        ?.base?.root as Record<string, unknown>;

const OPEN = "&[data-state=open]";
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

    it("grows a menu and a tooltip in from the side they open on, and fades them out", () => {
        for (const component of [menu, tooltip]) {
            const root = rootOf(component);
            expect(root[OPEN]).toEqual({
                animation: {
                    base: "token(durations.short3) token(easings.emphasizedDecelerate) overlayGrowIn",
                    _motionReduce:
                        "token(durations.short3) token(easings.emphasizedDecelerate) overlayFadeIn",
                },
                transformOrigin: "var(--transform-origin)",
            });
            expect(root[CLOSED]).toMatchObject({
                animation:
                    "token(durations.short2) token(easings.emphasizedAccelerate) forwards overlayFadeOut",
            });
        }
    });

    it("grows a snackbar in from its center", () => {
        const root = rootOf(snackbar);
        expect(root[OPEN]).toEqual({
            animation: {
                base: "token(durations.short3) token(easings.emphasizedDecelerate) overlayGrowIn",
                _motionReduce:
                    "token(durations.short3) token(easings.emphasizedDecelerate) overlayFadeIn",
            },
        });
    });

    it("slides a dialog in and out, and only fades it under reduced motion", () => {
        const root = rootOf(dialog);
        expect(root[OPEN]).toEqual({
            animation: {
                base: "token(durations.long2) token(easings.emphasizedDecelerate) dialogSlideIn",
                _motionReduce:
                    "token(durations.long2) token(easings.emphasizedDecelerate) overlayFadeIn",
            },
        });
        expect(root[CLOSED]).toEqual({
            animation: {
                base: "token(durations.short3) token(easings.emphasizedAccelerate) forwards dialogSlideOut",
                _motionReduce:
                    "token(durations.short3) token(easings.emphasizedAccelerate) forwards overlayFadeOut",
            },
        });
    });

    it("fades the scrim, which moves nothing, the same under reduced motion", () => {
        const root = rootOf(scrim);
        expect(root[OPEN]).toEqual({
            animation:
                "token(durations.long2) token(easings.linear) overlayFadeIn",
        });
        expect(root[CLOSED]).toEqual({
            animation:
                "token(durations.short3) token(easings.linear) forwards overlayFadeOut",
        });
    });

    it("adds the keyframes to the pureform config, and fades only opacity", () => {
        const keyframes = pureform().keyframes ?? {};
        for (const name of Object.keys(OVERLAY_KEYFRAMES)) {
            expect(keyframes[name]).toBe(OVERLAY_KEYFRAMES[name]);
        }
        for (const name of ["overlayFadeIn", "overlayFadeOut"]) {
            for (const stop of Object.values(OVERLAY_KEYFRAMES[name]!)) {
                expect(Object.keys(stop)).toEqual(["opacity"]);
            }
        }
    });
});
