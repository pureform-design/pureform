// The pureform bottom sheet: Material's surface of secondary content anchored to the bottom of
// the screen. Its top corners are rounded, it's at most 640 wide, and a drag handle at its top
// edge lets it be dragged down, or closed with a press.
//
// Markup: the surface holding the drag handle (the drag handle component, centered) and the
// content, which scrolls. The binding places it at the bottom of the viewport. `modal` stacks it
// at the theme's `dialog` layer, over a scrim, with focus kept inside; a standard sheet sits at the
// `raised` layer, beside what the page is doing. Both slide up while Zag's `data-state` is `open`.
//
//   <div class={root} role="dialog" aria-label="Share">
//     <button class={dragHandle} aria-label="Close sheet">…</button>
//     <div class={content}>…</div>
//   </div>

import { typed } from "@pureform/core";
import { auto, column, flex, pct, px, unitless } from "@pureform/core/ast";
import { radius, spacing, textStyle, zIndex } from "@pureform/theme";

import { overlayMotion } from "./overlay";
import { componentTokens, surface, sys } from "./shared";
import { BOTTOM_SHEET_MOTION } from "./sheet";
import { runCorners } from "./tiles";

const { tokens, ref } = componentTokens("bottomSheet", {
    container: sys("surfaceContainerLow"),
    content: sys("onSurfaceVariant"),
    radius: radius("extraLarge"),
    maxWidth: px(640),
    contentPadding: spacing("4"),
    contentPaddingEnd: spacing("6"),
});

const pf = typed();

export const bottomSheet = pf.slotComponent({
    name: "bottomSheet",
    $meta: {
        description:
            "Material bottom sheet: a surface anchored to the bottom, with rounded top corners, a drag handle and scrolling content. modal stacks it over a scrim.",
    },
    tokens,
    slots: ["root", "dragHandle", "content"],
    structure: { root: ["dragHandle", "content"] },
    variants: { modal: ["true", "false"] },
    recipe: () => ({
        base: {
            root: {
                ...surface(ref("container"), ref("content"), "level1"),
                ...overlayMotion(BOTTOM_SHEET_MOTION),
                ...runCorners(ref("radius"), px(0)),
                display: flex,
                flexDirection: column,
                width: pct(100),
                maxWidth: ref("maxWidth"),
                maxHeight: pct(100),
                minHeight: px(0),
                borderWidth: px(0),
                marginInlineStart: auto,
                marginInlineEnd: auto,
            },
            // The drag handle component, centered at the top.
            dragHandle: { marginInlineStart: auto, marginInlineEnd: auto },
            content: {
                textStyle: textStyle("bodyMedium"),
                color: ref("content"),
                flexGrow: unitless(1),
                minHeight: px(0),
                overflow: auto,
                paddingInlineStart: ref("contentPadding"),
                paddingInlineEnd: ref("contentPadding"),
                paddingBlockEnd: ref("contentPaddingEnd"),
            },
        },
        variants: {
            modal: {
                true: { root: { zIndex: zIndex("dialog") } },
                false: { root: { zIndex: zIndex("raised") } },
            },
        },
        defaultVariants: { modal: "true" },
    }),
});
