// What the bottom and side sheets share: how they slide in from their edge and back out, as
// `overlayMotion`s, and the keyframes for it. A bottom sheet rises from the bottom; a side sheet
// comes in from the end edge, so its keyframes run the other way under right to left (translation
// is physical). The slide springs, as Compose's sheets and drawers do (`BottomSheet.kt`,
// `NavigationDrawer.kt`: shown on `DefaultSpatial`, hidden on `FastEffects`), and a fade runs
// alongside on the fast effects spring. Under reduced motion only the fade runs. A target without
// `data-state` (React Native) draws no motion.

import { pct, px, transform, translateX, translateY } from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { spring } from "@pureform/theme";

import type { OverlayMotion } from "./overlay";
import { tweens } from "./shared";

/** How a dragged sheet settles back once let go: its `translate` (which the drag sets, apart
 *  from the motion's `transform`) on the default spatial spring, as Compose's sheets settle
 *  after a drag (`anchoredDraggableMotionSpec`, `DefaultSpatial`). It drops out under reduced
 *  motion, so the sheet goes back at once. */
export const SHEET_SETTLE = tweens(
    { spring: spring("spatialDefault") },
    "translate",
);

/** The keyframes the sheets slide with; `pureform()` adds them to the config. */
export const SHEET_KEYFRAMES: Record<string, Record<string, StyleMap>> = {
    bottomSheetIn: {
        from: {
            transform: transform(translateY(pct(100))),
        },
        to: {
            transform: transform(translateY(px(0))),
        },
    },
    bottomSheetOut: {
        from: {
            transform: transform(translateY(px(0))),
        },
        to: {
            transform: transform(translateY(pct(100))),
        },
    },
    sideSheetIn: {
        from: {
            transform: transform(translateX(pct(100))),
        },
        to: {
            transform: transform(translateX(px(0))),
        },
    },
    sideSheetOut: {
        from: {
            transform: transform(translateX(px(0))),
        },
        to: {
            transform: transform(translateX(pct(100))),
        },
    },
    sideSheetInRtl: {
        from: {
            transform: transform(translateX(pct(-100))),
        },
        to: {
            transform: transform(translateX(px(0))),
        },
    },
    sideSheetOutRtl: {
        from: {
            transform: transform(translateX(px(0))),
        },
        to: {
            transform: transform(translateX(pct(-100))),
        },
    },
};

/** A bottom sheet's motion (`overlayMotion`, on the element Zag marks with `data-state`): it
 *  rises from the bottom on the default spatial spring while `open`, and goes back down on the
 *  fast effects spring once `closed`, fading in and out on the fast effects spring. */
export const BOTTOM_SHEET_MOTION = {
    enter: {
        keyframes: "bottomSheetIn",
        spring: "spatialDefault",
        fade: { spring: "effectsFast" },
    },
    exit: {
        keyframes: "bottomSheetOut",
        spring: "effectsFast",
        fade: { spring: "effectsFast" },
    },
} as const satisfies OverlayMotion;

/** A side sheet's motion: as the bottom sheet's, sliding from the end edge, which is the left
 *  under right to left. */
export const SIDE_SHEET_MOTION = {
    enter: {
        keyframes: "sideSheetIn",
        rtl: "sideSheetInRtl",
        spring: "spatialDefault",
        fade: { spring: "effectsFast" },
    },
    exit: {
        keyframes: "sideSheetOut",
        rtl: "sideSheetOutRtl",
        spring: "effectsFast",
        fade: { spring: "effectsFast" },
    },
} as const satisfies OverlayMotion;
