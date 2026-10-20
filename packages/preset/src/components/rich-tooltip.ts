// The pureform rich tooltip: Material's rich tooltip, a surface with a subhead, supporting text,
// and actions, and an optional caret. Split from `tooltip`, which is the plain one.
//
//   <div class={root} role="tooltip">
//     <span class={subhead}>Drafts</span>
//     <span class={supportingText}>Drafts stay on this device.</span>
//     <div class={actions}>…</div>
//     <div class={caret}>…</div>            // optional
//   </div>

import { typed } from "@pureform/core";
import { column, end, flex, px, row } from "@pureform/core/ast";
import { radius, spacing, textStyle, zIndex } from "@pureform/theme";

import { overlayMotion, POPUP_MOTION } from "./overlay";
import { componentTokens, surface, sys } from "./shared";

const pf = typed();

const { tokens, ref } = componentTokens("richTooltip", {
    container: sys("surfaceContainer"),
    content: sys("onSurfaceVariant"),
    subheadColor: sys("onSurfaceVariant"),
    radius: radius("medium"),
    minHeight: px(24),
    maxWidth: px(320),
});

export const richTooltip = pf.slotComponent({
    name: "richTooltip",
    $meta: {
        description:
            "Material rich tooltip: a surface with a subhead, supporting text, and actions, with an optional caret.",
    },
    tokens,
    slots: ["root", "caret", "subhead", "supportingText", "actions"],
    structure: { root: ["subhead", "supportingText", "actions", "caret"] },
    recipe: () => ({
        base: {
            root: {
                ...overlayMotion({ ...POPUP_MOTION, fromAnchor: true }),
                ...surface(ref("container"), ref("content"), "level2"),
                zIndex: zIndex("tooltip"),
                display: flex,
                flexDirection: column,
                gap: spacing("1"),
                minHeight: ref("minHeight"),
                maxWidth: ref("maxWidth"),
                borderRadius: ref("radius"),
                paddingInlineStart: spacing("4"),
                paddingInlineEnd: spacing("4"),
                paddingBlockStart: spacing("3"),
                paddingBlockEnd: spacing("2"),
            },
            subhead: {
                textStyle: textStyle("titleSmall"),
                color: ref("subheadColor"),
            },
            supportingText: { textStyle: textStyle("bodyMedium") },
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
