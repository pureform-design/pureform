// Drawing with react-native-svg, moved by Reanimated 4 on the UI thread: shapes morph and fills
// blend through CSS transitions on a path's `d` and `fill`, and press ripples grow through a
// keyframe animation of their circle and fade through a transition of its opacity. Needs
// react-native-reanimated and react-native-svg.

import { createElement as h, useEffect, useMemo, useState } from "react";
import Animated from "react-native-reanimated";
import { Circle, G, Path } from "react-native-svg";

import { DISCS, useRippleDrawn } from "./animate/ripple";
import type { RippleOptions, Ripples } from "./animate/ripple";
import { shapePath } from "./geometry";
import { useComponentState } from "./react";
import { cssEasing } from "./reanimated";
import type { Drawing } from "./select";
import {
    drawingSvg,
    svgRipple,
    svgRipples,
    useSlotBox,
    useSvgId,
} from "./svg-parts";
import type { RippleCircleProps, SvgDrawingProps } from "./svg-parts";

export type { RippleOptions, Ripples } from "./animate/ripple";
export type { SvgDrawingProps } from "./svg-parts";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

/** As `SvgDrawing`, with Reanimated morphing the shape and blending the fill on the UI thread,
 *  over the slot's transitions. */
export const ReanimatedSvgDrawing = ({
    drawing,
    color,
    image,
}: SvgDrawingProps) => {
    const { box, fill: inSlot } = useSlotBox();
    const id = useSvgId();
    const transitions = drawing?.transitions;
    // The path's `d` and `fill` move over the shape's and the fill's transitions, as CSS's do.
    const motion = useMemo(() => {
        const timed = (
            [
                ["d", transitions?.shape],
                ["fill", transitions?.fill],
            ] as const
        ).flatMap(([property, t]) => (t ? [{ property, t }] : []));
        if (timed.length === 0) return undefined;
        return {
            animatedProps: {
                transitionProperty: timed.map(({ property }) => property),
                transitionDuration: timed.map(({ t }) => t.duration),
                transitionDelay: timed.map(({ t }) => t.delay),
                transitionTimingFunction: timed.map(({ t }) =>
                    cssEasing(t.easing),
                ),
            },
        };
    }, [transitions]);
    if (!drawing) return null;
    return inSlot(
        box &&
            drawingSvg({
                id,
                box,
                drawing,
                d: drawing.shape && shapePath(drawing.shape, box),
                fill: drawing.fill,
                color,
                image,
                ShapePath: AnimatedPath as never,
                ...(motion ? { motion } : {}),
            }),
    );
};

// A ripple's circle: it grows through a keyframe animation from the press point, holding its
// end, and once released and after the release's wait, its group fades through a transition
// of its opacity. Each keeps its animation props unchanged, since a change restarts them.
const RippleCircle = ({
    ripple,
    timing,
    done,
    fill,
    from,
    to,
}: RippleCircleProps) => {
    const [faded, setFaded] = useState(false);
    const released = ripple.release !== undefined;
    const grow = useMemo(
        () => ({
            animationName: { from, to },
            animationDuration: timing.grow,
            animationTimingFunction: cssEasing(timing.easing),
            animationFillMode: "both" as const,
        }),
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [],
    );
    const fade = useMemo(
        () => ({
            transitionProperty: "opacity",
            transitionDuration: timing.fade,
            transitionTimingFunction: "linear",
        }),
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [],
    );
    useEffect(() => {
        if (!released) return;
        const start = setTimeout(() => setFaded(true), ripple.release);
        const end = setTimeout(done, (ripple.release ?? 0) + timing.fade);
        return () => {
            clearTimeout(start);
            clearTimeout(end);
        };
        // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [released]);
    return h(
        AnimatedG,
        { opacity: faded ? 0 : 1, animatedProps: fade } as never,
        h(AnimatedCircle, { ...to, fill, animatedProps: grow } as never),
    );
};

/** As `useSvgRipple`, with Reanimated growing and fading the ripples on the UI thread. */
export const useReanimatedSvgRipple = (
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
