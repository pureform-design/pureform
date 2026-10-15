// The pureform floating action button: Material's FAB in three sizes, with an optional label
// for the extended FAB.
//
// The container takes a color group's container color (`tonal`), its main color (`filled`),
// or a surface with the group's color as content (`surface`). It rests at elevation level 3
// and lifts to level 4 on hover.

import { defineSlotComponent } from "@pureform/core";
import {
    center,
    inlineFlex,
    none,
    pointer,
    px,
    relative,
    row,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";

import {
    COLOR_GROUPS,
    colorVariants,
    componentTokens,
    disabledColors,
    fillColors,
    interactiveColors,
    stateTransition,
    sys,
    touchTarget,
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

const fabSize = (s: Size): { root: StyleMap; icon: StyleMap } => ({
    root: {
        height: ref(`size${s}`),
        minWidth: ref(`size${s}`),
        borderRadius: ref(`radius${s}`),
    },
    icon:
        s === "Large"
            ? { width: ref("iconSizeLarge"), height: ref("iconSizeLarge") }
            : {},
});

/** Build the FAB with a `color` variant per group in `groups`. */
export const createFab = (groups: ColorGroups = COLOR_GROUPS) =>
    defineSlotComponent({
        name: "fab",
        $meta: {
            description:
                "Material floating action button. Render the label slot for an extended FAB.",
        },
        tokens,
        slots: ["root", "icon", "label", "touchTarget"],
        recipe: {
            base: {
                root: {
                    transition: stateTransition,
                    position: relative,
                    display: inlineFlex,
                    flexDirection: row,
                    alignItems: center,
                    justifyContent: center,
                    gap: ref("gap"),
                    borderWidth: px(0),
                    cursor: pointer,
                    apply: { shadowElevation: "level3" },
                    states: {
                        hover: { apply: { shadowElevation: "level4" } },
                        disabled: {
                            pointerEvents: none,
                            apply: { shadowElevation: "level0" },
                        },
                    },
                },
                icon: { width: ref("iconSize"), height: ref("iconSize") },
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
                        root: {
                            paddingInlineStart: ref("padding"),
                            paddingInlineEnd: ref("padding"),
                        },
                    },
                    false: { root: {} },
                },
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
                        const { content } = colors;
                        return {
                            match: { color, variant },
                            style: {
                                root: {
                                    ...interactiveColors(container, content),
                                    states: { disabled: disabledColors(fill) },
                                },
                            },
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
            },
        },
    });

export const fab = createFab();
