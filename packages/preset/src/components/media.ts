// The pureform media: a picture or video that fills its container's width, at an aspect ratio,
// that can take a shape. Put it in a card or a list to give either artwork, while the card
// itself stays rectangular and its text unclipped.
//
//   <img class={media({ aspect: "landscape" })} src="…" alt="" />
//   <img class={media({ aspect: "square", shape: "cookie9Sided" })} src="…" alt="Album art" />

import { typed } from "@pureform/core";
import { cover, div, flex, pct, unitless } from "@pureform/core/ast";
import { radius } from "@pureform/theme";

import { DEFAULT_SHAPES, clipVariant } from "./shaped";
import type { Shapes } from "./shaped";
import { componentTokens, sys } from "./shared";

const { tokens, ref } = componentTokens("media", {
    radius: radius("medium"),
    // Shows while the picture loads, or behind a transparent one.
    container: sys("surfaceContainerHighest"),
});

const ratio = (width: number, height: number) => ({
    aspectRatio: div(unitless(width), unitless(height)),
});

const pf = typed();

/** Build the media with a `shape` variant per shape in `shapes`. A shape stretches to the
 *  media's aspect; give it a `contain` fit to keep its proportions. */
export const createMedia = (shapes: Shapes = DEFAULT_SHAPES) =>
    pf.component({
        name: "media",
        $meta: {
            description:
                "Media: a picture or video filling its container's width at an aspect ratio, cropped to fill. Give it alt text, or an empty alt when decorative. shape clips it to one of the theme's shapes.",
        },
        tokens,
        variants: {
            aspect: ["auto", "square", "landscape", "portrait"],
            shape: ["none", ...Object.keys(shapes)],
        },
        recipe: () => ({
            base: {
                display: flex,
                width: pct(100),
                borderRadius: ref("radius"),
                backgroundColor: ref("container"),
                objectFit: cover,
            },
            variants: {
                aspect: {
                    square: ratio(1, 1),
                    landscape: ratio(16, 9),
                    portrait: ratio(3, 4),
                },
                shape: clipVariant(shapes, ref("radius")),
            },
            defaultVariants: { aspect: "auto", shape: "none" },
        }),
    });

export const media = createMedia();
