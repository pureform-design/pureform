// The pureform navigation rail: Material's side navigation for wide screens, destinations
// stacked in a narrow column.
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
import { center, column, flex, pct, px } from "@pureform/core/ast";
import { spacing } from "@pureform/theme";

import {
    NAV_SLOTS,
    NAV_INDICATION,
    NAV_STRUCTURE,
    navColors,
    navParts,
    navTokens,
} from "./navigation";
import {
    DEFAULT_GROUP,
    colorVariant,
    defaultGroups,
    INDICATION_ROOT,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

const pf = typed();

const { tokens, ref } = navTokens("navigationRail", {
    container: sys("surface"),
    // M3 Expressive's collapsed rail.
    width: px(96),
    itemHeight: px(56),
    indicatorWidth: px(56),
    itemGap: spacing("3"),
});

const parts = navParts(ref, ref("indicatorWidth"));

/** Build the navigation rail with a `color` variant per group in `groups`. A group fills the
 *  current destination's pill with its container. */
export const createNavigationRail = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "navigationRail",
            $meta: {
                description:
                    'Material navigation rail. Mark the current destination with aria-current="page".',
            },
            tokens,
            slots: [...NAV_SLOTS],
            structure: NAV_STRUCTURE,
            indication: NAV_INDICATION,
            variants: {
                color: groups as ColorGroups,
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
                    item: {
                        ...parts.item,
                        width: pct(100),
                        minHeight: ref("itemHeight"),
                    },
                    indicator: parts.indicator,
                    activeIndicator: parts.activeIndicator,
                    icon: parts.icon,
                    label: parts.label,
                },
                variants: {
                    color: colorVariant(groups, (g) =>
                        navColors(ref, {
                            indicator: g.container,
                            icon: g.onContainer,
                            label: g.main,
                        }),
                    ),
                },
                defaultVariants: { color: DEFAULT_GROUP },
            }),
        }),
    );

export const navigationRail = createNavigationRail();
