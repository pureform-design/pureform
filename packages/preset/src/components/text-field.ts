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
import { pct } from "@pureform/core/ast";

import { FIELD_SLOTS, FIELD_STRUCTURE, fieldParts, fieldTokens } from "./field";
import { COLOR_GROUPS, DEFAULT_GROUP } from "./shared";
import type { ColorGroups } from "./shared";

const { tokens, ref } = fieldTokens("textField");

const { base, variant, colors, icons, densities } = fieldParts(ref, {
    labelRest: pct(50),
    iconRoom: "input",
    density: true,
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
        slots: [...FIELD_SLOTS],
        structure: FIELD_STRUCTURE,
        recipe: {
            base: {
                ...base,
                ...icons.base,
                container: { ...base.container, height: densities.height },
                input: { ...base.input, height: pct(100) },
            },
            variants: {
                variant,
                color: color.color,
                ...icons.variants,
                ...densities.variants,
            },
            compoundVariants: [
                ...color.compoundVariants,
                ...icons.compoundVariants,
                ...densities.compoundVariants,
            ],
            defaultVariants: {
                color: DEFAULT_GROUP,
                variant: "filled",
                ...icons.defaultVariants,
                ...densities.defaultVariants,
            },
        },
    });
};

export const textField = createTextField();
