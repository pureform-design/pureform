// The pureform icon: a box that centers a glyph, an icon-font icon, or an svg at one of the
// icon sizes. Components with an icon slot draw it with the same style.

import { typed } from "@pureform/core";
import { px } from "@pureform/core/ast";
import { size as sizeToken } from "@pureform/theme";

import { COLOR_GROUPS, componentTokens, iconBox, sys } from "./shared";
import type { ColorGroups } from "./shared";

const pf = typed();

const { tokens, ref } = componentTokens("icon", {
    sizeSmall: sizeToken("iconSmall"),
    sizeMedium: sizeToken("iconMedium"),
    sizeLarge: px(36),
});

/** Build the icon with a `color` variant per group in `groups`. With no color it takes the
 *  surrounding text color. */
export const createIcon = (groups: ColorGroups = COLOR_GROUPS) =>
    pf.component({
        name: "icon",
        $meta: {
            description:
                "An icon box at an icon size that centers its glyph or svg. color tints it with a color group.",
        },
        tokens,
        variants: {
            size: ["small", "medium", "large"],
            color: ["current", ...groups],
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
                        groups.map((group) => [group, { color: sys(group) }]),
                    ),
                },
            },
            defaultVariants: { size: "medium", color: "current" },
        }),
    });

export const icon = createIcon();
