// The pureform dialog: Material's basic dialog.
//
// Markup: the surface holding an optional icon, the headline, the body, and the actions (text
// buttons, the confirming one last). Turn on `icon` when you render one; Material then centers
// the icon and headline. Dim the page behind it with the scrim component, or style a native
// <dialog>'s backdrop yourself.
//
//   <dialog class={root} aria-labelledby="title" open>
//     <h2 class={headline} id="title">Discard draft?</h2>
//     <p class={body}>…</p>
//     <div class={actions}>
//       <button class={button({ variant: "text" }).root}>Cancel</button>
//       <button class={button({ variant: "text" }).root}>Discard</button>
//     </div>
//   </dialog>

import { defineSlotComponent } from "@pureform/core";
import { center, column, end, flex, pct, px, row } from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";
import { size as sizeToken } from "@pureform/theme";

import { componentTokens, iconBox, surface, sys } from "./shared";

const { tokens, ref } = componentTokens("dialog", {
    container: sys("surfaceContainerHigh"),
    headlineColor: sys("onSurface"),
    bodyColor: sys("onSurfaceVariant"),
    iconColor: sys("secondary"),
    iconSize: sizeToken("iconMedium"),
    radius: radius("extraLarge"),
    padding: spacing("6"),
    gap: spacing("4"),
    actionsGap: spacing("2"),
    minWidth: px(280),
    maxWidth: px(560),
});

export const dialog = defineSlotComponent({
    name: "dialog",
    $meta: {
        description:
            "Material basic dialog. Turn on icon when you render one; dim the page with the scrim component.",
    },
    tokens,
    slots: ["root", "icon", "headline", "body", "actions"],
    structure: { root: ["icon", "headline", "body", "actions"] },
    recipe: {
        base: {
            root: {
                ...surface(ref("container"), ref("bodyColor"), "level3"),
                display: flex,
                flexDirection: column,
                gap: ref("gap"),
                borderWidth: px(0),
                borderRadius: ref("radius"),
                paddingBlockStart: ref("padding"),
                paddingBlockEnd: ref("padding"),
                paddingInlineStart: ref("padding"),
                paddingInlineEnd: ref("padding"),
                minWidth: ref("minWidth"),
                maxWidth: ref("maxWidth"),
            },
            icon: { ...iconBox(ref("iconSize")), color: ref("iconColor") },
            headline: {
                textStyle: textStyle("headlineSmall"),
                color: ref("headlineColor"),
            },
            body: {
                textStyle: textStyle("bodyMedium"),
                color: ref("bodyColor"),
            },
            // Material leaves 24px above the actions: the gap plus this margin.
            actions: {
                display: flex,
                flexDirection: row,
                justifyContent: end,
                gap: ref("actionsGap"),
                marginBlockStart: spacing("2"),
            },
        },
        variants: {
            icon: {
                true: {
                    // The icon's box spans the dialog and centers the icon in it.
                    icon: { width: pct(100) },
                    headline: { textAlign: center },
                },
                false: {},
            },
        },
        defaultVariants: { icon: "false" },
    },
});
