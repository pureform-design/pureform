// The pureform avatar: a picture, initials, or an icon for a person or thing, in a color
// group's container, at one of three sizes. It can take a shape. An avatar isn't interactive,
// so it takes the clip itself; put it inside a button to make it one.
//
// The root holds the picture (`image`) and what stands in for it (`fallback`: initials or an
// icon). Zag's avatar machine shows the picture once it has loaded, and the fallback until then
// and when it fails; a root holding only a fallback is the initials or icon avatar.
//
//   <span class={root} role="img" aria-label="Ada Lovelace">
//     <img class={image} src="/ada.png" alt="" />
//     <span class={fallback}>AL</span>
//   </span>

import { typed } from "@pureform/core";
import {
    center,
    cover,
    hidden,
    inlineFlex,
    pct,
    px,
    relative,
    unitless,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, textStyle } from "@pureform/theme";

import { DEFAULT_SHAPES, clipVariant } from "./shaped";
import type { Shapes } from "./shaped";
import {
    DEFAULT_GROUP,
    colorVariant,
    componentTokens,
    defaultGroups,
    on,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

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
) => ({
    root: {
        width: ref(token),
        height: ref(token),
        textStyle: textStyle(style),
    } satisfies StyleMap,
});

const onRoot = (variants: Record<string, StyleMap>) =>
    Object.fromEntries(
        Object.entries(variants).map(([name, style]) => [
            name,
            { root: style },
        ]),
    );

const pf = typed();

/** Build the avatar with a `color` variant per group in `groups`, and a `shape` variant per
 *  shape in `shapes`. */
export const createAvatar = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
    shapes: Shapes = DEFAULT_SHAPES,
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "avatar",
            $meta: {
                description:
                    "Avatar: a picture with initials or an icon as its fallback, in a color group's container. Give it alt text or an aria-label. shape clips it to one of the theme's shapes.",
            },
            tokens,
            slots: ["root", "image", "fallback"],
            structure: { root: ["image", "fallback"] },
            variants: {
                size: ["small", "medium", "large"],
                color: groups as ColorGroups,
                shape: ["none", ...Object.keys(shapes)],
            },
            recipe: () => ({
                base: {
                    root: {
                        position: relative,
                        display: inlineFlex,
                        alignItems: center,
                        justifyContent: center,
                        flexShrink: unitless(0),
                        overflow: hidden,
                        borderRadius: ref("radius"),
                        backgroundColor: ref("container"),
                        color: ref("content"),
                    },
                    // Neither sets `display`, so the machine's `hidden` hides them.
                    image: {
                        width: pct(100),
                        height: pct(100),
                        objectFit: cover,
                    },
                    fallback: {
                        alignItems: center,
                        justifyContent: center,
                    },
                },
                variants: {
                    size: {
                        small: sized("sizeSmall", "labelSmall"),
                        medium: sized("sizeMedium", "titleMedium"),
                        large: sized("sizeLarge", "titleLarge"),
                    },
                    color: colorVariant(groups, (g) => ({
                        root: {
                            backgroundColor: g.container,
                            color: g.onContainer,
                        },
                    })),
                    shape: onRoot(clipVariant(shapes, ref("radius"))),
                },
                defaultVariants: {
                    size: "medium",
                    color: DEFAULT_GROUP,
                    shape: "none",
                },
            }),
        }),
    );

export const avatar = createAvatar();
