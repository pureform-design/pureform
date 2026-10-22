// How the overlays enter and leave: keyframes on Zag's `data-state`, which the bindings keep
// mounted until the exit's animation ends (Zag's presence), and the stacking layer each draws at.
//
//   <div data-part="positioner" style="z-index: var(--z-index)">  (Zag copies the surface's)
//     <div class={menu().root} data-state="open">                  (enters)
//     <div class={menu().root} data-state="closed">                (leaves, then hides)
//
// Each motion follows Material 3 in Compose: a menu, select list, tooltip, or snackbar grows
// from 80% and fades in, then fades out faster; a dialog slides down and fades in, as
// material-web's does, and slides back up as it fades out; the scrim fades. The movement and
// the fade are two animations: the movement runs on a spring, as Compose's do, and the fade
// keeps its duration and curve. Under reduced motion only the fade runs. A target without
// `data-state` (React Native) draws no motion.

import {
    animation,
    animations,
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
import { duration, easing, spacing, spring } from "@pureform/theme";
import type { DurationRole, EasingRole, SpringRole } from "@pureform/theme";

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
    // A menu, tooltip, or snackbar grows from its anchor (fading in alongside).
    overlayGrowIn: {
        from: { transform: transform(scale(unitless(0.8))) },
        to: { transform: transform(scale(unitless(1))) },
    },
    // A dialog comes down into place, and goes back up.
    dialogSlideIn: {
        from: {
            transform: transform(translateY(mul(spacing("12"), unitless(-1)))),
        },
        to: { transform: transform(translateY(px(0))) },
    },
    dialogSlideOut: {
        from: { transform: transform(translateY(px(0))) },
        to: {
            transform: transform(translateY(mul(spacing("12"), unitless(-1)))),
        },
    },
};

/** How long a motion takes and how it eases, as the theme names them: a duration and easing
 *  role, or a spring role, which sets both. */
export type MotionTiming =
    | {
          readonly duration: DurationRole;
          readonly easing: EasingRole;
          readonly spring?: never;
      }
    | {
          readonly spring: SpringRole;
          readonly duration?: never;
          readonly easing?: never;
      };

/** One way in or out: the keyframes, and the theme's duration and easing for them, or its
 *  spring. A fade moves nothing, so reduced motion keeps it as it is. */
export type OverlayMotionStep = {
    readonly keyframes: string;
    /** The keyframes under right to left, for a motion that moves sideways (translation is
     *  physical): a side sheet's slide. */
    readonly rtl?: string;
    /** For keyframes that only move: the fade that runs alongside them, on its own timing (the
     *  overlay fade in or out), so the movement can spring while the fade keeps its tween.
     *  Under reduced motion it runs alone. */
    readonly fade?: MotionTiming;
} & MotionTiming;

/** How an overlay enters and leaves. */
export interface OverlayMotion {
    readonly enter: OverlayMotionStep;
    readonly exit: OverlayMotionStep;
    /** Scale from the point the positioner gives (`--transform-origin`, Zag's), the side the
     *  overlay opens from, rather than its center. */
    readonly fromAnchor?: boolean;
}

const FADES = new Set([FADE_IN, FADE_OUT]);

/** One run of a keyframes on a timing the theme names: a duration and easing role, or a spring
 *  role. `forwards` holds the last frame (an exit that stays gone until the overlay hides). */
export const timedAnimation = (
    name: string,
    timing: MotionTiming,
    fillMode: "none" | "forwards" = "none",
) =>
    animation({
        name,
        ...(timing.spring
            ? { spring: spring(timing.spring) }
            : {
                  duration: duration(timing.duration),
                  easing: easing(timing.easing),
              }),
        ...(fillMode === "forwards" ? { fillMode } : {}),
    });

/** One run of a keyframes over the theme's duration and easing; `forwards` holds the last frame
 *  (an exit that stays gone until the overlay hides). Shared by every overlay's motion. */
export const motionAnimation = (
    name: string,
    time: DurationRole,
    curve: EasingRole,
    fillMode: "none" | "forwards" = "none",
) => timedAnimation(name, { duration: time, easing: curve }, fillMode);

const step = (
    { keyframes, rtl, fade: fadeTiming, ...timing }: OverlayMotionStep,
    fade: string,
    fillMode: "none" | "forwards",
) => {
    const fading = timedAnimation(fade, fadeTiming ?? timing, fillMode);
    const run = (name: string) => {
        const moving = timedAnimation(name, timing, fillMode);
        return fadeTiming ? animations(moving, fading) : moving;
    };
    if (FADES.has(keyframes)) return timedAnimation(keyframes, timing, fillMode);
    if (rtl) {
        return when()
            .on("rtl", run(rtl))
            .on("reducedMotion", fading)
            .else(run(keyframes));
    }
    return when("reducedMotion", fading, run(keyframes));
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

/** A menu, select list, tooltip, or snackbar: grows to full size from 80% on the fast spatial
 *  spring as it fades in over `short3` on the emphasized decelerating curve, and fades out over
 *  `short2` on the emphasized accelerating one. Compose's menu, tooltip, and snackbar host
 *  scale on `FastSpatial` (`Menu.kt`, `Tooltip.kt`, `SnackbarHost.kt`). */
export const POPUP_MOTION = {
    enter: {
        keyframes: "overlayGrowIn",
        spring: "spatialFast",
        fade: { duration: "short3", easing: "emphasizedDecelerate" },
    },
    exit: {
        keyframes: FADE_OUT,
        duration: "short2",
        easing: "emphasizedAccelerate",
    },
} as const satisfies OverlayMotion;

/** A dialog: comes down into place on the default spatial spring as it fades in over `long2`
 *  on the emphasized decelerating curve, and goes back up on the fast effects spring as it
 *  fades out over `short3` on the emphasized accelerating one, as material-web's dialog moves.
 *  Compose's dialog has no motion of its own; the springs are its sheets' and drawers' (shown
 *  on `DefaultSpatial`, hidden on `FastEffects`). */
export const DIALOG_MOTION = {
    enter: {
        keyframes: "dialogSlideIn",
        spring: "spatialDefault",
        fade: { duration: "long2", easing: "emphasizedDecelerate" },
    },
    exit: {
        keyframes: "dialogSlideOut",
        spring: "effectsFast",
        fade: { duration: "short3", easing: "emphasizedAccelerate" },
    },
} as const satisfies OverlayMotion;

/** The scrim behind a dialog: fades in and out with it, on the linear curve. */
export const SCRIM_MOTION = {
    enter: { keyframes: FADE_IN, duration: "long2", easing: "linear" },
    exit: { keyframes: FADE_OUT, duration: "short3", easing: "linear" },
} as const satisfies OverlayMotion;
