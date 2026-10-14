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
    COLOR_GROUPS,
    colorCompounds,
    colorVariants,
    componentTokens,
    fillVariant,
    sys,
    touchTarget,
} from "./shared";
import type { ColorGroups, Fill } from "./shared";

const FILLS: Record<string, Fill> = {
    filled: "filled",
    tonal: "tonal",
    outlined: "outlined",
    text: "text",
    elevated: "elevated",
};

const { tokens, ref } = componentTokens("button", {
    radius: alias("tokens", "radii", "full"),
    gap: alias("tokens", "spacing", "2"),
    iconSize: alias("tokens", "sizes", "iconSmall"),
    outlineWidth: px(1),
    outlineColor: sys("outline"),
    heightSmall: alias("tokens", "sizes", "controlSmall"),
    heightMedium: alias("tokens", "sizes", "controlMedium"),
    heightLarge: alias("tokens", "sizes", "controlLarge"),
    paddingSmall: alias("tokens", "spacing", "4"),
    paddingMedium: alias("tokens", "spacing", "6"),
    paddingLarge: alias("tokens", "spacing", "8"),
});

type Size = "Small" | "Medium" | "Large";

const size = (s: Size): { root: StyleMap } => ({
    root: {
        height: ref(`height${s}`),
        paddingInlineStart: ref(`padding${s}`),
        paddingInlineEnd: ref(`padding${s}`),
    },
});

/** Build the button with a `color` variant per group in `groups`. */
export const createButton = (groups: ColorGroups = COLOR_GROUPS) =>
    defineSlotComponent({
        name: "button",
        $meta: {
            description:
                "Material common button. Render the icon slot only when there is an icon.",
        },
        tokens,
        slots: ["root", "label", "icon", "touchTarget"],
        recipe: {
            base: {
                root: {
                    position: relative,
                    display: inlineFlex,
                    flexDirection: row,
                    alignItems: center,
                    justifyContent: center,
                    gap: ref("gap"),
                    borderWidth: px(0),
                    borderRadius: ref("radius"),
                    cursor: pointer,
                    states: { disabled: { pointerEvents: none } },
                },
                label: { textStyle: alias("textStyles", "labelLarge") },
                icon: {
                    width: ref("iconSize"),
                    height: ref("iconSize"),
                },
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
                    small: size("Small"),
                    medium: size("Medium"),
                    large: size("Large"),
                },
            },
            compoundVariants: colorCompounds(FILLS, groups),
            defaultVariants: {
                color: "primary",
                variant: "filled",
                size: "medium",
            },
        },
    });

export const button = createButton();
