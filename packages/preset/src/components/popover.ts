// The pureform popover: an anchored, non-modal panel for filters and small forms, with a title,
// body and actions, and an optional caret. M3 has no popover; this is pureform's own, on the
// rich tooltip's surface and motion (a surface container at level 2, the popup's grow from the
// anchor), stacked at the menu's layer, which is where an anchored panel opened by a press sits.
// The rich tooltip holds text and opens on hover or focus; the popover holds controls and opens
// on a press.
//
//   <div class={root} role="dialog">
//     <span class={title}>Filters</span>
//     <div class={body}>…</div>
//     <div class={actions}>…</div>
//     <div class={caret}>…</div>            // optional
//   </div>

import { typed } from "@pureform/core";
import { column, end, flex, px, row } from "@pureform/core/ast";
import { radius, spacing, textStyle, zIndex } from "@pureform/theme";

import { overlayMotion, POPUP_MOTION } from "./overlay";
import { componentTokens, surface, sys } from "./shared";

const pf = typed();

const { tokens, ref } = componentTokens("popover", {
    container: sys("surfaceContainer"),
    content: sys("onSurface"),
    titleColor: sys("onSurface"),
    radius: radius("medium"),
    minWidth: px(200),
    maxWidth: px(360),
});

export const popover = pf.slotComponent({
    name: "popover",
    $meta: {
        description:
            "An anchored, non-modal panel with a title, body and actions, and an optional caret, on the rich tooltip's surface.",
    },
    tokens,
    slots: ["root", "caret", "title", "body", "actions"],
    structure: { root: ["title", "body", "actions", "caret"] },
    recipe: () => ({
        base: {
            root: {
                ...overlayMotion({ ...POPUP_MOTION, fromAnchor: true }),
                ...surface(ref("container"), ref("content"), "level2"),
                zIndex: zIndex("menu"),
                display: flex,
                flexDirection: column,
                gap: spacing("2"),
                minWidth: ref("minWidth"),
                maxWidth: ref("maxWidth"),
                borderRadius: ref("radius"),
                paddingInlineStart: spacing("4"),
                paddingInlineEnd: spacing("4"),
                paddingBlockStart: spacing("4"),
                paddingBlockEnd: spacing("3"),
            },
            title: {
                textStyle: textStyle("titleMedium"),
                color: ref("titleColor"),
            },
            body: { textStyle: textStyle("bodyMedium") },
            actions: {
                display: flex,
                flexDirection: row,
                justifyContent: end,
                gap: spacing("2"),
            },
            caret: { color: ref("container") },
        },
    }),
});
