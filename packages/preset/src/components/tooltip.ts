// The pureform tooltip: Material's plain tooltip, a short label on the inverse surface, with an
// optional caret pointing at its anchor. The rich tooltip (subhead, supporting text, actions) is
// its own component, `richTooltip`.
//
// Showing it on hover and focus, placing it, and linking it with `aria-describedby` are the
// app's job. It stacks at the theme's `tooltip` layer, and grows in from its anchor while Zag's
// `data-state` is `open`.
//
//   <div class={root} role="tooltip" id="tip">
//     <span class={supportingText}>Save to drafts</span>
//     <div class={caret}>…</div>            // optional
//   </div>

import { typed } from "@pureform/core";
import { flex, px } from "@pureform/core/ast";
import { radius, spacing, textStyle, zIndex } from "@pureform/theme";

import { overlayMotion, POPUP_MOTION } from "./overlay";
import { componentTokens, surface, sys } from "./shared";

const pf = typed();

const { tokens, ref } = componentTokens("tooltip", {
    container: sys("inverseSurface"),
    content: sys("inverseOnSurface"),
    radius: radius("extraSmall"),
    minHeight: px(24),
    maxWidth: px(200),
});

export const tooltip = pf.slotComponent({
    name: "tooltip",
    $meta: {
        description:
            "Material plain tooltip: a short label on the inverse surface, with an optional caret. The rich tooltip is `richTooltip`.",
    },
    tokens,
    slots: ["root", "caret", "supportingText"],
    structure: { root: ["supportingText", "caret"] },
    recipe: () => ({
        base: {
            root: {
                ...overlayMotion({ ...POPUP_MOTION, fromAnchor: true }),
                ...surface(ref("container"), ref("content"), "level0"),
                zIndex: zIndex("tooltip"),
                display: flex,
                minHeight: ref("minHeight"),
                maxWidth: ref("maxWidth"),
                borderRadius: ref("radius"),
                paddingInlineStart: spacing("2"),
                paddingInlineEnd: spacing("2"),
                paddingBlockStart: spacing("1"),
                paddingBlockEnd: spacing("1"),
            },
            supportingText: { textStyle: textStyle("bodySmall") },
            caret: { color: ref("container") },
        },
    }),
});
