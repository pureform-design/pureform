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
// A toggle icon button sets `toggle: "true"` and marks its state with `aria-pressed`: it rests
// in Material's unselected colors and takes the selected ones, with its icon filled, once
// `aria-pressed="true"`.

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
import type { StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
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
    componentTokens,
    defaultDensities,
    defaultGroups,
    densitySteps,
    densityTokenVariant,
    entriesOf,
    DENSITY_TOKEN,
    groupTokens,
    iconBox,
    iconFill,
    INDICATION_ROOT,
    keysOf,
    mergeSlotStyles,
    pressableRoot,
    sys,
    tokenFillColors,
    touchTarget,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities, Fill } from "./shared";

const FILLS = {
    filled: "filled",
    tonal: "tonal",
    outlined: "outlined",
    standard: "text",
    elevated: "elevated",
} satisfies Record<string, Fill>;

const { tokens, ref } = componentTokens("iconButton", {
    radius: radius("full"),
    iconSize: sizeToken("iconMedium"),
    // Material draws a selected toggle's icon filled.
    iconFill: unitless(0),
    selectedIconFill: unitless(1),
    outlineWidth: px(1),
    outlineColor: sys("outline"),
    sizeSmall: sizeToken("controlSmall"),
    sizeMedium: sizeToken("controlMedium"),
    sizeLarge: sizeToken("controlLarge"),
    ...groupTokens(DEFAULT_GROUP),
    ...DENSITY_TOKEN,
    ...INDICATION_TOKENS,
});

const size = (
    token: "sizeSmall" | "sizeMedium" | "sizeLarge",
): { root: StyleMap } => ({
    root: {
        width: add(ref(token), ref("densityOffset")),
        height: add(ref(token), ref("densityOffset")),
    },
});

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
                size: ["small", "medium", "large"],
                toggle: ["false", "true"],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    root: {
                        ...INDICATION_ROOT,
                        ...pressableRoot(ref),
                        borderRadius: ref("radius"),
                    },
                    container: shapedContainer(ref("radius")),
                    icon: iconBox(ref("iconSize"), {
                        fill: iconFill(ref("iconFill"), {
                            on: SELECTED,
                            fill: ref("selectedIconFill"),
                        }),
                    }),
                    outline: shapedOutline(ref("radius")),
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
                                ),
                            ),
                        ]),
                    ),
                    shape: shapeVariant(shapes, {
                        radius: ref("radius"),
                        outlineColor: ref("outlineColor"),
                    }),
                    size: {
                        small: size("sizeSmall"),
                        medium: size("sizeMedium"),
                        large: size("sizeLarge"),
                    },
                    toggle: { false: {}, true: {} },
                    density: densityTokenVariant(densities),
                },
                // A toggle rests in the unselected colors and takes the selected ones once
                // pressed on; a selected outlined toggle fills instead of drawing its outline.
                compoundVariants: entriesOf(FILLS).map(([name, fill]) => {
                    const { unselected, selected } = toggleColors(fill);
                    return {
                        match: { variant: name, toggle: "true" as const },
                        style: mergeSlotStyles(
                            shapedColors(ref, fill, unselected, selected),
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
                    size: "medium",
                    toggle: "false",
                    density: "inherit",
                    shape: "none",
                },
            }),
        }),
    );

export const iconButton = createIconButton();
