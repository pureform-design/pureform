// The pureform grid list: tiles laid out in equal columns with a gutter between them, each at
// an aspect ratio, with an optional header and footer laid over the tile. M3 doesn't specify it
// (Android's image grid is M2 only); the parts and options follow Angular Material's grid list
// (`mat-grid-list`, `mat-grid-tile`, its header and footer), written here with M3 roles.
//
// There is no machine and no CSS grid: the root is a wrapping row and each tile takes a share of
// its width, so the same recipe draws on the web and in React Native. React Native can't subtract
// a gutter from a percentage, so the gutter is padding inside each tile (the grid cell), which
// the root pulls back with a negative margin of half a gutter; the `content` inside it is what
// you see, as in Angular's tile. A cell takes `100% / columns` whatever the gutter.
//
//   <div class={root} role="list">
//     <div class={tile} role="listitem">
//       <div class={content}>
//         <img class={media} src="…" alt="Sunrise" />
//         <div class={header}><div class={headline}>Sunrise</div></div>
//         <div class={footer}><div class={headline}>Photo by Ana</div></div>
//       </div>
//     </div>
//     …
//   </div>
//
// `columns`, `gutter` and `aspect` set tokens the parts read, so the root's variants never set a
// tile's property. Spanning a tile over more than one column or row isn't built (Angular's
// `colspan` and `rowspan`): a variant is chosen per grid, not per tile.

import { typed } from "@pureform/core";
import {
    absolute,
    center,
    column,
    colorMix,
    cover,
    div,
    flex,
    hidden,
    mul,
    pct,
    px,
    relative,
    row,
    transparent,
    unitless,
    wrap,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";

import { componentTokens, dense, sys } from "./shared";

const { tokens, ref } = componentTokens("gridList", {
    // How many tiles share a row.
    columns: unitless(3),
    // The space between tiles, in both directions.
    gutter: spacing("2"),
    // A tile's width over its height.
    aspect: unitless(1),
    radius: radius("medium"),
    // Shows while a picture loads, or behind a transparent one.
    container: sys("surfaceContainerHighest"),
    // The header's and footer's band: the inverse surface at `captionOpacity`, with its own
    // on-color for the text, a pair that holds its contrast in both schemes.
    captionContainer: sys("inverseSurface"),
    captionContent: sys("inverseOnSurface"),
    captionOpacity: pct(80),
    captionSize: px(48),
    captionPadding: spacing("4"),
});

// A band along one edge of the tile, over the picture.
const caption = (edge: "insetBlockStart" | "insetBlockEnd"): StyleMap => ({
    position: absolute,
    [edge]: px(0),
    insetInlineStart: px(0),
    insetInlineEnd: px(0),
    display: flex,
    flexDirection: column,
    justifyContent: center,
    minHeight: dense(ref("captionSize")),
    paddingInlineStart: ref("captionPadding"),
    paddingInlineEnd: ref("captionPadding"),
    textStyle: textStyle("titleSmall"),
    color: ref("captionContent"),
    backgroundColor: colorMix(
        transparent,
        ref("captionContainer"),
        ref("captionOpacity"),
    ),
});

const pf = typed();

export const gridList = pf.slotComponent({
    name: "gridList",
    $meta: {
        description:
            "Grid list: tiles in equal columns with a gutter, at an aspect ratio. columns, gutter and aspect set it; tokens columns, gutter and aspect take any value. Each tile holds a content, which holds a media, and optionally a header and footer laid over it. Give the root role list and each tile role listitem.",
    },
    tokens,
    slots: [
        "root",
        "tile",
        "content",
        "media",
        "header",
        "footer",
        "headline",
        "subhead",
    ],
    // The footer's lines are the same parts as the header's, so they nest once, under the header.
    structure: {
        root: ["tile"],
        tile: ["content"],
        content: ["media", "header", "footer"],
        header: ["headline", "subhead"],
    },
    variants: {
        columns: ["1", "2", "3", "4", "5", "6"],
        gutter: ["none", "small", "medium", "large"],
        aspect: ["square", "landscape", "portrait", "wide"],
    },
    recipe: () => ({
        base: {
            root: {
                display: flex,
                flexDirection: row,
                flexWrap: wrap,
                // Takes back the half gutter the cells pad on the outside.
                marginBlockStart: mul(ref("gutter"), unitless(-0.5)),
                marginBlockEnd: mul(ref("gutter"), unitless(-0.5)),
                marginInlineStart: mul(ref("gutter"), unitless(-0.5)),
                marginInlineEnd: mul(ref("gutter"), unitless(-0.5)),
            },
            // A grid cell: its share of the row, padded by half the gutter on every side.
            tile: {
                flexGrow: unitless(0),
                flexShrink: unitless(0),
                width: div(pct(100), ref("columns")),
                paddingBlockStart: mul(ref("gutter"), unitless(0.5)),
                paddingBlockEnd: mul(ref("gutter"), unitless(0.5)),
                paddingInlineStart: mul(ref("gutter"), unitless(0.5)),
                paddingInlineEnd: mul(ref("gutter"), unitless(0.5)),
            },
            content: {
                position: relative,
                overflow: hidden,
                width: pct(100),
                aspectRatio: ref("aspect"),
                borderRadius: ref("radius"),
                backgroundColor: ref("container"),
            },
            media: {
                display: flex,
                width: pct(100),
                height: pct(100),
                objectFit: cover,
            },
            header: caption("insetBlockStart"),
            footer: caption("insetBlockEnd"),
            headline: { textStyle: textStyle("titleSmall") },
            subhead: { textStyle: textStyle("bodySmall") },
        },
        variants: {
            columns: {
                "1": { root: { tokens: { columns: unitless(1) } } },
                "2": { root: { tokens: { columns: unitless(2) } } },
                "3": { root: { tokens: { columns: unitless(3) } } },
                "4": { root: { tokens: { columns: unitless(4) } } },
                "5": { root: { tokens: { columns: unitless(5) } } },
                "6": { root: { tokens: { columns: unitless(6) } } },
            },
            gutter: {
                none: { root: { tokens: { gutter: px(0) } } },
                small: { root: { tokens: { gutter: spacing("1") } } },
                medium: { root: { tokens: { gutter: spacing("2") } } },
                large: { root: { tokens: { gutter: spacing("4") } } },
            },
            aspect: {
                square: { root: { tokens: { aspect: unitless(1) } } },
                landscape: { root: { tokens: { aspect: unitless(4 / 3) } } },
                portrait: { root: { tokens: { aspect: unitless(3 / 4) } } },
                wide: { root: { tokens: { aspect: unitless(16 / 9) } } },
            },
        },
        defaultVariants: { columns: "3", gutter: "medium", aspect: "square" },
    }),
});
