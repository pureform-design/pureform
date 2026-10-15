// The pureform button: Material's common button in five fills and seven color groups.
//
// The icon slot is styled but never toggled by a variant. Render the icon element only when
// there is one; the root's gap spaces it from the label.

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
    colorCompounds,
    colorVariants,
    componentTokens,
    fillVariant,
    sys,
    touchTarget,
    stateTransition,
    focusRing,
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
    radius: radius("full"),
    gap: spacing("2"),
    iconSize: sizeToken("iconSmall"),
    outlineWidth: px(1),
    outlineColor: sys("outline"),
    heightSmall: sizeToken("controlSmall"),
    heightMedium: sizeToken("controlMedium"),
    heightLarge: sizeToken("controlLarge"),
    paddingSmall: spacing("4"),
    paddingMedium: spacing("6"),
    paddingLarge: spacing("8"),
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
        structure: { root: ["touchTarget", "icon", "label"] },
        recipe: {
            base: {
                root: {
                    ...focusRing(),
                    transition: stateTransition,
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
                label: { textStyle: textStyle("labelLarge") },
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
