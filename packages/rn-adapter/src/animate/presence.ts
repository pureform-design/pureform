// An overlay's enter and exit through Animated: each step drives its own progress from 0 to 1,
// and the view interpolates the step's two frames from it, so switching steps never shows the
// other step's end for a frame. A step with its own fade drives the opacity from a second
// progress, on the fade's timing (a movement on `Animated.spring`, its fade on
// `Animated.timing`). Opacity and transforms run on the native thread on a device.

import { Animated } from "react-native";

import { presenceFrames } from "../motion";
import type {
    PresenceDriver,
    PresencePhase,
    PresenceStep,
    PresenceView,
} from "../motion";
import { NATIVE_DRIVER, animate } from "./curve";

const NO_PROPS = Object.freeze({});

// A step's frames as a style moving with `progress`.
const moving = (
    progress: Animated.Value,
    fading: Animated.Value,
    step: PresenceStep,
): Record<string, unknown> => {
    const [from, to] = presenceFrames(step);
    const between = (a: number, b: number, by = progress) =>
        by.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
    const style: Record<string, unknown> = {
        opacity: between(
            from.opacity as number,
            to.opacity as number,
            step.fade ? fading : progress,
        ),
    };
    if (from.transform) {
        const ends = [from.transform, to.transform] as Record<
            string,
            number
        >[][];
        style.transform = ends[0]!.map((op, index) => {
            const key = Object.keys(op)[0]!;
            return { [key]: between(op[key]!, ends[1]![index]![key]!) };
        });
    }
    return style;
};

/** An overlay's enter and exit through Animated, ending each step with Animated's own
 *  completion. */
export const animatedPresence = (): PresenceDriver => {
    const progress: Record<PresencePhase, Animated.Value> = {
        enter: new Animated.Value(0),
        exit: new Animated.Value(0),
    };
    const fading: Record<PresencePhase, Animated.Value> = {
        enter: new Animated.Value(0),
        exit: new Animated.Value(0),
    };
    const views = new WeakMap<PresenceStep, PresenceView>();
    return {
        view(phase, motion) {
            const step = motion[phase];
            let view = views.get(step);
            if (!view) {
                view = {
                    style: moving(progress[phase], fading[phase], step),
                    props: NO_PROPS,
                };
                views.set(step, view);
            }
            return view;
        },
        run(phase, motion, done) {
            const step = motion[phase];
            // The other step starts from its first frame next time.
            const other = phase === "enter" ? "exit" : "enter";
            progress[other].setValue(0);
            fading[other].setValue(0);
            progress[phase].setValue(0);
            fading[phase].setValue(0);
            const move = animate(progress[phase], step, NATIVE_DRIVER);
            const animation = step.fade
                ? Animated.parallel([
                      move,
                      animate(fading[phase], step.fade, NATIVE_DRIVER),
                  ])
                : move;
            animation.start(({ finished }) => {
                if (finished) done(phase);
            });
            return () => animation.stop();
        },
    };
};
