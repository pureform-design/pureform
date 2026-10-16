// The pureform icon button: a square, fully rounded button holding a single icon. Its
// container can take a shape, so the icon sits inside it, and an outlined button draws its
// outline with an outline slot:
//
//   <button class={root}>
//     <span class={touchTarget} />
//     <span class={container}><span class={icon}>…</span></span>
//     <span class={outline} />
//   </button>

import { typed } from "@pureform/core";
import { px, add } from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import {
    DEFAULT_SHAPES,
    shapedColors,
    shapedContainer,
    shapedElevation,
    shapedOutline,
    shapedOutlineStroke,
    shapeVariant,
} from "./shaped";
import type { Shapes } from "./shaped";
import {
    DEFAULT_GROUP,
    colorTokenVariants,
    componentTokens,
    defaultDensities,
    defaultGroups,
    densitySteps,
    densityTokenVariant,
    DENSITY_TOKEN,
    groupTokens,
    iconBox,
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
    outlineWidth: px(1),
    outlineColor: sys("outline"),
    sizeSmall: sizeToken("controlSmall"),
    sizeMedium: sizeToken("controlMedium"),
    sizeLarge: sizeToken("controlLarge"),
    ...groupTokens(DEFAULT_GROUP),
    ...DENSITY_TOKEN,
});

const size = (
    token: "sizeSmall" | "sizeMedium" | "sizeLarge",
): { root: StyleMap } => ({
    root: {
        width: add(ref(token), ref("densityOffset")),
        height: add(ref(token), ref("densityOffset")),
    },
});

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
                    "Material icon button holding a single icon. Put the icon in the container; render the outline slot for the outlined variant. shape clips the container to one of the theme's shapes.",
            },
            tokens,
            slots: ["root", "touchTarget", "container", "icon", "outline"],
            structure: {
                root: ["touchTarget", "container", "outline"],
                container: ["icon"],
            },
            variants: {
                color: groups as ColorGroups,
                variant: keysOf(FILLS),
                shape: ["none", ...Object.keys(shapes)],
                size: ["small", "medium", "large"],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    root: {
                        ...pressableRoot,
                        borderRadius: ref("radius"),
                    },
                    container: shapedContainer(ref("radius")),
                    icon: iconBox(ref("iconSize")),
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
                                shapedColors(fill, tokenFillColors(fill, ref)),
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
                    density: densityTokenVariant(densities),
                },
                defaultVariants: {
                    color: "primary",
                    variant: "standard",
                    size: "medium",
                    density: "inherit",
                    shape: "none",
                },
            }),
        }),
    );

export const iconButton = createIconButton();
