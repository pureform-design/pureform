// The parts Material's navigation bar and navigation rail share: destinations that stack an
// icon over a label, with the current one marked by a pill behind its icon.
//
// Mark the current destination with `aria-current="page"` (or `aria-selected`). The pill takes
// the state layer while its destination is hovered, focused, or pressed; inside it, the active
// indicator grows from the center to fill it once the destination is current.

import {
    absolute,
    center,
    column,
    flex,
    none,
    pct,
    px,
    relative,
    slot,
    transparent,
    tween,
    unitless,
    when,
} from "@pureform/core/ast";
import type {
    AliasNode,
    ColorValue,
    StyleMap,
    ValueNode,
} from "@pureform/core/ast";
import {
    duration,
    easing,
    radius,
    size as sizeToken,
    spacing,
    textStyle,
} from "@pureform/theme";

import {
    componentTokens,
    iconBox,
    motionTransition,
    pressableRoot,
    slotStateLayer,
    stateTransition,
    sys,
} from "./shared";

/** The tokens every navigation component has. */
export const NAV_TOKENS = {
    indicatorColor: sys("secondaryContainer"),
    activeIconColor: sys("onSecondaryContainer"),
    iconColor: sys("onSurfaceVariant"),
    activeLabelColor: sys("onSurface"),
    labelColor: sys("onSurfaceVariant"),
    stateLayerColor: sys("onSurface"),
    iconSize: sizeToken("iconMedium"),
    indicatorHeight: px(32),
    gap: spacing("1"),
} satisfies Record<string, ValueNode>;

export type NavToken = keyof typeof NAV_TOKENS;

/** A navigation component's tokens: the shared ones plus its own. */
export const navTokens = <K extends string = never>(
    name: string,
    extra: Record<K, ValueNode>,
) => componentTokens<NavToken | K>(name, { ...NAV_TOKENS, ...extra });

/** The slots every navigation component has, and how they nest. */
export const NAV_SLOTS = [
    "root",
    "item",
    "indicator",
    "activeIndicator",
    "icon",
    "label",
] as const;
export const NAV_STRUCTURE = {
    root: ["item"],
    item: ["indicator", "label"],
    indicator: ["activeIndicator", "icon"],
} as { [K in "root" | "item" | "indicator"]: (typeof NAV_SLOTS)[number][] };

const CURRENT = slot("item", "selected");

/** The colors a current destination takes. */
export interface NavActive {
    indicator: ColorValue;
    icon: ColorValue;
}

/** The parts' colors, with the current destination's given. */
export const navColors = (
    ref: (token: NavToken) => AliasNode,
    active: NavActive,
) => ({
    indicator: {
        color: when().on(CURRENT, active.icon).else(ref("iconColor")),
    },
    // The fill carries the state layer once current, over the pill's own.
    activeIndicator: {
        backgroundColor: slotStateLayer("item", {
            base: active.indicator,
            content: ref("stateLayerColor"),
        }),
    },
});

// The active indicator grows from the pill's center: both insets move from 50% to 0, so it
// grows the same way in either writing direction.
const grow = when().on(CURRENT, px(0)).else(pct(50));

// Under reduced motion it appears at its full size, fading in.
const growTransition = motionTransition(
    tween("insetInlineStart", duration("medium2"), easing("emphasized")),
    tween("insetInlineEnd", duration("medium2"), easing("emphasized")),
    tween("opacity", duration("medium2"), easing("emphasized")),
    tween("backgroundColor", duration("short3"), easing("standard")),
);

/** The parts' styles, over the component's tokens. `indicatorWidth` is the pill's width. */
export const navParts = (
    ref: (token: NavToken) => AliasNode,
    indicatorWidth: ValueNode & StyleMap["width"],
) => {
    const colors = navColors(ref, {
        indicator: ref("indicatorColor"),
        icon: ref("activeIconColor"),
    });
    return {
        item: {
            ...pressableRoot,
            flexDirection: column,
            gap: ref("gap"),
            backgroundColor: transparent,
            color: ref("labelColor"),
            states: {
                ...pressableRoot.states,
                selected: { color: ref("activeLabelColor") },
            },
        } satisfies StyleMap,
        indicator: {
            transition: stateTransition,
            position: relative,
            display: flex,
            alignItems: center,
            justifyContent: center,
            width: indicatorWidth,
            height: ref("indicatorHeight"),
            borderRadius: radius("full"),
            backgroundColor: slotStateLayer("item", {
                base: transparent,
                content: ref("stateLayerColor"),
            }),
            ...colors.indicator,
        } satisfies StyleMap,
        activeIndicator: {
            position: absolute,
            top: px(0),
            bottom: px(0),
            insetInlineStart: grow,
            insetInlineEnd: grow,
            opacity: when().on(CURRENT, unitless(1)).else(unitless(0)),
            borderRadius: radius("full"),
            pointerEvents: none,
            transition: growTransition,
            ...colors.activeIndicator,
        } satisfies StyleMap,
        // Positioned, so it paints over the active indicator before it.
        icon: {
            ...iconBox(ref("iconSize")),
            position: relative,
        } satisfies StyleMap,
        label: {
            textStyle: textStyle("labelMedium"),
            maxWidth: pct(100),
        } satisfies StyleMap,
    };
};
