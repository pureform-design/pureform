// The pureform text field: Material's filled and outlined single-line text fields.
//
// Markup: a root holding the container and the supporting text. Inside the container, the
// optional leading icon, the input, the label, and the optional trailing icon, in that order.
// The input needs a placeholder (a single space when none should show), so CSS can tell when
// it holds a value and float the label. Turn on `leadingIcon` or `trailingIcon` when you
// render one, so the text makes room for it.
//
//   <div class={root}>
//     <div class={container}>
//       <span class={leadingIcon}>…</span>
//       <input class={input} id="name" placeholder=" " />
//       <label class={label} for="name">Name</label>
//     </div>
//     <span class={supportingText}>Helper or error text</span>
//   </div>
//
// Mark an error with `aria-invalid="true"` on the input. The container reads its state from
// the input, and the label, icons, and supporting text follow it.

import { defineSlotComponent } from "@pureform/core";
import {
    absolute,
    pct,
    px,
    transform,
    translateY,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { spacing } from "@pureform/theme";

import {
    DISABLED,
    FIELD_SLOTS,
    INVALID,
    fieldParts,
    fieldTokens,
    floated,
} from "./field";
import {
    COLOR_GROUPS,
    DEFAULT_GROUP,
    disabledColor,
    sys,
    iconBox,
} from "./shared";
import type { ColorGroups } from "./shared";

const { tokens, ref } = fieldTokens("textField", {
    iconInset: spacing("3"),
    iconColor: sys("onSurfaceVariant"),
    // The icon inset, the icon, and the gap before the text.
    textInsetWithIcon: px(52),
});

const { base, variant, colors } = fieldParts(ref, { labelRest: pct(50) });

const icon = (side: "Start" | "End"): StyleMap => ({
    position: absolute,
    top: pct(50),
    transform: transform(translateY(pct(-50))),
    [`insetInline${side}`]: ref("iconInset"),
    ...iconBox(ref("iconSize")),
    color: when()
        .on(DISABLED, disabledColor("disabledContent"))
        .else(ref("iconColor")),
});

/** Build the text field with a `color` variant per group in `groups`, setting its focus
 *  color. Errors keep the error color. */
export const createTextField = (groups: ColorGroups = COLOR_GROUPS) => {
    const color = colors(groups);
    return defineSlotComponent({
        name: "textField",
        $meta: {
            description:
                "Material text field, filled or outlined. Give the input a placeholder (a space works) and put the label after it; mark errors with aria-invalid. Turn on leadingIcon or trailingIcon when you render one.",
        },
        tokens,
        slots: [...FIELD_SLOTS, "leadingIcon", "trailingIcon"],
        structure: {
            root: ["container", "supportingText"],
            container: ["leadingIcon", "input", "label", "trailingIcon"],
        },
        recipe: {
            base: {
                ...base,
                container: { ...base.container, height: ref("height") },
                input: { ...base.input, height: pct(100) },
                leadingIcon: icon("Start"),
                // Material turns the trailing icon to the error color with the field.
                trailingIcon: {
                    ...icon("End"),
                    color: when()
                        .on(INVALID, ref("errorColor"))
                        .on(DISABLED, disabledColor("disabledContent"))
                        .else(ref("iconColor")),
                },
            },
            variants: {
                variant,
                color: color.color,
                leadingIcon: {
                    true: {
                        input: { paddingInlineStart: ref("textInsetWithIcon") },
                        label: { insetInlineStart: ref("textInsetWithIcon") },
                    },
                    false: {},
                },
                trailingIcon: {
                    true: {
                        input: { paddingInlineEnd: ref("textInsetWithIcon") },
                    },
                    false: {},
                },
            },
            // An outlined label floats onto the border at the usual inset, clear of the icon.
            compoundVariants: [
                ...color.compoundVariants,
                {
                    match: { variant: "outlined", leadingIcon: "true" },
                    style: {
                        label: {
                            insetInlineStart: floated(
                                ref("textInsetWithIcon"),
                                ref("paddingInline"),
                            ),
                        },
                    },
                },
            ],
            defaultVariants: {
                color: DEFAULT_GROUP,
                variant: "filled",
                leadingIcon: "false",
                trailingIcon: "false",
            },
        },
    });
};

export const textField = createTextField();
