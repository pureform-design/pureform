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
    max,
    min,
    mul,
    numeric,
    pct,
    px,
    relative,
    slot,
    sub,
    unitless,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import {
    radius,
    size as sizeToken,
    spacing,
    textStyle,
    zIndex,
} from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import { FAB_SIZES } from "./fab";
import { overlayMotion, POPUP_MOTION } from "./overlay";
import type { OverlayMotion } from "./overlay";
import { spatialCornerTransition } from "./shared";
import {
    DEFAULT_GROUP,
    colorTokenVariants,
    componentTokens,
    defaultGroups,
    entriesOf,
    groupTokens,
    iconBox,
    indicationRoot,
    OWN_SIZE,
    interactiveColors,
    keysOf,
    pressableRoot,
    sizeTokenName,
    sizeTokens,
    slotStateLayer,
    variantsOf,
    pillRadius,
    PILL_RADIUS_TOKEN,
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
    ...PILL_RADIUS_TOKEN,
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
    // How many items the list holds, which the bindings set, so the list's exit holds exactly
    // until its last item has left.
    itemCount: unitless(8),
    // Whether the items stagger: 1 once the count is known, 0 until then, so a composed menu
    // renders unstaggered on the server and its first client frame.
    staggering: unitless(0),
    ...groupTokens(DEFAULT_GROUP),
    ...INDICATION_TOKENS,
});

const EXPANDED = slot("closeTrigger", "expanded");

/** How long each item waits after the one before it: the items enter from the one nearest the
 *  FAB outward, and leave in reverse. Compose's `FloatingActionButtonMenu` (androidx-main
 *  `FloatingActionButtonMenu.kt`) has no fixed step: it runs an item count from 0 to the number
 *  of items on the `SlowEffects` spring (stiffness 800, critically damped) and shows each item as
 *  the count passes it, so the gaps run about 15ms to 50ms and the whole stagger 90ms (3 items) to
 *  150ms (8). 25ms a step is that, evenly spaced. */
export const FAB_MENU_STAGGER = numeric(25, "ms");

/** How many items stagger: the rest share the last one's wait. Compose has no cap; CSS needs one
 *  for its `nth-child` rules, and eight is past M3's six items a menu holds at most. */
export const FAB_MENU_STAGGERED = 8;

const wait = (index: number) =>
    index === 0
        ? undefined
        : mul(FAB_MENU_STAGGER, ref("staggering"), unitless(index));

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
            enter: {
                ...FAB_MENU_ITEM_MOTION.enter,
                ...(delay ? { wait: delay } : {}),
            },
            exit: {
                ...FAB_MENU_ITEM_MOTION.exit,
                ...(delay ? { wait: delay } : {}),
            },
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

/** The list itself only holds still: its presence waits for the items, which move. */
export const FAB_MENU_LIST_MOTION = {
    enter: { keyframes: "overlayHold", spring: "spatialFast" },
    exit: { keyframes: "overlayHold", spring: "spatialFast" },
} as const satisfies OverlayMotion;

/** Each item grows and fades in as a popup does (and shrinks as it leaves), after its wait. */
export const FAB_MENU_ITEM_MOTION = POPUP_MOTION;

// The list leaves once the last staggered item has: `itemCount` (the bindings set it) less one
// steps, at most the staggered ones. It has no enter animation: Zag's presence waits for an exit
// whose animation differs from the one the surface had open, so one that held still on the way in
// too would be gone at once.
const LIST_EXIT = overlayMotion({
    ...FAB_MENU_LIST_MOTION,
    exit: {
        ...FAB_MENU_LIST_MOTION.exit,
        wait: mul(
            FAB_MENU_STAGGER,
            ref("staggering"),
            max(
                sub(
                    min(ref("itemCount"), unitless(FAB_MENU_STAGGERED)),
                    unitless(1),
                ),
                unitless(0),
            ),
        ),
    },
}).rawRules!.css![CLOSED]!;

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
                        ...indicationRoot(ref),
                        ...OWN_SIZE,
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
                                [CLOSED]: LIST_EXIT,
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
                                root: {
                                    tokens: {
                                        closeIconSize: f.icon,
                                        closeRadius: pillRadius(
                                            "fabMenu",
                                            ref(sizeTokenName("size", name)),
                                        ),
                                    },
                                },
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
