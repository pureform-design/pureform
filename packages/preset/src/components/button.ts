// The pureform button: Material's common button in five fills and seven color groups.
//
// The icon slot is styled but never toggled by a variant. Render the icon element only when
// there is one; the root's gap spaces it from the label.

import { defineSlotComponent } from "@pureform/core";
import {
    alias,
    center,
    inlineFlex,
    none,
    pointer,
    px,
    relative,
    row,
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
    text: "text",
    elevated: "elevated",
};

const size = (height: string, padding: string): { root: StyleMap } => ({
    root: {
        height: alias("tokens", "sizes", height),
        paddingInlineStart: alias("tokens", "spacing", padding),
        paddingInlineEnd: alias("tokens", "spacing", padding),
    },
});

export const button = defineSlotComponent({
    name: "button",
    $meta: {
        description:
            "Material common button. Render the icon slot only when there is an icon.",
    },
    slots: ["root", "label", "icon", "touchTarget"],
    recipe: {
        base: {
            root: {
                position: relative,
                display: inlineFlex,
                flexDirection: row,
                alignItems: center,
                justifyContent: center,
                gap: alias("tokens", "spacing", "2"),
                borderWidth: px(0),
                borderRadius: alias("tokens", "radii", "full"),
                cursor: pointer,
                states: { disabled: { pointerEvents: none } },
            },
            label: { textStyle: alias("textStyles", "labelLarge") },
            icon: {
                width: alias("tokens", "sizes", "iconSmall"),
                height: alias("tokens", "sizes", "iconSmall"),
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
                small: size("controlSmall", "4"),
                medium: size("controlMedium", "6"),
                large: size("controlLarge", "8"),
            },
        },
        compoundVariants: colorCompounds(FILLS),
        defaultVariants: {
            color: "primary",
            variant: "filled",
            size: "medium",
        },
    },
});
