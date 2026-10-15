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
    entriesOf,
    keysOf,
    COLOR_GROUPS,
    colorVariants,
    componentTokens,
    sys,
    touchTarget,
    iconBox,
    pressableRoot,
    dense,
    densityCompounds,
    lower,
    densityMarkers,
    DEFAULT_DENSITIES,
} from "./shared";
import type { ColorGroups, Fill, Densities } from "./shared";

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
});

const size = (
    token: "sizeSmall" | "sizeMedium" | "sizeLarge",
): { root: StyleMap } => ({
    root: { width: dense(ref(token)), height: dense(ref(token)) },
});

const pf = typed();

/** Build the iconButton with a `color` variant per group in `groups`. */
export const createIconButton = (
    groups: ColorGroups = COLOR_GROUPS,
    densities: Densities = DEFAULT_DENSITIES,
    shapes: Shapes = DEFAULT_SHAPES,
) =>
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
            color: groups,
            variant: keysOf(FILLS),
            shape: ["none", ...Object.keys(shapes)],
            size: ["small", "medium", "large"],
            density: ["inherit", ...Object.keys(densities)],
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
                color: colorVariants(groups),
                variant: Object.fromEntries(
                    Object.entries(FILLS).map(([name, fill]) => [
                        name,
                        {
                            ...shapedElevation(fill),
                            ...(fill === "outlined"
                                ? { outline: shapedOutlineStroke(ref) }
                                : {}),
                        },
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
                density: densityMarkers(densities),
            },
            compoundVariants: [
                ...entriesOf(FILLS).flatMap(([variant, fill]) =>
                    groups.map((color) => ({
                        match: { color, variant },
                        style: shapedColors(fill, color),
                    })),
                ),
                ...(["Small", "Medium", "Large"] as const).flatMap((s) =>
                    densityCompounds(
                        densities,
                        { size: lower(s) },
                        (offset) => {
                            const side = add(ref(`size${s}`), offset);
                            return { root: { width: side, height: side } };
                        },
                    ),
                ),
            ],
            defaultVariants: {
                color: "primary",
                variant: "standard",
                size: "medium",
                density: "inherit",
                shape: "none",
            },
        }),
    });

export const iconButton = createIconButton();
