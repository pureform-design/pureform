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

import { defineSlotComponent } from "@pureform/core";
import {
    absolute,
    column,
    flex,
    pct,
    px,
    row,
    shadow,
    slot,
    unitless,
    when,
} from "@pureform/core/ast";
import type { ColorValue } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";

import { stateLayer } from "../state-layer";
import {
    COLOR_GROUPS,
    DEFAULT_GROUP,
    colorVariant,
    componentTokens,
    iconBox,
    pressableRoot,
    sys,
} from "./shared";
import type { ColorGroups } from "./shared";

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
    indicatorHeight: px(3),
    secondaryIndicatorHeight: px(2),
});

const SELECTED = slot("tab", "selected");

// The tab's colors, with the active content color given: it tints the state layer too.
const tabColors = (active: ColorValue) => ({
    backgroundColor: stateLayer({
        base: ref("container"),
        content: ref("content"),
    }),
    color: ref("content"),
    states: {
        selected: {
            backgroundColor: stateLayer({
                base: ref("container"),
                content: active,
            }),
            color: active,
        },
    },
});

/** Build the tabs with a `color` variant per group in `groups`. A group colors the indicator
 *  and a primary tab's active label and icon; a secondary tab's active label stays neutral. */
export const createTabs = (groups: ColorGroups = COLOR_GROUPS) =>
    defineSlotComponent({
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
        recipe: {
            base: {
                root: {
                    display: flex,
                    flexDirection: row,
                    backgroundColor: ref("container"),
                },
                // Every tab is as wide as the list, so they shrink to equal shares.
                tab: {
                    ...pressableRoot,
                    ...tabColors(ref("activeColor")),
                    states: {
                        ...pressableRoot.states,
                        ...tabColors(ref("activeColor")).states,
                    },
                    width: pct(100),
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
                icon: iconBox(ref("iconSize")),
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
                    opacity: when().on(SELECTED, unitless(1)).else(unitless(0)),
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
                color: colorVariant(groups, (g) => ({
                    tab: tabColors(g.main),
                    indicator: { backgroundColor: g.main },
                })),
            },
            // Primary tabs stack the icon over the label and grow taller; secondary tabs keep the
            // icon beside it.
            compoundVariants: [
                // The color variant sets the active label too, so secondary tabs set theirs back in
                // the later layer.
                ...groups
                    .filter((group) => group !== DEFAULT_GROUP)
                    .map((group) => ({
                        match: { variant: "secondary", color: group },
                        style: { tab: tabColors(ref("secondaryActiveColor")) },
                    })),
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
        },
    });

export const tabs = createTabs();
