// The pureform floating action button: Material's FAB in three sizes, with an optional label
// for the extended FAB.
//
// The container takes a color group's container color (`tonal`), its main color (`filled`),
// or a surface with the group's color as content (`surface`). It rests at elevation level 3
// and lifts to level 4 on hover. Its container can take a shape, so the icon and label sit
// inside it:
//
//   <button class={root}>
//     <span class={touchTarget} />
//     <span class={container}><span class={icon}>…</span><span class={label}>…</span></span>
//   </button>

import { defineSlotComponent } from "@pureform/core";
import { none, px } from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";

import {
    DEFAULT_SHAPES,
    shapedColors,
    shapedContainer,
    shapedElevationLevels,
    shapeVariant,
} from "./shaped";
import type { Shapes } from "./shaped";
import {
    COLOR_GROUPS,
    colorVariants,
    componentTokens,
    fillColors,
    sys,
    touchTarget,
    iconBox,
    pressableRoot,
} from "./shared";
import type { ColorGroups, Fill } from "./shared";

const FILLS: Record<string, Fill> = {
    tonal: "tonal",
    filled: "filled",
    surface: "elevated",
};

const { tokens, ref } = componentTokens("fab", {
    sizeSmall: px(40),
    sizeMedium: px(56),
    sizeLarge: px(96),
    radiusSmall: radius("medium"),
    radiusMedium: radius("large"),
    radiusLarge: radius("extraLarge"),
    iconSize: sizeToken("iconMedium"),
    iconSizeLarge: px(36),
    gap: spacing("3"),
    padding: spacing("4"),
});

type Size = "Small" | "Medium" | "Large";

const fabSize = (
    s: Size,
): { root: StyleMap; container: StyleMap; icon: StyleMap } => ({
    root: {
        height: ref(`size${s}`),
        minWidth: ref(`size${s}`),
        borderRadius: ref(`radius${s}`),
    },
    container: { borderRadius: ref(`radius${s}`) },
    icon:
        s === "Large"
            ? {
                  width: ref("iconSizeLarge"),
                  height: ref("iconSizeLarge"),
                  fontSize: ref("iconSizeLarge"),
              }
            : {},
});

const elevation = shapedElevationLevels("level3", "level4");

/** Build the FAB with a `color` variant per group in `groups`. */
export const createFab = (
    groups: ColorGroups = COLOR_GROUPS,
    shapes: Shapes = DEFAULT_SHAPES,
) =>
    defineSlotComponent({
        name: "fab",
        $meta: {
            description:
                "Material floating action button. Put the icon, and the label for an extended FAB, in the container. shape clips the container to one of the theme's shapes.",
        },
        tokens,
        slots: ["root", "touchTarget", "container", "icon", "label"],
        structure: {
            root: ["touchTarget", "container"],
            container: ["icon", "label"],
        },
        recipe: {
            base: {
                root: {
                    ...pressableRoot,
                    ...elevation.root,
                    states: {
                        ...elevation.root.states,
                        disabled: {
                            ...elevation.root.states.disabled,
                            pointerEvents: none,
                        },
                    },
                },
                container: {
                    ...shapedContainer(ref("radiusMedium")),
                    ...elevation.container,
                    gap: ref("gap"),
                },
                icon: iconBox(ref("iconSize")),
                label: { textStyle: textStyle("labelLarge") },
                touchTarget,
            },
            variants: {
                color: colorVariants(groups),
                variant: Object.fromEntries(
                    Object.keys(FILLS).map((name) => [name, { root: {} }]),
                ),
                size: {
                    small: fabSize("Small"),
                    medium: fabSize("Medium"),
                    large: fabSize("Large"),
                },
                extended: {
                    true: {
                        container: {
                            paddingInlineStart: ref("padding"),
                            paddingInlineEnd: ref("padding"),
                        },
                    },
                    false: { root: {} },
                },
                shape: shapeVariant(shapes, { radius: ref("radiusMedium") }),
            },
            compoundVariants: [
                ...Object.entries(FILLS).flatMap(([variant, fill]) =>
                    groups.map((color) => {
                        const colors = fillColors(fill, color);
                        // Material's surface FAB sits on the high surface container.
                        const container =
                            variant === "surface"
                                ? sys("surfaceContainerHigh")
                                : colors.container;
                        return {
                            match: { color, variant },
                            style: shapedColors(fill, color, container),
                        };
                    }),
                ),
                ...(["small", "large"] as const).map((size) => ({
                    match: { size, extended: "false" },
                    style: {
                        root: {
                            width: ref(
                                size === "small" ? "sizeSmall" : "sizeLarge",
                            ),
                        },
                    },
                })),
            ],
            defaultVariants: {
                color: "primary",
                variant: "tonal",
                size: "medium",
                extended: "false",
                shape: "none",
            },
        },
    });

export const fab = createFab();
