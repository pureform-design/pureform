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
import { column, flex, pct, px, start } from "@pureform/core/ast";
import { spacing, textStyle } from "@pureform/theme";

import { rowParts, rowTokens } from "./list";

const { tokens, ref } = rowTokens("listItem", {
    paddingInline: spacing("4"),
    gap: spacing("4"),
    heightOne: px(56),
    heightTwo: px(72),
    heightThree: px(88),
});

const parts = rowParts(ref, "root");

const lines = (height: "heightOne" | "heightTwo" | "heightThree") => ({
    root: { minHeight: ref(height) },
});

export const listItem = defineSlotComponent({
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
                        minHeight: ref("heightThree"),
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
        },
        defaultVariants: { lines: "one", interactive: "false" },
    },
});
