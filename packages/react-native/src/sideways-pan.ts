// What every sideways drag on React Native shares (the side sheet's drag to dismiss, the list
// item's swipe, the toast's swipe): a responder asked on the way down (so it wins over a pressable
// inside), which takes the gesture once it has moved past the slop mostly sideways; up and down
// stay the scroll view's. The handlers are read from the latest render.

import { useRef, useState } from "react";
import { PanResponder } from "react-native";
import type { GestureResponderHandlers } from "react-native";

export interface SidewaysPanHooks {
    /** Moves shorter than this (px, sideways) are a press, not a drag. */
    readonly slop: number;
    /** Whether a drag may start now (default: always). */
    readonly enabled?: (() => boolean) | undefined;
    /** The drag started. */
    readonly start?: (() => void) | undefined;
    /** The drag moved: `dx` px along the screen from where it started. */
    readonly move: (dx: number) => void;
    /** Let go: `dx` from where it started, `vx` along the screen in px/ms. */
    readonly release: (dx: number, vx: number) => void;
    /** Another responder took the gesture. */
    readonly cancel: () => void;
}

/** The pan handlers of a sideways drag, made once. */
export function useSidewaysPan(
    hooks: SidewaysPanHooks,
): GestureResponderHandlers {
    const latest = useRef(hooks);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks and gestures that run after render
    latest.current = hooks;
    // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
    const [pan] = useState(() =>
        PanResponder.create({
            onMoveShouldSetPanResponderCapture: (_event, gesture) =>
                (latest.current.enabled?.() ?? true) &&
                Math.abs(gesture.dx) > latest.current.slop &&
                Math.abs(gesture.dx) > Math.abs(gesture.dy),
            onPanResponderGrant: () => latest.current.start?.(),
            onPanResponderMove: (_event, gesture) =>
                latest.current.move(gesture.dx),
            onPanResponderRelease: (_event, gesture) =>
                latest.current.release(gesture.dx, gesture.vx),
            onPanResponderTerminate: () => latest.current.cancel(),
        }),
    );
    return pan.panHandlers;
}
