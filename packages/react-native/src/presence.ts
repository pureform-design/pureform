// Overlays' enter and exit, as the preset's keyframes run them on the web: a menu, select list,
// tooltip, or snackbar grows from 80% as it fades in and fades out faster; a dialog comes down
// 48px as it fades in and goes back up as it fades out; a scrim fades. Each duration and curve
// is the theme's motion token, so a theme that changes them changes these too. Under reduced
// motion each moving step gives way to a fade of the same timing, as the web's rule does.
//
// `usePresence(open)` keeps an overlay present until its exit has run to its end, which the
// engine reports (Animated's completion, Reanimated's `onCSSAnimationEnd`), so a `Modal` or the
// surface itself goes only then.

import type {
    PresenceDriver,
    PresenceFrame,
    PresenceMotion,
    PresencePhase,
    PresenceStep,
} from "@pureform/rn-adapter/animated";
import type { ThemeValues } from "@pureform/rn-adapter/factory";
import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useEngine, usePureform } from "./provider";

/** A frame as the theme gives it: a move down in pixels, or by a token's length times a
 *  factor. */
export interface OverlayFrame {
    readonly opacity: number;
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
        from: { opacity: 0, scale: 0.8 },
        to: { opacity: 1, scale: 1 },
    },
    dialogSlideIn: {
        from: { opacity: 0, translateY: { token: "spacing.12", times: -1 } },
        to: { opacity: 1, translateY: 0 },
    },
    dialogSlideOut: {
        from: { opacity: 1, translateY: 0 },
        to: { opacity: 0, translateY: { token: "spacing.12", times: -1 } },
    },
} as const satisfies Record<
    string,
    { readonly from: OverlayFrame; readonly to: OverlayFrame }
>;

type KeyframesName = keyof typeof OVERLAY_KEYFRAMES;

/** One way in or out, as the preset names it: the keyframes, and the theme's duration and
 *  easing roles for them. */
export interface OverlayMotionStep {
    readonly keyframes: KeyframesName;
    readonly duration: string;
    readonly easing: string;
}

/** The preset's overlay motions (`POPUP_MOTION`, `DIALOG_MOTION`, `SCRIM_MOTION`). */
export const OVERLAY_MOTIONS = {
    /** A menu, select list, tooltip, or snackbar. */
    popup: {
        enter: {
            keyframes: "overlayGrowIn",
            duration: "short3",
            easing: "emphasizedDecelerate",
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
            duration: "long2",
            easing: "emphasizedDecelerate",
        },
        exit: {
            keyframes: "dialogSlideOut",
            duration: "short3",
            easing: "emphasizedAccelerate",
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

const FADES: Record<PresencePhase, KeyframesName> = {
    enter: "overlayFadeIn",
    exit: "overlayFadeOut",
};

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

const frameOf = (frame: OverlayFrame, tokens: ThemeValues): PresenceFrame => {
    const move = frame.translateY;
    return {
        opacity: frame.opacity,
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

/** An overlay's motion in a theme: its frames, its durations (`timeScale` times as long) and
 *  curves from the theme's tokens, and under `reducedMotion` a fade in place of each step that
 *  moves. */
export const overlayMotion = (
    name: OverlayMotionName,
    tokens: ThemeValues,
    reducedMotion: boolean,
    timeScale = 1,
): PresenceMotion => {
    const step = (phase: PresencePhase): PresenceStep => {
        const given: OverlayMotionStep = OVERLAY_MOTIONS[name][phase];
        const keyframes =
            reducedMotion && MOVES.has(given.keyframes)
                ? FADES[phase]
                : given.keyframes;
        const frames = OVERLAY_KEYFRAMES[keyframes];
        const easing = tokens[`easings.${given.easing}`];
        return {
            from: frameOf(frames.from, tokens),
            to: frameOf(frames.to, tokens),
            duration:
                numberOf(tokens[`durations.${given.duration}`], 0) * timeScale,
            easing: typeof easing === "string" ? easing : "linear",
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
        if (resolved[phase].duration <= 0) done(phase);
        return stop;
    }, [driver, resolved, phase, shown]);
    if (!driver) return { present: shownNow, style: STILL, props: STILL };
    const view = driver.view(phase, resolved, done);
    return { present: shown, style: view.style, props: view.props };
}
