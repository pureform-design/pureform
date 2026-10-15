// The pureform snackbar: Material's brief message at the bottom of the screen, on the inverse
// surface, with an optional action and close button.
//
// Placing it (fixed to the bottom, above a navigation bar) and dismissing it are the app's job;
// announce it with `role="status"`.
//
//   <div class={root} role="status">
//     <span class={supportingText}>Message archived</span>
//     <button class={action}>Undo</button>
//     <button class={close} aria-label="Dismiss">×</button>
//   </div>

import { defineSlotComponent } from "@pureform/core";
import {
    center,
    flex,
    px,
    row,
    transparent,
    unitless,
} from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";

import {
    componentTokens,
    interactiveColors,
    pressableRoot,
    surface,
    sys,
} from "./shared";

const { tokens, ref } = componentTokens("snackbar", {
    container: sys("inverseSurface"),
    content: sys("inverseOnSurface"),
    actionColor: sys("inversePrimary"),
    radius: radius("extraSmall"),
    minHeight: px(48),
    maxWidth: px(560),
    paddingInline: spacing("4"),
    gap: spacing("2"),
    actionHeight: sizeToken("controlMedium"),
    // The close button is its own touch target.
    closeSize: px(48),
    iconSize: sizeToken("iconMedium"),
});

export const snackbar = defineSlotComponent({
    name: "snackbar",
    $meta: {
        description:
            "Material snackbar on the inverse surface, with an optional action and close button. Announce it with role=status.",
    },
    tokens,
    slots: ["root", "supportingText", "action", "close"],
    structure: { root: ["supportingText", "action", "close"] },
    recipe: {
        base: {
            root: {
                ...surface(ref("container"), ref("content"), "level3"),
                display: flex,
                flexDirection: row,
                alignItems: center,
                gap: ref("gap"),
                minHeight: ref("minHeight"),
                maxWidth: ref("maxWidth"),
                paddingInlineStart: ref("paddingInline"),
                paddingInlineEnd: ref("gap"),
                borderRadius: ref("radius"),
            },
            supportingText: {
                textStyle: textStyle("bodyMedium"),
                flexGrow: unitless(1),
                paddingBlockStart: spacing("3"),
                paddingBlockEnd: spacing("3"),
            },
            // A text button in the inverse primary color.
            action: {
                ...pressableRoot,
                ...interactiveColors(transparent, ref("actionColor")),
                textStyle: textStyle("labelLarge"),
                height: ref("actionHeight"),
                paddingInlineStart: spacing("3"),
                paddingInlineEnd: spacing("3"),
                borderRadius: radius("full"),
            },
            // An icon button in the content color.
            close: {
                ...pressableRoot,
                ...interactiveColors(transparent, ref("content")),
                width: ref("closeSize"),
                height: ref("closeSize"),
                fontSize: ref("iconSize"),
                lineHeight: unitless(1),
                borderRadius: radius("full"),
                justifyContent: center,
            },
        },
    },
});
