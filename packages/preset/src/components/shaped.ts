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
    linearGradient,
    stop,
    transition,
    tween,
    unitless,
    when,
} from "@pureform/core/ast";
import { clipShape, outlineShape } from "@pureform/core/ast";
import type {
    AliasNode,
    ColorValue,
    NumericValue,
    Condition,
    ShapeGeometry,
    ShapeMorph,
    StyleMap,
} from "@pureform/core/ast";
import { duration, easing, elevationTint } from "@pureform/theme";

import { MATERIAL_SHAPES } from "../shapes";
import {
    STATE_TWEENS,
    disabledColor,
    fillColors,
    slotStateLayer,
    stateTransition,
} from "./shared";
import type { Fill, OutlineTokens } from "./shared";

/** Shapes components offer as their `shape` variant, by name. A morph rests as its first
 *  shape and changes into the second while pressed. */
export type Shapes = Record<string, ShapeGeometry | ShapeMorph>;

const isMorph = (shape: ShapeGeometry | ShapeMorph): shape is ShapeMorph =>
    "from" in shape;

// A morph changes shape over medium2 on the emphasized curve, as Material's shape morphs do,
// along with the state colors; under reduced motion it changes at once.
const morphTransition = when(
    "reducedMotion",
    none,
    transition(
        ...STATE_TWEENS,
        tween("clipPath", duration("medium2"), easing("emphasized")),
    ),
);

export const DEFAULT_SHAPES: Shapes = MATERIAL_SHAPES;

const DISABLED = slot("root", "disabled");
const PRESSED = slot("root", "pressed");

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

const tint = (level: string) => {
    const color = elevationTint(level);
    return linearGradient([stop(color), stop(color)]);
};

/** Elevation that rests at one level and lifts to another on hover: drop shadows on the root,
 *  so they follow the shape, and the level's tint over the container's fill. A disabled
 *  component drops to level 0. */
export const shapedElevationLevels = (rest: string, hover: string) =>
    ({
        root: {
            apply: { filterElevation: rest },
            states: {
                hover: { apply: { filterElevation: hover } },
                disabled: { apply: { filterElevation: "level0" } },
            },
        },
        container: {
            backgroundImage: when()
                .on(DISABLED, tint("level0"))
                .on(slot("root", "hover"), tint(hover))
                .else(tint(rest)),
        },
    }) satisfies Record<string, StyleMap>;

/** Elevation for a fill, as Material specifies for buttons. Outlined and text fills draw
 *  none. */
export const shapedElevation = (fill: Fill): Record<string, StyleMap> =>
    fill === "elevated"
        ? shapedElevationLevels("level1", "level2")
        : fill === "filled" || fill === "tonal"
          ? shapedElevationLevels("level0", "level1")
          : {};

/** Clip styles per shape, for an element that takes the clip itself: `none` keeps the rounded
 *  corners, and each shape clips to itself, keeping `radius` where a target can't clip to a
 *  shape. A morph changes shape while `morphOn` holds, or keeps its first shape without one.
 *  Only for an element with no focus ring or shadow to lose, such as an avatar. */
export const clipVariant = (
    shapes: Shapes,
    radius: NumericValue,
    morphOn?: Condition,
): Record<string, StyleMap> => ({
    none: {},
    ...Object.fromEntries(
        Object.entries(shapes).map(([name, shape]) => {
            const fallback = when("clipShape", px(0), radius);
            if (!isMorph(shape)) {
                return [
                    name,
                    { clipPath: clipShape(shape), borderRadius: fallback },
                ];
            }
            return [
                name,
                morphOn
                    ? {
                          clipPath: when(
                              morphOn,
                              clipShape(shape.to),
                              clipShape(shape.from),
                          ),
                          borderRadius: fallback,
                          transition: morphTransition,
                      }
                    : {
                          clipPath: clipShape(shape.from),
                          borderRadius: fallback,
                      },
            ];
        }),
    ),
});

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
                container: clipVariant({ [name]: shape }, radius, PRESSED)[
                    name
                ]!,
                ...(outlineColor
                    ? {
                          outline: {
                              clipPath: isMorph(shape)
                                  ? when(
                                        PRESSED,
                                        outlineShape(shape.to, outlineWidth),
                                        outlineShape(shape.from, outlineWidth),
                                    )
                                  : outlineShape(shape, outlineWidth),
                              ...(isMorph(shape)
                                  ? { transition: morphTransition }
                                  : {}),
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
