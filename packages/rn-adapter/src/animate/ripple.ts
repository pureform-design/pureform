// Press ripples, as the web's ripple() draws them: each grows from the press point toward the
// center while the press lasts, and fades on release, though not before half its grow.

import {
    DEFAULT_RIPPLE_TIMING,
    rippleGeometry,
    ripplePress,
} from "@pureform/js-effects/core";
import type {
    Point,
    RippleGeometry,
    RippleTiming,
} from "@pureform/js-effects/core";
import {
    createElement,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import type { ReactNode, Ref } from "react";
import { Animated, Easing } from "react-native";

import { animatable, blend } from "../motion";
import { useReducedMotion, useComponentState, useTokens } from "../react";
import type { Style } from "../select";
import { NATIVE_DRIVER, curve } from "./curve";

// Material's pressed state opacity, where the ripple component declares none.
const PRESSED_OPACITY = 0.1;

type Box = { left: number; top: number; width: number; height: number };
export type { Box as RippleBox };

/** One ripple: where it starts and ends in its layer, its grow from 0 to 1, and its fade from
 *  1 to 0. */
export interface Ripple {
    id: number;
    geometry: RippleGeometry;
    grow: Animated.Value;
    fade: Animated.Value;
}

/** How a layer draws its ripples: in a box of the layer's size, the last a press measured,
 *  with `color` the ripple's. `native` says whether the native driver can run what it
 *  animates, which it can for a view's transforms and opacity but not an SVG's props. */
export interface RippleDrawing {
    draw: (ripples: Ripple[], box: Box, color: string) => ReactNode;
    native: boolean;
    /** Take the surface's color as is, for a drawing that applies the ripple's opacity
     *  itself, rather than the color at that opacity. */
    surfaceColor?: boolean;
}

// Each ripple a disc, placed at the press point and moved by transforms alone, which the
// native driver can run on a device. Its edge is hard: a soft one needs SVG.
export const DISCS: RippleDrawing = {
    native: true,
    draw: (ripples, _box, color) =>
        ripples.map(({ id, geometry, grow, fade }) => {
            const { size, scale, start, end } = geometry;
            const along = (from: number, to: number) =>
                grow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [from, to],
                });
            return createElement(Animated.View, {
                key: id,
                style: {
                    position: "absolute",
                    left: start.x,
                    top: start.y,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                    opacity: fade,
                    transform: [
                        { translateX: along(0, end.x - start.x) },
                        { translateY: along(0, end.y - start.y) },
                        { scale: along(1, scale) },
                    ],
                },
            });
        }),
};

/** What the layer does for the hook: grow a ripple from a point in it, and release it. */
interface Controller {
    press: (page: Point, centered: boolean) => void;
    release: () => void;
}

// The layer's box on the page: at once from the DOM on the web, where a press can't wait a
// frame, and through measure on a device.
const boxOf = (node: unknown, done: (box: Box) => void) => {
    const element = node as {
        getBoundingClientRect?: () => DOMRect;
        measure?: (
            callback: (
                x: number,
                y: number,
                w: number,
                h: number,
                left: number,
                top: number,
            ) => void,
        ) => void;
    } | null;
    if (element?.getBoundingClientRect) {
        // The rect is from the viewport, and a press's page point from the document.
        const { left, top, width, height } = element.getBoundingClientRect();
        const scroll = globalThis as { scrollX?: number; scrollY?: number };
        done({
            left: left + (scroll.scrollX ?? 0),
            top: top + (scroll.scrollY ?? 0),
            width,
            height,
        });
    } else {
        element?.measure?.((_x, _y, width, height, left, top) =>
            done({ left, top, width, height }),
        );
    }
};

// The layer keeps its own ripples, so a press re-renders it and not the surface around it.
const RippleLayer = (props: {
    controller: Ref<Controller>;
    style: Style;
    color: string;
    timing: RippleTiming;
    drawing: RippleDrawing;
}) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const [box, setBox] = useState<Box>();
    const native = NATIVE_DRIVER && props.drawing.native;
    const node = useRef<unknown>(null);
    const ids = useRef(0);
    const { timing } = props;
    // One ripple held at a time, released no sooner than half its grow.
    const [press] = useState(() => ripplePress());
    useImperativeHandle(props.controller, () => ({
        press: (page, centered) =>
            boxOf(node.current, (box) => {
                const origin = centered
                    ? { x: box.width / 2, y: box.height / 2 }
                    : { x: page.x - box.left, y: page.y - box.top };
                setBox((last) =>
                    last?.width === box.width && last.height === box.height
                        ? last
                        : box,
                );
                const ripple: Ripple = {
                    id: ids.current++,
                    geometry: rippleGeometry(box, origin),
                    grow: new Animated.Value(0),
                    fade: new Animated.Value(1),
                };
                press.begin(
                    {
                        release: (delay) =>
                            Animated.timing(ripple.fade, {
                                toValue: 0,
                                duration: timing.fade,
                                delay,
                                easing: Easing.linear,
                                useNativeDriver: native,
                            }).start(() =>
                                setRipples((list) =>
                                    list.filter((r) => r !== ripple),
                                ),
                            ),
                    },
                    timing,
                );
                setRipples((list) => [...list, ripple]);
                Animated.timing(ripple.grow, {
                    toValue: 1,
                    duration: timing.grow,
                    easing: curve(timing.easing),
                    useNativeDriver: native,
                }).start();
            }),
        release: press.end,
    }));

    useEffect(() => () => press.end(), [press]);

    return createElement(
        Animated.View,
        { ref: node as never, pointerEvents: "none", style: props.style },
        box && props.drawing.draw(ripples, box, props.color),
    );
};

/** Press ripples for a surface. Spread `handlers` on the pressable and render `layer` inside
 *  it, last. The ripple takes `color` at the ripple's opacity token and the surface's corner
 *  `radius`, and the ripple component's transition times it. Under reduced motion nothing
 *  ripples, and the pressed state layer shows the press. It's a solid disc: its soft edge is
 *  a radial gradient, which `useSvgRipple` from `@pureform/rn-adapter/svg` draws. On React
 *  Native Web, give the pressable `delayPressIn={0}`: by default it holds a press's start for
 *  50ms, which delays the ripple. */
export const useRipple = (options: RippleOptions) =>
    useRippleDrawn(options, DISCS);

export interface RippleOptions {
    color: string;
    radius?: number | string;
    /** Grow from the center, as icon buttons do. */
    centered?: boolean;
    disabled?: boolean;
}

/** As `useRipple`, drawing the ripples its own way. */
export const useRippleDrawn = (
    options: RippleOptions,
    drawing: RippleDrawing,
) => {
    const { styles, transitions } = useComponentState("ripple");
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const controller = useRef<Controller>(null);

    const timed = (property: string) =>
        transitions.root?.find((t) => t.property === property);
    const timing: RippleTiming = {
        grow: timed("transform")?.duration || DEFAULT_RIPPLE_TIMING.grow,
        fade: timed("opacity")?.duration || DEFAULT_RIPPLE_TIMING.fade,
        easing: timed("transform")?.easing ?? DEFAULT_RIPPLE_TIMING.easing,
    };
    const opacity = tokens["components.ripple.opacity"];
    const color = drawing.surfaceColor
        ? options.color
        : String(
              blend(
                  "transparent",
                  animatable(options.color),
                  typeof opacity === "number" ? opacity : PRESSED_OPACITY,
              ),
          );
    // The layer's corners follow the surface's, which CSS reads as inherit.
    const { borderRadius: _inherit, ...root } = styles.root ?? {};
    const style = {
        ...root,
        ...(options.radius === undefined
            ? {}
            : { borderRadius: options.radius }),
    };

    return {
        handlers: {
            onPressIn: (event: {
                nativeEvent: { pageX: number; pageY: number };
            }) => {
                if (options.disabled || reducedMotion) return;
                const { pageX, pageY } = event.nativeEvent;
                controller.current?.press(
                    { x: pageX, y: pageY },
                    options.centered ?? false,
                );
            },
            onPressOut: () => controller.current?.release(),
        },
        layer: createElement(RippleLayer, {
            controller,
            style,
            color,
            timing,
            drawing,
        }),
    };
};
