// The pureform button: Material's common button in five fills and seven color groups.
//
// Each color group points the button's group tokens at its roles, and each fill reads them, so
// every pairing of fill and group comes from two rules rather than one of its own.
//
// The icon slot is styled but never toggled by a variant. Render the icon element only when
// there is one; the root's gap spaces it from the label.

import { typed } from "@pureform/core";
import { px, add } from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import {
    DEFAULT_GROUP,
    colorTokenVariants,
    componentTokens,
    defaultDensities,
    defaultGroups,
    dense,
    densityCompounds,
    densityMarkers,
    densitySteps,
    fillTokenColors,
    fillVariant,
    groupTokens,
    iconBox,
    keysOf,
    lower,
    pressableRoot,
    sys,
    touchTarget,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities, Fill } from "./shared";

const FILLS = {
    filled: "filled",
    tonal: "tonal",
    outlined: "outlined",
    text: "text",
    elevated: "elevated",
} satisfies Record<string, Fill>;

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
    ...groupTokens(DEFAULT_GROUP),
});

type Size = "Small" | "Medium" | "Large";
const SIZES: Size[] = ["Small", "Medium", "Large"];

const pf = typed();

/** Build the button with a `color` variant per group in `groups`. */
export const createButton = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
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
                color: groups as ColorGroups,
                variant: keysOf(FILLS),
                size: ["small", "medium", "large"],
                density: densitySteps<string>(densities),
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
                        color: colorTokenVariants(groups),
                        variant: Object.fromEntries(
                            Object.entries(FILLS).map(([name, fill]) => {
                                const { root } = fillVariant(fill, token);
                                const colors = fillTokenColors(fill, token);
                                return [
                                    name,
                                    {
                                        root: {
                                            ...root,
                                            ...colors,
                                            states: {
                                                ...root.states,
                                                disabled: {
                                                    ...root.states?.disabled,
                                                    ...colors.states?.disabled,
                                                },
                                            },
                                        },
                                    },
                                ];
                            }),
                        ),
                        size: {
                            small: size("Small"),
                            medium: size("Medium"),
                            large: size("Large"),
                        },
                        density: densityMarkers(densities),
                    },
                    compoundVariants: SIZES.flatMap((s) =>
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
                    defaultVariants: {
                        color: "primary",
                        variant: "filled",
                        size: "medium",
                        density: "inherit",
                    },
                };
            },
        }),
    );

export const button = createButton();
