// The pureform supporting text: the small helper or error line under a control.
//
// It turns to the error color when its parent holds an input marked `aria-invalid="true"`,
// and dims when its parent holds a disabled control, so it follows a text field, a checkbox,
// or any field it sits beside. `tone: "error"` sets the error color directly. The text field
// draws its own supporting text from the same style.

import { defineComponent } from "@pureform/core";
import { column, flex, rawCondition, when } from "@pureform/core/ast";
import type { ColorValue, StyleMap } from "@pureform/core/ast";
import { colorRole, spacing, textStyle } from "@pureform/theme";

import { componentTokens, disabledColor, sys } from "./shared";

/** An input marked invalid. The attribute repeats so a rule keyed on it outranks focus. */
export const INVALID_INPUT = "[aria-invalid=true][aria-invalid=true]";

/** Supporting text that follows its parent's error and disabled states. */
export const supportingTextStyle = (colors: {
    rest: ColorValue;
    error: ColorValue;
}): StyleMap => ({
    // A line of its own, even as a span. Core has no portable `block`; a flex column is the
    // same box on the web.
    display: flex,
    flexDirection: column,
    textStyle: textStyle("bodySmall"),
    paddingBlockStart: spacing("1"),
    color: when()
        .on(rawCondition({ css: `:has(${INVALID_INPUT}) > &` }), colors.error)
        .on(
            rawCondition({ css: ":has(:disabled) > &" }),
            disabledColor("disabledContent"),
        )
        .else(colors.rest),
});

const { tokens, ref } = componentTokens("supportingText", {
    color: sys("onSurfaceVariant"),
    errorColor: colorRole("negative"),
});

export const supportingText = defineComponent({
    name: "supportingText",
    $meta: {
        description:
            "Helper or error text under a control. Follows its parent's aria-invalid and disabled states; tone: error forces the error color.",
    },
    tokens,
    recipe: {
        base: supportingTextStyle({
            rest: ref("color"),
            error: ref("errorColor"),
        }),
        variants: {
            tone: {
                neutral: {},
                error: { color: ref("errorColor") },
            },
        },
        defaultVariants: { tone: "neutral" },
    },
});
