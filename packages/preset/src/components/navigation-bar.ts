// The pureform navigation bar: Material's bottom navigation, three to five destinations side
// by side.
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
import { flex, pct, px, row, unitless } from "@pureform/core/ast";
import { spacing } from "@pureform/theme";

import {
    NAV_SLOTS,
    NAV_STRUCTURE,
    navColors,
    navParts,
    navTokens,
} from "./navigation";
import {
    COLOR_GROUPS,
    DEFAULT_GROUP,
    colorVariant,
    surface,
    sys,
} from "./shared";
import type { ColorGroups } from "./shared";

const pf = typed();

const { tokens, ref } = navTokens("navigationBar", {
    container: sys("surfaceContainer"),
    height: px(80),
    indicatorWidth: px(64),
});

const parts = navParts(ref, ref("indicatorWidth"));

/** Build the navigation bar with a `color` variant per group in `groups`. A group fills the
 *  current destination's pill with its container. */
export const createNavigationBar = (groups: ColorGroups = COLOR_GROUPS) =>
    pf.slotComponent({
        name: "navigationBar",
        $meta: {
            description:
                'Material navigation bar. Mark the current destination with aria-current="page".',
        },
        tokens,
        slots: [...NAV_SLOTS],
        structure: NAV_STRUCTURE,
        variants: {
            color: groups,
        },
        recipe: () => ({
            base: {
                root: {
                    ...surface(ref("container"), ref("labelColor"), "level2"),
                    display: flex,
                    flexDirection: row,
                    height: ref("height"),
                },
                // Destinations share the bar's width equally.
                item: {
                    ...parts.item,
                    flexBasis: px(0),
                    flexGrow: unitless(1),
                    minWidth: px(0),
                    height: pct(100),
                    paddingBlockStart: spacing("3"),
                    paddingBlockEnd: spacing("4"),
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
                    }),
                ),
            },
            defaultVariants: { color: DEFAULT_GROUP },
        }),
    });

export const navigationBar = createNavigationBar();
