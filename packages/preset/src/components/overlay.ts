// How the overlays enter and leave: keyframes on Zag's `data-state`, which the bindings keep
// mounted until the exit's animation ends (Zag's presence), and the stacking layer each draws at.
//
//   <div data-part="positioner" style="z-index: var(--z-index)">  (Zag copies the surface's)
//     <div class={menu().root} data-state="open">                  (enters)
//     <div class={menu().root} data-state="closed">                (leaves, then hides)
//
// Each motion follows Material 3 in Compose: a menu, select list, tooltip, or snackbar grows
// from 80% and fades in, then fades out faster; a dialog slides down and fades in, as
// material-web's does, and slides back up as it fades out; the scrim fades. Under reduced
// motion the moving keyframes give way to a fade of the same timing. A target without
// `data-state` (React Native) draws no motion.

import {
    animation,
    literal,
    mul,
    px,
    scale,
    transform,
    translateY,
    unitless,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { duration, easing, spacing } from "@pureform/theme";
import type { DurationRole, EasingRole } from "@pureform/theme";

const FADE_IN = "overlayFadeIn";
const FADE_OUT = "overlayFadeOut";

/** The keyframes the overlays animate with; `pureform()` adds them to the config. */
export const OVERLAY_KEYFRAMES: Record<string, Record<string, StyleMap>> = {
    [FADE_IN]: {
        from: { opacity: unitless(0) },
        to: { opacity: unitless(1) },
    },
    [FADE_OUT]: {
        from: { opacity: unitless(1) },
        to: { opacity: unitless(0) },
    },
    // A menu, tooltip, or snackbar grows from its anchor.
    overlayGrowIn: {
        from: {
            opacity: unitless(0),
            transform: transform(scale(unitless(0.8))),
        },
        to: { opacity: unitless(1), transform: transform(scale(unitless(1))) },
    },
    // A dialog comes down into place, and goes back up.
    dialogSlideIn: {
        from: {
            opacity: unitless(0),
            transform: transform(translateY(mul(spacing("12"), unitless(-1)))),
        },
        to: { opacity: unitless(1), transform: transform(translateY(px(0))) },
    },
    dialogSlideOut: {
        from: { opacity: unitless(1), transform: transform(translateY(px(0))) },
        to: {
            opacity: unitless(0),
            transform: transform(translateY(mul(spacing("12"), unitless(-1)))),
        },
    },
};

/** One way in or out: the keyframes, and the theme's duration and easing for them. A fade
 *  moves nothing, so reduced motion keeps it as it is. */
export interface OverlayMotionStep {
    readonly keyframes: string;
    readonly duration: DurationRole;
    readonly easing: EasingRole;
}

/** How an overlay enters and leaves. */
export interface OverlayMotion {
    readonly enter: OverlayMotionStep;
    readonly exit: OverlayMotionStep;
    /** Scale from the point the positioner gives (`--transform-origin`, Zag's), the side the
     *  overlay opens from, rather than its center. */
    readonly fromAnchor?: boolean;
}

const FADES = new Set([FADE_IN, FADE_OUT]);

/** One run of a keyframes over the theme's duration and easing; `forwards` holds the last frame
 *  (an exit that stays gone until the overlay hides). Shared by every overlay's motion. */
export const motionAnimation = (
    name: string,
    time: DurationRole,
    curve: EasingRole,
    fillMode: "none" | "forwards" = "none",
) =>
    animation({
        name,
        duration: duration(time),
        easing: easing(curve),
        ...(fillMode === "forwards" ? { fillMode } : {}),
    });

const step = (
    { keyframes, duration: time, easing: curve }: OverlayMotionStep,
    fade: string,
    fillMode: "none" | "forwards",
) => {
    const run = (name: string) => motionAnimation(name, time, curve, fillMode);
    if (FADES.has(keyframes)) return run(keyframes);
    return when("reducedMotion", run(fade), run(keyframes));
};

/** An overlay's motion, as styles for the element Zag marks with `data-state`: the enter's
 *  animation while it's `open`, the exit's once it's `closed`, holding its last frame until the
 *  overlay hides, so a part that leaves sooner than the surface (a dialog's scrim) stays gone. */
export const overlayMotion = (motion: OverlayMotion): StyleMap => ({
    rawRules: {
        css: {
            "&[data-state=open]": {
                animation: step(motion.enter, FADE_IN, "none"),
                ...(motion.fromAnchor
                    ? { transformOrigin: literal("var(--transform-origin)") }
                    : {}),
            },
            "&[data-state=closed]": {
                animation: step(motion.exit, FADE_OUT, "forwards"),
                ...(motion.fromAnchor
                    ? { transformOrigin: literal("var(--transform-origin)") }
                    : {}),
            },
        },
    },
});

/** A menu, select list, tooltip, or snackbar: grows to full size from 80% as it fades in, over
 *  `short3` on the emphasized decelerating curve, and fades out over `short2` on the
 *  emphasized accelerating one, as Compose's menu, tooltip, and snackbar host do. */
export const POPUP_MOTION = {
    enter: {
        keyframes: "overlayGrowIn",
        duration: "short3",
        easing: "emphasizedDecelerate",
    },
    exit: {
        keyframes: FADE_OUT,
        duration: "short2",
        easing: "emphasizedAccelerate",
    },
} as const satisfies OverlayMotion;

/** A dialog: comes down into place as it fades in, over `long2` on the emphasized
 *  decelerating curve, and goes back up as it fades out over `short3` on the emphasized
 *  accelerating one, as material-web's dialog does. */
export const DIALOG_MOTION = {
    enter: {
        keyframes: "dialogSlideIn",
        duration: "long2",
        easing: "emphasizedDecelerate",
    },
    exit: {
        keyframes: "dialogSlideOut",
        duration: "short3",
        easing: "emphasizedAccelerate",
    },
} as const satisfies OverlayMotion;

/** The scrim behind a dialog: fades in and out with it, on the linear curve. */
export const SCRIM_MOTION = {
    enter: { keyframes: FADE_IN, duration: "long2", easing: "linear" },
    exit: { keyframes: FADE_OUT, duration: "short3", easing: "linear" },
} as const satisfies OverlayMotion;
