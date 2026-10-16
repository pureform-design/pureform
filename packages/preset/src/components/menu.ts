// The pureform menu: Material's menu surface and its items.
//
// The items share the list item's row: a leading icon, the label, and a trailing icon or text
// (a keyboard shortcut). Separate groups with the separator component.
//
//   <div class={root} role="menu">
//     <button class={item} role="menuitem">
//       <span class={itemLeading}>✂</span>
//       <span class={itemLabel}>Cut</span>
//       <span class={itemTrailingText}>⌘X</span>
//     </button>
//     <hr class={separator()} />
//   </div>
//
// Mark the chosen item with `aria-selected`, and an unavailable one with
// `disabled` or `aria-disabled`.

import { typed } from "@pureform/core";
import { column, flex, pct, px, start, add } from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { rowGroupColors, rowParts, rowTokens } from "./list";
import {
    DEFAULT_GROUP,
    colorVariant,
    defaultDensities,
    defaultGroups,
    dense,
    densitySteps,
    densityVariant,
    surface,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

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
});

const parts = rowParts(ref, "item");

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
                    "Material menu and its items. Separate groups with the separator component; mark the chosen item with aria-selected.",
            },
            tokens,
            slots: [
                "root",
                "item",
                "itemLeading",
                "itemLabel",
                "itemTrailing",
                "itemTrailingText",
            ],
            structure: {
                root: ["item"],
                item: [
                    "itemLeading",
                    "itemLabel",
                    "itemTrailing",
                    "itemTrailingText",
                ],
            },
            variants: {
                density: densitySteps<string>(densities),
                color: groups as ColorGroups,
            },
            recipe: () => ({
                base: {
                    root: {
                        ...surface(ref("container"), ref("content"), "level2"),
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
                        height: dense(ref("itemHeight")),
                        paddingInlineStart: ref("itemPaddingInline"),
                        paddingInlineEnd: ref("itemPaddingInline"),
                        borderWidth: px(0),
                        justifyContent: start,
                    },
                    itemLeading: parts.leading,
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
                        item: { height: add(ref("itemHeight"), offset) },
                    })),
                    color: colorVariant(groups, (g) => {
                        const c = rowGroupColors(ref, "item", g);
                        return {
                            item: c.interactive,
                            itemLeading: c.leading,
                            itemTrailing: c.trailing,
                        };
                    }),
                },
                defaultVariants: { color: DEFAULT_GROUP, density: "inherit" },
            }),
        }),
    );

export const menu = createMenu();
