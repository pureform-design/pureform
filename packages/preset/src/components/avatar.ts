// The pureform avatar: a picture, initials, or an icon for a person or thing, in a color
// group's container, at one of three sizes. It can take a shape. An avatar isn't interactive,
// so it takes the clip itself; put it inside a button to make it one.
//
//   <img class={avatar()} src="…" alt="Ada Lovelace" />
//   <span class={avatar({ shape: "cookie9Sided" })} role="img" aria-label="Ada Lovelace">AL</span>

import { typed } from "@pureform/core";
import { center, cover, inlineFlex, px, unitless } from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, textStyle } from "@pureform/theme";

import { DEFAULT_SHAPES, clipVariant } from "./shaped";
import type { Shapes } from "./shaped";
import {
    COLOR_GROUPS,
    DEFAULT_GROUP,
    colorVariant,
    componentTokens,
    on,
    sys,
} from "./shared";
import type { ColorGroups } from "./shared";

const { tokens, ref } = componentTokens("avatar", {
    radius: radius("full"),
    container: sys("primaryContainer"),
    content: on("primaryContainer"),
    sizeSmall: px(24),
    sizeMedium: px(40),
    sizeLarge: px(56),
});

const sized = (
    token: "sizeSmall" | "sizeMedium" | "sizeLarge",
    style: string,
): StyleMap => ({
    width: ref(token),
    height: ref(token),
    textStyle: textStyle(style),
});

const pf = typed();

/** Build the avatar with a `color` variant per group in `groups`, and a `shape` variant per
 *  shape in `shapes`. */
export const createAvatar = (
    groups: ColorGroups = COLOR_GROUPS,
    shapes: Shapes = DEFAULT_SHAPES,
) =>
    pf.component({
        name: "avatar",
        $meta: {
            description:
                "Avatar: a picture (style the img itself), initials, or an icon, in a color group's container. Give it alt text or an aria-label. shape clips it to one of the theme's shapes.",
        },
        tokens,
        variants: {
            size: ["small", "medium", "large"],
            color: groups,
            shape: ["none", ...Object.keys(shapes)],
        },
        recipe: () => ({
            base: {
                display: inlineFlex,
                alignItems: center,
                justifyContent: center,
                flexShrink: unitless(0),
                borderRadius: ref("radius"),
                backgroundColor: ref("container"),
                color: ref("content"),
                objectFit: cover,
            },
            variants: {
                size: {
                    small: sized("sizeSmall", "labelSmall"),
                    medium: sized("sizeMedium", "titleMedium"),
                    large: sized("sizeLarge", "titleLarge"),
                },
                color: colorVariant(groups, (g) => ({
                    backgroundColor: g.container,
                    color: g.onContainer,
                })),
                shape: clipVariant(shapes, ref("radius")),
            },
            defaultVariants: {
                size: "medium",
                color: DEFAULT_GROUP,
                shape: "none",
            },
        }),
    });

export const avatar = createAvatar();
