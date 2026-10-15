// Animated styles: a component's styles where each property with a transition moves to its new
// value through React Native's Animated, which React Native Web runs too. Pass the slots'
// styles to `Animated.View` and `Animated.Text`.

import {
    createElement,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { Animated, Easing } from "react-native";

import {
    animatable,
    blend,
    channels,
    easingPoints,
    interpolates,
    rippleGeometry,
    stops,
} from "./motion";
import { useReducedMotion, useRecipeWithTransitions, useTokens } from "./react";
import type { State, Style } from "./select";
import type { Animation, Concrete, ThemeValues, Transition } from "./values";

// One property in motion: where it's going from and to, and how far along it is.
interface Track {
    progress: Animated.Value;
    from: Concrete;
    to: Concrete;
    at: number;
    animation?: Animated.CompositeAnimation | undefined;
}

// A keyframe animation on one slot: its progress, and what drives it once started.
interface Loop {
    key: string;
    animation: Animation;
    progress: Animated.Value;
    running?: Animated.CompositeAnimation;
}

// Drive a keyframe animation's progress from 0 to 1 each time through: backwards for
// `reverse`, there and back for `alternate`, as many times as it runs.
const run = (
    progress: Animated.Value,
    animation: Animation,
): Animated.CompositeAnimation => {
    const backwards =
        animation.direction === "reverse" ||
        animation.direction === "alternateReverse";
    const alternate = animation.direction.startsWith("alternate");
    const [start, end] = backwards ? [1, 0] : [0, 1];
    const leg = (to: number) =>
        Animated.timing(progress, {
            toValue: to,
            duration: animation.duration,
            easing: curve(animation.easing),
            useNativeDriver: false,
        });
    const once = alternate
        ? Animated.sequence([leg(end), leg(start)])
        : Animated.sequence([
              Animated.timing(progress, {
                  toValue: start,
                  duration: 0,
                  useNativeDriver: false,
              }),
              leg(end),
          ]);
    const loop = Animated.loop(once, {
        iterations:
            animation.iterations < 0
                ? -1
                : alternate
                  ? Math.ceil(animation.iterations / 2)
                  : animation.iterations,
    });
    return animation.delay > 0
        ? Animated.sequence([Animated.delay(animation.delay), loop])
        : loop;
};

// A change waiting to start once the render commits.
interface Pending {
    track: Track;
    transition: Transition;
    previous: Animated.CompositeAnimation | undefined;
    previousProgress: Animated.Value;
}

// A progress value whose listener keeps its track's `at` current, for interruptions.
const progressOf = (start: number, track: () => Track): Animated.Value => {
    const progress = new Animated.Value(start);
    progress.addListener(({ value }) => {
        if (track().progress === progress) track().at = value;
    });
    return progress;
};

const curve = (easing: string) => {
    const points = easingPoints(easing);
    return points === "linear" ? Easing.linear : Easing.bezier(...points);
};

/** A component's styles per slot, with transitioned properties as animated values. */
export const useAnimatedRecipe = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
    tokens?: ThemeValues,
): Record<string, Record<string, unknown>> => {
    const { styles, transitions, animations } = useRecipeWithTransitions(
        name,
        variants,
        state,
        tokens,
    );
    const tracks = useRef(new Map<string, Track>());
    const pending = useRef<Pending[]>([]);
    const loops = useRef(new Map<string, Loop>());
    const stale = useRef<Loop[]>([]);

    const out: Record<string, Record<string, unknown>> = {};
    for (const [slot, style] of Object.entries(styles)) {
        const animated: Record<string, unknown> = { ...style };
        // One value moving under a transition: a property, or one step of a transform. It
        // returns the animated value, or the target itself where it can't move.
        const drive = (
            key: string,
            target: Concrete,
            transition: Transition,
        ): unknown => {
            const to = animatable(target);
            let track = tracks.current.get(key);
            if (!track) {
                track = {
                    progress: progressOf(1, () => track!),
                    from: to,
                    to,
                    at: 1,
                };
                tracks.current.set(key, track);
            } else if (track.to !== to) {
                // Start from what's on screen, so an interrupted change doesn't jump. A live
                // animated value can't change during render (the views bound to it would
                // update mid-render), so the change gets a new one, started after render, and
                // the old one stops then.
                const current = track;
                pending.current.push({
                    track: current,
                    transition,
                    previous: current.animation,
                    previousProgress: current.progress,
                });
                current.from = blend(current.from, current.to, current.at);
                current.to = to;
                current.at = 0;
                current.progress = progressOf(0, () => current);
                current.animation = undefined;
            }
            if (!interpolates(track.from, track.to)) return target;
            const { inputRange, outputRange } = stops(track.from, track.to);
            return track.progress.interpolate({
                inputRange,
                // Both numbers or both strings, which `interpolates` checked.
                outputRange: outputRange as unknown as number[],
            });
        };
        for (const transition of transitions[slot] ?? []) {
            const target = style[transition.property];
            const key = `${slot}.${transition.property}`;
            if (typeof target === "number" || typeof target === "string") {
                animated[transition.property] = drive(key, target, transition);
            } else if (
                transition.property === "transform" &&
                Array.isArray(target)
            ) {
                // Each step moves on its own, as CSS interpolates transforms of one shape.
                animated.transform = (target as Record<string, Concrete>[]).map(
                    (step, index) =>
                        Object.fromEntries(
                            Object.entries(step).map(([name, value]) => [
                                name,
                                drive(
                                    `${key}.${index}.${name}`,
                                    value,
                                    transition,
                                ),
                            ]),
                        ),
                );
            }
        }
        const animation = animations[slot];
        const key = animation ? JSON.stringify(animation) : undefined;
        let loop = loops.current.get(slot);
        if (loop && loop.key !== key) {
            stale.current.push(loop);
            loops.current.delete(slot);
            loop = undefined;
        }
        if (animation && !loop) {
            loop = { key: key!, animation, progress: new Animated.Value(0) };
            loops.current.set(slot, loop);
        }
        if (loop) {
            const transform = Array.isArray(style.transform)
                ? (style.transform as Record<string, unknown>[]).map((op) => ({
                      ...op,
                  }))
                : [];
            for (const channel of channels(loop.animation.frames, style)) {
                const value = loop.progress.interpolate({
                    inputRange: channel.inputRange,
                    outputRange: channel.outputRange as unknown as number[],
                });
                if (channel.step) {
                    const [index, name] = channel.step;
                    transform[index] = { ...transform[index], [name]: value };
                } else {
                    animated[channel.property] = value;
                }
            }
            if (transform.length > 0) animated.transform = transform;
        }
        out[slot] = animated;
    }

    useLayoutEffect(() => {
        for (const loop of stale.current.splice(0)) loop.running?.stop();
        for (const loop of loops.current.values()) {
            if (loop.running) continue;
            loop.running = run(loop.progress, loop.animation);
            loop.running.start();
        }
        for (const {
            track,
            transition,
            previous,
            previousProgress,
        } of pending.current.splice(0)) {
            previous?.stop();
            previousProgress.removeAllListeners();
            track.animation = Animated.timing(track.progress, {
                toValue: 1,
                duration: transition.duration,
                delay: transition.delay,
                easing: curve(transition.easing),
                useNativeDriver: false,
            });
            track.animation.start();
        }
    });

    useEffect(
        () => () => {
            for (const track of tracks.current.values()) {
                track.animation?.stop();
                track.progress.removeAllListeners();
            }
            for (const loop of loops.current.values()) loop.running?.stop();
        },
        [],
    );

    return out;
};

export type { State, Style };

// Material's ripple timing, where the ripple component declares none.
const GROW_MS = 450;
const FADE_MS = 375;
const GROW_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const PRESSED_OPACITY = 0.1;

interface Ripple {
    id: number;
    geometry: ReturnType<typeof rippleGeometry>;
    grow: Animated.Value;
    fade: Animated.Value;
}

interface Measurable {
    measure: (
        done: (
            x: number,
            y: number,
            width: number,
            height: number,
            left: number,
            top: number,
        ) => void,
    ) => void;
}

/** Press ripples for a surface, as the web's ripple() draws them: each grows from the press
 *  point toward the center while the press lasts, and fades on release, though not before
 *  half its grow. Spread `handlers` on the pressable and render `layer` inside it, last. The
 *  ripple takes `color` at the ripple's opacity token, and the surface's corner `radius`.
 *  Under reduced motion nothing ripples, and the pressed state layer shows the press. */
export const useRipple = (options: {
    color: string;
    radius?: number | string;
    /** Grow from the center, as icon buttons do. */
    centered?: boolean;
    disabled?: boolean;
}) => {
    const { styles, transitions } = useRecipeWithTransitions("ripple");
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const layer = useRef<Measurable>(null);
    const held = useRef<{ ripple: Ripple; at: number } | undefined>(undefined);
    const ids = useRef(0);

    const timing = (property: string) =>
        transitions.root?.find((t) => t.property === property);
    const grow = timing("transform");
    const fade = timing("opacity");
    const growMs = grow?.duration || GROW_MS;
    const fadeMs = fade?.duration || FADE_MS;
    const opacity = tokens["components.ripple.opacity"];
    const color = blend(
        "transparent",
        animatable(options.color),
        typeof opacity === "number" ? opacity : PRESSED_OPACITY,
    );

    const release = () => {
        const press = held.current;
        held.current = undefined;
        if (!press) return;
        const waited = Date.now() - press.at;
        Animated.timing(press.ripple.fade, {
            toValue: 0,
            duration: fadeMs,
            delay: Math.max(growMs / 2 - waited, 0),
            easing: Easing.linear,
            useNativeDriver: false,
        }).start(() =>
            setRipples((list) => list.filter((r) => r !== press.ripple)),
        );
    };

    const handlers = {
        onPressIn: (event: {
            nativeEvent: { pageX: number; pageY: number };
        }) => {
            if (options.disabled || reducedMotion || !layer.current) return;
            const { pageX, pageY } = event.nativeEvent;
            layer.current.measure((_x, _y, width, height, left, top) => {
                const origin = options.centered
                    ? { x: width / 2, y: height / 2 }
                    : { x: pageX - left, y: pageY - top };
                const ripple: Ripple = {
                    id: ids.current++,
                    geometry: rippleGeometry({ width, height }, origin),
                    grow: new Animated.Value(0),
                    fade: new Animated.Value(1),
                };
                release();
                held.current = { ripple, at: Date.now() };
                setRipples((list) => [...list, ripple]);
                Animated.timing(ripple.grow, {
                    toValue: 1,
                    duration: growMs,
                    easing: curve(grow?.easing ?? GROW_EASING),
                    useNativeDriver: false,
                }).start();
            });
        },
        onPressOut: release,
    };

    const { borderRadius: _inherit, ...root } = styles.root ?? {};
    const layerElement = createElement(
        Animated.View,
        {
            ref: layer as never,
            pointerEvents: "none",
            style: {
                ...root,
                ...(options.radius === undefined
                    ? {}
                    : { borderRadius: options.radius }),
            },
        },
        ...ripples.map(({ id, geometry, grow: g, fade: f }) =>
            createElement(Animated.View, {
                key: id,
                style: {
                    position: "absolute",
                    width: geometry.size,
                    height: geometry.size,
                    borderRadius: geometry.size / 2,
                    backgroundColor: color,
                    left: g.interpolate({
                        inputRange: [0, 1],
                        outputRange: [geometry.start.x, geometry.end.x],
                    }),
                    top: g.interpolate({
                        inputRange: [0, 1],
                        outputRange: [geometry.start.y, geometry.end.y],
                    }),
                    opacity: f,
                    transform: [
                        {
                            scale: g.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, geometry.scale],
                            }),
                        },
                    ],
                },
            }),
        ),
    );
    return { handlers, layer: layerElement };
};
