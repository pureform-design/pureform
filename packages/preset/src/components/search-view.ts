// The pureform search view: Material's search view, the surface a search bar opens into, with
// the query in a header over the suggestions or results.
//
// Markup: a surface holding the header (a leading icon button, usually back, the search input,
// and trailing icon buttons such as clear), a divider, and the content (the suggestions, often a list
// or the menu's items). The binding opens it as a modal: focus stays in it while it's open and
// goes back to the search bar when it closes.
//
//   <div class={root} role="dialog" aria-label="Search">
//     <div class={header}>
//       <button class={leading} aria-label="Back">←</button>
//       <input class={input} role="combobox" placeholder="Search" />
//       <button class={trailing} aria-label="Clear">×</button>
//     </div>
//     <hr class={divider} />
//     <div class={content} role="listbox">…</div>
//   </div>
//
// The view fills its positioner, which the binding places: over the viewport for `fullScreen`
// (with M3's taller header), or over the search bar's place, at the top of the bar's
// positioned container, for `docked` (the large corners and an elevation) and `contained`.
// `contained` (M3 Expressive) is docked with the header kept as a pill inside the surface and
// no divider, and its leading and trailing icons travel outward as it opens.

import { typed } from "@pureform/core";
import {
    auto,
    center,
    column,
    flex,
    mul,
    none,
    pct,
    px,
    row,
    transform,
    translateX,
    unitless,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import {
    radius,
    size as sizeToken,
    spacing,
    textStyle,
    zIndex,
} from "@pureform/theme";

import { DIALOG_MOTION, motionAnimation, overlayMotion } from "./overlay";
import {
    componentTokens,
    iconBox,
    iconFill,
    inputText,
    surface,
    sys,
} from "./shared";

const { tokens, ref } = componentTokens("searchView", {
    container: sys("surfaceContainerHigh"),
    // The contained view's pill around the header.
    headerContainer: sys("surfaceContainerHigh"),
    inputColor: sys("onSurface"),
    placeholderColor: sys("onSurfaceVariant"),
    leadingColor: sys("onSurface"),
    trailingColor: sys("onSurfaceVariant"),
    contentColor: sys("onSurfaceVariant"),
    dividerColor: sys("outline"),
    dividerThickness: px(1),
    headerHeight: px(72),
    headerRadius: radius("full"),
    // Room around the contained view's header pill.
    headerInset: px(0),
    radius: radius("extraLarge"),
    // The header's inline padding, around icon buttons.
    paddingInline: spacing("2"),
    gap: spacing("1"),
    iconSize: sizeToken("iconMedium"),
    iconFill: unitless(0),
    // The docked and contained views' size.
    minWidth: px(360),
    minHeight: px(240),
    maxHeight: px(560),
});

// How far the contained view's icons start inside their place before they travel out.
const ICON_TRAVEL = spacing("4");

/** The keyframes the contained view's icons travel outward with; `pureform()` adds them to the
 *  config. Inline-start is left under `ltr` and right under `rtl`. */
export const SEARCH_VIEW_KEYFRAMES: Record<string, Record<string, StyleMap>> = {
    searchViewFromEnd: {
        from: { transform: transform(translateX(ICON_TRAVEL)) },
        to: { transform: transform(translateX(px(0))) },
    },
    searchViewFromStart: {
        from: {
            transform: transform(translateX(mul(ICON_TRAVEL, unitless(-1)))),
        },
        to: { transform: transform(translateX(px(0))) },
    },
};

// An icon traveling outward from the bar's middle: from the end side for the leading icon,
// from the start side for the trailing one. Reduced motion keeps them still.
const travel = (side: "leading" | "trailing"): StyleMap => {
    const run = (name: string) =>
        motionAnimation(name, "medium2", "emphasizedDecelerate");
    const [ltr, rtl] =
        side === "leading"
            ? ["searchViewFromEnd", "searchViewFromStart"]
            : ["searchViewFromStart", "searchViewFromEnd"];
    return {
        animation: when()
            .on("reducedMotion", none)
            .on("rtl", run(rtl))
            .else(run(ltr)),
    };
};

// An icon, or icon buttons (the ready-made's back and clear buttons), which grow it past the
// icon's size.
const icon = (color: "leadingColor" | "trailingColor"): StyleMap => {
    const {
        width: _width,
        height: _height,
        ...box
    } = iconBox(ref("iconSize"), { fill: iconFill(ref("iconFill")) });
    return {
        ...box,
        minHeight: ref("iconSize"),
        color: ref(color),
        flexShrink: unitless(0),
    };
};

// The docked and contained views: dropped over the search bar's place, at the bar's width.
const dropped: StyleMap = {
    ...surface(ref("container"), ref("contentColor"), "level3"),
    minWidth: ref("minWidth"),
    minHeight: ref("minHeight"),
    maxHeight: ref("maxHeight"),
    borderRadius: ref("radius"),
    overflow: auto,
};

const pf = typed();

export const searchView = pf.slotComponent({
    name: "searchView",
    $meta: {
        description:
            "Material search view: the surface a search bar opens into, a header (leading icon button, search input, trailing icons) over a divider and the suggestions. variant fullScreen covers the viewport; docked drops over the bar inside its positioned container; contained (Expressive) keeps the header as a pill, drops the divider, and moves its icons outward as it opens.",
    },
    tokens,
    slots: [
        "root",
        "header",
        "leading",
        "input",
        "trailing",
        "divider",
        "content",
    ],
    structure: {
        root: ["header", "divider", "content"],
        header: ["leading", "input", "trailing"],
    },
    variants: { variant: ["fullScreen", "docked", "contained"] },
    recipe: () => ({
        base: {
            root: {
                ...surface(ref("container"), ref("contentColor"), "level0"),
                ...overlayMotion(DIALOG_MOTION),
                zIndex: zIndex("dialog"),
                display: flex,
                flexDirection: column,
                width: pct(100),
                minHeight: px(0),
                borderWidth: px(0),
            },
            header: {
                display: flex,
                flexDirection: row,
                alignItems: center,
                flexShrink: unitless(0),
                gap: ref("gap"),
                minHeight: ref("headerHeight"),
                marginBlockStart: ref("headerInset"),
                marginInlineStart: ref("headerInset"),
                marginInlineEnd: ref("headerInset"),
                paddingInlineStart: ref("paddingInline"),
                paddingInlineEnd: ref("paddingInline"),
            },
            leading: icon("leadingColor"),
            input: {
                ...inputText(ref("inputColor")),
                flexGrow: unitless(1),
                minWidth: px(0),
                height: pct(100),
                rawRules: {
                    css: {
                        "&::placeholder": { color: ref("placeholderColor") },
                    },
                },
            },
            trailing: icon("trailingColor"),
            divider: {
                flexShrink: unitless(0),
                height: ref("dividerThickness"),
                width: pct(100),
                marginBlockStart: px(0),
                marginBlockEnd: px(0),
                borderWidth: px(0),
                backgroundColor: ref("dividerColor"),
            },
            content: {
                textStyle: textStyle("bodyLarge"),
                color: ref("contentColor"),
                flexGrow: unitless(1),
                minHeight: px(0),
                overflow: auto,
            },
        },
        variants: {
            variant: {
                // The whole viewport, square, with M3's 72dp header.
                fullScreen: {
                    root: { flexGrow: unitless(1) },
                },
                // Over the bar, with the bar's 56dp header height.
                docked: {
                    root: {
                        ...dropped,
                        tokens: { headerHeight: px(56) },
                    },
                },
                // The header stays a pill inside the surface, without a divider, and its icons
                // travel outward.
                contained: {
                    root: {
                        ...dropped,
                        tokens: {
                            // A step below the header's pill, so the pill shows.
                            container: sys("surfaceContainer"),
                            headerHeight: px(56),
                            headerInset: spacing("2"),
                        },
                    },
                    header: {
                        backgroundColor: ref("headerContainer"),
                        borderRadius: ref("headerRadius"),
                    },
                    leading: travel("leading"),
                    trailing: travel("trailing"),
                    divider: { display: none },
                    content: { paddingBlockStart: spacing("2") },
                },
            },
        },
        defaultVariants: { variant: "fullScreen" },
    }),
});
