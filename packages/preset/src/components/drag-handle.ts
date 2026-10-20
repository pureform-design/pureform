// The pureform drag handle: Material's grip for a sheet or a pane. A short pill in the middle of
// a touch-sized button. Sheets put it at their top edge (`horizontal`), and a pane divider stands it
// up (`vertical`, Compose's `VerticalDragHandle`). The button is what takes focus and presses: a
// press on a sheet's handle closes or resizes the sheet, for people who can't drag.
//
//   <button class={root} aria-label="Close sheet">
//     <span class={handle}></span>
//   </button>

import { typed } from "@pureform/core";
import {
    center,
    flex,
    grab,
    px,
    transparent,
    unitless,
} from "@pureform/core/ast";
import { radius, size } from "@pureform/theme";

import { themeIndication } from "../state-layer";
import { componentTokens, focusRing, sys } from "./shared";

const { tokens, ref } = componentTokens("dragHandle", {
    color: sys("onSurfaceVariant"),
    // The pill's long side, and its thickness. `vertical` stands it up with its own length.
    length: px(32),
    verticalLength: px(48),
    thickness: px(4),
    target: size("touchTarget"),
});

const pf = typed();

export const dragHandle = pf.slotComponent({
    name: "dragHandle",
    $meta: {
        description:
            "Material drag handle: a pill in a touch-sized button, at the top of a bottom sheet (horizontal) or on a pane divider (vertical). Name the button for what a press does.",
    },
    tokens,
    slots: ["root", "handle"],
    structure: { root: ["handle"] },
    variants: { orientation: ["horizontal", "vertical"] },
    recipe: () => ({
        base: {
            root: {
                ...focusRing(themeIndication),
                display: flex,
                alignItems: center,
                justifyContent: center,
                flexShrink: unitless(0),
                minWidth: ref("target"),
                minHeight: ref("target"),
                borderWidth: px(0),
                borderRadius: radius("full"),
                backgroundColor: transparent,
                paddingBlockStart: px(0),
                paddingBlockEnd: px(0),
                paddingInlineStart: px(0),
                paddingInlineEnd: px(0),
                cursor: grab,
            },
            handle: {
                backgroundColor: ref("color"),
                borderRadius: radius("full"),
                width: ref("length"),
                height: ref("thickness"),
            },
        },
        variants: {
            orientation: {
                horizontal: {},
                vertical: {
                    handle: {
                        width: ref("thickness"),
                        height: ref("verticalLength"),
                    },
                },
            },
        },
        defaultVariants: { orientation: "horizontal" },
    }),
});
