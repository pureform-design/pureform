// Overlays' enter and exit, as the preset's keyframes run them on the web: a menu, select list,
// tooltip, or snackbar grows from 80% as it fades in and shrinks back to 80% as it fades out; a
// dialog comes down 48px as it fades in and goes back up as it fades out; a bottom or side sheet
// slides in from its edge and back out; a scrim fades. A step
// that moves runs its movement on the theme's spatial spring and its fade alongside on its own
// (an effects spring). Each is the theme's motion token, so a theme that changes them changes these too.
// Under reduced motion each moving step gives way to its fade, as the web's rule does.
//
// `usePresence(open)` keeps an overlay present until its exit has run to its end, which the
// engine reports (Animated's completion, Reanimated's `onCSSAnimationEnd`), so a `Modal` or the
// surface itself goes only then.

import { slowSpring } from "@pureform/rn-adapter/animated";
import type {
    PresenceDriver,
    PresenceFrame,
    PresenceMotion,
    PresencePhase,
    PresenceStep,
    PresenceTiming,
    Spring,
} from "@pureform/rn-adapter/animated";
import type { ThemeValues } from "@pureform/rn-adapter/factory";
import { isEasing, LINEAR } from "@pureform/rn-adapter/factory";
import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { useWindowDimensions } from "react-native";

import { useDirection, useEngine, usePureform } from "./provider";

/** A move as the theme gives it: pixels, a token's length times a factor, or a share of the
 *  overlay's own size along the move (`{ share: 1 }` for the web's `100%`: a sheet against that
 *  edge goes just out of sight past it). */
export type OverlayMove =
    | number
    | { readonly token: string; readonly times: number }
    | { readonly share: number };

/** A frame as the theme gives it: its opacity and scale, and its moves across and down. */
export interface OverlayFrame {
    readonly opacity?: number;
    readonly scale?: number;
    readonly translateX?: OverlayMove;
    readonly translateY?: OverlayMove;
}

/** The preset's overlay keyframes (`OVERLAY_KEYFRAMES`), by name. */
export const OVERLAY_KEYFRAMES = {
    overlayFadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
    overlayFadeOut: { from: { opacity: 1 }, to: { opacity: 0 } },
    overlayGrowIn: {
        from: { scale: 0.8 },
        to: { scale: 1 },
    },
    overlayShrinkOut: {
        from: { scale: 1 },
        to: { scale: 0.8 },
    },
    overlayHold: {
        from: { opacity: 1 },
        to: { opacity: 1 },
    },
    dialogSlideIn: {
        from: { translateY: { token: "spacing.12", times: -1 } },
        to: { translateY: 0 },
    },
    dialogSlideOut: {
        from: { translateY: 0 },
        to: { translateY: { token: "spacing.12", times: -1 } },
    },
    bottomSheetIn: {
        from: { translateY: { share: 1 } },
        to: { translateY: 0 },
    },
    bottomSheetOut: {
        from: { translateY: 0 },
        to: { translateY: { share: 1 } },
    },
    sideSheetIn: {
        from: { translateX: { share: 1 } },
        to: { translateX: 0 },
    },
    sideSheetOut: {
        from: { translateX: 0 },
        to: { translateX: { share: 1 } },
    },
    sideSheetInRtl: {
        from: { translateX: { share: -1 } },
        to: { translateX: 0 },
    },
    sideSheetOutRtl: {
        from: { translateX: 0 },
        to: { translateX: { share: -1 } },
    },
    fadeThroughGrowIn: {
        from: { scale: 0.8 },
        to: { scale: 1 },
    },
    fadeThroughGrowOut: {
        from: { scale: 1 },
        to: { scale: 1.05 },
    },
} as const satisfies Record<
    string,
    { readonly from: OverlayFrame; readonly to: OverlayFrame }
>;

type KeyframesName = keyof typeof OVERLAY_KEYFRAMES;

/** A timing as the preset names it: the theme's duration and easing roles, or its spring
 *  role, after an optional duration role's `delay`. */
export type OverlayTiming = (
    | {
          readonly duration: string;
          readonly easing: string;
          readonly spring?: never;
      }
    | {
          readonly spring: string;
          readonly duration?: never;
          readonly easing?: never;
      }
) & { readonly delay?: string };

/** One way in or out, as the preset names it: the keyframes and their timing, and for keyframes
 *  that only move, the fade's own timing alongside. */
export type OverlayMotionStep = {
    readonly keyframes: KeyframesName;
    /** The keyframes under right to left, where they differ (translation is physical). */
    readonly rtl?: KeyframesName;
    readonly fade?: OverlayTiming;
} & OverlayTiming;

/** The preset's overlay motions (`POPUP_MOTION`, `DIALOG_MOTION`, `SCRIM_MOTION`, and the FAB
 *  menu's list and items). */
export const OVERLAY_MOTIONS = {
    /** A menu, select list, tooltip, or snackbar. */
    popup: {
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
    },
    /** The FAB menu's list, which holds still until its items (`fabMenuItem`) have left. */
    fabMenuList: {
        enter: { keyframes: "overlayHold", spring: "spatialFast" },
        exit: { keyframes: "overlayHold", spring: "spatialFast" },
    },
    /** One of the FAB menu's items: grows and fades in as a popup does, each after the one nearer
     *  the FAB, and leaves in reverse. */
    fabMenuItem: {
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
    },
    dialog: {
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
    },
    /** A bottom sheet: rises from the bottom edge, and goes back down. */
    bottomSheet: {
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
    },
    /** A side sheet: comes in from the end edge, and goes back out. */
    sideSheet: {
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
    },
    /** The scrim behind a dialog. */
    scrim: {
        enter: { keyframes: "overlayFadeIn", spring: "effectsDefault" },
        exit: { keyframes: "overlayFadeOut", spring: "effectsDefault" },
    },
    /** A fade through's page (`FADE_THROUGH_MOTION`): the incoming one grows from 80% as it
     *  fades in once the outgoing one has faded out, growing to 105%. */
    fadeThrough: {
        enter: {
            keyframes: "fadeThroughGrowIn",
            spring: "spatialDefault",
            fade: { duration: "short4", easing: "linear", delay: "short2" },
        },
        exit: {
            keyframes: "fadeThroughGrowOut",
            spring: "spatialDefault",
            fade: { duration: "short2", easing: "linear" },
        },
    },
} as const satisfies Record<
    string,
    { readonly enter: OverlayMotionStep; readonly exit: OverlayMotionStep }
>;

/** How an overlay enters and leaves: `popup` (a menu, select list, tooltip, or snackbar),
 *  `fabMenuList`, `fabMenuItem`, `dialog`, `bottomSheet`, `sideSheet`, or `scrim`; or a fade
 *  through's page (`fadeThrough`). */
export type OverlayMotionName = keyof typeof OVERLAY_MOTIONS;

const FADES = {
    enter: "overlayFadeIn",
    exit: "overlayFadeOut",
} as const satisfies Record<PresencePhase, KeyframesName>;

const MOVES = new Set<KeyframesName>([
    "overlayGrowIn",
    "overlayShrinkOut",
    "dialogSlideIn",
    "dialogSlideOut",
    "bottomSheetIn",
    "bottomSheetOut",
    "sideSheetIn",
    "sideSheetOut",
    "sideSheetInRtl",
    "sideSheetOutRtl",
    "fadeThroughGrowIn",
    "fadeThroughGrowOut",
]);

const numberOf = (value: unknown, fallback: number): number => {
    const n =
        typeof value === "number" ? value : Number.parseFloat(String(value));
    return Number.isFinite(n) ? n : fallback;
};

/** The overlay's size, which a move by a share of it reads. */
export interface OverlaySize {
    readonly width: number;
    readonly height: number;
}

const moveOf = (
    move: OverlayMove,
    tokens: ThemeValues,
    length: number,
): number =>
    typeof move === "number"
        ? move
        : "share" in move
          ? move.share * length
          : numberOf(tokens[move.token], 0) * move.times;

const frameOf = (
    frame: OverlayFrame,
    opacity: number,
    tokens: ThemeValues,
    size: OverlaySize,
): PresenceFrame => ({
    opacity: frame.opacity ?? opacity,
    ...(frame.scale === undefined ? {} : { scale: frame.scale }),
    ...(frame.translateX === undefined
        ? {}
        : { translateX: moveOf(frame.translateX, tokens, size.width) }),
    ...(frame.translateY === undefined
        ? {}
        : { translateY: moveOf(frame.translateY, tokens, size.height) }),
});

/** A spring role's physics in a theme (its stiffness, damping coefficient, and mass), slowed
 *  `timeScale` times (`slowSpring`): none at no time at all. */
export const themeSpring = (
    role: string,
    tokens: ThemeValues,
    timeScale = 1,
): Spring | undefined => {
    const field = (name: string) => tokens[`springs.${role}.${name}`];
    return slowSpring(
        {
            type: "spring",
            stiffness: numberOf(field("stiffness"), 1),
            damping: numberOf(field("damping"), 0),
            mass: numberOf(field("mass"), 1),
        },
        timeScale,
    );
};

// A timing in a theme: its duration (`timeScale` times as long) and curve, and for a spring,
// its physics, slowed `timeScale` times (`slowSpring`).
const timingOf = (
    given: OverlayTiming,
    tokens: ThemeValues,
    timeScale: number,
): PresenceTiming => {
    const delay =
        given.delay === undefined
            ? {}
            : {
                  delay:
                      numberOf(tokens[`durations.${given.delay}`], 0) *
                      timeScale,
              };
    const role = given.spring;
    if (role !== undefined) {
        const field = (name: string) => tokens[`springs.${role}.${name}`];
        const easing = field("easing");
        const spring = themeSpring(role, tokens, timeScale);
        return {
            duration: numberOf(field("duration"), 0) * timeScale,
            easing: isEasing(easing) ? easing : LINEAR,
            ...(spring ? { spring } : {}),
            ...delay,
        };
    }
    const easing = tokens[`easings.${given.easing}`];
    return {
        duration:
            numberOf(tokens[`durations.${given.duration}`], 0) * timeScale,
        easing: isEasing(easing) ? easing : LINEAR,
        ...delay,
    };
};

/** How long each step waits before it starts, in ms (before `timeScale`). */
export interface OverlayDelay {
    readonly enter?: number;
    readonly exit?: number;
}

/** An overlay's motion in a theme: its frames (a move by a share of its own `size`, and
 *  under `rtl` its right-to-left keyframes), its durations (`timeScale` times as long), curves
 *  and springs from the theme's tokens, and under `reducedMotion` its fade alone in place of
 *  each step that moves. */
export const overlayMotion = (
    name: OverlayMotionName,
    tokens: ThemeValues,
    reducedMotion: boolean,
    timeScale = 1,
    size: OverlaySize = { width: 0, height: 0 },
    rtl = false,
    delay: OverlayDelay = {},
): PresenceMotion => {
    const step = (phase: PresencePhase): PresenceStep => {
        const {
            keyframes: ltr,
            rtl: mirrored,
            fade,
            ...timing
        } = OVERLAY_MOTIONS[name][phase] as OverlayMotionStep;
        const given = rtl && mirrored ? mirrored : ltr;
        const moving = MOVES.has(given);
        const keyframes = reducedMotion && moving ? FADES[phase] : given;
        const frames: { from: OverlayFrame; to: OverlayFrame } =
            OVERLAY_KEYFRAMES[keyframes];
        const faded = OVERLAY_KEYFRAMES[FADES[phase]];
        const ends = {
            from: frameOf(frames.from, faded.from.opacity, tokens, size),
            to: frameOf(frames.to, faded.to.opacity, tokens, size),
        };
        // Reduced motion leaves the fade, on its own timing.
        if (reducedMotion && moving) {
            return { ...ends, ...timingOf(fade ?? timing, tokens, timeScale) };
        }
        const wait = (delay[phase] ?? 0) * timeScale;
        const waiting = wait > 0 ? { delay: wait } : {};
        return {
            ...ends,
            ...timingOf(timing, tokens, timeScale),
            ...waiting,
            ...(fade
                ? { fade: { ...timingOf(fade, tokens, timeScale), ...waiting } }
                : {}),
        };
    };
    return { enter: step("enter"), exit: step("exit") };
};

/** What `usePresence` gives an overlay. */
export interface Presence {
    /** Whether to render the overlay: while it's open, and until its exit has ended. */
    readonly present: boolean;
    /** The moving view's style: its opacity and transform, animated by the engine. */
    readonly style: Record<string, unknown>;
    /** Props for the moving view, which must be the engine's view (`useEngine().View`). For a
     *  motion that moves by the overlay's own size, they include the `onLayout` measuring it:
     *  call it from the view's own `onLayout`, if it has one. */
    readonly props: Record<string, unknown>;
}

const STILL = Object.freeze({});
const UNSEEN = Object.freeze({ opacity: 0 });

// The motions that move by a share of the overlay's own size, which they measure.
const SIZED = new Set<OverlayMotionName>(
    (Object.keys(OVERLAY_MOTIONS) as OverlayMotionName[]).filter((name) =>
        Object.values(OVERLAY_MOTIONS[name]).some((step: OverlayMotionStep) =>
            [step.keyframes, step.rtl].some(
                (keyframes) =>
                    keyframes !== undefined &&
                    Object.values(OVERLAY_KEYFRAMES[keyframes]).some(
                        (frame: OverlayFrame) =>
                            [frame.translateX, frame.translateY].some(
                                (move) =>
                                    typeof move === "object" && "share" in move,
                            ),
                    ),
            ),
        ),
    ),
);

/** An overlay's enter and exit through the provider's engine (each step waiting its `delay`): it enters when `open` turns
 *  true (or mounts open), and stays present when it turns false until the exit ends, so the
 *  overlay (or the `Modal` it's in) goes only then. Give `style` and `props` to the engine's
 *  view that moves.
 *
 *  ```tsx
 *  const presence = usePresence(open, "dialog");
 *  const engine = useEngine();
 *  <Modal transparent visible={presence.present}>
 *      <engine.View style={presence.style} {...presence.props}>…</engine.View>
 *  </Modal>
 *  ```
 */
export function usePresence(
    open: boolean,
    motion: OverlayMotionName = "popup",
    delay?: OverlayDelay,
): Presence {
    return useOverlayPresence(open, motion, delay);
}

/** As `usePresence`, for a surface whose `open` is optional: without it, the surface is always
 *  present and still. A sheet slides by its own size, measured by the moving view's layout: its
 *  enter waits for the first measure, and each step keeps the size it started with, so a sheet
 *  that grows while it moves doesn't start the step over. */
export function useOverlayPresence(
    open: boolean | undefined,
    motion: OverlayMotionName,
    delay?: OverlayDelay,
    onEntered?: () => void,
): Presence {
    const engine = useEngine();
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const { timeScale } = usePureform();
    const window = useWindowDimensions();
    const rtl = useDirection() === "rtl";
    const sized = SIZED.has(motion);
    const [measured, setMeasured] = useState<OverlaySize>();
    const shownNow = open ?? true;
    const phase: PresencePhase = shownNow ? "enter" : "exit";
    // The size a step moves by: measured when it started, or once it's first measured.
    const held = useRef<{ phase: PresencePhase; size: OverlaySize }>(undefined);
    if (
        measured &&
        (held.current === undefined || held.current.phase !== phase)
    )
        held.current = { phase, size: measured };
    const computed = overlayMotion(
        motion,
        tokens,
        reducedMotion,
        timeScale,
        held.current?.size ?? window,
        rtl,
        delay,
    );
    const onLayout = useCallback((event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setMeasured((last) =>
            last?.width === width && last.height === height
                ? last
                : { width, height },
        );
    }, []);
    // Kept while it's the same, so a render doesn't start a step over.
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- kept while the motion is the same by value, so a render doesn't restart a step
    const resolved = useMemo(() => computed, [JSON.stringify(computed)]);
    const moves = open !== undefined;
    const driver = useMemo<PresenceDriver | undefined>(
        () => (moves ? engine.presence?.() : undefined),
        [engine, moves],
    );
    const [present, setPresent] = useState(shownNow);
    if (shownNow && !present) setPresent(true);
    const shown = shownNow || present;
    const latest = useRef(phase);
    const entered = useRef(onEntered);
    useLayoutEffect(() => {
        latest.current = phase;
        entered.current = onEntered;
    });
    const done = useCallback((ended: PresencePhase) => {
        if (ended === "exit" && latest.current === "exit") setPresent(false);
        if (ended === "enter" && latest.current === "enter")
            entered.current?.();
    }, []);
    // A sized motion's enter waits for its first measure, unseen meanwhile; then the engine's
    // view takes over from its first frame.
    const measuring = sized && phase === "enter" && held.current === undefined;
    useLayoutEffect(() => {
        if (!shown || measuring) return;
        if (!driver) {
            done(phase);
            return;
        }
        const stop = driver.run(phase, resolved, done);
        // A step that takes no time may never report its end.
        const step = resolved[phase];
        if (Math.max(step.duration, step.fade?.duration ?? 0) <= 0) done(phase);
        return stop;
    }, [driver, resolved, phase, shown, measuring, done]);
    if (!driver) return { present: shownNow, style: STILL, props: STILL };
    if (measuring)
        return { present: shown, style: UNSEEN, props: { onLayout } };
    const view = driver.view(phase, resolved, done);
    return {
        present: shown,
        style: view.style,
        props: sized ? { ...view.props, onLayout } : view.props,
    };
}
