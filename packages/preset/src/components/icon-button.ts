// The pureform icon button: a square, fully rounded button holding a single icon.

import { defineSlotComponent } from "@pureform/core";
import { px } from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken } from "@pureform/theme";

import {
    COLOR_GROUPS,
    colorCompounds,
    colorVariants,
    componentTokens,
    fillVariant,
    sys,
    touchTarget,
    iconBox,
    pressableRoot,
} from "./shared";
import type { ColorGroups, Fill } from "./shared";

const FILLS: Record<string, Fill> = {
    filled: "filled",
    tonal: "tonal",
    outlined: "outlined",
    standard: "text",
    elevated: "elevated",
};

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
    root: { width: ref(token), height: ref(token) },
});

/** Build the iconButton with a `color` variant per group in `groups`. */
export const createIconButton = (groups: ColorGroups = COLOR_GROUPS) =>
    defineSlotComponent({
        name: "iconButton",
        $meta: { description: "Material icon button holding a single icon." },
        tokens,
        slots: ["root", "icon", "touchTarget"],
        structure: { root: ["touchTarget", "icon"] },
        recipe: {
            base: {
                root: {
                    ...pressableRoot,
                    borderRadius: ref("radius"),
                },
                icon: iconBox(ref("iconSize")),
                touchTarget,
            },
            variants: {
                color: colorVariants(groups),
                variant: Object.fromEntries(
                    Object.entries(FILLS).map(([name, fill]) => [
                        name,
                        fillVariant(fill, ref),
                    ]),
                ),
                size: {
                    small: size("sizeSmall"),
                    medium: size("sizeMedium"),
                    large: size("sizeLarge"),
                },
            },
            compoundVariants: colorCompounds(FILLS, groups),
            defaultVariants: {
                color: "primary",
                variant: "standard",
                size: "medium",
            },
        },
    });

export const iconButton = createIconButton();
