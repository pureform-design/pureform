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
    fillVariant,
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

const size = (dimension: string): { root: StyleMap } => ({
    root: {
        width: alias("tokens", "sizes", dimension),
        height: alias("tokens", "sizes", dimension),
    },
});

export const iconButton = defineSlotComponent({
    name: "iconButton",
    $meta: { description: "Material icon button holding a single icon." },
    slots: ["root", "icon", "touchTarget"],
    recipe: {
        base: {
            root: {
                position: relative,
                display: inlineFlex,
                alignItems: center,
                justifyContent: center,
                borderWidth: px(0),
                borderRadius: alias("tokens", "radii", "full"),
                cursor: pointer,
                states: { disabled: { pointerEvents: none } },
            },
            icon: {
                width: alias("tokens", "sizes", "iconMedium"),
                height: alias("tokens", "sizes", "iconMedium"),
            },
            touchTarget,
        },
        variants: {
            color: colorVariants(),
            variant: Object.fromEntries(
                Object.entries(FILLS).map(([name, fill]) => [
                    name,
                    fillVariant(fill),
                ]),
            ),
            size: {
                small: size("controlSmall"),
                medium: size("controlMedium"),
                large: size("controlLarge"),
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
