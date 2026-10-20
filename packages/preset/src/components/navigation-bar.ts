// The pureform navigation bar: Material's bottom navigation, three to five destinations side
// by side. `itemLayout: horizontal` puts each label beside its icon, both in the pill, as M3
// Expressive's bar does in medium windows; the destinations then gather in the bar's center.
//
//   <nav class={root}>
//     <a class={item} href="/" aria-current="page">
//       <span class={indicator}>
//         <span class={activeIndicator} />
//         <span class={icon}>⌂</span>
//       </span>
//       <span class={label}>Home</span>
//     </a>
//   </nav>

import { typed } from "@pureform/core";
import { center, flex, pct, px, row, unitless } from "@pureform/core/ast";
import { spacing } from "@pureform/theme";

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

const { tokens, ref } = navTokens("navigationBar", {
    container: sys("surfaceContainer"),
    // M3 Expressive's shorter bar, with a narrower pill.
    height: px(64),
    indicatorWidth: px(56),
});

const parts = navParts(ref, ref("indicatorWidth"));
const horizontal = navHorizontalParts(ref, ref("horizontalIndicatorHeight"));

/** Where each destination's label sits: under its icon (`vertical`, the default) or beside it,
 *  inside the pill (`horizontal`). */
export type NavigationBarItemLayout = "vertical" | "horizontal";

/** Build the navigation bar with a `color` variant per group in `groups`. A group fills the
 *  current destination's pill with its container. */
export const createNavigationBar = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{
        color: G | typeof DEFAULT_GROUP;
        itemLayout: NavigationBarItemLayout;
    }>()(
        pf.slotComponent({
            name: "navigationBar",
            $meta: {
                description:
                    'Material navigation bar. Mark the current destination with aria-current="page".',
            },
            tokens,
            slots: [...NAV_SLOTS],
            structure: NAV_STRUCTURE,
            indication: NAV_INDICATION,
            variants: {
                color: groups as ColorGroups,
                itemLayout: ["vertical", "horizontal"],
            },
            recipe: () => ({
                base: {
                    root: {
                        ...INDICATION_ROOT,
                        ...surface(
                            ref("container"),
                            ref("labelColor"),
                            "level2",
                        ),
                        display: flex,
                        flexDirection: row,
                        height: ref("height"),
                    },
                    item: parts.item,
                    indicator: parts.indicator,
                    activeIndicator: parts.activeIndicator,
                    icon: parts.icon,
                    label: parts.label,
                },
                variants: {
                    color: colorVariant(groups, (g) => ({
                        ...navLabelTokens(g),
                        ...navColors(ref, {
                            indicator: g.container,
                            icon: g.onContainer,
                        }),
                    })),
                    // Each destination hugs its pill, and they gather in the center.
                    itemLayout: {
                        // Destinations share the bar's width equally.
                        vertical: {
                            item: {
                                flexBasis: px(0),
                                flexGrow: unitless(1),
                                minWidth: px(0),
                                height: pct(100),
                                paddingBlockStart: px(6),
                                paddingBlockEnd: px(6),
                            },
                        },
                        horizontal: {
                            root: {
                                justifyContent: center,
                                alignItems: center,
                                gap: spacing("2"),
                            },
                            item: horizontal.item,
                            indicator: horizontal.indicator,
                            icon: horizontal.icon,
                            label: horizontal.label,
                        },
                    },
                },
                defaultVariants: {
                    color: DEFAULT_GROUP,
                    itemLayout: "vertical",
                },
            }),
        }),
    );

export const navigationBar = createNavigationBar();
