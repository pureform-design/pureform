// The pureform supporting text: the small helper or error line under a control.
//
// `tone` sets its color: any color group, such as `error` for an error, `success` for a saved
// state, or `warning` for a warning. Whoever knows the state sets it, the same way on
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
    errorColor: colorRole("error"),
});

/** Build the supporting text with `neutral` and a `tone` per group in `groups`. `error` reads
 *  the `errorColor` token, so it can be restyled on its own. */
export const createSupportingText = (groups: ColorGroups = COLOR_GROUPS) =>
    defineComponent({
        name: "supportingText",
        $meta: {
            description:
                "Helper or error text under a control. tone sets its color: any color group, such as error.",
        },
        tokens,
        recipe: {
            base: { ...supportingTextStyle, color: ref("color") },
            variants: {
                tone: {
                    neutral: {},
                    error: { color: ref("errorColor") },
                    ...Object.fromEntries(
                        groups
                            .filter((group) => group !== "error")
                            .map((group) => [group, { color: sys(group) }]),
                    ),
                },
            },
            defaultVariants: { tone: "neutral" },
        },
    });

export const supportingText = createSupportingText();
