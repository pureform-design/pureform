// The pureform navigation rail: Material's side navigation for wide screens, destinations
// stacked in a narrow column under an optional header (the menu button and a FAB).
//
//   <nav class={root}>
//     <div class={header}>…menu button, FAB…</div>
//     <a class={item} href="/" aria-current="page">
//       <span class={indicator}>
//         <span class={activeIndicator} />
//         <span class={icon}>⌂</span>
//       </span>
//       <span class={label}>Home</span>
//     </a>
//   </nav>
//
// `expanded` widens it, M3 Expressive's replacement for the navigation drawer: each label sits
// beside its icon, inside the pill, and destinations sharing a `section` sit under one
// `sectionLabel` heading. A collapsed rail hides its section labels. `modal` draws it as a surface over the page; the bindings
// put it in a dialog over a scrim.

import { typed } from "@pureform/core";
import { center, column, flex, none, pct, px, start } from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";

import {
    NAV_SLOTS,
    NAV_INDICATION,
    NAV_STRUCTURE,
    navColors,
    navHorizontalParts,
    navLabelTokens,
    navParts,
    navTokens,
} from "./navigation";
import {
    DEFAULT_GROUP,
    colorVariant,
    defaultGroups,
    INDICATION_ROOT,
    surface,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

const pf = typed();

const { tokens, ref } = navTokens("navigationRail", {
    container: sys("surface"),
    // A modal rail's surface, raised over the page.
    modalContainer: sys("surfaceContainer"),
    // M3 Expressive's collapsed rail.
    width: px(96),
    // The expanded rail's width, Material's minimum.
    expandedWidth: px(220),
    itemHeight: px(56),
    indicatorWidth: px(56),
    itemGap: spacing("3"),
    // An expanded destination's pill is the item's height, its label further from the icon.
    horizontalIndicatorHeight: px(56),
    horizontalGap: spacing("2"),
    // The header's controls, and the space between it and the destinations.
    headerGap: spacing("2"),
    headerSpacing: spacing("4"),
    // An expanded rail's section label: its color, and its height (M3 Expressive's 56, as a
    // destination's), its text at the label's start.
    sectionLabelColor: sys("onSurfaceVariant"),
    sectionLabelHeight: px(56),
    sectionLabelPaddingInline: spacing("4"),
});

const parts = navParts(ref, ref("indicatorWidth"));
const horizontal = navHorizontalParts(ref, ref("horizontalIndicatorHeight"));

const SLOTS = [...NAV_SLOTS, "header", "sectionLabel"] as const;
const STRUCTURE = {
    ...NAV_STRUCTURE,
    root: ["header", "sectionLabel", "item"],
} as {
    [K in "root" | "item" | "indicator"]: (typeof SLOTS)[number][];
};

/** Build the navigation rail with a `color` variant per group in `groups`. A group fills the
 *  current destination's pill with its container. */
export const createNavigationRail = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{
        color: G | typeof DEFAULT_GROUP;
        expanded: "false" | "true";
        modal: "false" | "true";
    }>()(
        pf.slotComponent({
            name: "navigationRail",
            $meta: {
                description:
                    'Material navigation rail. Mark the current destination with aria-current="page". An expanded rail shows its section labels; a collapsed one hides them.',
            },
            tokens,
            slots: [...SLOTS],
            structure: STRUCTURE,
            indication: NAV_INDICATION,
            variants: {
                color: groups as ColorGroups,
                expanded: ["false", "true"],
                modal: ["false", "true"],
            },
            recipe: () => ({
                base: {
                    root: {
                        ...INDICATION_ROOT,
                        display: flex,
                        flexDirection: column,
                        alignItems: center,
                        gap: ref("itemGap"),
                        width: ref("width"),
                        paddingBlockStart: spacing("3"),
                        paddingBlockEnd: spacing("3"),
                        backgroundColor: ref("container"),
                        color: ref("labelColor"),
                    },
                    // The menu button and the FAB, stacked over the destinations.
                    header: {
                        display: flex,
                        flexDirection: column,
                        alignItems: center,
                        gap: ref("headerGap"),
                        marginBlockEnd: ref("headerSpacing"),
                    },
                    item: {
                        ...parts.item,
                        minHeight: ref("itemHeight"),
                    },
                    indicator: parts.indicator,
                    activeIndicator: parts.activeIndicator,
                    icon: parts.icon,
                    label: parts.label,
                    sectionLabel: { display: none },
                },
                variants: {
                    color: colorVariant(groups, (g) => ({
                        ...navLabelTokens(g),
                        ...navColors(ref, {
                            indicator: g.container,
                            icon: g.onContainer,
                        }),
                    })),
                    // Destinations hug their pills, at the start of the wider column.
                    expanded: {
                        false: { item: { width: pct(100) } },
                        true: {
                            root: {
                                width: ref("expandedWidth"),
                                alignItems: start,
                                paddingInlineStart: spacing("5"),
                                paddingInlineEnd: spacing("5"),
                            },
                            header: { alignItems: start },
                            sectionLabel: {
                                display: flex,
                                alignItems: center,
                                minHeight: ref("sectionLabelHeight"),
                                paddingInlineStart: ref(
                                    "sectionLabelPaddingInline",
                                ),
                                paddingInlineEnd: ref(
                                    "sectionLabelPaddingInline",
                                ),
                                textStyle: textStyle("titleSmall"),
                                color: ref("sectionLabelColor"),
                            },
                            item: horizontal.item,
                            indicator: horizontal.indicator,
                            icon: horizontal.icon,
                            label: {
                                ...horizontal.label,
                                textStyle: textStyle("labelLarge"),
                            },
                        },
                    },
                    // A surface over the page, with its end corners rounded.
                    modal: {
                        false: {},
                        true: {
                            root: {
                                ...surface(
                                    ref("modalContainer"),
                                    ref("labelColor"),
                                    "level1",
                                ),
                                height: pct(100),
                                borderStartEndRadius: radius("large"),
                                borderEndEndRadius: radius("large"),
                            },
                        },
                    },
                },
                defaultVariants: {
                    color: DEFAULT_GROUP,
                    expanded: "false",
                    modal: "false",
                },
            }),
        }),
    );

export const navigationRail = createNavigationRail();
