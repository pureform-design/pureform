// The pureform app bar: Material's top app bar, the strip at the top of a screen holding the
// navigation button, the screen's headline, and its actions.
//
// Markup: a container holding the leading navigation button, the content (the headline and an
// optional subtitle, or a search bar), and trailing actions. Every element sits in one wrapping
// row: the leading and trailing parts are the bar's height, so they make its first line. A small
// bar keeps the content between them; a medium or large flexible bar renders the content last,
// where it takes a line of its own under the actions, in a larger type. Once the page scrolls
// under it, the bar takes the scrolled container color, and a flexible bar collapses to the small
// one.
//
//   <header class={root}>
//     <span class={leading}><button aria-label="Back">←</button></span>
//     <span class={trailing}><button aria-label="More">⋮</button></span>
//     <div class={content}>
//       <h1 class={headline}>Inbox</h1>
//       <p class={subtitle}>12 unread</p>
//     </div>
//   </header>

import { typed } from "@pureform/core";
import {
    auto,
    center,
    column,
    end,
    flex,
    hidden,
    none,
    pct,
    px,
    row,
    stretch,
    transform,
    translateY,
    unitless,
    when,
    wrap,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { size as sizeToken, spacing, textStyle } from "@pureform/theme";

import { motionAnimation } from "./overlay";
import {
    blend,
    componentTokens,
    iconBox,
    iconFill,
    stateTransition,
    surface,
    sys,
} from "./shared";

const { tokens, ref } = componentTokens("appBar", {
    container: sys("surface"),
    // The container once the page has scrolled under the bar.
    scrolledContainer: sys("surfaceContainer"),
    leadingColor: sys("onSurface"),
    headlineColor: sys("onSurface"),
    subtitleColor: sys("onSurfaceVariant"),
    trailingColor: sys("onSurfaceVariant"),
    // The bar's first line: the small bar, and a flexible bar's row of actions.
    height: px(64),
    // The room a flexible bar's headline takes under its actions, at least.
    mediumContentHeight: px(48),
    largeContentHeight: px(56),
    paddingInline: spacing("1"),
    // The headline's inset from the leading and trailing parts.
    contentPaddingInline: spacing("3"),
    // A flexible bar's headline insets from the edges and the bottom.
    expandedPaddingInline: spacing("4"),
    expandedPaddingBlockEnd: spacing("3"),
    iconSize: sizeToken("iconMedium"),
    iconFill: unitless(0),
    // Flags the content's inset reads: 1 on a flexible bar (set by `size`), and 1 with a search
    // bar (set by `search`), which wins.
    expanded: unitless(0),
    search: unitless(0),
});

const pf = typed();

// How far the headline rises as it moves into a collapsed bar.
const COLLAPSE_TRAVEL = spacing("2");

/** The keyframes the headline rises into a collapsed bar with; `pureform()` adds them to the
 *  config. Reduced motion drops them. */
export const APP_BAR_KEYFRAMES: Record<string, Record<string, StyleMap>> = {
    appBarCollapseIn: {
        from: { transform: transform(translateY(COLLAPSE_TRAVEL)) },
        to: { transform: transform(translateY(px(0))) },
    },
};

// A part at the start or end of the first line: an icon, or icon buttons, which grow it past the
// icon's size. It's the bar's height, so it makes the first line. Its icon buttons draw in its
// color, as Material's leading and trailing icons do.
const edge = (color: "leadingColor" | "trailingColor"): StyleMap => {
    const {
        width: _width,
        height: _height,
        minWidth: _minWidth,
        ...box
    } = iconBox(ref("iconSize"), { fill: iconFill(ref("iconFill")) });
    return {
        ...box,
        flexShrink: unitless(0),
        height: ref("height"),
        color: ref(color),
        providedTokens: { "components.iconButton.accent": ref(color) },
    };
};

// A flexible bar's content: a line of its own under the actions, its headline at the bottom,
// inset from the edges by the `expanded` flag.
const expanded = (minHeight: NonNullable<StyleMap["minHeight"]>): StyleMap => ({
    flexBasis: pct(100),
    flexGrow: unitless(1),
    justifyContent: end,
    minHeight,
    paddingBlockEnd: ref("expandedPaddingBlockEnd"),
});

// The content's inline inset: from the leading and trailing parts, from the edges on a flexible
// bar, and the bar's own padding around a search bar.
const contentInset = blend(
    blend(
        ref("contentPaddingInline"),
        ref("expandedPaddingInline"),
        ref("expanded"),
    ),
    ref("paddingInline"),
    ref("search"),
);

export const appBar = pf.slotComponent({
    name: "appBar",
    bindingVariants: ["search"],
    $meta: {
        description:
            "Material app bar: the strip at the top of a screen with a leading navigation button, the headline and subtitle (or a search bar), and trailing actions. size small, mediumFlexible or largeFlexible (the flexible ones put the headline on a line of its own, larger); centered centers the headline; search makes room for a search bar; scrolled takes the scrolled container color; collapsed draws a flexible bar as the small one.",
    },
    tokens,
    slots: ["root", "leading", "content", "headline", "subtitle", "trailing"],
    structure: {
        root: ["leading", "content", "trailing"],
        content: ["headline", "subtitle"],
    },
    variants: {
        size: ["small", "mediumFlexible", "largeFlexible"],
        centered: ["false", "true"],
        search: ["false", "true"],
        scrolled: ["false", "true"],
        collapsed: ["false", "true"],
    },
    recipe: () => ({
        base: {
            root: {
                ...surface(ref("container"), ref("headlineColor"), "level0"),
                transition: stateTransition,
                display: flex,
                flexDirection: row,
                flexWrap: wrap,
                alignItems: center,
                width: pct(100),
                paddingInlineStart: ref("paddingInline"),
                paddingInlineEnd: ref("paddingInline"),
            },
            leading: edge("leadingColor"),
            content: {
                display: flex,
                flexDirection: column,
                alignItems: stretch,
                flexGrow: unitless(1),
                flexBasis: px(0),
                minWidth: px(0),
                paddingInlineStart: contentInset,
                paddingInlineEnd: contentInset,
            },
            headline: {
                textStyle: textStyle("titleLarge"),
                color: ref("headlineColor"),
                overflow: hidden,
            },
            subtitle: {
                textStyle: textStyle("labelMedium"),
                color: ref("subtitleColor"),
                overflow: hidden,
            },
            trailing: {
                ...edge("trailingColor"),
                // The actions keep to the end, even with no content between.
                marginInlineStart: auto,
            },
        },
        variants: {
            size: {
                small: {},
                // M3 Expressive's flexible bars replace the medium and large ones.
                mediumFlexible: {
                    root: { tokens: { expanded: unitless(1) } },
                    content: expanded(ref("mediumContentHeight")),
                    headline: { textStyle: textStyle("headlineMedium") },
                    subtitle: { textStyle: textStyle("labelLarge") },
                },
                largeFlexible: {
                    root: { tokens: { expanded: unitless(1) } },
                    content: expanded(ref("largeContentHeight")),
                    headline: { textStyle: textStyle("displaySmall") },
                    subtitle: { textStyle: textStyle("titleMedium") },
                },
            },
            centered: {
                false: {},
                true: { content: { alignItems: center } },
            },
            // A search bar fills the content, between the navigation button and the actions.
            search: {
                false: {},
                true: { root: { tokens: { search: unitless(1) } } },
            },
            // The page has scrolled under the bar.
            scrolled: {
                false: {},
                true: {
                    root: { tokens: { container: ref("scrolledContainer") } },
                },
            },
            // A flexible bar scrolled past its headline: the bindings select the small size
            // with it, and its headline rises into the first line.
            collapsed: {
                false: {},
                true: {
                    content: {
                        animation: when(
                            "reducedMotion",
                            none,
                            motionAnimation(
                                "appBarCollapseIn",
                                "short4",
                                "emphasizedDecelerate",
                            ),
                        ),
                    },
                },
            },
        },
        defaultVariants: {
            size: "small",
            centered: "false",
            search: "false",
            scrolled: "false",
            collapsed: "false",
        },
    }),
});
