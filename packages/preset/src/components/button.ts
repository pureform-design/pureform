// The pureform button: Material's common button in five fills and seven color groups.
//
// The icon slot is styled but never toggled by a variant. Render the icon element only when
// there is one; the root's gap spaces it from the label.

import { typed } from "@pureform/core";
import { px, add } from "@pureform/core/ast";
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
    iconBox,
    pressableRoot,
    dense,
    densityCompounds,
    lower,
    densityMarkers,
    DEFAULT_DENSITIES,
} from "./shared";
import type { ColorGroups, Fill, Densities } from "./shared";

const FILLS: Record<string, Fill> = {
    filled: "filled",
    tonal: "tonal",
    outlined: "outlined",
    text: "text",
    elevated: "elevated",
};

const { tokens } = componentTokens("button", {
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
const SIZES: Size[] = ["Small", "Medium", "Large"];

const pf = typed();

/** Build the button with a `color` variant per group in `groups`. */
export const createButton = (
    groups: ColorGroups = COLOR_GROUPS,
    densities: Densities = DEFAULT_DENSITIES,
) =>
    pf.slotComponent({
        name: "button",
        $meta: {
            description:
                "Material common button. Render the icon slot only when there is an icon.",
        },
        tokens,
        slots: ["root", "label", "icon", "touchTarget"],
        structure: { root: ["touchTarget", "icon", "label"] },
        variants: {
            color: groups,
            variant: Object.keys(FILLS),
            size: ["small", "medium", "large"],
            density: ["inherit", ...Object.keys(densities)],
        },
        recipe: ({ token }) => {
            const size = (s: Size): { root: StyleMap } => ({
                root: {
                    height: dense(token(`height${s}`)),
                    paddingInlineStart: token(`padding${s}`),
                    paddingInlineEnd: token(`padding${s}`),
                },
            });
            return {
                base: {
                    root: {
                        ...pressableRoot,
                        gap: token("gap"),
                        borderRadius: token("radius"),
                    },
                    label: { textStyle: textStyle("labelLarge") },
                    icon: iconBox(token("iconSize")),
                    touchTarget,
                },
                variants: {
                    color: colorVariants(groups),
                    variant: Object.fromEntries(
                        Object.entries(FILLS).map(([name, fill]) => [
                            name,
                            fillVariant(fill, token),
                        ]),
                    ),
                    size: {
                        small: size("Small"),
                        medium: size("Medium"),
                        large: size("Large"),
                    },
                    density: densityMarkers(densities),
                },
                compoundVariants: [
                    ...colorCompounds(FILLS, groups),
                    ...SIZES.flatMap((s) =>
                        densityCompounds(
                            densities,
                            { size: lower(s) },
                            (offset) => ({
                                root: {
                                    height: add(token(`height${s}`), offset),
                                },
                            }),
                        ),
                    ),
                ],
                defaultVariants: {
                    color: "primary",
                    variant: "filled",
                    size: "medium",
                    density: "inherit",
                },
            };
        },
    });

export const button = createButton();
