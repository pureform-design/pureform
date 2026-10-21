// What the bottom and side sheets share: how they slide in from their edge and back out, as
// `overlayMotion`s, and the keyframes for it. A bottom sheet rises from the bottom; a side sheet
// comes in from the end edge, so its keyframes run the other way under right to left (translation
// is physical). Under reduced motion both fade with the other overlays' fade. A target without
// `data-state` (React Native) draws no motion.

import {
    pct,
    px,
    transform,
    translateX,
    translateY,
    unitless,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";

import type { OverlayMotion } from "./overlay";

/** The keyframes the sheets slide with; `pureform()` adds them to the config. */
export const SHEET_KEYFRAMES: Record<string, Record<string, StyleMap>> = {
    bottomSheetIn: {
        from: {
            opacity: unitless(0),
            transform: transform(translateY(pct(100))),
        },
        to: {
            opacity: unitless(1),
            transform: transform(translateY(px(0))),
        },
    },
    bottomSheetOut: {
        from: {
            opacity: unitless(1),
            transform: transform(translateY(px(0))),
        },
        to: {
            opacity: unitless(0),
            transform: transform(translateY(pct(100))),
        },
    },
    sideSheetIn: {
        from: {
            opacity: unitless(0),
            transform: transform(translateX(pct(100))),
        },
        to: {
            opacity: unitless(1),
            transform: transform(translateX(px(0))),
        },
    },
    sideSheetOut: {
        from: {
            opacity: unitless(1),
            transform: transform(translateX(px(0))),
        },
        to: {
            opacity: unitless(0),
            transform: transform(translateX(pct(100))),
        },
    },
    sideSheetInRtl: {
        from: {
            opacity: unitless(0),
            transform: transform(translateX(pct(-100))),
        },
        to: {
            opacity: unitless(1),
            transform: transform(translateX(px(0))),
        },
    },
    sideSheetOutRtl: {
        from: {
            opacity: unitless(1),
            transform: transform(translateX(px(0))),
        },
        to: {
            opacity: unitless(0),
            transform: transform(translateX(pct(-100))),
        },
    },
};

/** A bottom sheet's motion (`overlayMotion`, on the element Zag marks with `data-state`): it
 *  rises from the bottom over `long2` on the emphasized decelerating curve while `open`, and
 *  goes back down over `medium1` on the emphasized accelerating one once `closed`. */
export const BOTTOM_SHEET_MOTION = {
    enter: {
        keyframes: "bottomSheetIn",
        duration: "long2",
        easing: "emphasizedDecelerate",
    },
    exit: {
        keyframes: "bottomSheetOut",
        duration: "medium1",
        easing: "emphasizedAccelerate",
    },
} as const satisfies OverlayMotion;

/** A side sheet's motion: as the bottom sheet's, sliding from the end edge, which is the left
 *  under right to left. */
export const SIDE_SHEET_MOTION = {
    enter: {
        keyframes: "sideSheetIn",
        rtl: "sideSheetInRtl",
        duration: "long2",
        easing: "emphasizedDecelerate",
    },
    exit: {
        keyframes: "sideSheetOut",
        rtl: "sideSheetOutRtl",
        duration: "medium1",
        easing: "emphasizedAccelerate",
    },
} as const satisfies OverlayMotion;
