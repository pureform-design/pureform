// The pureform toast: a notification outside Material 3, skinned with its tokens. Toasts stack in
// a `group` region at a corner or edge of the screen (Zag's toast places them), each with an
// icon tinted by its `type`, a title, a description, an optional action and a close button.
// Material's own brief message is the `snackbar`, one at a time; reach for the toast when several
// notifications can be on screen at once, or they need a status (success, warning, ...).
//
//   <div class={group} role="region">
//     <div class={root} role="status" data-type="success">
//       <span class={icon}>✓</span>
//       <div class={title}>Saved</div>
//       <div class={description}>Your changes are saved.</div>
//       <button class={actionTrigger}>Undo</button>
//       <button class={closeTrigger} aria-label="Dismiss">×</button>
//     </div>
//   </div>
//
// `type` (`info` by default, `success`, `warning`, `error`, `loading`) colors the icon (`info`
// reads the `accent` token): the theme's `success`, `warning`, `error` and `info` color groups (every Material
// palette fills them, from a static theme or a runtime seed), and `primary` while loading. The
// icon and the close button sit in the inline padding, so the text runs between them.
//
// Zag moves each toast with `--x`, `--y`, `--scale`, `--opacity`, `--z-index` and `--height` on
// its root; the bindings apply them as a transform, and the root transitions the transform and
// height on the fast spatial spring, as Compose's snackbar host scales its snackbar in
// (`SnackbarHost.kt`, `FastSpatial`), and the opacity on the fast effects spring (`FastEffects`;
// the movement drops out under reduced motion). Leaving, it shrinks to 80% on the same spatial
// spring as it fades, as the snackbar and the other popups do (`overlayShrinkOut`).

import { typed } from "@pureform/core";
import {
    absolute,
    add,
    center,
    column,
    flex,
    hidden,
    px,
    relative,
    start,
    transparent,
    tween,
    unitless,
    when,
} from "@pureform/core/ast";
import {
    radius,
    size as sizeToken,
    spacing,
    spring,
    textStyle,
    zIndex,
} from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import {
    componentTokens,
    INDICATION_ROOT,
    interactiveColors,
    motionTransition,
    notificationAction,
    pressableRoot,
    surface,
    sys,
} from "./shared";

/** The toast's `type` values, each a theme color group but `loading`. */
export const TOAST_TYPES = [
    "info",
    "success",
    "warning",
    "error",
    "loading",
] as const;

export type ToastType = (typeof TOAST_TYPES)[number];

const { tokens, ref } = componentTokens("toast", {
    container: sys("surfaceContainerHigh"),
    titleColor: sys("onSurface"),
    content: sys("onSurfaceVariant"),
    accent: sys("info"),
    actionColor: sys("primary"),
    radius: radius("medium"),
    minHeight: px(56),
    width: px(356),
    paddingInline: spacing("4"),
    paddingBlock: spacing("3"),
    iconSize: sizeToken("iconMedium"),
    actionHeight: sizeToken("controlMedium"),
    // The close button is its own touch target.
    closeSize: px(48),
    ...INDICATION_TOKENS,
});

const pf = typed();

// A type's icon color: one of the theme's color groups. (Only the group, the outermost slot, can
// set tokens, and the group holds toasts of every type.)
const accent = (group: string) => ({ icon: { color: sys(group) } });

// A toast moves into its place in the stack and resizes on a spatial spring; it fades on an
// effects spring.
const MOVE = { spring: spring("spatialFast") };
const FADE = { spring: spring("effectsFast") };

// The icon's room at the start: the padding, the icon and a gap.
const iconRoom = add(ref("paddingInline"), ref("iconSize"), spacing("3"));

export const toast = pf.slotComponent({
    name: "toast",
    $meta: {
        description:
            "A notification outside Material 3, skinned with its tokens: stacked toasts with a type (info, success, warning, error, loading) that tints the icon. Material's single message is the snackbar.",
    },
    tokens,
    slots: [
        "group",
        "root",
        "icon",
        "title",
        "description",
        "actionTrigger",
        "closeTrigger",
    ],
    structure: {
        group: ["root"],
        root: ["icon", "title", "description", "actionTrigger", "closeTrigger"],
    },
    variants: { type: TOAST_TYPES },
    indication: [
        {
            trigger: "actionTrigger",
            surface: "actionTrigger",
            centered: false,
            focus: "actionTrigger",
        },
        {
            trigger: "closeTrigger",
            surface: "closeTrigger",
            centered: false,
            focus: "closeTrigger",
        },
    ],
    recipe: () => ({
        base: {
            // Zag positions the region and its toasts; this stacks it over the page.
            group: {
                ...INDICATION_ROOT,
                zIndex: zIndex("snackbar"),
                width: ref("width"),
            },
            root: {
                ...surface(ref("container"), ref("content"), "level3"),
                position: relative,
                display: flex,
                flexDirection: column,
                alignItems: start,
                gap: spacing("1"),
                width: ref("width"),
                minHeight: ref("minHeight"),
                paddingBlockStart: ref("paddingBlock"),
                paddingBlockEnd: ref("paddingBlock"),
                paddingInlineStart: iconRoom,
                paddingInlineEnd: ref("closeSize"),
                borderRadius: ref("radius"),
                overflow: hidden,
                transition: motionTransition(
                    tween("transform", MOVE),
                    tween("scale", MOVE),
                    tween("height", MOVE),
                    tween("opacity", FADE),
                ),
                // Leaving, it shrinks to 80% as it fades, as Compose's snackbar host does
                // (`FadeInFadeOutWithScale`); `scale` composes with Zag's transform. Under
                // reduced motion it only fades.
                rawRules: {
                    css: {
                        "&[data-state=closed]": {
                            scale: when(
                                "reducedMotion",
                                unitless(1),
                                unitless(0.8),
                            ),
                        },
                    },
                },
            },
            icon: {
                position: absolute,
                insetInlineStart: ref("paddingInline"),
                insetBlockStart: ref("paddingBlock"),
                display: flex,
                alignItems: center,
                justifyContent: center,
                width: ref("iconSize"),
                height: ref("iconSize"),
                fontSize: ref("iconSize"),
                lineHeight: unitless(1),
                color: ref("accent"),
            },
            title: {
                textStyle: textStyle("titleSmall"),
                color: ref("titleColor"),
            },
            description: {
                textStyle: textStyle("bodyMedium"),
                color: ref("content"),
            },
            // A text button in the primary color, below the text.
            actionTrigger: notificationAction(ref, ref("actionColor")),
            // An icon button at the top end.
            closeTrigger: {
                ...pressableRoot(ref),
                ...interactiveColors(ref, transparent, ref("content")),
                position: absolute,
                insetBlockStart: px(4),
                insetInlineEnd: px(0),
                width: ref("closeSize"),
                height: ref("closeSize"),
                fontSize: ref("iconSize"),
                lineHeight: unitless(1),
                borderRadius: radius("full"),
            },
        },
        variants: {
            type: {
                info: {},
                success: accent("success"),
                warning: accent("warning"),
                error: accent("error"),
                loading: accent("primary"),
            },
        },
        defaultVariants: { type: "info" },
    }),
});
