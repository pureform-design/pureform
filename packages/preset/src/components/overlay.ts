// How the overlays enter and leave: keyframes on Zag's `data-state`, which the bindings keep
// mounted until the exit's animation ends (Zag's presence), and the stacking layer each draws at.
//
//   <div data-part="positioner" style="z-index: var(--z-index)">  (Zag copies the surface's)
//     <div class={menu().root} data-state="open">                  (enters)
//     <div class={menu().root} data-state="closed">                (leaves, then hides)
//
// Each motion follows Material 3 in Compose: a menu, select list, tooltip, or snackbar grows
// from 80% as it fades in, and shrinks back to 80% as it fades out; a dialog slides down and
// fades in, as material-web's does, and slides back up as it fades out; the scrim fades. The
// movement and the fade are two animations: the movement runs on a spatial spring and the fade
// on an effects spring, as Compose's do. Under reduced motion only the fade runs. A target without
// `data-state` (React Native) draws no motion.

import {
    animation,
    animations,
    literal,
    mul,
    px,
    transform,
    translateY,
    unitless,
    when,
} from "@pureform/core/ast";
import type { NumericValue, StyleMap } from "@pureform/core/ast";
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
    // A menu, tooltip, or snackbar grows from its anchor (fading in alongside). It's the `scale`
    // property, so it composes with a transform of the overlay's own (a toast's stacking).
    overlayGrowIn: {
        from: { scale: unitless(0.8) },
        to: { scale: unitless(1) },
    },
    // ...and shrinks back to it as it leaves (fading out alongside).
    overlayShrinkOut: {
        from: { scale: unitless(1) },
        to: { scale: unitless(0.8) },
    },
    // A surface that only holds still while its parts move (the FAB menu's list, whose items
    // enter and leave on their own), so its presence waits for them.
    overlayHold: {
        from: { opacity: unitless(1) },
        to: { opacity: unitless(1) },
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
 *  role, or a spring role, which sets both. Either may wait a duration role's `delay` first,
 *  showing its first frame meanwhile. */
export type MotionTiming = (
    | {
          readonly duration: DurationRole;
          readonly easing: EasingRole;
          readonly spring?: never;
      }
    | {
          readonly spring: SpringRole;
          readonly duration?: never;
          readonly easing?: never;
      }
) & { readonly delay?: DurationRole };

/** One way in or out: the keyframes, and the theme's duration and easing for them, or its
 *  spring. A fade moves nothing, so reduced motion keeps it as it is. */
export type OverlayMotionStep = {
    readonly keyframes: string;
    /** The keyframes under right to left, for a motion that moves sideways (translation is
     *  physical): a side sheet's slide. */
    readonly rtl?: string;
    /** For keyframes that only move: the fade that runs alongside them, on its own timing (the
     *  overlay fade in or out), so the movement and the fade can each take their own spring.
     *  Under reduced motion it runs alone. */
    readonly fade?: MotionTiming;
    /** How long the step waits before it starts, which its fade waits too. Under reduced motion
     *  the fade runs at once. */
    readonly wait?: NumericValue;
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
 *  role. `forwards` holds the last frame (an exit that stays gone until the overlay hides); a
 *  delayed run also holds its first frame through the delay. */
export const timedAnimation = (
    name: string,
    timing: MotionTiming,
    fillMode: "none" | "forwards" = "none",
    delay?: NumericValue,
) => {
    // A delayed run shows its first frame through the delay, so an item that waits its turn
    // isn't drawn before it enters.
    const fill =
        timing.delay || delay
        ? fillMode === "forwards"
            ? "both"
            : "backwards"
        : fillMode;
    return animation({
        name,
        ...(delay ? { delay } : {}),
        ...(timing.spring
            ? { spring: spring(timing.spring) }
            : {
                  duration: duration(timing.duration),
                  easing: easing(timing.easing),
              }),
        ...(timing.delay ? { delay: duration(timing.delay) } : {}),
        ...(fill === "none" ? {} : { fillMode: fill }),
    });
};

/** One run of a keyframes over the theme's duration and easing; `forwards` holds the last frame
 *  (an exit that stays gone until the overlay hides). Shared by every overlay's motion. */
export const motionAnimation = (
    name: string,
    time: DurationRole,
    curve: EasingRole,
    fillMode: "none" | "forwards" = "none",
) => timedAnimation(name, { duration: time, easing: curve }, fillMode);

const step = (
    { keyframes, rtl, fade: fadeTiming, wait, ...timing }: OverlayMotionStep,
    fade: string,
    fillMode: "none" | "forwards",
) => {
    const fading = timedAnimation(fade, fadeTiming ?? timing, fillMode);
    const run = (name: string) => {
        const moving = timedAnimation(name, timing, fillMode, wait);
        return fadeTiming
            ? animations(
                  moving,
                  timedAnimation(fade, fadeTiming, fillMode, wait),
              )
            : moving;
    };
    if (FADES.has(keyframes))
        return timedAnimation(keyframes, timing, fillMode);
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
 *  spring as it fades in on the fast effects spring, and shrinks back to 80% as it fades out on
 *  the same two. Compose's menu, tooltip, and snackbar host scale between 0.8 and 1 on
 *  `FastSpatial` and fade on `FastEffects` both ways (`Menu.kt` `DropdownMenuContent`,
 *  `ClosedScaleTarget = 0.8f`; `Tooltip.kt`; `SnackbarHost.kt` `FadeInFadeOutWithScale`). */
export const POPUP_MOTION = {
    enter: {
        keyframes: "overlayGrowIn",
        spring: "spatialFast",
        fade: { spring: "effectsFast" },
    },
    exit: {
        keyframes: "overlayShrinkOut",
        spring: "spatialFast",
        fade: { spring: "effectsFast" },
    },
} as const satisfies OverlayMotion;

/** A dialog: comes down into place on the default spatial spring, and goes back up on the fast
 *  effects spring, as material-web's dialog moves; it fades in and out on the fast effects
 *  spring. Compose's dialog has no motion of its own; the springs are its sheets' and drawers'
 *  (shown on `DefaultSpatial`, hidden on `FastEffects`). */
export const DIALOG_MOTION = {
    enter: {
        keyframes: "dialogSlideIn",
        spring: "spatialDefault",
        fade: { spring: "effectsFast" },
    },
    exit: {
        keyframes: "dialogSlideOut",
        spring: "effectsFast",
        fade: { spring: "effectsFast" },
    },
} as const satisfies OverlayMotion;

/** The scrim behind a dialog: fades in and out with it on the default effects spring, as
 *  Compose's modal bottom sheet fades its scrim (`ModalBottomSheet.kt`, `DefaultEffects`). */
export const SCRIM_MOTION = {
    enter: { keyframes: FADE_IN, spring: "effectsDefault" },
    exit: { keyframes: FADE_OUT, spring: "effectsDefault" },
} as const satisfies OverlayMotion;
