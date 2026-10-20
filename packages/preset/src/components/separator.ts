// The pureform separator: Material's divider, a thin line between groups of content.
//
// Named for the ARIA separator role, since Panda already has a divider pattern and names the
// generated recipe after the component.
//
// Use an `<hr>` (it carries the separator role) or any element with `role="separator"`.
// `inset` indents it from the start (`start`, past a list item's leading icon) or from both
// sides (`middle`).

import { typed } from "@pureform/core";
import { mul, pct, px, stretch, unitless } from "@pureform/core/ast";
import { spacing } from "@pureform/theme";

import { componentTokens, sys } from "./shared";

const { tokens, ref } = componentTokens("separator", {
    thickness: px(1),
    color: sys("outlineVariant"),
    inset: spacing("4"),
    // The `inset` variant's flags: whether the start, and the end, indent.
    insetStart: unitless(0),
    insetEnd: unitless(0),
});

const pf = typed();

export const separator = pf.component({
    name: "separator",
    $meta: {
        description:
            "Material divider. Use an hr; inset indents it from the start or both sides.",
    },
    tokens,
    variants: {
        inset: ["none", "start", "middle"],
        orientation: ["horizontal", "vertical"],
    },
    recipe: () => ({
        base: {
            // An hr draws a border by default; this is a filled line of the token's color.
            borderWidth: px(0),
            height: ref("thickness"),
            backgroundColor: ref("color"),
            marginBlockStart: px(0),
            marginBlockEnd: px(0),
        },
        variants: {
            // `inset` sets which ends indent, as flags; `orientation` reads them along its own
            // axis, so neither needs a compound with the other.
            inset: {
                none: {},
                start: { tokens: { insetStart: unitless(1) } },
                middle: {
                    tokens: { insetStart: unitless(1), insetEnd: unitless(1) },
                },
            },
            orientation: {
                horizontal: {
                    marginInlineStart: mul(ref("inset"), ref("insetStart")),
                    marginInlineEnd: mul(ref("inset"), ref("insetEnd")),
                },
                // A vertical divider stands between items in a row, as tall as the row.
                vertical: {
                    height: pct(100),
                    width: ref("thickness"),
                    alignSelf: stretch,
                    marginBlockStart: mul(ref("inset"), ref("insetStart")),
                    marginBlockEnd: mul(ref("inset"), ref("insetEnd")),
                },
            },
        },
        defaultVariants: { inset: "none", orientation: "horizontal" },
    }),
});
