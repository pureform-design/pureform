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
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import type { ComponentType, ReactElement, ReactNode, Ref } from "react";
import { Animated, Easing, Platform, View } from "react-native";

import { animatable, blend } from "../motion";
import { useReducedMotion, useComponentState, useTokens } from "../react";
import type { Style } from "../select";
import { NATIVE_DRIVER, curve } from "./curve";

// Material's pressed state opacity, where the ripple component declares none.
const PRESSED_OPACITY = 0.1;

type Box = { left: number; top: number; width: number; height: number };
export type { Box as RippleBox };

/** One ripple: where it starts and ends in its layer, and, once released, how long it waits
 *  before it fades. */
export interface Ripple {
    id: number;
    geometry: RippleGeometry;
    release?: number;
}

/** What draws one ripple: it grows when it mounts, fades once released, and calls `done`
 *  when it has faded. `color` is the ripple's. */
export interface RippleProps {
    ripple: Ripple;
    color: string;
    timing: RippleTiming;
    done: () => void;
}

/** How a layer draws its ripples: each as `Ripple` draws it, all of them inside what `draw`
 *  wraps them in, in a box of the layer's size, the last a press measured. */
export interface RippleDrawing {
    Ripple: ComponentType<RippleProps>;
    draw?: (ripples: ReactNode[], box: Box) => ReactNode;
    /** Take the surface's color as is, for a drawing that applies the ripple's opacity
     *  itself, rather than the color at that opacity. */
    surfaceColor?: boolean;
}

/** A ripple's grow from 0 to 1 and fade from 1 to 0 with Animated, on the native thread
 *  where `native` allows: a view's transforms and opacity, not an SVG's props. */
export const useRippleMotion = (
    { ripple, timing, done }: RippleProps,
    native: boolean,
) => {
    const [grow] = useState(() => new Animated.Value(0));
    const [fade] = useState(() => new Animated.Value(1));
    const driver = NATIVE_DRIVER && native;
    useEffect(() => {
        Animated.timing(grow, {
            toValue: 1,
            duration: timing.grow,
            easing: curve(timing.easing),
            useNativeDriver: driver,
        }).start();
    }, []);
    useEffect(() => {
        if (ripple.release === undefined) return;
        Animated.timing(fade, {
            toValue: 0,
            duration: timing.fade,
            delay: ripple.release,
            easing: Easing.linear,
            useNativeDriver: driver,
        }).start(({ finished }) => finished && done());
    }, [ripple.release]);
    return { grow, fade };
};

// A disc, placed at the press point and moved by transforms alone, which the native driver
// runs on a device's UI thread. Its edge is hard: a soft one needs SVG.
const NativeDisc = (props: RippleProps) => {
    const { grow, fade } = useRippleMotion(props, true);
    const { size, scale, start, end } = props.ripple.geometry;
    const along = (from: number, to: number) =>
        grow.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
    return createElement(Animated.View, {
        style: {
            ...discStyle(props),
            opacity: fade,
            transform: [
                { translateX: along(0, end.x - start.x) },
                { translateY: along(0, end.y - start.y) },
                { scale: along(1, scale) },
            ],
        },
    });
};

const discStyle = ({ ripple, color }: RippleProps) => ({
    position: "absolute" as const,
    left: ripple.geometry.start.x,
    top: ripple.geometry.start.y,
    width: ripple.geometry.size,
    height: ripple.geometry.size,
    borderRadius: ripple.geometry.size / 2,
    backgroundColor: color,
});

type Animatable = {
    animate?: (
        keyframes: Keyframe[],
        options: KeyframeAnimationOptions,
    ) => { finished: Promise<unknown> };
};

// On the web, the same disc grown and faded by the browser's own animations of its transform and
// opacity, which run off the main thread: Animated would step them from JavaScript each frame,
// so a surface's re-render (its pressed state) stalls the ripple. Each starts before the disc is
// first painted.
const WebDisc = (props: RippleProps) => {
    const node = useRef<Animatable | null>(null);
    const latest = useRef(props.done);
    latest.current = props.done;
    const { size: _size, scale, start, end } = props.ripple.geometry;
    const { timing } = props;
    useLayoutEffect(() => {
        node.current?.animate?.(
            [
                { transform: "translate(0px, 0px) scale(1)" },
                {
                    transform: `translate(${end.x - start.x}px, ${end.y - start.y}px) scale(${scale})`,
                },
            ],
            { duration: timing.grow, easing: timing.easing, fill: "forwards" },
        );
    }, []);
    const release = props.ripple.release;
    useLayoutEffect(() => {
        if (release === undefined) return;
        const fade = node.current?.animate?.([{ opacity: 1 }, { opacity: 0 }], {
            duration: timing.fade,
            delay: release,
            easing: "linear",
            fill: "forwards",
        });
        if (!fade) {
            latest.current();
            return;
        }
        let live = true;
        fade.finished.then(
            () => live && latest.current(),
            () => {},
        );
        return () => {
            live = false;
        };
    }, [release]);
    return createElement(View, { ref: node as never, style: discStyle(props) });
};

const Disc = Platform.OS === "web" ? WebDisc : NativeDisc;

export const DISCS: RippleDrawing = { Ripple: Disc };

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
    const node = useRef<unknown>(null);
    const ids = useRef(0);
    const { timing, drawing } = props;
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
                const id = ids.current++;
                press.begin(
                    {
                        release: (delay) =>
                            setRipples((list) =>
                                list.map((r) =>
                                    r.id === id ? { ...r, release: delay } : r,
                                ),
                            ),
                    },
                    timing,
                );
                setRipples((list) => [
                    ...list,
                    { id, geometry: rippleGeometry(box, origin) },
                ]);
            }),
        release: press.end,
    }));

    useEffect(() => () => press.end(), [press]);

    const drawn = ripples.map((ripple) =>
        createElement(drawing.Ripple, {
            key: ripple.id,
            ripple,
            color: props.color,
            timing,
            done: () =>
                setRipples((list) => list.filter((r) => r.id !== ripple.id)),
        }),
    );
    return createElement(
        Animated.View,
        { ref: node as never, pointerEvents: "none", style: props.style },
        box && (drawing.draw ? drawing.draw(drawn, box) : drawn),
    );
};

/** Press ripples for a surface. Spread `handlers` on the pressable and render `layer` inside
 *  it, last. The ripple takes `color` at the ripple's opacity token and the surface's corner
 *  `radius`, and the ripple component's transition times it. Under reduced motion nothing
 *  ripples, and the pressed state layer shows the press. It's a solid disc: its soft edge is
 *  a radial gradient, which `useSvgRipple` from `@pureform/rn-adapter/svg` draws. On React
 *  Native Web, give the pressable `delayPressIn={0}`: by default it holds a press's start for
 *  50ms, which delays the ripple. */
export const useRipple = (options: RippleOptions): Ripples =>
    useRippleDrawn(options, DISCS);

export interface RippleOptions {
    color: string;
    radius?: number | string;
    /** Grow from the center, as icon buttons do. */
    centered?: boolean;
    disabled?: boolean;
}

/** As `useRipple`, drawing the ripples its own way. */
/** A surface's ripples: handlers for its pressable, and the layer to render inside it. */
export interface Ripples {
    handlers: {
        onPressIn: (event: {
            nativeEvent: { pageX?: number; pageY?: number };
        }) => void;
        onPressOut: () => void;
    };
    layer: ReactElement;
}

export const useRippleDrawn = (
    options: RippleOptions,
    drawing: RippleDrawing,
): Ripples => {
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
                nativeEvent: { pageX?: number; pageY?: number };
            }) => {
                if (options.disabled || reducedMotion) return;
                const { pageX, pageY } = event.nativeEvent;
                // A press with no pointer, from a key or an assistive technology, ripples from
                // the center, as the web's keyboard clicks do.
                const pointer =
                    Number.isFinite(pageX) && Number.isFinite(pageY);
                controller.current?.press(
                    { x: pageX ?? 0, y: pageY ?? 0 },
                    (options.centered ?? false) || !pointer,
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
