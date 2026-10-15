// The pureform supporting text: the small helper or error line under a control.
//
// `tone` sets its color: `error` for an error, or any color group (`positive` for a saved
// state, `notice` for a warning, and so on). Whoever knows the state sets it, the same way on
// every target. Inside a text field, use its own supporting text slot, which follows the
// field's state and shares this style.

import { defineComponent } from "@pureform/core";
import { column, flex } from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { colorRole, spacing, textStyle } from "@pureform/theme";

import { COLOR_GROUPS, componentTokens, sys } from "./shared";
import type { ColorGroups } from "./shared";

/** Supporting text's type and spacing. It takes a line of its own even as a span; core has no
 *  portable `block`, and a flex column is the same box on the web. */
export const supportingTextStyle: StyleMap = {
    display: flex,
    flexDirection: column,
    textStyle: textStyle("bodySmall"),
    paddingBlockStart: spacing("1"),
};

const { tokens, ref } = componentTokens("supportingText", {
    color: sys("onSurfaceVariant"),
    errorColor: colorRole("negative"),
});

/** Build the supporting text with a `tone` per group in `groups`, plus `neutral` and
 *  `error`. */
export const createSupportingText = (groups: ColorGroups = COLOR_GROUPS) =>
    defineComponent({
        name: "supportingText",
        $meta: {
            description:
                "Helper or error text under a control. tone sets its color: error, or any color group.",
        },
        tokens,
        recipe: {
            base: { ...supportingTextStyle, color: ref("color") },
            variants: {
                tone: {
                    neutral: {},
                    error: { color: ref("errorColor") },
                    ...Object.fromEntries(
                        groups.map((group) => [group, { color: sys(group) }]),
                    ),
                },
            },
            defaultVariants: { tone: "neutral" },
        },
    });

export const supportingText = createSupportingText();
