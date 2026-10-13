// The pureform icon button: a square, fully rounded button holding a single icon.

import { defineSlotComponent } from "@pureform/core";
import {
    alias,
    center,
    inlineFlex,
    none,
    pointer,
    px,
    relative,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";

import {
    colorCompounds,
    colorVariants,
    componentTokens,
    fillVariant,
    sys,
    touchTarget,
} from "./shared";
import type { Fill } from "./shared";

const FILLS: Record<string, Fill> = {
    filled: "filled",
    tonal: "tonal",
    outlined: "outlined",
    standard: "text",
    elevated: "elevated",
};

const { tokens, ref } = componentTokens("iconButton", {
    radius: alias("tokens", "radii", "full"),
    iconSize: alias("tokens", "sizes", "iconMedium"),
    outlineWidth: px(1),
    outlineColor: sys("outline"),
    sizeSmall: alias("tokens", "sizes", "controlSmall"),
    sizeMedium: alias("tokens", "sizes", "controlMedium"),
    sizeLarge: alias("tokens", "sizes", "controlLarge"),
});

const size = (
    token: "sizeSmall" | "sizeMedium" | "sizeLarge",
): { root: StyleMap } => ({
    root: { width: ref(token), height: ref(token) },
});

export const iconButton = defineSlotComponent({
    name: "iconButton",
    $meta: { description: "Material icon button holding a single icon." },
    tokens,
    slots: ["root", "icon", "touchTarget"],
    recipe: {
        base: {
            root: {
                position: relative,
                display: inlineFlex,
                alignItems: center,
                justifyContent: center,
                borderWidth: px(0),
                borderRadius: ref("radius"),
                cursor: pointer,
                states: { disabled: { pointerEvents: none } },
            },
            icon: {
                width: ref("iconSize"),
                height: ref("iconSize"),
            },
            touchTarget,
        },
        variants: {
            color: colorVariants(),
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
        compoundVariants: colorCompounds(FILLS),
        defaultVariants: {
            color: "primary",
            variant: "standard",
            size: "medium",
        },
    },
});
