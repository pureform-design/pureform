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

import { transitionMoves } from "@pureform/core";
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
    TransitionPart,
} from "@pureform/core/ast";
import { duration, easing, elevationTint, spring } from "@pureform/theme";
import type { SpringRole } from "@pureform/theme";

import { MATERIAL_SHAPES } from "../shapes";
import type { IndicationRef } from "../state-layer";
import {
    STATE_TWEENS,
    blend,
    disabledColor,
    motionTransition,
    slotStateLayer,
    stateTransition,
} from "./shared";
import type { Fill, OutlineTokens } from "./shared";

/** Shapes components offer as their `shape` variant, by name. A morph rests as its first
 *  shape and changes into the second while pressed. */
export type Shapes = Record<string, ShapeGeometry | ShapeMorph>;

const isMorph = (shape: ShapeGeometry | ShapeMorph): shape is ShapeMorph =>
    "from" in shape;

// A morph changes shape on the `effectsDefault` spring, as Compose's `shapeByInteraction` does
// for buttons and icon buttons (no bounce), along with the state colors; under reduced motion
// the shape changes at once and the colors still fade.
const morphTransition = motionTransition(
    ...STATE_TWEENS,
    tween("clipPath", { spring: spring("effectsDefault") }),
);

/** Corner changes that settle on the `spatialFast` spring, with the state colors: Compose's
 *  chips (`shapeByInteraction` with `FastSpatial`) and the FAB menu's toggle
 *  (`ToggleFloatingActionButton`, `FastSpatial`). Under reduced motion the corners change at
 *  once and the colors still fade. */
export const spatialCornerTransition = motionTransition(
    ...STATE_TWEENS,
    tween("borderRadius", { spring: spring("spatialFast") }),
);

/** A transition of the given properties where the ones that move, resize or turn settle on the
 *  `role` spring and the rest (colors, opacity) keep the `short3` standard tween, as Compose
 *  springs movement and leaves colors to their own spec. Under reduced motion the moving ones
 *  change at once and the fades still run. */
export const spatialTweens = (
    role: SpringRole,
    ...properties: TransitionPart["property"][]
): NonNullable<StyleMap["transition"]> =>
    motionTransition(
        ...properties.map((property) =>
            transitionMoves(property)
                ? tween(property, { spring: spring(role) })
                : tween(property, duration("short3"), easing("standard")),
        ),
    );

export const DEFAULT_SHAPES: Shapes = MATERIAL_SHAPES;

const DISABLED = slot("root", "disabled");
const PRESSED = slot("root", "pressed");
const SELECTED = slot("root", "selected");

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

/** An outlined style's outline layer: the stroke as a border, until a shape clips it. The
 *  `shaped` flag (1 under a shape, set by `shapeVariant`) picks the shape's stroke: none where
 *  the clip draws the ring, a 1px border where a target can't clip. */
export const shapedOutlineStroke = (
    ref: (token: OutlineTokens | "shaped") => AliasNode,
): StyleMap => ({
    display: flex,
    borderStyle: solid,
    borderWidth: when(
        "clipShape",
        blend(ref("outlineWidth"), px(0), ref("shaped")),
        blend(ref("outlineWidth"), px(1), ref("shaped")),
    ),
    borderColor: when(
        DISABLED,
        disabledColor("disabledContainer"),
        ref("outlineColor"),
    ),
});

/** A container and the content drawn on it. */
export interface ShapedFill {
    container: ColorValue;
    content: ColorValue;
}

/** A fill's colors, split between the root (the content color the icon and label inherit)
 *  and the container (the fill, with its state layer at the opacities `token` reads, and the
 *  disabled fill). `selected` gives the colors once the root is selected (a toggle that's on); a
 *  selected container keeps a faint fill when disabled, and `disabledContent` colors the
 *  disabled content (Material's on-surface at 38% by default). */
export const shapedColors = (
    token: IndicationRef,
    fill: Fill,
    { container, content }: ShapedFill,
    selected?: ShapedFill,
    disabledContent: ColorValue = disabledColor("disabledContent"),
) => {
    const disabled =
        fill === "outlined" || fill === "text"
            ? transparent
            : disabledColor("disabledContainer");
    return {
        root: {
            color: content,
            states: {
                ...(selected ? { selected: { color: selected.content } } : {}),
                disabled: { color: disabledContent },
            },
        },
        container: {
            backgroundColor: slotStateLayer(
                token,
                "root",
                { base: container, content, disabled },
                selected && {
                    state: SELECTED,
                    base: selected.container,
                    content: selected.content,
                    disabled:
                        selected.container === transparent
                            ? transparent
                            : disabledColor("disabledContainer"),
                },
            ),
        },
    } satisfies Record<string, StyleMap>;
};

/** An elevation level's tint, as the elevation utility draws it over a surface. */
export const tint = (level: string) => {
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
 *  outline color, when the component has one, and sets the root's `shaped` flag, which
 *  `shapedOutlineStroke` reads for the border. Where a target can't clip to a shape, the
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
                          root: { tokens: { shaped: unitless(1) } },
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
