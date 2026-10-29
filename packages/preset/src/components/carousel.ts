// The pureform carousel: Material's row of items that scrolls and snaps, each item a rounded mask
// over its content. The `layout` picks how the items are sized:
//
// - `multiBrowse` (the default): large items, then a medium and a small one at the end, so
//   people see there is more. Items grow and shrink as they scroll past.
// - `hero`: one large item and a small one after it.
// - `uncontained`: items all the same size; the last one is cut off by the edge.
// - `multiAspect`: uncontained, with each item at its own aspect ratio.
// - `fullScreen`: one item fills the carousel, edge to edge.
//
//   <div class={root} role="region" aria-roledescription="carousel">
//     <div class={itemGroup}>                      scrolls and snaps (Zag's carousel)
//       <div class={item}>                         an item's place in the row
//         <div class={mask} tabindex="0">          the rounded, clipped item people see
//           <div class={content}><img … /></div>   the item at its full size, centered
//         </div>
//       </div>
//     </div>
//   </div>
//
// The bindings size each item from the layout: the item (its slot) and the content keep the large
// size, and the mask's width and inline offset follow the scroll position, so the content stays
// put while the mask around it shrinks (Material's parallax). Those sizes are set inline from the
// measured row; everything else (the shape, the colors, the spacing, the height) is a token.

import { typed } from "@pureform/core";
import {
    center,
    flex,
    hidden,
    pct,
    px,
    relative,
    stretch,
    unitless,
} from "@pureform/core/ast";
import { radius } from "@pureform/theme";

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import { componentTokens, indicationRoot, pressableRoot, sys } from "./shared";

/** The carousel's `layout` values. */
export const CAROUSEL_LAYOUTS = [
    "multiBrowse",
    "hero",
    "uncontained",
    "multiAspect",
    "fullScreen",
] as const;

export type CarouselLayout = (typeof CAROUSEL_LAYOUTS)[number];

const { tokens, ref } = componentTokens("carousel", {
    // Shows behind the content while it loads, and takes the state layer.
    container: sys("surfaceContainerHighest"),
    content: sys("onSurface"),
    // Material's item shape: the extra-large corners (28dp).
    radius: radius("extraLarge"),
    // The items' height: the carousel's, but for `fullScreen`, which fills its parent.
    height: px(200),
    // Between items, and around the row.
    gap: px(8),
    padding: px(16),
    ...INDICATION_TOKENS,
});

const pf = typed();

export const carousel = pf.slotComponent({
    name: "carousel",
    $meta: {
        description:
            "Material carousel: a scrolling row of items, each a rounded mask over its content. layout multiBrowse (large, medium and small items), hero, uncontained, multiAspect or fullScreen. Name it with aria-label; each item is focusable.",
    },
    tokens,
    slots: ["root", "itemGroup", "item", "mask", "content"],
    structure: {
        root: ["itemGroup"],
        itemGroup: ["item"],
        item: ["mask"],
        mask: ["content"],
    },
    variants: { layout: CAROUSEL_LAYOUTS },
    indication: [
        { trigger: "mask", surface: "mask", centered: false, focus: "mask" },
    ],
    recipe: () => ({
        base: {
            root: {
                ...indicationRoot(ref),
                position: relative,
                display: flex,
                width: pct(100),
            },
            itemGroup: {
                display: flex,
                flexGrow: unitless(1),
                alignItems: stretch,
                gap: ref("gap"),
                height: ref("height"),
                paddingInlineStart: ref("padding"),
                paddingInlineEnd: ref("padding"),
            },
            item: {
                position: relative,
                display: flex,
                flexShrink: unitless(0),
                height: pct(100),
            },
            mask: {
                ...pressableRoot(ref),
                display: flex,
                alignItems: stretch,
                justifyContent: center,
                flexShrink: unitless(0),
                height: pct(100),
                overflow: hidden,
                borderRadius: ref("radius"),
                backgroundColor: stateLayer(ref, {
                    base: ref("container"),
                    content: ref("content"),
                }),
                color: ref("content"),
            },
            content: {
                display: flex,
                flexShrink: unitless(0),
                height: pct(100),
            },
        },
        variants: {
            layout: {
                multiBrowse: {},
                hero: {},
                uncontained: {},
                multiAspect: {},
                // Edge to edge: no padding around the row, and the parent's height.
                fullScreen: {
                    root: { tokens: { padding: px(0) }, height: pct(100) },
                    itemGroup: { height: pct(100) },
                },
            },
        },
        defaultVariants: { layout: "multiBrowse" },
    }),
});
