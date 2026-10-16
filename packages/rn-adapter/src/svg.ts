// Drawing with react-native-svg: a slot's shape and fill, and its gradient, which React Native
// views can't draw, and press ripples with their soft edge, clipped to the shape. Turn on the provider's `svg` so selection returns the drawings, and put an
// `SvgDrawing` first in the slot's view, so it paints under the content as a background does.

import {
    createElement as h,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, {
    Circle,
    ClipPath,
    Defs,
    G,
    Image,
    LinearGradient,
    Path,
    RadialGradient,
    Rect,
    Stop,
} from "react-native-svg";
import type { CircleProps } from "react-native-svg";

import { curve } from "./animate/curve";
import { DISCS, useRippleDrawn } from "./animate/ripple";
import type { RippleDrawing, RippleOptions, Ripples } from "./animate/ripple";
import { pathAt, placeGradient, shapeCoordinates, shapePath } from "./geometry";
import type { Box, PlacedGradient } from "./geometry";
import { animatable, blend } from "./motion";
import { useComponentState } from "./react";
import type { Drawing } from "./select";
import type { Transition } from "./values";

export { placeGradient, shapePath } from "./geometry";
export type { RippleOptions, Ripples } from "./animate/ripple";
export type { Box, GradientStop, PlacedGradient } from "./geometry";

const gradientElement = (id: string, placed: PlacedGradient) => {
    const stops = placed.stops.map((stop, i) =>
        h(Stop, { key: i, offset: stop.offset, stopColor: stop.color }),
    );
    return placed.kind === "linear"
        ? h(
              LinearGradient,
              {
                  id,
                  gradientUnits: "userSpaceOnUse",
                  x1: placed.x1,
                  y1: placed.y1,
                  x2: placed.x2,
                  y2: placed.y2,
              },
              stops,
          )
        : // In the box's own units, a circle stretches to the box's ellipse.
          h(RadialGradient, { id, cx: 0.5, cy: 0.5, r: placed.r }, stops);
};

export interface SvgDrawingProps {
    /** The slot's drawing, from `useComponentState(...).drawings[slot]`. Nothing draws
     *  without one. */
    drawing: Drawing | undefined;
    /** The color a gradient stop mixing with the current color takes, such as a ripple's.
     *  Default black. */
    color?: string;
    /** A picture to draw clipped to the shape, for a slot that shows one, such as media: its
     *  source and how it fits the box, as `objectFit` gives it. Default `cover`. */
    image?: { uri: string; fit?: "cover" | "contain" | "fill" };
}

// A value that moves to each new target over its transition, from wherever it is, as CSS's
// transitions do. `key` says when the target changes; `mix` gives the value `t` of the way,
// or undefined where the two can't mix, and the value jumps.
const useTween = <T>(
    target: T | undefined,
    key: string,
    transition: Transition | undefined,
    mix: (from: T, to: T, t: number) => T | undefined,
): T | undefined => {
    const [shown, setShown] = useState(target);
    const current = useRef(target);
    const last = useRef(key);
    useEffect(() => {
        if (last.current === key) return;
        last.current = key;
        const from = current.current;
        const show = (value: T | undefined) => {
            current.current = value;
            setShown(value);
        };
        if (
            target === undefined ||
            from === undefined ||
            !transition ||
            transition.duration <= 0 ||
            mix(from, target, 0) === undefined
        ) {
            show(target);
            return;
        }
        const progress = new Animated.Value(0);
        const listener = progress.addListener(({ value }) =>
            show(mix(from, target, value)),
        );
        Animated.timing(progress, {
            toValue: 1,
            duration: transition.duration,
            delay: transition.delay,
            easing: curve(transition.easing),
            useNativeDriver: false,
        }).start();
        return () => {
            progress.removeListener(listener);
            progress.stopAnimation();
        };
        // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return last.current === key ? shown : current.current;
};

const mixPoints = (from: number[], to: number[], t: number) =>
    from.length === to.length
        ? from.map((a, i) => a + (to[i]! - a) * t)
        : undefined;

const mixColors = (from: string, to: string, t: number) =>
    String(blend(animatable(from), animatable(to), t));

/** A slot's drawing, filling the slot. A change of shape morphs, and a change of fill blends,
 *  over the slot's transitions. */
export const SvgDrawing = ({ drawing, color, image }: SvgDrawingProps) => {
    const [box, setBox] = useState<Box>();
    const id = `pf${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
    const shapeNow = drawing?.shape;
    const target = useMemo(
        () => (box && shapeNow ? shapeCoordinates(shapeNow, box) : undefined),
        [box, shapeNow],
    );
    const points = useTween(
        target,
        target ? target.join(",") : "",
        drawing?.transitions?.shape,
        mixPoints,
    );
    const fillNow = useTween(
        drawing?.fill,
        drawing?.fill ?? "",
        drawing?.transitions?.fill,
        mixColors,
    );
    if (!drawing) return null;
    const { shape, gradient } = drawing;
    const fill = fillNow ?? drawing.fill;
    const placed = box && gradient && placeGradient(gradient, box, color);
    // Mid-morph, the points so far; until the morph starts, or for points of another
    // structure, the target's.
    const d =
        box &&
        shape &&
        (points && target && points.length === target.length
            ? pathAt(shape, points)
            : shapePath(shape, box));
    const fillRule = shape?.fillRule ?? "nonzero";
    return h(
        View,
        {
            pointerEvents: "none",
            style: StyleSheet.absoluteFill,
            onLayout: (event: { nativeEvent: { layout: Box } }) => {
                const { width, height } = event.nativeEvent.layout;
                setBox((last) =>
                    last?.width === width && last.height === height
                        ? last
                        : { width, height },
                );
            },
        },
        box &&
            h(
                Svg,
                { width: box.width, height: box.height },
                h(
                    Defs,
                    null,
                    placed && gradientElement(id, placed),
                    image &&
                        d &&
                        h(
                            ClipPath,
                            { id: `${id}clip` },
                            h(Path, { d, fillRule }),
                        ),
                ),
                d && fill && h(Path, { d, fill, fillRule }),
                image &&
                    h(Image, {
                        href: { uri: image.uri },
                        width: box.width,
                        height: box.height,
                        preserveAspectRatio:
                            image.fit === "contain"
                                ? "xMidYMid meet"
                                : image.fit === "fill"
                                  ? "none"
                                  : "xMidYMid slice",
                        ...(d ? { clipPath: `url(#${id}clip)` } : {}),
                    }),
                placed &&
                    (d
                        ? h(Path, { d, fill: `url(#${id})`, fillRule })
                        : h(Rect, {
                              width: box.width,
                              height: box.height,
                              fill: `url(#${id})`,
                          })),
            ),
    );
};

// Animated marks its views `collapsable`, which react-native-svg would pass to the DOM on the
// web, where it means nothing.
const AnimatedCircle = Animated.createAnimatedComponent(
    (props: CircleProps & { collapsable?: boolean }) => {
        const { collapsable, ...own } = props;
        return h(Circle, collapsable === undefined ? props : own);
    },
);

/** Press ripples as `useRipple` makes them, drawn with SVG: each a circle with the ripple's
 *  soft edge, clipped to the surface's shape when `clip` gives its drawing. SVG's props run on
 *  the JavaScript thread. Without the provider's `svg`, they're `useRipple`'s discs. */
export const useSvgRipple = (
    options: RippleOptions & {
        /** The surface's drawing, from its `drawings`, to clip the ripples to its shape. */
        clip?: Drawing | undefined;
    },
): Ripples => {
    const gradient = useComponentState("ripple").drawings.ripple?.gradient;
    const shape = options.clip?.shape;
    const id = `pf${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
    const drawing = useMemo((): RippleDrawing => {
        if (!gradient) return DISCS;
        return {
            native: false,
            surfaceColor: true,
            draw: (ripples, box, color) =>
                h(
                    Svg,
                    {
                        width: box.width,
                        height: box.height,
                        style: StyleSheet.absoluteFill,
                    },
                    h(
                        Defs,
                        null,
                        // The edge's lengths are of the starting disc, which the ripple grows
                        // from, as the web's scales it.
                        ...ripples.map(({ id: n, geometry: { size } }) =>
                            gradientElement(
                                `${id}r${n}`,
                                placeGradient(
                                    gradient,
                                    { width: size, height: size },
                                    color,
                                ),
                            ),
                        ),
                        shape &&
                            h(
                                ClipPath,
                                { id: `${id}clip` },
                                h(Path, {
                                    d: shapePath(shape, box),
                                    fillRule: shape.fillRule ?? "nonzero",
                                }),
                            ),
                    ),
                    h(
                        G,
                        shape ? { clipPath: `url(#${id}clip)` } : {},
                        ...ripples.map(({ id: n, geometry, grow, fade }) => {
                            const { size, scale, start, end } = geometry;
                            const along = (from: number, to: number) =>
                                grow.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [from, to],
                                });
                            return h(AnimatedCircle, {
                                key: n,
                                cx: along(start.x + size / 2, end.x + size / 2),
                                cy: along(start.y + size / 2, end.y + size / 2),
                                r: along(size / 2, (size / 2) * scale),
                                fill: `url(#${id}r${n})`,
                                opacity: fade,
                            });
                        }),
                    ),
                ),
        };
    }, [gradient, shape, id]);
    return useRippleDrawn(options, drawing);
};
