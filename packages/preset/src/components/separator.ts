// The pureform separator: Material's divider, a thin line between groups of content.
//
// Named for the ARIA separator role, since Panda already has a divider pattern and names the
// generated recipe after the component.
//
// Use an `<hr>` (it carries the separator role) or any element with `role="separator"`.
// `inset` indents it from the start (`start`, past a list item's leading icon) or from both
// sides (`middle`).

import { defineComponent } from "@pureform/core";
import { px } from "@pureform/core/ast";
import { spacing } from "@pureform/theme";

import { componentTokens, sys } from "./shared";

const { tokens, ref } = componentTokens("separator", {
    thickness: px(1),
    color: sys("outlineVariant"),
    inset: spacing("4"),
});

export const separator = defineComponent({
    name: "separator",
    $meta: {
        description:
            "Material divider. Use an hr; inset indents it from the start or both sides.",
    },
    tokens,
    recipe: {
        base: {
            // An hr draws a border by default; this is a filled line of the token's color.
            borderWidth: px(0),
            height: ref("thickness"),
            backgroundColor: ref("color"),
            marginBlockStart: px(0),
            marginBlockEnd: px(0),
        },
        variants: {
            inset: {
                none: {},
                start: { marginInlineStart: ref("inset") },
                middle: {
                    marginInlineStart: ref("inset"),
                    marginInlineEnd: ref("inset"),
                },
            },
        },
        defaultVariants: { inset: "none" },
    },
});
