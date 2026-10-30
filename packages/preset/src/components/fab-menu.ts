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
    literal,
    numeric,
    pct,
    px,
    relative,
    slot,
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
import { overlayMotion } from "./overlay";
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
    // How long an item waits before it enters or leaves, and how long the list waits for its last
    // item: the bindings sample them from the theme's slow effects spring (`animate-web`'s
    // `stagger`) once they know the spring, and write each item its own. Until then they are 0, so
    // a menu renders unstaggered on the server and its first client frame.
    staggerDelay: numeric(0, "ms"),
    staggerTotal: numeric(0, "ms"),
    ...groupTokens(DEFAULT_GROUP),
    ...INDICATION_TOKENS,
});

const EXPANDED = slot("closeTrigger", "expanded");

const OPEN = "&[data-state=open]";
const CLOSED = "&[data-state=closed]";

// The items as the list's children, which the machine gives no state of their own. Each waits its
// own `staggerDelay`, which the bindings write inline: the item nearest the FAB (the last) enters
// first and the farthest (the first) leaves first, on Compose's `SlowEffects` spring, which has no
// fixed step (`FloatingActionButtonMenu.kt` runs an item count from 0 to the number of items on
// it and shows each item as the count passes). Waiting a token rather than a rule per position
// means no cap on how many items stagger, and the theme's spring sets the spacing.
const staggered = (): Record<string, StyleMap> => {
    const wait = ref("staggerDelay");
    const motion = overlayMotion({
        enter: { ...FAB_MENU_ITEM_MOTION.enter, wait },
        exit: { ...FAB_MENU_ITEM_MOTION.exit, wait },
    }).rawRules!.css as Record<string, StyleMap>;
    return {
        [`${OPEN} > *`]: motion[OPEN]!,
        [`${CLOSED} > *`]: motion[CLOSED]!,
    };
};

/** The list itself only holds still: its presence waits for the items, which move. */
export const FAB_MENU_LIST_MOTION = {
    enter: { keyframes: "overlayHold", spring: "spatialFast" },
    exit: { keyframes: "overlayHold", spring: "spatialFast" },
} as const satisfies OverlayMotion;

// An item is revealed from the menu's aligned edge, as Compose's `FloatingActionButtonMenuItem`
// is: it is laid out at its full width and a width animation clips it, so its content is never
// squeezed, only uncovered. A clip shows the same thing as the width without laying the page out
// again each frame: each item is its own row, so no neighbor depends on its width. The rounded
// clip keeps the pill's end round as it grows. The aligned edge is the end one (the left under
// right to left, hence the `Rtl` frames).
const ROUND = "round var(--components-fabMenu-itemRadius)";
const SHOWN = literal(`inset(0 0 0 0 ${ROUND})`);
const HIDDEN = literal(`inset(0 0 0 100% ${ROUND})`);
const HIDDEN_RTL = literal(`inset(0 100% 0 0 ${ROUND})`);

/** The item reveal's keyframes; `pureform()` adds them to the config. */
export const FAB_MENU_KEYFRAMES: Record<string, Record<string, StyleMap>> = {
    fabMenuItemRevealIn: {
        from: { clipPath: HIDDEN },
        to: { clipPath: SHOWN },
    },
    fabMenuItemRevealOut: {
        from: { clipPath: SHOWN },
        to: { clipPath: HIDDEN },
    },
    fabMenuItemRevealInRtl: {
        from: { clipPath: HIDDEN_RTL },
        to: { clipPath: SHOWN },
    },
    fabMenuItemRevealOutRtl: {
        from: { clipPath: SHOWN },
        to: { clipPath: HIDDEN_RTL },
    },
};

/** Each item is revealed from the aligned edge on the fast spatial spring as it fades in on the
 *  fast effects spring (Compose's `FastSpatial` width and `FastEffects` alpha), after its wait,
 *  and leaves the same way back. */
export const FAB_MENU_ITEM_MOTION = {
    enter: {
        keyframes: "fabMenuItemRevealIn",
        rtl: "fabMenuItemRevealInRtl",
        spring: "spatialFast",
        fade: { spring: "effectsFast" },
    },
    exit: {
        keyframes: "fabMenuItemRevealOut",
        rtl: "fabMenuItemRevealOutRtl",
        spring: "spatialFast",
        fade: { spring: "effectsFast" },
    },
} as const satisfies OverlayMotion;

// The list leaves once the last item has: it waits the longest item wait (`staggerTotal`, which
// the bindings write), then runs its own hold. It has no enter animation: Zag's presence waits
// for an exit whose animation differs from the one the surface had open, so one that held still
// on the way in too would be gone at once.
const LIST_EXIT = overlayMotion({
    ...FAB_MENU_LIST_MOTION,
    exit: { ...FAB_MENU_LIST_MOTION.exit, wait: ref("staggerTotal") },
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
