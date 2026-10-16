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
// a state layer and the focus ring. Mark it selected with `aria-selected` or `aria-current`.

import { typed } from "@pureform/core";
import { column, flex, pct, px, start, add } from "@pureform/core/ast";
import { spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { rowParts, rowTokens } from "./list";
import {
    DEFAULT_GROUP,
    colorVariant,
    defaultDensities,
    defaultGroups,
    DENSITY_TOKEN,
    densityTokenVariant,
    densitySteps,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const pf = typed();

const { tokens, ref } = rowTokens("listItem", {
    paddingInline: spacing("4"),
    gap: spacing("4"),
    heightOne: px(56),
    heightTwo: px(72),
    heightThree: px(88),
    ...DENSITY_TOKEN,
});

const parts = rowParts(ref, "root");

type LineHeight = "heightOne" | "heightTwo" | "heightThree";

const lines = (height: LineHeight) => ({
    root: { minHeight: add(ref(height), ref("densityOffset")) },
});

/** Build the list item with a `color` variant per group in `groups`. A group colors the
 *  selected item and its parts with the group's container; at rest, every item is neutral. */
export const createListItem = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
        pf.slotComponent({
            name: "listItem",
            $meta: {
                description:
                    "Material list item. Set lines to the number of text lines, and interactive when it is clickable. Mark it selected with aria-selected or aria-current.",
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
            variants: {
                lines: ["one", "two", "three"],
                interactive: ["true", "false"],
                density: densitySteps<string>(densities),
                color: groups as ColorGroups,
            },
            recipe: () => ({
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
                                minHeight: add(
                                    ref("heightThree"),
                                    ref("densityOffset"),
                                ),
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
                    density: densityTokenVariant(densities),
                    // A group points the selected colors, which the row and its parts read,
                    // at its container roles.
                    color: colorVariant(groups, (g) => ({
                        root: {
                            tokens: {
                                selectedContainer: g.container,
                                selectedContent: g.onContainer,
                            },
                        },
                    })),
                },
                defaultVariants: {
                    lines: "one",
                    interactive: "false",
                    color: DEFAULT_GROUP,
                    density: "inherit",
                },
            }),
        }),
    );

export const listItem = createListItem();
