// The parts Material's navigation bar and navigation rail share: destinations that stack an
// icon over a label, with the current one marked by a pill behind its icon.
//
// Mark the current destination with `aria-current="page"` (or `aria-selected`). The pill fills
// with the indicator color there, and takes the state layer while its destination is hovered,
// focused, or pressed.

import {
    center,
    column,
    flex,
    pct,
    px,
    slot,
    transparent,
    when,
} from "@pureform/core/ast";
import type {
    AliasNode,
    ColorValue,
    StyleMap,
    ValueNode,
} from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";

import {
    componentTokens,
    iconBox,
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
    "icon",
    "label",
] as const;
export const NAV_STRUCTURE = {
    root: ["item"],
    item: ["indicator", "label"],
    indicator: ["icon"],
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
        backgroundColor: slotStateLayer(
            "item",
            { base: transparent, content: ref("stateLayerColor") },
            {
                state: CURRENT,
                base: active.indicator,
                content: ref("stateLayerColor"),
            },
        ),
        color: when().on(CURRENT, active.icon).else(ref("iconColor")),
    },
});

/** The parts' styles, over the component's tokens. `indicatorWidth` is the pill's width. */
export const navParts = (
    ref: (token: NavToken) => AliasNode,
    indicatorWidth: ValueNode & StyleMap["width"],
) => ({
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
        display: flex,
        alignItems: center,
        justifyContent: center,
        width: indicatorWidth,
        height: ref("indicatorHeight"),
        borderRadius: radius("full"),
        ...navColors(ref, {
            indicator: ref("indicatorColor"),
            icon: ref("activeIconColor"),
        }).indicator,
    } satisfies StyleMap,
    icon: iconBox(ref("iconSize")),
    label: {
        textStyle: textStyle("labelMedium"),
        maxWidth: pct(100),
    } satisfies StyleMap,
});
