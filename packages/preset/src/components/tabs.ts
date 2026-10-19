// The pureform tabs: Material's primary and secondary tabs.
//
// Markup: a tab list holding the tabs, each with an optional icon, its label, and the active
// indicator. Mark the current tab with `aria-selected="true"`. Turn on `icon` when the tabs
// have icons; primary tabs then stack the icon over the label.
//
//   <div class={root} role="tablist">
//     <button class={tab} role="tab" aria-selected="true">
//       <span class={icon}>★</span>
//       <span class={label}>Flights</span>
//       <span class={indicator} />
//     </button>
//   </div>
//
// The indicator slides from the tab selected before to the new one: the bindings start a
// transform from the old indicator's box (FLIP), timed by the `transform` transition the
// indicator declares here, so the motion tokens retime it and reduced motion turns it off.

import { typed } from "@pureform/core";
import {
    absolute,
    column,
    flex,
    px,
    relative,
    row,
    shadow,
    slot,
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
    secondaryIndicatorHeight: px(2),
    // How the indicator slides to a newly selected tab, as Material's web tabs time it.
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
                    "Material tabs, primary or secondary. Mark the current tab with aria-selected; turn on icon when the tabs have icons.",
            },
            tokens,
            slots: ["root", "tab", "icon", "label", "indicator"],
            structure: {
                root: ["tab"],
                tab: ["icon", "label", "indicator"],
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
                    // Tabs share the list's width equally.
                    tab: {
                        ...pressable,
                        ...tabColors(ref("activeColor")),
                        states: {
                            ...pressable.states,
                            ...tabColors(ref("activeColor")).states,
                        },
                        flexBasis: px(0),
                        flexGrow: unitless(1),
                        minWidth: px(0),
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
                        paddingInlineStart: ref("paddingInline"),
                        paddingInlineEnd: ref("paddingInline"),
                        gap: spacing("2"),
                    },
                    icon: iconBox(ref("iconSize"), {
                        fill: iconFill(ref("iconFill")),
                    }),
                    label: { textStyle: textStyle("titleSmall") },
                    indicator: {
                        position: absolute,
                        bottom: px(0),
                        insetInlineStart: ref("paddingInline"),
                        insetInlineEnd: ref("paddingInline"),
                        height: ref("indicatorHeight"),
                        borderStartStartRadius: radius("extraSmall"),
                        borderStartEndRadius: radius("extraSmall"),
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
                        // A secondary tab's indicator spans the tab, square, and its label stays neutral.
                        secondary: {
                            tab: {
                                ...tabColors(ref("secondaryActiveColor")),
                            },
                            indicator: {
                                insetInlineStart: px(0),
                                insetInlineEnd: px(0),
                                height: ref("secondaryIndicatorHeight"),
                                borderStartStartRadius: px(0),
                                borderStartEndRadius: px(0),
                            },
                        },
                    },
                    icon: { true: {}, false: {} },
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
                // Primary tabs stack the icon over the label and grow taller; secondary tabs keep the
                // icon beside it.
                compoundVariants: [
                    {
                        match: { variant: "primary", icon: "true" },
                        style: {
                            tab: {
                                flexDirection: column,
                                gap: px(2),
                                height: ref("heightWithIcon"),
                            },
                        },
                    },
                ],
                defaultVariants: {
                    variant: "primary",
                    icon: "false",
                    color: DEFAULT_GROUP,
                },
            }),
        }),
    );

export const tabs = createTabs();
