// The pureform icon: a box that centers a glyph, an icon-font icon, or an svg at one of the
// icon sizes. Components with an icon slot draw it with the same style. An icon font follows
// the fill of the slot it sits in, unless `filled` says otherwise; mark an icon that points with
// `data-pf-mirror` to flip it under rtl.

import { typed } from "@pureform/core";
import { px, unitless } from "@pureform/core/ast";
import { size as sizeToken } from "@pureform/theme";

import {
    DEFAULT_GROUP,
    componentTokens,
    defaultGroups,
    iconBox,
    iconFill,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

const pf = typed();

const { tokens, ref } = componentTokens("icon", {
    sizeSmall: sizeToken("iconSmall"),
    sizeMedium: sizeToken("iconMedium"),
    sizeLarge: px(36),
});

/** Build the icon with a `color` variant per group in `groups`. With no color it takes the
 *  surrounding text color. */
export const createIcon = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.component({
            name: "icon",
            $meta: {
                description:
                    "An icon box at an icon size that centers its glyph or svg. color tints it with a color group; filled draws an icon font filled or outlined, or inherit follows the slot it sits in. Set data-pf-mirror on an icon that points to flip it under rtl.",
            },
            tokens,
            variants: {
                size: ["small", "medium", "large"],
                color: ["current", ...groups],
                filled: ["inherit", "false", "true"],
            },
            recipe: () => ({
                base: {},
                variants: {
                    size: {
                        small: iconBox(ref("sizeSmall")),
                        medium: iconBox(ref("sizeMedium")),
                        large: iconBox(ref("sizeLarge")),
                    },
                    color: {
                        current: {},
                        ...Object.fromEntries(
                            groups.map((group) => [
                                group,
                                { color: sys(group) },
                            ]),
                        ),
                    },
                    filled: {
                        inherit: {},
                        false: { fontVariationSettings: iconFill(unitless(0)) },
                        true: { fontVariationSettings: iconFill(unitless(1)) },
                    },
                },
                defaultVariants: {
                    size: "medium",
                    color: "current",
                    filled: "inherit",
                },
            }),
        }),
    );

export const icon = createIcon();
