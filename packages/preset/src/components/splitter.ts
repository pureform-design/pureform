// The pureform splitter: panes side by side (or stacked) with a drag handle between each pair, as
// in Material 3's adaptive list-detail layouts (Compose's `VerticalDragHandle` between the panes
// of a `ThreePaneScaffold` with pane expansion). Zag's splitter backs it: its parts are Zag's,
// the handle's pill is `resizeTriggerIndicator`. A drag or the arrow keys resize the panes; the
// bindings snap a drag to the anchors when it lets go.
//
// The handle follows Compose's `DragHandleTokens`: a 24dp-wide container holding a 4×48dp
// `outline` pill, fully rounded, which grows to 12×52dp in `onSurface` with medium corners while
// it's pressed or dragged.
//
//   <div class={root}>
//     <div class={panel}>List</div>
//     <div class={resizeTrigger} role="separator" tabindex="0">
//       <div class={resizeTriggerIndicator}></div>
//     </div>
//     <div class={panel}>Detail</div>
//   </div>

import { typed } from "@pureform/core";
import {
    auto,
    center,
    column,
    flex,
    px,
    row,
    slot,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import { radius, size } from "@pureform/theme";

import { themeIndication } from "../state-layer";
import { componentTokens, focusRing, sys } from "./shared";

const { tokens, ref } = componentTokens("splitter", {
    // The handle's container, across the divider (Compose's `ContainerWidth`).
    handleContainer: px(24),
    handleColor: sys("outline"),
    handleActiveColor: sys("onSurface"),
    // The pill's thickness and length at rest, and pressed or dragged.
    handleThickness: px(4),
    handleLength: px(48),
    handleActiveThickness: px(12),
    handleActiveLength: px(52),
    handleRadius: radius("full"),
    handleActiveRadius: radius("medium"),
    // Along the divider the handle is at least a touch target.
    target: size("touchTarget"),
});

const pf = typed();

const ACTIVE = slot("resizeTrigger", "pressed");

/** The pill's size across and along the divider: rest, or pressed and dragged. */
const pill = (across: "width" | "height", along: "width" | "height") => ({
    [across]: when(ACTIVE, ref("handleActiveThickness"), ref("handleThickness")),
    [along]: when(ACTIVE, ref("handleActiveLength"), ref("handleLength")),
});

export const splitter = pf.slotComponent({
    name: "splitter",
    $meta: {
        description:
            "Resizable panes (Zag's splitter) with Material's vertical drag handle between them, as in an adaptive list-detail layout. A drag or the arrow keys resize the panes; a drag snaps to the anchors.",
    },
    tokens,
    slots: ["root", "panel", "resizeTrigger", "resizeTriggerIndicator"],
    structure: {
        root: ["panel", "resizeTrigger"],
        resizeTrigger: ["resizeTriggerIndicator"],
    },
    // `horizontal` lays the panes side by side (a vertical handle between them, Compose's);
    // `vertical` stacks them.
    variants: { orientation: ["horizontal", "vertical"] },
    recipe: () => ({
        base: {
            root: {
                display: flex,
                minWidth: px(0),
                minHeight: px(0),
            },
            // A pane's content scrolls natively when it overflows.
            panel: {
                minWidth: px(0),
                minHeight: px(0),
                overflow: auto,
            },
            resizeTrigger: {
                ...focusRing(themeIndication),
                display: flex,
                alignItems: center,
                justifyContent: center,
                flexShrink: unitless(0),
                backgroundColor: transparent,
                borderRadius: radius("full"),
            },
            resizeTriggerIndicator: {
                flexShrink: unitless(0),
                backgroundColor: when(ACTIVE, ref("handleActiveColor"), ref("handleColor")),
                borderRadius: when(ACTIVE, ref("handleActiveRadius"), ref("handleRadius")),
            },
        },
        variants: {
            orientation: {
                horizontal: {
                    root: { flexDirection: row },
                    resizeTrigger: {
                        width: ref("handleContainer"),
                        minHeight: ref("target"),
                    },
                    resizeTriggerIndicator: pill("width", "height"),
                },
                vertical: {
                    root: { flexDirection: column },
                    resizeTrigger: {
                        height: ref("handleContainer"),
                        minWidth: ref("target"),
                    },
                    resizeTriggerIndicator: pill("height", "width"),
                },
            },
        },
        defaultVariants: { orientation: "horizontal" },
    }),
});
