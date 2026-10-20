// What the bottom and side sheets share: how they slide in from their edge and back out, and the
// keyframes for it. A bottom sheet rises from the bottom; a side sheet comes in from the end edge,
// so its keyframes run the other way under right to left (translation is physical). Under reduced
// motion both fade, as the other overlays do. A target without `data-state` (React Native) draws
// no motion.

import {
    animation,
    pct,
    px,
    transform,
    translateX,
    translateY,
    unitless,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { duration, easing } from "@pureform/theme";
import type { DurationRole, EasingRole } from "@pureform/theme";

/** The keyframes the sheets slide with; `pureform()` adds them to the config. */
export const SHEET_KEYFRAMES: Record<string, Record<string, StyleMap>> = {
    bottomSheetIn: {
        from: { transform: transform(translateY(pct(100))) },
        to: { transform: transform(translateY(px(0))) },
    },
    bottomSheetOut: {
        from: { transform: transform(translateY(px(0))) },
        to: { transform: transform(translateY(pct(100))) },
    },
    sideSheetIn: {
        from: { transform: transform(translateX(pct(100))) },
        to: { transform: transform(translateX(px(0))) },
    },
    sideSheetOut: {
        from: { transform: transform(translateX(px(0))) },
        to: { transform: transform(translateX(pct(100))) },
    },
    sideSheetInRtl: {
        from: { transform: transform(translateX(pct(-100))) },
        to: { transform: transform(translateX(px(0))) },
    },
    sideSheetOutRtl: {
        from: { transform: transform(translateX(px(0))) },
        to: { transform: transform(translateX(pct(-100))) },
    },
    sheetFadeIn: {
        from: { opacity: unitless(0) },
        to: { opacity: unitless(1) },
    },
    sheetFadeOut: {
        from: { opacity: unitless(1) },
        to: { opacity: unitless(0) },
    },
};

/** The edge a sheet slides from. */
export type SheetEdge = "bottom" | "end";

const run = (
    name: string,
    time: DurationRole,
    curve: EasingRole,
    fillMode: "none" | "forwards",
) =>
    animation({
        name,
        duration: duration(time),
        easing: easing(curve),
        ...(fillMode === "forwards" ? { fillMode } : {}),
    });

// One way in or out: the slide, its right-to-left form for the end edge, and a fade under reduced
// motion.
const step = (
    edge: SheetEdge,
    way: "In" | "Out",
    time: DurationRole,
    curve: EasingRole,
    fillMode: "none" | "forwards",
) => {
    const fade = run(`sheetFade${way}`, time, curve, fillMode);
    if (edge === "bottom") {
        return when(
            "reducedMotion",
            fade,
            run(`bottomSheet${way}`, time, curve, fillMode),
        );
    }
    return when()
        .on("rtl", run(`sideSheet${way}Rtl`, time, curve, fillMode))
        .on("reducedMotion", fade)
        .else(run(`sideSheet${way}`, time, curve, fillMode));
};

/** A sheet's motion, on the element Zag marks with `data-state`: it slides in from its edge
 *  over `long2` on the emphasized decelerating curve while `open`, and back out over `medium1`
 *  on the emphasized accelerating one once `closed`, holding its last frame until it hides. */
export const sheetMotion = (edge: SheetEdge): StyleMap => ({
    rawRules: {
        css: {
            "&[data-state=open]": {
                animation: step(
                    edge,
                    "In",
                    "long2",
                    "emphasizedDecelerate",
                    "none",
                ),
            },
            "&[data-state=closed]": {
                animation: step(
                    edge,
                    "Out",
                    "medium1",
                    "emphasizedAccelerate",
                    "forwards",
                ),
            },
        },
    },
});
