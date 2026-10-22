// Overlays' enter and exit, as the preset's keyframes run them on the web: a menu, select list,
// tooltip, or snackbar grows from 80% as it fades in and fades out faster; a dialog comes down
// 48px as it fades in and goes back up as it fades out; a scrim fades. A step that moves runs
// its movement on the theme's spring and its fade alongside on the fade's own duration and
// curve. Each is the theme's motion token, so a theme that changes them changes these too.
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
import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useEngine, usePureform } from "./provider";

/** A frame as the theme gives it: a move down in pixels, or by a token's length times a
 *  factor. */
export interface OverlayFrame {
    readonly opacity?: number;
    readonly scale?: number;
    readonly translateY?:
        | number
        | { readonly token: string; readonly times: number };
}

/** The preset's overlay keyframes (`OVERLAY_KEYFRAMES`), by name. */
export const OVERLAY_KEYFRAMES = {
    overlayFadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
    overlayFadeOut: { from: { opacity: 1 }, to: { opacity: 0 } },
    overlayGrowIn: {
        from: { scale: 0.8 },
        to: { scale: 1 },
    },
    dialogSlideIn: {
        from: { translateY: { token: "spacing.12", times: -1 } },
        to: { translateY: 0 },
    },
    dialogSlideOut: {
        from: { translateY: 0 },
        to: { translateY: { token: "spacing.12", times: -1 } },
    },
} as const satisfies Record<
    string,
    { readonly from: OverlayFrame; readonly to: OverlayFrame }
>;

type KeyframesName = keyof typeof OVERLAY_KEYFRAMES;

/** A timing as the preset names it: the theme's duration and easing roles, or its spring
 *  role. */
export type OverlayTiming =
    | {
          readonly duration: string;
          readonly easing: string;
          readonly spring?: never;
      }
    | {
          readonly spring: string;
          readonly duration?: never;
          readonly easing?: never;
      };

/** One way in or out, as the preset names it: the keyframes and their timing, and for keyframes
 *  that only move, the fade's own timing alongside. */
export type OverlayMotionStep = {
    readonly keyframes: KeyframesName;
    readonly fade?: OverlayTiming;
} & OverlayTiming;

/** The preset's overlay motions (`POPUP_MOTION`, `DIALOG_MOTION`, `SCRIM_MOTION`). */
export const OVERLAY_MOTIONS = {
    /** A menu, select list, tooltip, or snackbar. */
    popup: {
        enter: {
            keyframes: "overlayGrowIn",
            spring: "spatialFast",
            fade: { duration: "short3", easing: "emphasizedDecelerate" },
        },
        exit: {
            keyframes: "overlayFadeOut",
            duration: "short2",
            easing: "emphasizedAccelerate",
        },
    },
    dialog: {
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
    },
    /** The scrim behind a dialog. */
    scrim: {
        enter: {
            keyframes: "overlayFadeIn",
            duration: "long2",
            easing: "linear",
        },
        exit: {
            keyframes: "overlayFadeOut",
            duration: "short3",
            easing: "linear",
        },
    },
} as const satisfies Record<
    string,
    { readonly enter: OverlayMotionStep; readonly exit: OverlayMotionStep }
>;

/** How an overlay enters and leaves: `popup` (a menu, select list, tooltip, or snackbar),
 *  `dialog`, or `scrim`. */
export type OverlayMotionName = keyof typeof OVERLAY_MOTIONS;

const FADES = {
    enter: "overlayFadeIn",
    exit: "overlayFadeOut",
} as const satisfies Record<PresencePhase, KeyframesName>;

const MOVES = new Set<KeyframesName>([
    "overlayGrowIn",
    "dialogSlideIn",
    "dialogSlideOut",
]);

const numberOf = (value: unknown, fallback: number): number => {
    const n =
        typeof value === "number" ? value : Number.parseFloat(String(value));
    return Number.isFinite(n) ? n : fallback;
};

const frameOf = (
    frame: OverlayFrame,
    opacity: number,
    tokens: ThemeValues,
): PresenceFrame => {
    const move = frame.translateY;
    return {
        opacity: frame.opacity ?? opacity,
        ...(frame.scale === undefined ? {} : { scale: frame.scale }),
        ...(move === undefined
            ? {}
            : {
                  translateY:
                      typeof move === "number"
                          ? move
                          : numberOf(tokens[move.token], 0) * move.times,
              }),
    };
};

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
    const role = given.spring;
    if (role !== undefined) {
        const field = (name: string) => tokens[`springs.${role}.${name}`];
        const easing = field("easing");
        const spring = themeSpring(role, tokens, timeScale);
        return {
            duration: numberOf(field("duration"), 0) * timeScale,
            easing: typeof easing === "string" ? easing : "linear",
            ...(spring ? { spring } : {}),
        };
    }
    const easing = tokens[`easings.${given.easing}`];
    return {
        duration:
            numberOf(tokens[`durations.${given.duration}`], 0) * timeScale,
        easing: typeof easing === "string" ? easing : "linear",
    };
};

/** An overlay's motion in a theme: its frames, its durations (`timeScale` times as long),
 *  curves and springs from the theme's tokens, and under `reducedMotion` its fade alone in
 *  place of each step that moves. */
export const overlayMotion = (
    name: OverlayMotionName,
    tokens: ThemeValues,
    reducedMotion: boolean,
    timeScale = 1,
): PresenceMotion => {
    const step = (phase: PresencePhase): PresenceStep => {
        const {
            keyframes: given,
            fade,
            ...timing
        } = OVERLAY_MOTIONS[name][phase] as OverlayMotionStep;
        const moving = MOVES.has(given);
        const keyframes = reducedMotion && moving ? FADES[phase] : given;
        const frames: { from: OverlayFrame; to: OverlayFrame } =
            OVERLAY_KEYFRAMES[keyframes];
        const faded = OVERLAY_KEYFRAMES[FADES[phase]];
        const ends = {
            from: frameOf(frames.from, faded.from.opacity, tokens),
            to: frameOf(frames.to, faded.to.opacity, tokens),
        };
        // Reduced motion leaves the fade, on its own timing.
        if (reducedMotion && moving) {
            return { ...ends, ...timingOf(fade ?? timing, tokens, timeScale) };
        }
        return {
            ...ends,
            ...timingOf(timing, tokens, timeScale),
            ...(fade ? { fade: timingOf(fade, tokens, timeScale) } : {}),
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
    /** Props for the moving view, which must be the engine's view (`useEngine().View`). */
    readonly props: Record<string, unknown>;
}

const STILL = Object.freeze({});

/** An overlay's enter and exit through the provider's engine: it enters when `open` turns
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
): Presence {
    return useOverlayPresence(open, motion);
}

/** As `usePresence`, for a surface whose `open` is optional: without it, the surface is always
 *  present and still. */
export function useOverlayPresence(
    open: boolean | undefined,
    motion: OverlayMotionName,
): Presence {
    const engine = useEngine();
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const { timeScale } = usePureform();
    const computed = overlayMotion(motion, tokens, reducedMotion, timeScale);
    // Kept while it's the same, so a render doesn't start a step over.
    const resolved = useMemo(() => computed, [JSON.stringify(computed)]);
    const moves = open !== undefined;
    const driver = useMemo<PresenceDriver | undefined>(
        () => (moves ? engine.presence?.() : undefined),
        [engine, moves],
    );
    const shownNow = open ?? true;
    const [present, setPresent] = useState(shownNow);
    if (shownNow && !present) setPresent(true);
    const shown = shownNow || present;
    const phase: PresencePhase = shownNow ? "enter" : "exit";
    const latest = useRef(phase);
    useLayoutEffect(() => {
        latest.current = phase;
    });
    const done = useCallback((ended: PresencePhase) => {
        if (ended === "exit" && latest.current === "exit") setPresent(false);
    }, []);
    useLayoutEffect(() => {
        if (!shown) return;
        if (!driver) {
            done(phase);
            return;
        }
        const stop = driver.run(phase, resolved, done);
        // A step that takes no time may never report its end.
        const step = resolved[phase];
        if (Math.max(step.duration, step.fade?.duration ?? 0) <= 0) done(phase);
        return stop;
    }, [driver, resolved, phase, shown]);
    if (!driver) return { present: shownNow, style: STILL, props: STILL };
    const view = driver.view(phase, resolved, done);
    return { present: shown, style: view.style, props: view.props };
}
