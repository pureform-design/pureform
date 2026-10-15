// Shared parts for components that can be clipped to a shape, such as the icon button and the
// FAB.
//
// A clip cuts away everything an element draws outside it, its focus ring and shadow
// included, and its hit area, so these components split in two: the root keeps the focus
// ring, the touch target, and elevation (as drop shadows, which follow what is drawn), and a
// `container` slot inside it draws the fill and state layer and takes the clip. An outlined
// style strokes the shape with an `outline` slot clipped to a ring. Where a target can't clip
// to a shape, the container keeps its rounded corners.
//
//   <button class={root}>
//     <span class={touchTarget} />
//     <span class={container}><span class={icon}>…</span></span>
//     <span class={outline} />   (outlined styles only)
//   </button>

import {
    absolute,
    center,
    flex,
    none,
    pct,
    relative,
    px,
    slot,
    solid,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import { clipShape, outlineShape } from "@pureform/core/ast";
import type {
    AliasNode,
    ColorValue,
    NumericValue,
    ShapeGeometry,
    StyleMap,
} from "@pureform/core/ast";

import { MATERIAL_SHAPES } from "../shapes";
import {
    disabledColor,
    fillColors,
    slotStateLayer,
    stateTransition,
} from "./shared";
import type { Fill, OutlineTokens } from "./shared";

/** Shapes components offer as their `shape` variant, by name. */
export type Shapes = Record<string, ShapeGeometry>;

export const DEFAULT_SHAPES: Shapes = MATERIAL_SHAPES;

const DISABLED = slot("root", "disabled");

/** The container: it fills the root, draws the fill, and lays out the content. */
export const shapedContainer = (radius: NumericValue): StyleMap => ({
    transition: stateTransition,
    position: relative,
    display: flex,
    flexGrow: unitless(1),
    height: pct(100),
    alignItems: center,
    justifyContent: center,
    borderRadius: radius,
});

/** The outline layer, drawn over the container for outlined styles only. */
export const shapedOutline = (radius: NumericValue): StyleMap => ({
    position: absolute,
    top: px(0),
    left: px(0),
    width: pct(100),
    height: pct(100),
    pointerEvents: none,
    borderRadius: radius,
    display: none,
});

/** An outlined style's outline layer: the stroke as a border, until a shape clips it. */
export const shapedOutlineStroke = (
    ref: (token: OutlineTokens) => AliasNode,
): StyleMap => ({
    display: flex,
    borderStyle: solid,
    borderWidth: ref("outlineWidth"),
    borderColor: when(
        DISABLED,
        disabledColor("disabledContainer"),
        ref("outlineColor"),
    ),
});

/** A fill's colors, split between the root (the content color the icon and label inherit)
 *  and the container (the fill, with its state layer, and the disabled fill). */
export const shapedColors = (
    fill: Fill,
    group: string,
    container: ColorValue = fillColors(fill, group).container,
) => {
    const { content } = fillColors(fill, group);
    const disabled =
        fill === "outlined" || fill === "text"
            ? transparent
            : disabledColor("disabledContainer");
    return {
        root: {
            color: content,
            states: { disabled: { color: disabledColor("disabledContent") } },
        },
        container: {
            backgroundColor: slotStateLayer("root", {
                base: container,
                content,
                disabled,
            }),
        },
    } satisfies Record<string, StyleMap>;
};

/** Elevation for a fill, as drop shadows on the root so they follow the shape. */
export const shapedElevation = (fill: Fill): StyleMap => {
    const levels =
        fill === "elevated"
            ? ["level1", "level2"]
            : fill === "filled" || fill === "tonal"
              ? ["level0", "level1"]
              : undefined;
    if (!levels) return {};
    return {
        apply: { filterElevation: levels[0]! },
        states: {
            hover: { apply: { filterElevation: levels[1]! } },
            disabled: { apply: { filterElevation: "level0" } },
        },
    };
};

/** The `shape` variant: `none` keeps the rounded corners, and each shape clips the container
 *  to itself, and the outline layer to a ring `outlineWidth` wide along it, filled with the
 *  outline color, when the component has one. Where a target can't clip to a shape, the
 *  container keeps `radius` and the outline its border. The ring's width is a plain length, since each of its points restates
 *  it. */
export const shapeVariant = (
    shapes: Shapes,
    {
        radius,
        outlineColor,
        outlineWidth = px(1),
    }: {
        radius: NumericValue;
        outlineColor?: ColorValue;
        outlineWidth?: NumericValue;
    },
): Record<string, Record<string, StyleMap>> => ({
    none: {},
    ...Object.fromEntries(
        Object.entries(shapes).map(([name, shape]) => [
            name,
            {
                container: {
                    clipPath: clipShape(shape),
                    borderRadius: when("clipShape", px(0), radius),
                },
                ...(outlineColor
                    ? {
                          outline: {
                              clipPath: outlineShape(shape, outlineWidth),
                              borderWidth: when(
                                  "clipShape",
                                  px(0),
                                  outlineWidth,
                              ),
                              backgroundColor: when(
                                  "clipShape",
                                  when(
                                      DISABLED,
                                      disabledColor("disabledContainer"),
                                      outlineColor,
                                  ),
                                  transparent,
                              ),
                          },
                      }
                    : {}),
            },
        ]),
    ),
});
