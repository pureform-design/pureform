// Press ripples, as the web's ripple() draws them: each grows from the press point toward the
// center while the press lasts, and fades on release, though not before half its grow.

import {
    createElement,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import type { Ref } from "react";
import { Animated, Easing } from "react-native";

import { animatable, blend, rippleGeometry } from "../motion";
import {
    useReducedMotion,
    useRecipeWithTransitions,
    useTokens,
} from "../react";
import type { Style } from "../select";
import { NATIVE_DRIVER, curve } from "./curve";

// Material's ripple timing and opacity, where the ripple component declares none.
const GROW_MS = 450;
const FADE_MS = 375;
const GROW_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const PRESSED_OPACITY = 0.1;

type Point = { x: number; y: number };
type Box = { left: number; top: number; width: number; height: number };

interface Ripple {
    id: number;
    geometry: ReturnType<typeof rippleGeometry>;
    grow: Animated.Value;
    fade: Animated.Value;
}

interface Timing {
    grow: number;
    fade: number;
    easing: string;
}

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
    timing: Timing;
}) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const node = useRef<unknown>(null);
    const held = useRef<{ ripple: Ripple; at: number } | undefined>(undefined);
    const ids = useRef(0);
    const { timing } = props;

    const release = () => {
        const press = held.current;
        held.current = undefined;
        if (!press) return;
        const waited = Date.now() - press.at;
        Animated.timing(press.ripple.fade, {
            toValue: 0,
            duration: timing.fade,
            delay: Math.max(timing.grow / 2 - waited, 0),
            easing: Easing.linear,
            useNativeDriver: NATIVE_DRIVER,
        }).start(() =>
            setRipples((list) => list.filter((r) => r !== press.ripple)),
        );
    };

    useImperativeHandle(props.controller, () => ({
        press: (page, centered) =>
            boxOf(node.current, (box) => {
                const origin = centered
                    ? { x: box.width / 2, y: box.height / 2 }
                    : { x: page.x - box.left, y: page.y - box.top };
                const ripple: Ripple = {
                    id: ids.current++,
                    geometry: rippleGeometry(box, origin),
                    grow: new Animated.Value(0),
                    fade: new Animated.Value(1),
                };
                release();
                held.current = { ripple, at: Date.now() };
                setRipples((list) => [...list, ripple]);
                Animated.timing(ripple.grow, {
                    toValue: 1,
                    duration: timing.grow,
                    easing: curve(timing.easing),
                    useNativeDriver: NATIVE_DRIVER,
                }).start();
            }),
        release,
    }));

    useEffect(() => () => held.current?.ripple.grow.stopAnimation(), []);

    return createElement(
        Animated.View,
        { ref: node as never, pointerEvents: "none", style: props.style },
        ...ripples.map(({ id, geometry, grow, fade }) => {
            const { size, scale, start, end } = geometry;
            const along = (from: number, to: number) =>
                grow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [from, to],
                });
            // Placed at the press point and moved by transforms alone, which the native
            // driver can run on a device.
            return createElement(Animated.View, {
                key: id,
                style: {
                    position: "absolute",
                    left: start.x,
                    top: start.y,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: props.color,
                    opacity: fade,
                    transform: [
                        { translateX: along(0, end.x - start.x) },
                        { translateY: along(0, end.y - start.y) },
                        { scale: along(1, scale) },
                    ],
                },
            });
        }),
    );
};

/** Press ripples for a surface. Spread `handlers` on the pressable and render `layer` inside
 *  it, last. The ripple takes `color` at the ripple's opacity token and the surface's corner
 *  `radius`, and the ripple component's transition times it. Under reduced motion nothing
 *  ripples, and the pressed state layer shows the press. It's a solid disc: its soft edge is
 *  a radial gradient, which React Native can't draw without SVG. On React Native Web, give the
 *  pressable `delayPressIn={0}`: by default it holds a press's start for 50ms, which delays
 *  the ripple. */
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
    const controller = useRef<Controller>(null);

    const timed = (property: string) =>
        transitions.root?.find((t) => t.property === property);
    const timing: Timing = {
        grow: timed("transform")?.duration || GROW_MS,
        fade: timed("opacity")?.duration || FADE_MS,
        easing: timed("transform")?.easing ?? GROW_EASING,
    };
    const opacity = tokens["components.ripple.opacity"];
    const color = String(
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
        layer: createElement(RippleLayer, { controller, style, color, timing }),
    };
};
