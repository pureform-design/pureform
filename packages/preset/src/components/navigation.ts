// The parts Material's navigation bar and navigation rail share: destinations that stack an
// icon over a label, with the current one marked by a pill behind its icon. A horizontal
// destination (the bar's `itemLayout: horizontal`, the expanded rail) puts the label beside the
// icon, both inside the pill.
//
// Mark the current destination with `aria-current="page"` (or `aria-selected`). The pill takes
// the state layer while its destination is hovered, focused, or pressed; inside it, the active
// indicator grows from the center to fill it once the destination is current, and an icon font
// draws the icon filled.

import type { IndicationDeclaration } from "@pureform/core";
import {
    absolute,
    add,
    center,
    colorMix,
    column,
    flex,
    start,
    none,
    pct,
    px,
    relative,
    row,
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
    opacity,
    radius,
    size as sizeToken,
    spacing,
    spring,
    textStyle,
} from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import {
    componentTokens,
    iconBox,
    iconFill,
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
    // M3 Expressive labels the current destination in the secondary color.
    activeLabelColor: sys("secondary"),
    // Compose 1.5 labels a horizontal item's current destination in its icon's color, as the
    // label sits on the pill with the icon.
    horizontalActiveLabelColor: sys("onSecondaryContainer"),
    labelColor: sys("onSurfaceVariant"),
    // A disabled destination's icon and label: the inactive ones at Material's disabled content
    // opacity, 38% (Compose's `NavigationBarItemDefaults.colors` and `NavigationRailItemDefaults`:
    // `InactiveIconColor.copy(alpha = DisabledAlpha)`), current or not.
    disabledIconColor: colorMix(
        transparent,
        sys("onSurfaceVariant"),
        opacity("disabledContent"),
    ),
    disabledLabelColor: colorMix(
        transparent,
        sys("onSurfaceVariant"),
        opacity("disabledContent"),
    ),
    stateLayerColor: sys("onSurface"),
    iconSize: sizeToken("iconMedium"),
    // Material draws the current destination's icon filled.
    iconFill: unitless(0),
    activeIconFill: unitless(1),
    indicatorHeight: px(32),
    gap: spacing("1"),
    // A horizontal destination's pill: its height, the inline padding around the icon and label,
    // and the gap between them.
    horizontalIndicatorHeight: px(40),
    horizontalPadding: spacing("4"),
    horizontalGap: spacing("1"),
    ...INDICATION_TOKENS,
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

/** Where a destination shows indication: the pill takes its state layer and ripples from its
 *  center. The pill, not the active indicator inside it, is the surface: the active indicator
 *  is drawn only on the current destination. */
export const NAV_INDICATION: IndicationDeclaration<
    (typeof NAV_SLOTS)[number]
>[] = [
    {
        trigger: "item",
        surface: "indicator",
        centered: true,
        focus: "item",
    },
];

const CURRENT = slot("item", "selected");
const DISABLED = slot("item", "disabled");

/** The colors a current destination takes. */
export interface NavActive {
    indicator: ColorValue;
    icon: ColorValue;
}

/** The parts' colors, with the current destination's given. The label's are tokens (see
 *  `navLabelTokens`), so the layout picks between them. */
export const navColors = (
    ref: (token: NavToken) => AliasNode,
    active: NavActive,
) => ({
    indicator: {
        color: when()
            .on(CURRENT, active.icon)
            .on(DISABLED, ref("disabledIconColor"))
            .else(ref("iconColor")),
    },
    // The fill carries the state layer once current, over the pill's own.
    activeIndicator: {
        backgroundColor: slotStateLayer(ref, "item", {
            base: active.indicator,
            content: ref("stateLayerColor"),
        }),
    },
});

/** A color group's current labels, as tokens on the root: M3 Expressive draws a vertical
 *  destination's in the group's main color, and a horizontal one's, which sits on the pill, in
 *  the icon's color. The layout reads one or the other. */
export const navLabelTokens = (group: {
    main: ColorValue;
    onContainer: ColorValue;
}) => ({
    root: {
        tokens: {
            activeLabelColor: group.main,
            horizontalActiveLabelColor: group.onContainer,
        },
    },
});

// The active indicator grows from the pill's center: both insets move from 50% to 0, so it
// grows the same way in either writing direction.
const grow = when().on(CURRENT, px(0)).else(pct(50));

// It grows on the `spatialDefault` spring and fades in on `effectsDefault`, as Compose's
// navigation items animate their indicator (`DefaultSpatial`; their colors `DefaultEffects`).
// Under reduced motion it appears at its full size, fading in.
const growTransition = motionTransition(
    tween("insetInlineStart", { spring: spring("spatialDefault") }),
    tween("insetInlineEnd", { spring: spring("spatialDefault") }),
    tween("opacity", { spring: spring("effectsDefault") }),
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
    const pressable = pressableRoot(ref);
    return {
        item: {
            ...pressable,
            flexDirection: column,
            gap: ref("gap"),
            backgroundColor: transparent,
            color: ref("labelColor"),
            states: {
                ...pressable.states,
                selected: { color: ref("activeLabelColor") },
                disabled: {
                    ...pressable.states.disabled,
                    color: ref("disabledLabelColor"),
                },
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
            backgroundColor: slotStateLayer(ref, "item", {
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
            ...iconBox(ref("iconSize"), {
                fill: iconFill(ref("iconFill"), {
                    on: CURRENT,
                    fill: ref("activeIconFill"),
                }),
            }),
            position: relative,
        } satisfies StyleMap,
        label: {
            textStyle: textStyle("labelMedium"),
            maxWidth: pct(100),
        } satisfies StyleMap,
    };
};

/** The parts' styles for a horizontal destination, over the vertical ones: the item is the pill,
 *  the label beside the icon. The pill (`indicator`) covers the item, holding the active
 *  indicator and the icon at its start; the label follows in the flow, past the icon, and paints
 *  over the pill. Every target positions an absolute child against its parent, so the pill
 *  stays the item's. `height` is the pill's. */
export const navHorizontalParts = (
    ref: (token: NavToken) => AliasNode,
    height: ValueNode & StyleMap["height"],
) => ({
    item: {
        position: relative,
        flexDirection: row,
        alignItems: center,
        justifyContent: start,
        height,
        minHeight: height,
        paddingInlineStart: ref("horizontalPadding"),
        paddingInlineEnd: ref("horizontalPadding"),
        paddingBlockStart: px(0),
        paddingBlockEnd: px(0),
        gap: px(0),
        borderRadius: radius("full"),
        states: {
            selected: { color: ref("horizontalActiveLabelColor") },
            disabled: { color: ref("disabledLabelColor") },
        },
    } satisfies StyleMap,
    indicator: {
        position: absolute,
        top: px(0),
        bottom: px(0),
        insetInlineStart: px(0),
        width: pct(100),
        height: pct(100),
        justifyContent: start,
    } satisfies StyleMap,
    icon: { marginInlineStart: ref("horizontalPadding") } satisfies StyleMap,
    label: {
        position: relative,
        marginInlineStart: add(ref("iconSize"), ref("horizontalGap")),
    } satisfies StyleMap,
});
