// The pureform full-screen dialog: Material's dialog that fills the screen, for tasks with more
// content than a basic dialog holds (a form to fill in, a list to review).
//
// Markup: a surface holding a header and the body. The header has the close trigger (an icon
// button), the headline, and the confirm action (a text button) at the end; there's no icon and no
// actions row. It fills its container, so the binding places it in a positioner that covers the
// viewport, stacked at the theme's `dialog` layer, and it slides in while Zag's `data-state` is
// `open`, as the basic dialog does. Nothing is dimmed behind it, so it has no scrim.
//
//   <div class={root} role="dialog" aria-labelledby="title">
//     <div class={header}>
//       <button class={closeTrigger} aria-label="Close">×</button>
//       <h2 class={headline} id="title">New event</h2>
//       <button class={confirmAction}>Save</button>
//     </div>
//     <div class={body}>…</div>
//   </div>

import { typed } from "@pureform/core";
import {
    auto,
    center,
    column,
    flex,
    pct,
    px,
    row,
    unitless,
} from "@pureform/core/ast";
import { spacing, textStyle, zIndex } from "@pureform/theme";

import { DIALOG_MOTION, overlayMotion } from "./overlay";
import { componentTokens, surface, sys } from "./shared";

const { tokens, ref } = componentTokens("fullscreenDialog", {
    container: sys("surface"),
    headlineColor: sys("onSurface"),
    bodyColor: sys("onSurfaceVariant"),
    headerHeight: px(56),
    headerPadding: spacing("4"),
    headerGap: spacing("4"),
    bodyPadding: spacing("6"),
});

const pf = typed();

export const fullscreenDialog = pf.slotComponent({
    name: "fullscreenDialog",
    $meta: {
        description:
            "Material full-screen dialog: a surface that fills the screen, with a header (close trigger, headline, confirm action) over a scrolling body. It has no icon, actions row or scrim.",
    },
    tokens,
    slots: [
        "root",
        "header",
        "closeTrigger",
        "headline",
        "confirmAction",
        "body",
    ],
    structure: {
        root: ["header", "body"],
        header: ["closeTrigger", "headline", "confirmAction"],
    },
    recipe: () => ({
        base: {
            root: {
                ...surface(ref("container"), ref("bodyColor"), "level0"),
                ...overlayMotion(DIALOG_MOTION),
                zIndex: zIndex("dialog"),
                display: flex,
                flexDirection: column,
                flexGrow: unitless(1),
                minWidth: px(0),
                minHeight: px(0),
                width: pct(100),
                borderWidth: px(0),
            },
            header: {
                display: flex,
                flexDirection: row,
                alignItems: center,
                flexShrink: unitless(0),
                gap: ref("headerGap"),
                minHeight: ref("headerHeight"),
                paddingInlineStart: ref("headerPadding"),
                paddingInlineEnd: ref("headerPadding"),
            },
            closeTrigger: { flexShrink: unitless(0) },
            headline: {
                textStyle: textStyle("titleLarge"),
                color: ref("headlineColor"),
                flexGrow: unitless(1),
                minWidth: px(0),
            },
            confirmAction: { flexShrink: unitless(0) },
            body: {
                textStyle: textStyle("bodyMedium"),
                color: ref("bodyColor"),
                flexGrow: unitless(1),
                minHeight: px(0),
                overflow: auto,
                paddingBlockStart: ref("bodyPadding"),
                paddingBlockEnd: ref("bodyPadding"),
                paddingInlineStart: ref("bodyPadding"),
                paddingInlineEnd: ref("bodyPadding"),
            },
        },
    }),
});
