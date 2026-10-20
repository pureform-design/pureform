// The pureform side sheet: Material's surface of supplementary content anchored to the end edge
// of the screen. A header (an optional back button, the headline, and a close button) over the
// content, and an optional row of actions under a divider.
//
// Markup: the binding places it against the end edge. A standard sheet sits on the page at the
// theme's `raised` layer, without elevation, and the page stays usable. `coplanar` puts it on the
// page's plane instead, in the layout next to the content it squeezes. `modal` stacks it at the
// `dialog` layer over a scrim, rounds its start corners, lifts it to level 1 on the low container,
// and keeps focus inside. `coplanar` applies to a standard sheet only. It slides in from the end
// edge while Zag's `data-state` is `open`.
//
//   <div class={root} role="dialog" aria-labelledby="title">
//     <div class={header}>
//       <button class={backButton} aria-label="Back">←</button>
//       <h2 class={headline} id="title">Filters</h2>
//       <button class={closeTrigger} aria-label="Close">×</button>
//     </div>
//     <div class={content}>…</div>
//     <div class={actions}><button>Save</button><button>Cancel</button></div>
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
    solid,
    sub,
    unitless,
} from "@pureform/core/ast";
import { radius, spacing, textStyle, zIndex } from "@pureform/theme";

import { componentTokens, surface, sys } from "./shared";
import { sheetMotion } from "./sheet";
import { runCorners } from "./tiles";

const { tokens, ref } = componentTokens("sideSheet", {
    container: sys("surface"),
    headlineColor: sys("onSurfaceVariant"),
    content: sys("onSurfaceVariant"),
    dividerColor: sys("outlineVariant"),
    radius: radius("large"),
    width: px(360),
    headerHeight: px(72),
    padding: spacing("6"),
    // The close and back buttons' own room: their icons sit 12 from the edge.
    buttonInset: spacing("3"),
    gap: spacing("3"),
    actionsGap: spacing("2"),
});

const pf = typed();

export const sideSheet = pf.slotComponent({
    name: "sideSheet",
    $meta: {
        description:
            "Material side sheet at the end edge: a header (back button, headline, close button), content, and optional actions. modal stacks it over a scrim; coplanar puts a standard sheet in the page's layout.",
    },
    tokens,
    slots: [
        "root",
        "header",
        "backButton",
        "headline",
        "closeTrigger",
        "content",
        "actions",
    ],
    structure: {
        root: ["header", "content", "actions"],
        header: ["backButton", "headline", "closeTrigger"],
    },
    variants: { modal: ["true", "false"], coplanar: ["true", "false"] },
    recipe: () => ({
        base: {
            root: {
                ...surface(ref("container"), ref("content"), "level0"),
                ...sheetMotion("end"),
                display: flex,
                flexDirection: column,
                width: ref("width"),
                maxWidth: pct(100),
                height: pct(100),
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
                paddingInlineStart: ref("padding"),
                paddingInlineEnd: ref("buttonInset"),
            },
            // An icon button, pulled toward the start edge, so it sits `buttonInset` from it as
            // the close button does from the end.
            backButton: {
                flexShrink: unitless(0),
                marginInlineStart: sub(ref("buttonInset"), ref("padding")),
            },
            headline: {
                textStyle: textStyle("titleLarge"),
                color: ref("headlineColor"),
                flexGrow: unitless(1),
                minWidth: px(0),
                marginBlockStart: px(0),
                marginBlockEnd: px(0),
            },
            closeTrigger: { flexShrink: unitless(0), marginInlineStart: auto },
            content: {
                textStyle: textStyle("bodyMedium"),
                color: ref("content"),
                flexGrow: unitless(1),
                minHeight: px(0),
                overflow: auto,
                paddingInlineStart: ref("padding"),
                paddingInlineEnd: ref("padding"),
            },
            actions: {
                display: flex,
                flexDirection: row,
                alignItems: center,
                flexShrink: unitless(0),
                gap: ref("actionsGap"),
                paddingBlockStart: ref("padding"),
                paddingBlockEnd: ref("padding"),
                paddingInlineStart: ref("padding"),
                paddingInlineEnd: ref("padding"),
                borderBlockStartWidth: px(1),
                borderBlockStartStyle: solid,
                borderBlockStartColor: ref("dividerColor"),
            },
        },
        variants: {
            modal: {
                true: {
                    root: {
                        tokens: { container: sys("surfaceContainerLow") },
                        apply: { shadowElevation: "level1" },
                        ...runCorners(ref("radius"), px(0), "inline"),
                        zIndex: zIndex("dialog"),
                    },
                },
                false: { root: { zIndex: zIndex("raised") } },
            },
            coplanar: {
                true: { root: { zIndex: zIndex("base") } },
                false: {},
            },
        },
        defaultVariants: { modal: "true", coplanar: "false" },
    }),
});
