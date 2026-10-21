// The pureform tabs: Material's primary and secondary tabs.
//
// Markup: a tab list holding the tabs, each wrapping its content (an optional icon, its label,
// and the active indicator), as Material's tabs do. Mark the current tab with
// `aria-selected="true"`. Turn on `icon` when the tabs have icons; primary tabs then stack the
// icon over the label, unless `inlineIcon` sets it beside.
//
//   <div class={root} role="tablist">
//     <button class={tab} role="tab" aria-selected="true">
//       <span class={tabContent}>
//         <span class={icon}>★</span>
//         <span class={label}>Flights</span>
//         <span class={indicator} />
//       </span>
//     </button>
//   </div>
//
// A primary tab's indicator spans its content (at least 24px, centered under it); a secondary
// tab's content spans the tab and pads itself, so its indicator spans the whole tab.
//
// `scrollable` tabs size to their content (at least 90px) rather than share the list's width,
// and the list scrolls sideways, padded at its edges. React Native has no scrolling overflow, so
// its binding wraps the list in a horizontal scroll view.
//
// The indicator slides from the tab selected before to the new one: the bindings start a
// transform from the old indicator's box (FLIP), timed by the `transform` transition the
// indicator declares here, so the motion tokens retime it and reduced motion turns it off.

import { typed } from "@pureform/core";
import {
    absolute,
    auto,
    center,
    column,
    flex,
    mul,
    px,
    relative,
    row,
    shadow,
    slot,
    stretch,
    tween,
    unitless,
    when,
} from "@pureform/core/ast";
import type { ColorValue } from "@pureform/core/ast";
import {
    duration,
    easing,
    radius,
    size as sizeToken,
    spacing,
    textStyle,
} from "@pureform/theme";

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import {
    DEFAULT_GROUP,
    colorVariant,
    componentTokens,
    defaultGroups,
    iconBox,
    iconFill,
    INDICATION_ROOT,
    motionTransition,
    pressableRoot,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

const pf = typed();

const { tokens, ref } = componentTokens("tabs", {
    container: sys("surface"),
    dividerColor: sys("outlineVariant"),
    content: sys("onSurfaceVariant"),
    activeColor: sys("primary"),
    secondaryActiveColor: sys("onSurface"),
    indicatorColor: sys("primary"),
    height: px(48),
    heightWithIcon: px(64),
    paddingInline: spacing("4"),
    iconSize: sizeToken("iconMedium"),
    iconFill: unitless(0),
    indicatorHeight: px(3),
    // Material's 3dp top corners on a primary indicator.
    indicatorRadius: mul(radius("extraSmall"), unitless(0.75)),
    secondaryIndicatorHeight: px(2),
    // A primary indicator is as wide as the tab's content, and never narrower than this.
    indicatorMinWidth: px(24),
    // How the indicator slides to a newly selected tab, as Material's web tabs time it.
    // Scrollable tabs: the inline padding before the first tab and after the last, and the
    // narrowest a tab gets (Compose's `PrimaryScrollableTabRow` edge padding and minimum tab
    // width, 52dp and 90dp).
    edgePadding: px(52),
    scrollableMinWidth: px(90),
    indicatorDuration: duration("medium1"),
    indicatorEasing: easing("emphasized"),
    ...INDICATION_TOKENS,
});

const pressable = pressableRoot(ref);

const SELECTED = slot("tab", "selected");

// The tab's colors, with the active content color given: it tints the state layer too.
const tabColors = (active: ColorValue) => ({
    backgroundColor: stateLayer(ref, {
        base: ref("container"),
        content: ref("content"),
    }),
    color: ref("content"),
    states: {
        selected: {
            backgroundColor: stateLayer(ref, {
                base: ref("container"),
                content: active,
            }),
            color: active,
        },
    },
});

/** Build the tabs with a `color` variant per group in `groups`. A group colors the indicator
 *  and a primary tab's active label and icon; a secondary tab's active label stays neutral. */
export const createTabs = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "tabs",
            $meta: {
                description:
                    "Material tabs, primary or secondary. Mark the current tab with aria-selected; turn on icon when the tabs have icons, inlineIcon to set a primary tab's icon beside its label, and scrollable for tabs that size to their content and scroll.",
            },
            tokens,
            slots: ["root", "tab", "tabContent", "icon", "label", "indicator"],
            structure: {
                root: ["tab"],
                tab: ["tabContent"],
                tabContent: ["icon", "label", "indicator"],
            },
            indication: [
                {
                    trigger: "tab",
                    surface: "tab",
                    centered: false,
                    focus: "tab",
                },
            ],
            variants: {
                variant: ["primary", "secondary"],
                icon: ["true", "false"],
                inlineIcon: ["true", "false"],
                scrollable: ["false", "true"],
                color: groups as ColorGroups,
            },
            recipe: () => ({
                base: {
                    root: {
                        ...INDICATION_ROOT,
                        // A stacking context of its own, so the indicator's layer stays in it.
                        position: relative,
                        zIndex: unitless(0),
                        display: flex,
                        flexDirection: row,
                        backgroundColor: ref("container"),
                    },
                    tab: {
                        ...pressable,
                        ...tabColors(ref("activeColor")),
                        states: {
                            ...pressable.states,
                            ...tabColors(ref("activeColor")).states,
                        },
                        // The content fills the tab's height, so the indicator sits on its edge.
                        alignItems: stretch,
                        height: ref("height"),
                        // The divider under the tabs: an inset shadow on each tab, so it takes no space
                        // and draws over the tab's state layer.
                        boxShadow: shadow({
                            x: px(0),
                            y: px(-1),
                            blur: px(0),
                            spread: px(0),
                            color: ref("dividerColor"),
                            inset: true,
                        }),
                    },
                    // The icon and label, centered in the tab and kept clear of its edges; the
                    // indicator spans it.
                    tabContent: {
                        position: relative,
                        display: flex,
                        flexDirection: row,
                        alignItems: center,
                        justifyContent: center,
                        gap: spacing("2"),
                        minWidth: ref("indicatorMinWidth"),
                        marginInlineStart: ref("paddingInline"),
                        marginInlineEnd: ref("paddingInline"),
                    },
                    icon: iconBox(ref("iconSize"), {
                        fill: iconFill(ref("iconFill")),
                    }),
                    label: { textStyle: textStyle("titleSmall") },
                    indicator: {
                        position: absolute,
                        bottom: px(0),
                        insetInlineStart: px(0),
                        insetInlineEnd: px(0),
                        height: ref("indicatorHeight"),
                        borderStartStartRadius: ref("indicatorRadius"),
                        borderStartEndRadius: ref("indicatorRadius"),
                        backgroundColor: ref("indicatorColor"),
                        opacity: when()
                            .on(SELECTED, unitless(1))
                            .else(unitless(0)),
                        // Over every tab, so it draws over the tabs it slides across.
                        zIndex: unitless(1),
                        transition: motionTransition(
                            tween(
                                "transform",
                                ref("indicatorDuration"),
                                ref("indicatorEasing"),
                            ),
                        ),
                    },
                },
                variants: {
                    variant: {
                        primary: {},
                        // A secondary tab's content spans the tab, padded rather than inset, so its
                        // indicator spans the tab, square; its label stays neutral.
                        secondary: {
                            tab: {
                                ...tabColors(ref("secondaryActiveColor")),
                            },
                            tabContent: {
                                flexGrow: unitless(1),
                                marginInlineStart: px(0),
                                marginInlineEnd: px(0),
                                paddingInlineStart: ref("paddingInline"),
                                paddingInlineEnd: ref("paddingInline"),
                            },
                            indicator: {
                                height: ref("secondaryIndicatorHeight"),
                                borderStartStartRadius: px(0),
                                borderStartEndRadius: px(0),
                            },
                        },
                    },
                    icon: { true: {}, false: {} },
                    inlineIcon: { true: {}, false: {} },
                    // Scrollable tabs size to their content, at least the minimum width, and the
                    // list scrolls, padded at its edges.
                    scrollable: {
                        // Fixed tabs share the list's width equally.
                        false: {
                            tab: {
                                flexBasis: px(0),
                                flexGrow: unitless(1),
                                minWidth: px(0),
                            },
                        },
                        true: {
                            root: {
                                overflow: auto,
                                paddingInlineStart: ref("edgePadding"),
                                paddingInlineEnd: ref("edgePadding"),
                            },
                            tab: {
                                flexGrow: unitless(0),
                                flexShrink: unitless(0),
                                minWidth: ref("scrollableMinWidth"),
                            },
                        },
                    },
                    // A group points the active and indicator colors at its main color.
                    // Secondary tabs read their own active color, so they keep it.
                    color: colorVariant(groups, (g) => ({
                        root: {
                            tokens: {
                                activeColor: g.main,
                                indicatorColor: g.main,
                            },
                        },
                    })),
                },
                // Primary tabs stack the icon over the label and grow taller, unless the icon is
                // inline; secondary tabs keep the icon beside it.
                compoundVariants: [
                    {
                        match: {
                            variant: "primary",
                            icon: "true",
                            inlineIcon: "false",
                        },
                        style: {
                            tab: { height: ref("heightWithIcon") },
                            tabContent: { flexDirection: column, gap: px(2) },
                        },
                    },
                ],
                defaultVariants: {
                    variant: "primary",
                    icon: "false",
                    inlineIcon: "false",
                    scrollable: "false",
                    color: DEFAULT_GROUP,
                },
            }),
        }),
    );

export const tabs = createTabs();
