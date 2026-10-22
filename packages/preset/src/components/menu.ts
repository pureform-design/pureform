// The pureform menu: Material's menu surface and its items.
//
// The items share the list item's row: a leading icon, the label (with supporting text under it,
// in `itemContent`), and a trailing icon or text (a keyboard shortcut). Items can sit in groups
// (`itemGroup`), each with an optional label (`itemGroupLabel`); `grouped` draws each group as
// its own tile, the run's outside corners rounded. Or separate groups with the separator
// component.
//
//   <div class={root} role="menu">
//     <div class={itemGroup} role="group" aria-labelledby="edit">
//       <span class={itemGroupLabel} id="edit">Edit</span>
//       <button class={item} role="menuitem">
//         <span class={itemLeading}>✂</span>
//         <span class={itemContent}>
//           <span class={itemLabel}>Cut</span>
//           <span class={itemSupportingText}>To the clipboard</span>
//         </span>
//         <span class={itemTrailingText}>⌘X</span>
//       </button>
//     </div>
//   </div>
//
// Mark the chosen item with `aria-selected` (or `aria-checked` for a toggleable one), and an
// unavailable one with `disabled` or `aria-disabled`. An item that opens a submenu holds an arrow
// in `itemTrailing` (mirrored under `rtl`), and the submenu is another menu. It stacks at the theme's `menu` layer, and grows in from the
// side it opens on while Zag's `data-state` is `open`.

import { typed } from "@pureform/core";
import {
    column,
    flex,
    hidden,
    platform,
    visible,
    pct,
    px,
    start,
    add,
    transparent,
} from "@pureform/core/ast";
import { radius, spacing, textStyle, zIndex } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { rowGroupColors, rowParts, rowTokens } from "./list";
import { overlayMotion, POPUP_MOTION } from "./overlay";
import {
    DEFAULT_GROUP,
    colorVariant,
    defaultDensities,
    defaultGroups,
    dense,
    densitySteps,
    densityVariant,
    INDICATION_ROOT,
    surface,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";
import { TILE_RADII } from "./tiles";

const pf = typed();

const { tokens, ref } = rowTokens("menu", {
    container: sys("surfaceContainer"),
    radius: radius("extraSmall"),
    paddingBlock: spacing("2"),
    minWidth: px(112),
    maxWidth: px(280),
    itemHeight: px(48),
    itemPaddingInline: spacing("3"),
    gap: spacing("3"),
    // A grouped menu's tiles: the gap between them, and their corners.
    groupGap: px(2),
    ...TILE_RADII,
    // The vibrant colors.
    vibrantContainer: sys("tertiaryContainer"),
    vibrantContent: sys("onTertiaryContainer"),
    vibrantSelectedContainer: sys("tertiary"),
    vibrantSelectedContent: sys("onTertiary"),
});

const CHOSEN = ["selected", "checked"] as const;

const parts = rowParts(ref, "item", undefined, CHOSEN);

/** Build the menu with a `color` variant per group in `groups`. A group colors the selected
 *  item with the group's container. */
export const createMenu = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
        pf.slotComponent({
            name: "menu",
            $meta: {
                description:
                    "Material menu and its items, optionally in labelled groups (grouped draws them as tiles). Mark the chosen item with aria-selected or aria-checked; vibrant swaps to the tertiary colors.",
            },
            tokens,
            slots: [
                "root",
                "itemGroup",
                "itemGroupLabel",
                "item",
                "itemLeading",
                "itemContent",
                "itemLabel",
                "itemSupportingText",
                "itemTrailing",
                "itemTrailingText",
            ],
            structure: {
                root: ["itemGroup", "item"],
                itemGroup: ["itemGroupLabel"],
                item: [
                    "itemLeading",
                    "itemContent",
                    "itemTrailing",
                    "itemTrailingText",
                ],
                itemContent: ["itemLabel", "itemSupportingText"],
            },
            // Each item, and each of a select's options, which the menu draws. A highlighted
            // item shows as hovered.
            indication: [
                {
                    trigger: "item",
                    surface: "item",
                    centered: false,
                    focus: "item",
                },
            ],
            variants: {
                density: densitySteps<string>(densities),
                color: groups as ColorGroups,
                vibrant: ["true", "false"],
                grouped: ["true", "false"],
            },
            recipe: () => ({
                base: {
                    root: {
                        ...INDICATION_ROOT,
                        ...surface(ref("container"), ref("content"), "level2"),
                        ...overlayMotion({ ...POPUP_MOTION, fromAnchor: true }),
                        zIndex: zIndex("menu"),
                        display: flex,
                        flexDirection: column,
                        borderRadius: ref("radius"),
                        paddingBlockStart: ref("paddingBlock"),
                        paddingBlockEnd: ref("paddingBlock"),
                        minWidth: ref("minWidth"),
                        maxWidth: ref("maxWidth"),
                    },
                    item: {
                        ...parts.row,
                        ...parts.interactive,
                        gap: ref("gap"),
                        width: pct(100),
                        minHeight: dense(ref("itemHeight")),
                        paddingInlineStart: ref("itemPaddingInline"),
                        paddingInlineEnd: ref("itemPaddingInline"),
                        borderWidth: px(0),
                        justifyContent: start,
                    },
                    itemGroup: { display: flex, flexDirection: column },
                    itemGroupLabel: {
                        textStyle: textStyle("labelMedium"),
                        color: ref("supportingColor"),
                        paddingInlineStart: ref("itemPaddingInline"),
                        paddingInlineEnd: ref("itemPaddingInline"),
                        paddingBlockStart: spacing("2"),
                        paddingBlockEnd: spacing("2"),
                    },
                    itemLeading: parts.leading,
                    // The label and the supporting text under it, when there is some.
                    itemContent: {
                        display: flex,
                        flexDirection: column,
                        width: pct(100),
                        paddingBlockStart: spacing("2"),
                        paddingBlockEnd: spacing("2"),
                    },
                    itemSupportingText: {
                        ...parts.supportingText,
                        textAlign: start,
                    },
                    itemLabel: {
                        textStyle: textStyle("labelLarge"),
                        width: pct(100),
                        textAlign: start,
                    },
                    itemTrailing: parts.trailing,
                    itemTrailingText: parts.trailingText("labelLarge"),
                },
                variants: {
                    density: densityVariant(densities, (offset) => ({
                        item: { minHeight: add(ref("itemHeight"), offset) },
                    })),
                    color: colorVariant(groups, (g) => {
                        const c = rowGroupColors(ref, "item", g, CHOSEN);
                        return {
                            item: c.interactive,
                            itemLeading: c.leading,
                            itemTrailing: c.trailing,
                            itemSupportingText: c.supportingText,
                        };
                    }),
                    // Material's vibrant menu: the surface and its parts in the tertiary
                    // container's colors, a chosen item in the tertiary's.
                    vibrant: {
                        true: {
                            root: {
                                tokens: {
                                    container: ref("vibrantContainer"),
                                    content: ref("vibrantContent"),
                                    supportingColor: ref("vibrantContent"),
                                    iconColor: ref("vibrantContent"),
                                    trailingColor: ref("vibrantContent"),
                                    selectedContainer: ref(
                                        "vibrantSelectedContainer",
                                    ),
                                    selectedContent: ref(
                                        "vibrantSelectedContent",
                                    ),
                                },
                            },
                        },
                        false: {},
                    },
                    // Each group a tile of the surface, apart from the next, the run's outside
                    // corners round. On the web the first and last groups (the machine marks
                    // them `data-first`/`data-last`) round them, so the menu doesn't clip, and a
                    // submenu drawn inside it shows whole; React Native (whose submenus drill in)
                    // clips them.
                    grouped: {
                        true: {
                            root: {
                                backgroundColor: transparent,
                                borderRadius: ref("outerRadius"),
                                overflow: platform({ css: visible }, hidden),
                                gap: ref("groupGap"),
                                paddingBlockStart: px(0),
                                paddingBlockEnd: px(0),
                            },
                            itemGroup: {
                                backgroundColor: ref("container"),
                                borderRadius: ref("innerRadius"),
                                paddingBlockStart: ref("paddingBlock"),
                                paddingBlockEnd: ref("paddingBlock"),
                                rawRules: {
                                    css: {
                                        "&[data-first]": {
                                            borderStartStartRadius:
                                                ref("outerRadius"),
                                            borderStartEndRadius:
                                                ref("outerRadius"),
                                        },
                                        "&[data-last]": {
                                            borderEndStartRadius:
                                                ref("outerRadius"),
                                            borderEndEndRadius:
                                                ref("outerRadius"),
                                        },
                                    },
                                },
                            },
                        },
                        false: {},
                    },
                },
                defaultVariants: {
                    color: DEFAULT_GROUP,
                    density: "inherit",
                    vibrant: "false",
                    grouped: "false",
                },
            }),
        }),
    );

export const menu = createMenu();
