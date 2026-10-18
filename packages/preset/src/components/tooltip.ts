// The pureform tooltip: Material's plain tooltip, a short label on the inverse surface, and its
// rich tooltip, a surface with a subhead, supporting text, and actions.
//
// Showing it on hover and focus, placing it, and linking it with `aria-describedby` are the
// app's job. It stacks at the theme's `tooltip` layer, and grows in from its anchor while Zag's
// `data-state` is `open`.
//
//   <div class={root} role="tooltip" id="tip">Save to drafts</div>
//
//   <div class={root} role="tooltip">       // variant: "rich"
//     <span class={subhead}>Drafts</span>
//     <span class={supportingText}>Drafts stay on this device.</span>
//     <div class={actions}>…</div>
//   </div>

import { typed } from "@pureform/core";
import { column, end, flex, px, row } from "@pureform/core/ast";
import { radius, spacing, textStyle, zIndex } from "@pureform/theme";

import { overlayMotion, POPUP_MOTION } from "./overlay";
import { componentTokens, surface, sys } from "./shared";

const pf = typed();

const { tokens, ref } = componentTokens("tooltip", {
    container: sys("inverseSurface"),
    content: sys("inverseOnSurface"),
    richContainer: sys("surfaceContainer"),
    subheadColor: sys("onSurfaceVariant"),
    richContent: sys("onSurfaceVariant"),
    radius: radius("extraSmall"),
    richRadius: radius("medium"),
    minHeight: px(24),
    maxWidth: px(200),
    richMaxWidth: px(320),
});

export const tooltip = pf.slotComponent({
    name: "tooltip",
    $meta: {
        description:
            "Material tooltip: plain, a short label on the inverse surface, or rich, with a subhead, supporting text, and actions.",
    },
    tokens,
    slots: ["root", "subhead", "supportingText", "actions"],
    structure: { root: ["subhead", "supportingText", "actions"] },
    variants: { variant: ["plain", "rich"] },
    recipe: () => ({
        base: {
            root: {
                ...overlayMotion({ ...POPUP_MOTION, fromAnchor: true }),
                zIndex: zIndex("tooltip"),
                display: flex,
                flexDirection: column,
                minHeight: ref("minHeight"),
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
        },
        variants: {
            variant: {
                plain: {
                    root: {
                        ...surface(ref("container"), ref("content"), "level0"),
                        textStyle: textStyle("bodySmall"),
                        maxWidth: ref("maxWidth"),
                        borderRadius: ref("radius"),
                        paddingInlineStart: spacing("2"),
                        paddingInlineEnd: spacing("2"),
                        paddingBlockStart: spacing("1"),
                        paddingBlockEnd: spacing("1"),
                    },
                },
                rich: {
                    root: {
                        ...surface(
                            ref("richContainer"),
                            ref("richContent"),
                            "level2",
                        ),
                        gap: spacing("1"),
                        maxWidth: ref("richMaxWidth"),
                        borderRadius: ref("richRadius"),
                        paddingInlineStart: spacing("4"),
                        paddingInlineEnd: spacing("4"),
                        paddingBlockStart: spacing("3"),
                        paddingBlockEnd: spacing("2"),
                    },
                },
            },
        },
        defaultVariants: { variant: "plain" },
    }),
});
