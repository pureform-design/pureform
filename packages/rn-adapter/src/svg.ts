// Drawing with react-native-svg: a slot's shape and fill, and its gradient, which React Native
// views can't draw, and press ripples with their soft edge, clipped to the shape. Turn on the
// provider's `svg` so selection returns the drawings, and put an `SvgDrawing` first in the
// slot's view, so it paints under the content as a background does. Shapes morph, fills blend,
// and ripples grow with Animated, on the JavaScript thread; `@pureform/rn-adapter/reanimated-svg`
// runs them on the UI thread.

import {
    createElement as h,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Animated } from "react-native";
import { Circle } from "react-native-svg";
import type { CircleProps } from "react-native-svg";

import { curve } from "./animate/curve";
import { DISCS, useRippleDrawn, useRippleMotion } from "./animate/ripple";
import type { RippleOptions, Ripples } from "./animate/ripple";
import { pathAt, shapeCoordinates, shapePath } from "./geometry";
import { animatable, blend } from "./motion";
import { useComponentState } from "./react";
import type { Drawing } from "./select";
import {
    drawingSvg,
    svgRipple,
    svgRipples,
    useSlotBox,
    useSvgId,
} from "./svg-parts";
import type { RippleCircleProps, SvgDrawingProps } from "./svg-parts";
import type { Transition } from "./values";

export { placeGradient, shapePath } from "./geometry";
export type { RippleOptions, Ripples } from "./animate/ripple";
export type { Box, GradientStop, PlacedGradient } from "./geometry";
export type { SvgDrawingProps } from "./svg-parts";

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
    const { box, fill: inSlot } = useSlotBox();
    const id = useSvgId();
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
    const { shape } = drawing;
    // Mid-morph, the points so far; until the morph starts, or for points of another
    // structure, the target's.
    const d =
        box &&
        shape &&
        (points && target && points.length === target.length
            ? pathAt(shape, points)
            : shapePath(shape, box));
    return inSlot(
        box &&
            drawingSvg({
                id,
                box,
                drawing,
                d,
                fill: fillNow ?? drawing.fill,
                color,
                image,
            }),
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

// A ripple's circle, grown and faded with Animated. SVG's props can't take the native driver.
const RippleCircle = (props: RippleCircleProps) => {
    const { grow, fade } = useRippleMotion(props, false);
    const along = (key: "cx" | "cy" | "r") =>
        grow.interpolate({
            inputRange: [0, 1],
            outputRange: [props.from[key], props.to[key]],
        });
    return h(AnimatedCircle, {
        cx: along("cx"),
        cy: along("cy"),
        r: along("r"),
        fill: props.fill,
        opacity: fade,
    });
};

/** Press ripples as `useRipple` makes them, drawn with SVG: each a circle with the ripple's
 *  soft edge, clipped to the surface's shape when `clip` gives its drawing. Without the
 *  provider's `svg`, they're `useRipple`'s discs. */
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
        () => gradient && svgRipple(gradient, id, RippleCircle),
        [gradient, id],
    );
    const drawing = useMemo(
        () => (Ripple ? svgRipples(Ripple, shape, id) : DISCS),
        [Ripple, shape, id],
    );
    return useRippleDrawn(options, drawing);
};
