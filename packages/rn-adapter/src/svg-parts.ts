// What drawing with react-native-svg shares between the Animated and Reanimated entries: a
// slot's measured box, its drawing as an SVG, and press ripples as SVG circles. How shapes,
// fills, and ripples move is each entry's own.

import { createElement as h, useId, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import Svg, {
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
import type { PathProps } from "react-native-svg";

import type { RippleDrawing, RippleProps } from "./animate/ripple";
import { colorAt, conicWedges, placeGradient, shapePath } from "./geometry";
import type { Box, PlacedGradient } from "./geometry";
import type { Drawing } from "./select";
import type { GradientValue, ShapeValue } from "./values";

/** An id for SVG references, unique to the component. */
export const useSvgId = () => `pf${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

export const gradientElement = (
    id: string,
    placed: Exclude<PlacedGradient, { kind: "conic" }>,
) => {
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
     *  source, as React Native's `Image` takes it, and how it fits the box, as `objectFit`
     *  gives it. Default `cover`. */
    image?: {
        source: ImageSourcePropType;
        fit?: "cover" | "contain" | "fill";
    };
}

/** A view filling its slot, which measures it: the box to draw in, once laid out. */
export const useSlotBox = () => {
    const [box, setBox] = useState<Box>();
    const fill = (children: ReactNode) =>
        h(
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
            children,
        );
    return { box, fill };
};

/** A slot's drawing as an SVG: its fill along the path `d`, a picture clipped to it, and its
 *  gradient over them. `ShapePath` draws each path, with `motion` added to its props, so an
 *  engine can move them. With `fadeFrom`, the fill path sits over one of that color, with
 *  `fadeIn` added to its props, so an engine can cross-fade them. */
export const drawingSvg = (props: {
    id: string;
    box: Box;
    drawing: Drawing;
    d: string | undefined;
    fill: string | undefined;
    color?: string | undefined;
    image?: SvgDrawingProps["image"];
    ShapePath?: ComponentType<PathProps>;
    motion?: object;
    fadeFrom?: string | undefined;
    fadeIn?: object;
}) => {
    const { id, box, drawing, d, fill, image } = props;
    const ShapePath = props.ShapePath ?? Path;
    const fillRule = drawing.shape?.fillRule ?? "nonzero";
    const placed =
        drawing.gradient && placeGradient(drawing.gradient, box, props.color);
    // SVG has no conic gradient: one is wedges around the center, clipped to the shape or the
    // box. They're drawn without anti-aliasing, which would let the background through where
    // they meet, over the gradient's middle color for a renderer that anti-aliases anyway.
    const conic =
        placed?.kind === "conic" &&
        h(
            G,
            { clipPath: `url(#${id}conic)` },
            h(Rect, {
                width: box.width,
                height: box.height,
                fill: colorAt(placed.stops, 0.5),
            }),
            ...conicWedges(placed, box).map(({ d: wedge, color }, i) =>
                // react-native-svg passes the hint on to the page, and devices ignore it.
                h(Path, {
                    key: i,
                    d: wedge,
                    fill: color,
                    ...({ shapeRendering: "crispEdges" } as object),
                }),
            ),
        );
    return h(
        Svg,
        { width: box.width, height: box.height },
        h(
            Defs,
            null,
            placed && placed.kind !== "conic" && gradientElement(id, placed),
            conic &&
                h(
                    ClipPath,
                    { id: `${id}conic` },
                    d
                        ? h(Path, { d, fillRule })
                        : h(Rect, { width: box.width, height: box.height }),
                ),
            image &&
                d &&
                h(ClipPath, { id: `${id}clip` }, h(Path, { d, fillRule })),
        ),
        d &&
            fill &&
            props.fadeFrom &&
            h(ShapePath, {
                d,
                fill: props.fadeFrom,
                fillRule,
                ...props.motion,
            }),
        d &&
            fill &&
            h(ShapePath, {
                d,
                fill,
                fillRule,
                ...props.motion,
                ...props.fadeIn,
            }),
        image &&
            h(Image, {
                href: image.source,
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
        conic ||
            (placed &&
                (d
                    ? h(ShapePath, {
                          d,
                          fill: `url(#${id})`,
                          fillRule,
                          ...props.motion,
                      })
                    : h(Rect, {
                          width: box.width,
                          height: box.height,
                          fill: `url(#${id})`,
                      }))),
    );
};

/** A ripple circle's props: the circle's center and radius at the start of its grow and at
 *  its end, and its fill, the ripple's soft-edged gradient. */
export interface RippleCircleProps extends RippleProps {
    fill: string;
    from: { cx: number; cy: number; r: number };
    to: { cx: number; cy: number; r: number };
}

/** One ripple as an SVG circle, `Circle`, filled with the ripple's soft-edged gradient. Make it
 *  once per surface: a new component would remount every ripple. */
export const svgRipple =
    (
        gradient: GradientValue,
        id: string,
        Circle: ComponentType<RippleCircleProps>,
    ) =>
    (props: RippleProps) => {
        const { id: n, geometry } = props.ripple;
        const { size, scale, start, end } = geometry;
        const half = size / 2;
        return h(
            G,
            null,
            h(
                Defs,
                null,
                // The edge's lengths are of the starting disc, which the ripple grows from, as
                // the web's scales it.
                gradientElement(
                    `${id}r${n}`,
                    placeGradient(
                        gradient,
                        { width: size, height: size },
                        props.color,
                    ) as Exclude<PlacedGradient, { kind: "conic" }>,
                ),
            ),
            h(Circle, {
                ...props,
                fill: `url(#${id}r${n})`,
                from: { cx: start.x + half, cy: start.y + half, r: half },
                to: { cx: end.x + half, cy: end.y + half, r: half * scale },
            }),
        );
    };

/** Ripples drawn as `Ripple` draws each, in an SVG, clipped to the surface's shape when it has
 *  one. */
export const svgRipples = (
    Ripple: ComponentType<RippleProps>,
    shape: ShapeValue | undefined,
    id: string,
): RippleDrawing => ({
    surfaceColor: true,
    Ripple,
    draw: (ripples, box) =>
        h(
            Svg,
            {
                width: box.width,
                height: box.height,
                style: StyleSheet.absoluteFill,
            },
            shape &&
                h(
                    Defs,
                    null,
                    h(
                        ClipPath,
                        { id: `${id}clip` },
                        h(Path, {
                            d: shapePath(shape, box),
                            fillRule: shape.fillRule ?? "nonzero",
                        }),
                    ),
                ),
            h(G, shape ? { clipPath: `url(#${id}clip)` } : {}, ...ripples),
        ),
});
