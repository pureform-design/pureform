// The pureform list item: Material's one-, two-, and three-line list items.
//
// Markup: a row holding an optional leading icon, the text, and an optional trailing icon or
// text. Inside the text, an optional overline, the headline, and optional supporting text.
//
//   <li class={root}>
//     <span class={leading}>★</span>
//     <div class={content}>
//       <span class={headline}>Headline</span>
//       <span class={supportingText}>Supporting text</span>
//     </div>
//     <span class={trailingText}>100+</span>
//   </li>
//
// Set `interactive` when the item is clickable (a button or link, or `tabindex`); it then takes
// a state layer and the focus ring. Mark it selected with `aria-selected` or `data-selected`.

import { defineSlotComponent } from "@pureform/core";
import { column, flex, pct, px, start, add } from "@pureform/core/ast";
import { spacing, textStyle } from "@pureform/theme";

import { rowGroupColors, rowParts, rowTokens } from "./list";
import {
    COLOR_GROUPS,
    DEFAULT_GROUP,
    colorVariant,
    groupRoles,
    dense,
    densityCompounds,
    densityMarkers,
    DEFAULT_DENSITIES,
} from "./shared";
import type { ColorGroups, Densities } from "./shared";

const { tokens, ref } = rowTokens("listItem", {
    paddingInline: spacing("4"),
    gap: spacing("4"),
    heightOne: px(56),
    heightTwo: px(72),
    heightThree: px(88),
});

const parts = rowParts(ref, "root");

type LineHeight = "heightOne" | "heightTwo" | "heightThree";

const LINES: Record<string, LineHeight> = {
    one: "heightOne",
    two: "heightTwo",
    three: "heightThree",
};

const lines = (height: LineHeight) => ({
    root: { minHeight: dense(ref(height)) },
});

/** Build the list item with a `color` variant per group in `groups`. A group colors the
 *  selected item and its parts with the group's container; at rest, every item is neutral. */
export const createListItem = (
    groups: ColorGroups = COLOR_GROUPS,
    densities: Densities = DEFAULT_DENSITIES,
) =>
    defineSlotComponent({
        name: "listItem",
        $meta: {
            description:
                "Material list item. Set lines to the number of text lines, and interactive when it is clickable. Mark it selected with aria-selected or data-selected.",
        },
        tokens,
        slots: [
            "root",
            "leading",
            "content",
            "overline",
            "headline",
            "supportingText",
            "trailing",
            "trailingText",
        ],
        structure: {
            root: ["leading", "content", "trailing", "trailingText"],
            content: ["overline", "headline", "supportingText"],
        },
        recipe: {
            base: {
                root: {
                    ...parts.row,
                    gap: ref("gap"),
                    paddingInlineStart: ref("paddingInline"),
                    paddingInlineEnd: ref("paddingInline"),
                    paddingBlockStart: spacing("2"),
                    paddingBlockEnd: spacing("2"),
                },
                leading: parts.leading,
                content: {
                    display: flex,
                    flexDirection: column,
                    width: pct(100),
                },
                overline: {
                    textStyle: textStyle("labelSmall"),
                    color: parts.supportingText.color,
                },
                headline: { textStyle: textStyle("bodyLarge") },
                supportingText: parts.supportingText,
                trailing: parts.trailing,
                trailingText: parts.trailingText("labelSmall"),
            },
            variants: {
                lines: {
                    one: lines("heightOne"),
                    two: lines("heightTwo"),
                    // Material tops the leading and trailing parts in a three-line item.
                    three: {
                        root: {
                            minHeight: dense(ref("heightThree")),
                            alignItems: start,
                            paddingBlockStart: spacing("3"),
                            paddingBlockEnd: spacing("3"),
                        },
                    },
                },
                interactive: {
                    true: { root: parts.interactive },
                    false: {},
                },
                density: densityMarkers(densities),
                color: colorVariant(groups, (g) => {
                    const c = rowGroupColors(ref, "root", g);
                    return {
                        root: c.row,
                        leading: c.leading,
                        trailing: c.trailing,
                        overline: c.supportingText,
                        supportingText: c.supportingText,
                    };
                }),
            },
            // An interactive item's selected colors sit in the interactive variant, so a compound
            // variant per group replaces them in the later layer.
            compoundVariants: [
                ...groups
                    .filter((group) => group !== DEFAULT_GROUP)
                    .map((group) => ({
                        match: { interactive: "true", color: group },
                        style: {
                            root: rowGroupColors(ref, "root", groupRoles(group))
                                .interactive,
                        },
                    })),
                ...Object.entries(LINES).flatMap(([count, height]) =>
                    densityCompounds(densities, { lines: count }, (offset) => ({
                        root: { minHeight: add(ref(height), offset) },
                    })),
                ),
            ],
            defaultVariants: {
                lines: "one",
                interactive: "false",
                color: DEFAULT_GROUP,
                density: "inherit",
            },
        },
    });

export const listItem = createListItem();
