// Drawing with react-native-svg: a slot's shape and fill, and its gradient, which React Native
// views can't draw, and press ripples with their soft edge, clipped to the shape. Turn on the
// provider's `svg` so selection returns the drawings, and put an `SvgDrawing` first in the
// slot's view, so it paints under the content as a background does. Nothing here moves through
// React state: on the web the browser runs every motion (a shape's morph through CSS's `d` or
// SMIL, a fill's cross-fade, a ripple's transform and opacity); on a device ripples run on the
// native driver, and a morph or a cross-fade writes the native paths' props from Animated, on the
// JavaScript thread. `@pureform/rn-adapter/reanimated-svg` runs those on the UI thread.

import {
    createElement as h,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { ComponentType } from "react";
import { Animated, Platform } from "react-native";
import Svg, { Circle, Defs, G, Path } from "react-native-svg";
import type { PathProps } from "react-native-svg";

import { browserEasing } from "./animate/browser-easing";
import { animate, curve } from "./animate/curve";
import { runKeyframes } from "./animate/keyframes";
import {
    DISCS,
    useBrowserRipple,
    useRippleDrawn,
    useRippleMotion,
} from "./animate/ripple";
import type {
    RippleDrawing,
    RippleOptions,
    RippleProps,
    Ripples,
} from "./animate/ripple";
import {
    cssDirection,
    keyframeShapes,
    pathAt,
    placeGradient,
    shapeCoordinates,
    shapePath,
} from "./geometry";
import type { PlacedGradient } from "./geometry";
import { animatable, blend, fadeOutOpacity } from "./motion";
import { useComponentState } from "./react";
import { parseColor } from "./rgba";
import type { Drawing } from "./select";
import {
    drawingSvg,
    gradientElement,
    svgRipple,
    svgRipples,
    useSlotBox,
    useSvgId,
} from "./svg-parts";
import type { RippleCircleProps, SvgDrawingProps } from "./svg-parts";
import type { GradientValue, Transition } from "./values";

export { placeGradient, shapePath } from "./geometry";
export type { RippleOptions, Ripples } from "./animate/ripple";
export type { Box, GradientStop, PlacedGradient } from "./geometry";
export type { SvgDrawingProps } from "./svg-parts";

const WEB = Platform.OS === "web";

// What a react-native-svg element's ref gets: on the web, a component holding its DOM element;
// on a device, a component taking native props.
type SvgNode = {
    elementRef?: { current: Element | null };
    setNativeProps?: (props: object) => void;
};

const elementOf = (node: unknown) =>
    (node as SvgNode | null)?.elementRef?.current ?? (node as Element | null);

/** A motion under way: how far along it is, 0 to 1 in its curve's progress, and how to stop it. */
interface Run {
    progress: () => number;
    stop: () => void;
}

const clamp = (t: number) => Math.min(1, Math.max(0, t));

// The browser's animations over a transition: how far they are, from their own clock.
const browserRun = (
    transition: Transition,
    animations: Animation[],
    done: () => void,
): Run => {
    const ease = curve(transition.easing);
    const first = animations[0];
    // oxlint-disable-next-line promise/no-callback-in-promise -- `Run` reports its end through `done`, and `finished` is the only signal the browser gives for it
    if (first) first.finished.then(done, () => {});
    else done();
    return {
        progress: () => {
            const time = first?.currentTime;
            if (time === null || time === undefined) return 1;
            return ease(
                clamp((Number(time) - transition.delay) / transition.duration),
            );
        },
        stop: () => {
            for (const animation of animations) animation.cancel();
        },
    };
};

// Animated stepping `frame` from 0 to 1 over a transition, its spring where it has one, with no
// React state: `frame` writes native props.
const animatedRun = (
    transition: Transition,
    frame: (progress: number) => void,
    done: () => void,
): Run => {
    const value = new Animated.Value(0);
    let at = 0;
    frame(0);
    const listener = value.addListener(({ value: v }) => {
        at = v;
        frame(v);
    });
    animate(value, transition, false).start(({ finished }) => {
        if (!finished) return;
        at = 1;
        frame(1);
        done();
    });
    return {
        progress: () => at,
        stop: () => {
            value.removeListener(listener);
            value.stopAnimation();
        },
    };
};

const SVG_NS = "http://www.w3.org/2000/svg";
// SMIL's samples of a morph's curve, where CSS can't animate `d`.
const SAMPLES = 30;

const cssPathAnimates = () =>
    typeof CSS !== "undefined" && CSS.supports?.("d", 'path("M0 0")');

// One path's morph in the browser: CSS's `d` where it animates, else SMIL's `<animate>` through
// the curve's samples. Either ends on the path's own `d`, the target's.
const browserMorph = (
    element: Element,
    transition: Transition,
    pathOf: (progress: number) => string,
): Animation | undefined => {
    const timing = {
        duration: transition.duration,
        delay: transition.delay,
    };
    if (cssPathAnimates()) {
        return element.animate(
            [{ d: `path("${pathOf(0)}")` }, { d: `path("${pathOf(1)}")` }],
            {
                ...timing,
                easing: browserEasing(transition.easing),
                fill: "backwards",
            },
        );
    }
    const animation = element.ownerDocument.createElementNS(
        SVG_NS,
        "animate",
    ) as SVGAnimationElement;
    const ease = curve(transition.easing);
    const total = transition.delay + transition.duration;
    const times: number[] = transition.delay > 0 ? [0] : [];
    const values: string[] = transition.delay > 0 ? [pathOf(0)] : [];
    for (let i = 0; i <= SAMPLES; i++) {
        times.push(
            (transition.delay + (transition.duration * i) / SAMPLES) / total,
        );
        values.push(pathOf(ease(i / SAMPLES)));
    }
    for (const [name, value] of [
        ["attributeName", "d"],
        ["dur", `${total}ms`],
        ["begin", "indefinite"],
        ["fill", "remove"],
        ["calcMode", "linear"],
        ["keyTimes", times.join(";")],
        ["values", values.join(";")],
    ]) {
        animation.setAttribute(name!, value!);
    }
    element.append(animation);
    animation.beginElement();
    // The same clock as CSS's, for its progress and its end, which takes the SMIL away.
    const clock = element.animate([{}, {}], { ...timing, easing: "linear" });
    const remove = () => animation.remove();
    clock.finished.then(remove, remove);
    return clock;
};

const mixPoints = (from: number[], to: number[], t: number) =>
    from.length === to.length
        ? from.map((a, i) => a + (to[i]! - a) * t)
        : undefined;

const mixColors = (from: string, to: string, t: number) =>
    String(blend(animatable(from), animatable(to), t));

// The drawing's shape paths, each registered while it's mounted: `fading` ones are the fill's
// top path, which cross-fades over the color under it, and `under` ones that color's.
const useShapePaths = () => {
    const [paths] = useState(() => ({
        all: new Set<unknown>(),
        fading: new Set<unknown>(),
        under: new Set<unknown>(),
        // A path mounting mid-morph, such as a cross-fade's, joins it.
        join: (_node: unknown) => {},
    }));
    const ShapePath = useMemo(
        () =>
            ((props: PathProps & { fading?: boolean; under?: boolean }) => {
                const { fading, under, ...own } = props;
                const node = useRef<unknown>(null);
                useLayoutEffect(() => {
                    const n = node.current;
                    paths.all.add(n);
                    if (fading) paths.fading.add(n);
                    if (under) paths.under.add(n);
                    paths.join(n);
                    return () => {
                        paths.all.delete(n);
                        paths.fading.delete(n);
                        paths.under.delete(n);
                    };
                }, [fading, under]);
                return h(Path, { ...own, ref: node as never });
            }) as ComponentType<PathProps>,
        [paths],
    );
    return { paths, ShapePath };
};

// A change of shape morphs over its transition, from wherever the last morph had reached.
const useMorph = (
    drawing: Drawing | undefined,
    box: { width: number; height: number } | undefined,
    paths: { all: Set<unknown>; join: (node: unknown) => void },
) => {
    const shape = drawing?.shape;
    const transition = drawing?.transitions?.shape;
    const target = useMemo(
        () => (box && shape ? shapeCoordinates(shape, box) : undefined),
        [box, shape],
    );
    const key = target ? target.join(",") : "";
    const last = useRef({ key, points: target });
    const run = useRef<{ run: Run; from: number[] }>(undefined);
    useLayoutEffect(() => {
        if (last.current.key === key) return;
        const before = last.current.points;
        const running = run.current;
        const from =
            running && before
                ? mixPoints(running.from, before, running.run.progress())
                : before;
        last.current = { key, points: target };
        running?.run.stop();
        run.current = undefined;
        paths.join = () => {};
        if (
            !shape ||
            !target ||
            !from ||
            !transition ||
            transition.duration <= 0 ||
            mixPoints(from, target, 0) === undefined
        ) {
            return;
        }
        const pathOf = (t: number) =>
            pathAt(shape, mixPoints(from, target, t)!);
        const settled = () => {
            run.current = undefined;
            paths.join = () => {};
        };
        const animations: Animation[] = [];
        if (WEB) {
            for (const node of paths.all) {
                const element = elementOf(node);
                const animation =
                    element && browserMorph(element, transition, pathOf);
                if (animation) animations.push(animation);
            }
            if (animations.length === 0) return;
        }
        run.current = {
            from,
            run: WEB
                ? browserRun(transition, animations, settled)
                : animatedRun(
                      transition,
                      (t) => {
                          const d = pathOf(t);
                          for (const node of paths.all) {
                              (node as SvgNode).setNativeProps?.({ d });
                          }
                      },
                      settled,
                  ),
        };
        const started = run.current;
        paths.join = (node) => {
            if (WEB) {
                // The same morph, at the same time.
                const element = elementOf(node);
                const first = animations[0];
                const animation =
                    element && browserMorph(element, transition, pathOf);
                if (!animation) return;
                if (first) animation.currentTime = first.currentTime;
                animations.push(animation);
            } else {
                (node as SvgNode).setNativeProps?.({
                    d: pathOf(started.run.progress()),
                });
            }
        };
    }, [key]);
    useLayoutEffect(() => () => run.current?.run.stop(), []);
};

// A keyframe animation's shapes (the loading indicator's): the drawing's paths morph through
// them as CSS eases between keyframes, each step on the animation's curve, looping as it does,
// in its direction (`alternate` there and back). The browser runs it where CSS animates `d`;
// elsewhere Animated writes the paths each frame.
const useShapeKeyframes = (
    drawing: Drawing | undefined,
    box: { width: number; height: number } | undefined,
    paths: { all: Set<unknown> },
) => {
    const keyframes = drawing?.keyframes;
    const base = drawing?.shape;
    const key =
        keyframes && base && box
            ? JSON.stringify([keyframes, box.width, box.height])
            : "";
    useLayoutEffect(() => {
        if (!keyframes || !base || !box) return;
        const frames = keyframeShapes(keyframes, base, box);
        if (!frames) return;
        const iterations =
            keyframes.iterations < 0 ? Infinity : keyframes.iterations;
        const nodes = [...paths.all];
        if (WEB && cssPathAnimates()) {
            const animations = nodes.flatMap((node) => {
                const element = elementOf(node);
                return element
                    ? [
                          element.animate(
                              frames.map((frame) => ({
                                  offset: frame.offset,
                                  d: `path("${frame.d}")`,
                                  easing: browserEasing(keyframes.easing),
                              })),
                              {
                                  duration: keyframes.duration,
                                  delay: keyframes.delay,
                                  iterations,
                                  direction: cssDirection(keyframes.direction),
                              },
                          ),
                      ]
                    : [];
            });
            return () => {
                for (const animation of animations) animation.cancel();
            };
        }
        const ease = curve(keyframes.easing);
        // `t` is the directed progress through the frames, which `runKeyframes` turns back for
        // a reverse or alternating direction, as CSS does before easing each step.
        const pathOf = (t: number) => {
            let i = 0;
            while (i < frames.length - 2 && t > frames[i + 1]!.offset) i++;
            const [from, to] = [frames[i]!, frames[i + 1]!];
            const local =
                to.offset > from.offset
                    ? ease(clamp((t - from.offset) / (to.offset - from.offset)))
                    : 1;
            return pathAt(
                from.shape,
                mixPoints(from.points, to.points, local)!,
            );
        };
        const value = new Animated.Value(0);
        const listener = value.addListener(({ value: t }) => {
            const d = pathOf(t);
            for (const node of nodes) {
                if (WEB) elementOf(node)?.setAttribute("d", d);
                else (node as SvgNode).setNativeProps?.({ d });
            }
        });
        const running = runKeyframes(value, keyframes);
        running.start();
        return () => {
            running.stop();
            value.removeListener(listener);
        };
    }, [key]);
};

// SVG's samples of the old fill's fade, in the transition's progress.
const FADE_SAMPLES = 16;

// A change of fill cross-fades over its transition: the new fill's path fades in over a path of
// the color shown before, which goes once it has. Under a translucent new fill the old one fades
// out meanwhile (`fadeOutOpacity`).
const useCrossFade = (
    drawing: Drawing | undefined,
    fading: Set<unknown>,
    under: Set<unknown>,
) => {
    const fill = drawing?.fill;
    const transition = drawing?.transitions?.fill;
    // An object, so a fade restarting from the same color still starts again.
    const [from, setUnder] = useState<{ color: string }>();
    const last = useRef(fill);
    const run = useRef<Run>(undefined);
    useLayoutEffect(() => {
        const before = last.current;
        if (before === fill) return;
        last.current = fill;
        const shown =
            run.current && from && before !== undefined
                ? mixColors(from.color, before, run.current.progress())
                : before;
        run.current?.stop();
        run.current = undefined;
        const fades =
            shown !== undefined &&
            fill !== undefined &&
            transition &&
            transition.duration > 0;
        setUnder(fades ? { color: shown } : undefined);
    }, [fill]);
    useLayoutEffect(() => {
        if (!from || !transition) return;
        const nodes = [...fading];
        const olds = [...under];
        const alpha = fill === undefined ? 1 : (parseColor(fill)[3] ?? 1);
        const translucent = alpha < 1;
        const done = () => {
            run.current = undefined;
            setUnder(undefined);
        };
        const timing = {
            duration: transition.duration,
            delay: transition.delay,
            easing: browserEasing(transition.easing),
            fill: "backwards" as const,
        };
        // The old fill's fade, sampled in the transition's progress, which its easing gives.
        const fadeOut = Array.from({ length: FADE_SAMPLES + 1 }, (_, i) => ({
            offset: i / FADE_SAMPLES,
            opacity: fadeOutOpacity(alpha, i / FADE_SAMPLES),
        }));
        run.current = WEB
            ? browserRun(
                  transition,
                  [
                      ...nodes.flatMap((node) => {
                          const animation = elementOf(node)?.animate(
                              [{ opacity: 0 }, { opacity: 1 }],
                              timing,
                          );
                          return animation ? [animation] : [];
                      }),
                      ...(translucent
                          ? olds.flatMap((node) => {
                                const animation = elementOf(node)?.animate(
                                    fadeOut,
                                    timing,
                                );
                                return animation ? [animation] : [];
                            })
                          : []),
                  ],
                  done,
              )
            : animatedRun(
                  transition,
                  (t) => {
                      for (const node of nodes) {
                          (node as SvgNode).setNativeProps?.({ opacity: t });
                      }
                      if (!translucent) return;
                      for (const node of olds) {
                          (node as SvgNode).setNativeProps?.({
                              opacity: fadeOutOpacity(alpha, t),
                          });
                      }
                  },
                  done,
              );
    }, [from]);
    useLayoutEffect(() => () => run.current?.stop(), []);
    return from?.color;
};

/** A slot's drawing, filling the slot. A change of shape morphs, and a change of fill
 *  cross-fades, over the slot's transitions. */
export const SvgDrawing = ({ drawing, color, image }: SvgDrawingProps) => {
    const { box, fill: inSlot } = useSlotBox();
    const id = useSvgId();
    const { paths, ShapePath } = useShapePaths();
    useMorph(drawing, box, paths);
    useShapeKeyframes(drawing, box, paths);
    const under = useCrossFade(drawing, paths.fading, paths.under);
    if (!drawing) return null;
    const { shape } = drawing;
    return inSlot(
        box &&
            drawingSvg({
                id,
                box,
                drawing,
                d: shape && shapePath(shape, box),
                fill: drawing.fill,
                color,
                image,
                ShapePath,
                fadeFrom: under,
                fadeIn: { fading: true },
                fadeOut: { under: true },
            }),
    );
};

// On the web, a ripple's circle drawn at its end, and moved there from its start by the
// browser's animation of its group's transform, which also fades it.
const BrowserRippleCircle = (props: RippleCircleProps) => {
    const { from, to } = props;
    const k = from.r / to.r;
    const ref = useBrowserRipple(
        props,
        [
            {
                transform: `translate(${from.cx - k * to.cx}px, ${from.cy - k * to.cy}px) scale(${k})`,
            },
            { transform: "translate(0px, 0px) scale(1)" },
        ],
        elementOf as never,
    );
    return h(G, { ref } as never, h(Circle, { ...to, fill: props.fill }));
};

// On a device, a ripple drawn at its end in its own SVG, in a view the native driver moves there
// from its start and fades. Its layer clips it to the surface's rounded corners, not to an SVG
// shape: a native-driven view can't sit inside the drawing's clip path, and clipping a view to a
// path takes a mask view, which React Native doesn't ship. `reanimated-svg` keeps the exact clip
// on the UI thread.
const nativeSvgRipple =
    (gradient: GradientValue, id: string) => (props: RippleProps) => {
        const { grow, fade } = useRippleMotion(props, true);
        const { id: n, geometry } = props.ripple;
        const { size, scale, start, end } = geometry;
        const half = size / 2;
        const r = half * scale;
        const along = (from: number, to: number) =>
            grow.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
        return h(
            Animated.View,
            {
                pointerEvents: "none",
                style: {
                    position: "absolute",
                    left: end.x + half - r,
                    top: end.y + half - r,
                    width: 2 * r,
                    height: 2 * r,
                    opacity: fade,
                    transform: [
                        { translateX: along(start.x - end.x, 0) },
                        { translateY: along(start.y - end.y, 0) },
                        { scale: along(1 / scale, 1) },
                    ],
                },
            },
            h(
                Svg,
                { width: 2 * r, height: 2 * r },
                h(
                    Defs,
                    null,
                    // The gradient is in the circle's own units, so its edge scales with it.
                    gradientElement(
                        `${id}r${n}`,
                        placeGradient(
                            gradient,
                            { width: size, height: size },
                            props.color,
                        ) as Exclude<PlacedGradient, { kind: "conic" }>,
                    ),
                ),
                h(Circle, { cx: r, cy: r, r, fill: `url(#${id}r${n})` }),
            ),
        );
    };

/** Press ripples as `useRipple` makes them, drawn with SVG: each a circle with the ripple's
 *  soft edge, clipped to the surface's shape when `clip` gives its drawing (on the web; a
 *  device's clip to the surface's corners). Without the provider's `svg`, they're `useRipple`'s
 *  discs. */
export const useSvgRipple = (
    options: RippleOptions & {
        /** The surface's drawing, from its `drawings`, to clip the ripples to its shape. */
        clip?: Drawing | undefined;
    },
): Ripples => {
    const gradient = useComponentState("ripple").drawings.ripple?.gradient;
    const shape = options.clip?.shape;
    const id = useSvgId();
    const Ripple = useMemo(
        () =>
            gradient &&
            (WEB
                ? svgRipple(gradient, id, BrowserRippleCircle)
                : nativeSvgRipple(gradient, id)),
        [gradient, id],
    );
    const drawing = useMemo<RippleDrawing>(
        () =>
            !Ripple
                ? DISCS
                : WEB
                  ? svgRipples(Ripple, shape, id)
                  : { surfaceColor: true, Ripple },
        [Ripple, shape, id],
    );
    return useRippleDrawn(options, drawing);
};
