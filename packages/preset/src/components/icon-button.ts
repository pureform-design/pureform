// The pureform icon button: a square, fully rounded button holding a single icon. Its
// container can take a shape, so the icon sits inside it, and an outlined button draws its
// outline with an outline slot:
//
//   <button class={root}>
//     <span class={touchTarget} />
//     <span class={container}><span class={icon}>…</span></span>
//     <span class={outline} />
//   </button>
//
// Sizes follow M3 Expressive: `xsmall` (32), `small` (40, the default), `medium` (56), `large`
// (96), and `xlarge` (136), each with its icon size, and `width` makes it `narrow`, `default`,
// or `wide`. `compact` (48) keeps the earlier large icon button and is deprecated. `corner`
// picks round or square corners; pressing squares them a little further, and a toggle that's on
// swaps them, as Expressive's shape morphs do. A `shape` clips the container instead.
//
// A toggle icon button sets `toggle: "true"` and marks its state with `aria-pressed`: it rests
// in Material's unselected colors and takes the selected ones, with its icon filled, once
// `aria-pressed="true"`.
//
// In a button group, `position` places the button: `single` in a standard group, where it widens
// while pressed, and `first`, `middle` or `last` in a connected one, where its inner corners
// square off (see `button-group.ts`).

import { typed } from "@pureform/core";
import {
    add,
    flex,
    none,
    px,
    slot,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { NumericValue } from "@pureform/core/ast";
import { radius, size as sizeToken } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import {
    GROUP_INNER_RADII,
    GROUPED_TOKENS,
    groupPositionVariant,
} from "./button-group";
import {
    DEFAULT_SHAPES,
    shapedColors,
    shapedContainer,
    shapedElevation,
    shapedOutline,
    shapedOutlineStroke,
    shapeVariant,
} from "./shaped";
import type { ShapedFill, Shapes } from "./shaped";
import {
    DEFAULT_GROUP,
    colorTokenVariants,
    blend,
    cornerMorphTokens,
    cornerMorphVariants,
    cornerRadius,
    cornerTransition,
    componentTokens,
    defaultDensities,
    defaultGroups,
    densitySteps,
    disabledColor,
    densityTokenVariant,
    entriesOf,
    DENSITY_TOKEN,
    groupTokens,
    iconBox,
    iconFill,
    INDICATION_ROOT,
    keysOf,
    sizeTokenName,
    sizeTokens,
    mergeSlotStyles,
    pressableRoot,
    sys,
    tokenFillColors,
    touchTarget,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities, Fill } from "./shared";
import { POSITIONS } from "./tiles";

const FILLS = {
    filled: "filled",
    tonal: "tonal",
    outlined: "outlined",
    standard: "text",
    elevated: "elevated",
} satisfies Record<string, Fill>;

/** One of M3 Expressive's icon button sizes, or the deprecated `compact` one. */
export interface IconButtonSize {
    /** The height, and the width of a `default` width button. */
    size: NumericValue;
    narrow: NumericValue;
    wide: NumericValue;
    icon: NumericValue;
    outline: NumericValue;
    /** The corner radius of a square button. */
    square: NumericValue;
    /** The corner radius while pressed, whatever the corners at rest. */
    pressed: NumericValue;
}

export const ICON_BUTTON_SIZES = {
    xsmall: {
        size: sizeToken("controlSmall"),
        narrow: px(28),
        wide: px(40),
        icon: px(20),
        outline: px(1),
        square: radius("medium"),
        pressed: radius("small"),
    },
    small: {
        size: sizeToken("controlMedium"),
        narrow: px(32),
        wide: px(52),
        icon: px(24),
        outline: px(1),
        square: radius("medium"),
        pressed: radius("small"),
    },
    medium: {
        size: px(56),
        narrow: px(48),
        wide: px(72),
        icon: px(24),
        outline: px(1),
        square: radius("large"),
        pressed: radius("medium"),
    },
    large: {
        size: px(96),
        narrow: px(64),
        wide: px(128),
        icon: px(32),
        outline: px(2),
        square: radius("extraLarge"),
        pressed: radius("large"),
    },
    xlarge: {
        size: px(136),
        narrow: px(104),
        wide: px(184),
        icon: px(40),
        outline: px(3),
        square: radius("extraLarge"),
        pressed: radius("large"),
    },
    // Deprecated: the earlier large icon button, kept for apps that use it. It has one width.
    compact: {
        size: sizeToken("controlLarge"),
        narrow: sizeToken("controlLarge"),
        wide: sizeToken("controlLarge"),
        icon: sizeToken("iconMedium"),
        outline: px(1),
        square: radius("medium"),
        pressed: radius("small"),
    },
} satisfies Record<string, IconButtonSize>;

const { tokens, ref } = componentTokens("iconButton", {
    // The size's square and pressed corners, and the `corner` and `toggle` variants' flags,
    // which `cornerRadius` reads.
    ...cornerMorphTokens("round", radius("medium"), radius("small")),
    // The `width` variant's flags: narrow, wide, or neither for the default width.
    narrow: unitless(0),
    wide: unitless(0),
    // A grouped button's inner corners and pressed growth.
    ...GROUPED_TOKENS,
    iconSize: sizeToken("iconMedium"),
    // Material draws a selected toggle's icon filled.
    iconFill: unitless(0),
    selectedIconFill: unitless(1),
    outlineWidth: px(1),
    outlineColor: sys("outline"),
    // A disabled button's content: Material's on-surface at 38%.
    disabledContent: disabledColor("disabledContent"),
    // 1 under a shape (the `shape` variant sets it): the outline's border gives way to the clip.
    shaped: unitless(0),
    // Each size's height and widths, so a theme can retune a size.
    ...sizeTokens(ICON_BUTTON_SIZES, "size", "size"),
    ...sizeTokens(ICON_BUTTON_SIZES, "narrow", "narrow"),
    ...sizeTokens(ICON_BUTTON_SIZES, "wide", "wide"),
    ...groupTokens(DEFAULT_GROUP),
    ...DENSITY_TOKEN,
    ...INDICATION_TOKENS,
});

const dense = (value: NumericValue) => add(value, ref("densityOffset"));

/** A width with the density's offset, wider by `pressedGrowth` while pressed. */
const grown = (value: NumericValue) =>
    when(
        slot("root", "pressed"),
        add(dense(value), ref("pressedGrowth")),
        dense(value),
    );

const corners = {
    borderRadius: cornerRadius(ref),
    transition: cornerTransition,
};

const SELECTED = slot("root", "selected");

/** A toggle's colors per fill, off and on, as Material's toggle icon buttons draw them. */
const toggleColors = (
    fill: Fill,
): { unselected: ShapedFill; selected: ShapedFill } => {
    switch (fill) {
        case "text":
            return {
                unselected: {
                    container: transparent,
                    content: sys("onSurfaceVariant"),
                },
                selected: { container: transparent, content: ref("accent") },
            };
        case "filled":
            return {
                unselected: {
                    container: sys("surfaceContainerHighest"),
                    content: ref("accent"),
                },
                selected: {
                    container: ref("accent"),
                    content: ref("onAccent"),
                },
            };
        case "tonal":
            return {
                unselected: {
                    container: sys("surfaceContainerHighest"),
                    content: sys("onSurfaceVariant"),
                },
                selected: {
                    container: ref("accentContainer"),
                    content: ref("onAccentContainer"),
                },
            };
        case "outlined":
            return {
                unselected: {
                    container: transparent,
                    content: sys("onSurfaceVariant"),
                },
                selected: {
                    container: sys("inverseSurface"),
                    content: sys("inverseOnSurface"),
                },
            };
        case "elevated":
            return {
                unselected: {
                    container: sys("surfaceContainerLow"),
                    content: ref("accent"),
                },
                selected: {
                    container: ref("accent"),
                    content: ref("onAccent"),
                },
            };
    }
};

const pf = typed();

/** Build the iconButton with a `color` variant per group in `groups`. */
export const createIconButton = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
    shapes: Shapes = DEFAULT_SHAPES,
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
        pf.slotComponent({
            name: "iconButton",
            bindingVariants: ["toggle", "position", "density"],
            $meta: {
                description:
                    'Material icon button holding a single icon. Put the icon in the container; render the outline slot for the outlined variant. shape clips the container to one of the theme\'s shapes. A toggle sets toggle to "true" and marks itself selected with aria-pressed="true".',
            },
            tokens,
            slots: ["root", "touchTarget", "container", "icon", "outline"],
            structure: {
                root: ["touchTarget", "container", "outline"],
                container: ["icon"],
            },
            indication: [
                {
                    trigger: "root",
                    surface: "container",
                    centered: true,
                    focus: "root",
                },
            ],
            variants: {
                color: groups as ColorGroups,
                variant: keysOf(FILLS),
                shape: ["none", ...Object.keys(shapes)],
                size: keysOf(ICON_BUTTON_SIZES),
                width: ["narrow", "default", "wide"],
                corner: ["round", "square"],
                toggle: ["false", "true"],
                position: [...POSITIONS],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    // The corners morph on the root (for the focus ring), the container, and the
                    // outline. A shape, as a variant, clips the container over them.
                    root: {
                        ...INDICATION_ROOT,
                        ...pressableRoot(ref),
                        ...corners,
                    },
                    container: {
                        ...shapedContainer(ref("radius")),
                        ...corners,
                    },
                    icon: iconBox(ref("iconSize"), {
                        fill: iconFill(ref("iconFill"), {
                            on: SELECTED,
                            fill: ref("selectedIconFill"),
                        }),
                    }),
                    outline: { ...shapedOutline(ref("radius")), ...corners },
                    touchTarget,
                },
                variants: {
                    color: colorTokenVariants(groups),
                    variant: Object.fromEntries(
                        Object.entries(FILLS).map(([name, fill]) => [
                            name,
                            mergeSlotStyles(
                                shapedElevation(fill),
                                fill === "outlined"
                                    ? { outline: shapedOutlineStroke(ref) }
                                    : {},
                                shapedColors(
                                    ref,
                                    fill,
                                    tokenFillColors(fill, ref),
                                    undefined,
                                    ref("disabledContent"),
                                ),
                            ),
                        ]),
                    ),
                    shape: shapeVariant(shapes, {
                        radius: ref("radius"),
                        outlineColor: ref("outlineColor"),
                    }),
                    size: Object.fromEntries(
                        entriesOf(ICON_BUTTON_SIZES).map(([name, s]) => [
                            name,
                            {
                                root: {
                                    tokens: {
                                        iconSize: s.icon,
                                        outlineWidth: s.outline,
                                        squareRadius: s.square,
                                        pressedRadius: s.pressed,
                                        ...GROUP_INNER_RADII[name],
                                    },
                                    // The default width, or the narrow or wide one by the
                                    // `width` variant's flags, wider by `pressedGrowth` while
                                    // pressed.
                                    width: grown(
                                        blend(
                                            blend(
                                                ref(
                                                    sizeTokenName("size", name),
                                                ),
                                                ref(
                                                    sizeTokenName(
                                                        "narrow",
                                                        name,
                                                    ),
                                                ),
                                                ref("narrow"),
                                            ),
                                            ref(sizeTokenName("wide", name)),
                                            ref("wide"),
                                        ),
                                    ),
                                    height: dense(
                                        ref(sizeTokenName("size", name)),
                                    ),
                                },
                            },
                        ]),
                    ),
                    width: {
                        narrow: { root: { tokens: { narrow: unitless(1) } } },
                        default: {},
                        wide: { root: { tokens: { wide: unitless(1) } } },
                    },
                    ...cornerMorphVariants("round"),
                    // Its place in a button group: `single` in a standard group (it widens
                    // while pressed), and the run's corners in a connected one.
                    position: groupPositionVariant(ref, [
                        "root",
                        "container",
                        "outline",
                    ]),
                    density: densityTokenVariant(densities),
                },
                // A toggle rests in the unselected colors and takes the selected ones once
                // pressed on; a selected outlined toggle fills instead of drawing its outline.
                compoundVariants: entriesOf(FILLS).map(([name, fill]) => {
                    const { unselected, selected } = toggleColors(fill);
                    return {
                        match: { variant: name, toggle: "true" as const },
                        style: mergeSlotStyles(
                            shapedColors(
                                ref,
                                fill,
                                unselected,
                                selected,
                                ref("disabledContent"),
                            ),
                            fill === "outlined"
                                ? {
                                      outline: {
                                          display: when(SELECTED, none, flex),
                                      },
                                  }
                                : {},
                        ),
                    };
                }),
                defaultVariants: {
                    color: "primary",
                    variant: "standard",
                    size: "small",
                    width: "default",
                    corner: "round",
                    toggle: "false",
                    position: "none",
                    density: "inherit",
                    shape: "none",
                },
            }),
        }),
    );

export const iconButton = createIconButton();
