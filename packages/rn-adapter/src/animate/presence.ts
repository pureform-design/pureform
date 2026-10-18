// An overlay's enter and exit through Animated: each step drives its own progress from 0 to 1,
// and the view interpolates the step's two frames from it, so switching steps never shows the
// other step's end for a frame. Opacity and transforms run on the native thread on a device.

import { Animated } from "react-native";

import { presenceFrames } from "../motion";
import type {
    PresenceDriver,
    PresencePhase,
    PresenceStep,
    PresenceView,
} from "../motion";
import { NATIVE_DRIVER, curve } from "./curve";

const NO_PROPS = Object.freeze({});

// A step's frames as a style moving with `progress`.
const moving = (
    progress: Animated.Value,
    step: PresenceStep,
): Record<string, unknown> => {
    const [from, to] = presenceFrames(step);
    const between = (a: number, b: number) =>
        progress.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
    const style: Record<string, unknown> = {
        opacity: between(from.opacity as number, to.opacity as number),
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
    const views = new WeakMap<PresenceStep, PresenceView>();
    return {
        view(phase, motion) {
            const step = motion[phase];
            let view = views.get(step);
            if (!view) {
                view = {
                    style: moving(progress[phase], step),
                    props: NO_PROPS,
                };
                views.set(step, view);
            }
            return view;
        },
        run(phase, motion, done) {
            const step = motion[phase];
            // The other step starts from its first frame next time.
            progress[phase === "enter" ? "exit" : "enter"].setValue(0);
            progress[phase].setValue(0);
            const animation = Animated.timing(progress[phase], {
                toValue: 1,
                duration: step.duration,
                easing: curve(step.easing),
                useNativeDriver: NATIVE_DRIVER,
            });
            animation.start(({ finished }) => {
                if (finished) done(phase);
            });
            return () => animation.stop();
        },
    };
};
