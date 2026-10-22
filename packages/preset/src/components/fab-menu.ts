// The pureform FAB menu: M3 Expressive's FAB that opens a stack of actions over itself.
//
// The FAB (`closeTrigger`) opens the menu; while it's open (`aria-expanded`) it turns into the
// round close button in the group's main color. The items stack above it, at its end, each a
// pill in the group's container color with an icon and a label, in the `list` (Zag's menu
// content), which sits above the FAB at its end, in either direction. `root` holds both.
//
//   <div class={root}>
//     <div class={list} role="menu">
//       <button class={item} role="menuitem">
//         <span class={itemIcon}>✉</span><span class={itemLabel}>Message</span>
//       </button>
//     </div>
//     <button class={closeTrigger} aria-haspopup="menu" aria-expanded="true">✕</button>
//   </div>
//
// `color` takes M3's primary, secondary and tertiary sets, or any of the theme's groups; `size`
// is the FAB's at rest (`default` 56, `medium` 80, `large` 96).

import { typed } from "@pureform/core";
import {
    absolute,
    column,
    end,
    flex,
    inlineFlex,
    mul,
    pct,
    px,
    relative,
    slot,
    unitless,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import {
    duration,
    radius,
    size as sizeToken,
    spacing,
    textStyle,
    zIndex,
} from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import { FAB_SIZES } from "./fab";
import { overlayMotion, POPUP_MOTION } from "./overlay";
import { spatialCornerTransition } from "./shared";
import {
    DEFAULT_GROUP,
    colorTokenVariants,
    componentTokens,
    defaultGroups,
    entriesOf,
    groupTokens,
    iconBox,
    INDICATION_ROOT,
    interactiveColors,
    keysOf,
    pressableRoot,
    sizeTokenName,
    sizeTokens,
    slotStateLayer,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

/** The FAB sizes the menu's FAB takes: Expressive's, without the deprecated small one. */
const SIZES = {
    default: FAB_SIZES.default,
    medium: FAB_SIZES.medium,
    large: FAB_SIZES.large,
};

const { tokens, ref } = componentTokens("fabMenu", {
    // The FAB at rest, by size (so a theme can retune one), and the open close button's
    // round corners.
    ...sizeTokens(SIZES, "size", "size"),
    ...sizeTokens(SIZES, "radius", "radius"),
    closeRadius: radius("full"),
    iconSize: sizeToken("iconMedium"),
    // The FAB's icon, by size.
    closeIconSize: sizeToken("iconMedium"),
    // The items: their height, padding, the gap between icon and label, and between items.
    itemHeight: px(56),
    itemPaddingInline: spacing("6"),
    itemGap: spacing("2"),
    itemRadius: radius("full"),
    gap: spacing("1"),
    listGap: spacing("2"),
    ...groupTokens(DEFAULT_GROUP),
    ...INDICATION_TOKENS,
});

const EXPANDED = slot("closeTrigger", "expanded");

/** How long each item waits after the one before it: the items enter from the one nearest the
 *  FAB outward, and leave in reverse, as Compose's `FloatingActionButtonMenu` staggers them. */
export const FAB_MENU_STAGGER = duration("short1");

/** How many items stagger: the rest share the last one's wait. The list holds until the last
 *  of these has left, so a menu of fewer waits that bit longer to hide. */
export const FAB_MENU_STAGGERED = 8;

const wait = (index: number) =>
    index === 0 ? undefined : mul(FAB_MENU_STAGGER, unitless(index));

const OPEN = "&[data-state=open]";
const CLOSED = "&[data-state=closed]";

// The items as the list's children, which the machine gives no state of their own: the nearest
// the FAB (the last) enters first, the farthest (the first) leaves first.
const staggered = (): Record<string, StyleMap> => {
    const rules: Record<string, StyleMap> = {};
    for (let index = 0; index < FAB_MENU_STAGGERED; index++) {
        const last = index === FAB_MENU_STAGGERED - 1;
        const delay = wait(index);
        const motion = overlayMotion({
            enter: { ...POPUP_MOTION.enter, ...(delay ? { delay } : {}) },
            exit: { ...POPUP_MOTION.exit, ...(delay ? { delay } : {}) },
        }).rawRules!.css as Record<string, StyleMap>;
        rules[
            `${OPEN} > :nth-last-child(${last ? `n+${index + 1}` : index + 1})`
        ] = motion[OPEN]!;
        rules[
            `${CLOSED} > :nth-child(${last ? `n+${index + 1}` : index + 1})`
        ] = motion[CLOSED]!;
    }
    return rules;
};

// The list itself only holds still, until the last item has left.
const LIST_MOTION = overlayMotion({
    enter: { keyframes: "overlayHold", spring: "spatialFast" },
    exit: {
        keyframes: "overlayHold",
        spring: "spatialFast",
        delay: mul(FAB_MENU_STAGGER, unitless(FAB_MENU_STAGGERED - 1)),
    },
});

const pf = typed();

/** Build the FAB menu with a `color` variant per group in `groups`. */
export const createFabMenu = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "fabMenu",
            $meta: {
                description:
                    "M3 Expressive FAB menu: the FAB (closeTrigger, aria-expanded while open) turns into a round close button, and the menu's items (in list, the menu's content) stack above it, each a pill with an icon and a label.",
            },
            tokens,
            slots: [
                "root",
                "list",
                "item",
                "itemIcon",
                "itemLabel",
                "closeTrigger",
            ],
            structure: {
                root: ["list", "closeTrigger"],
                list: ["item"],
                item: ["itemIcon", "itemLabel"],
            },
            indication: [
                {
                    trigger: "closeTrigger",
                    surface: "closeTrigger",
                    centered: false,
                    focus: "closeTrigger",
                },
                {
                    trigger: "item",
                    surface: "item",
                    centered: false,
                    focus: "item",
                },
            ],
            variants: {
                color: groups as ColorGroups,
                size: keysOf(SIZES),
            },
            recipe: () => ({
                base: {
                    // Over the page, with the list it opens.
                    root: {
                        ...INDICATION_ROOT,
                        zIndex: zIndex("menu"),
                        position: relative,
                        display: inlineFlex,
                    },
                    // Above the FAB, at its end, in either direction.
                    list: {
                        position: absolute,
                        insetBlockEnd: pct(100),
                        insetInlineEnd: px(0),
                        marginBlockEnd: ref("listGap"),
                        rawRules: {
                            css: {
                                ...LIST_MOTION.rawRules!.css,
                                ...staggered(),
                            },
                        },
                        zIndex: zIndex("menu"),
                        display: flex,
                        flexDirection: column,
                        alignItems: end,
                        gap: ref("gap"),
                    },
                    closeTrigger: {
                        ...pressableRoot(ref),
                        transition: spatialCornerTransition,
                        fontSize: ref("closeIconSize"),
                        backgroundColor: slotStateLayer(
                            ref,
                            "closeTrigger",
                            {
                                base: ref("accentContainer"),
                                content: ref("onAccentContainer"),
                            },
                            {
                                state: EXPANDED,
                                base: ref("accent"),
                                content: ref("onAccent"),
                            },
                        ),
                        color: when(
                            EXPANDED,
                            ref("onAccent"),
                            ref("onAccentContainer"),
                        ),
                        apply: { shadowElevation: "level3" },
                        states: {
                            ...pressableRoot(ref).states,
                            hover: { apply: { shadowElevation: "level4" } },
                        },
                    },
                    item: {
                        ...pressableRoot(ref),
                        ...interactiveColors(
                            ref,
                            ref("accentContainer"),
                            ref("onAccentContainer"),
                        ),
                        minHeight: ref("itemHeight"),
                        gap: ref("itemGap"),
                        paddingInlineStart: ref("itemPaddingInline"),
                        paddingInlineEnd: ref("itemPaddingInline"),
                        borderRadius: ref("itemRadius"),
                        textStyle: textStyle("titleMedium"),
                    },
                    itemIcon: iconBox(ref("iconSize")),
                    itemLabel: { textStyle: textStyle("titleMedium") },
                },
                variants: {
                    color: colorTokenVariants(groups),
                    size: Object.fromEntries(
                        entriesOf(SIZES).map(([name, f]) => [
                            name,
                            {
                                root: { tokens: { closeIconSize: f.icon } },
                                closeTrigger: {
                                    // Round once open.
                                    borderRadius: when(
                                        EXPANDED,
                                        ref("closeRadius"),
                                        ref(sizeTokenName("radius", name)),
                                    ),
                                    width: ref(sizeTokenName("size", name)),
                                    height: ref(sizeTokenName("size", name)),
                                },
                            },
                        ]),
                    ),
                },
                defaultVariants: { color: DEFAULT_GROUP, size: "default" },
            }),
        }),
    );

export const fabMenu = createFabMenu();
