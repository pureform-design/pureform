// The pureform text area: Material's filled and outlined multi-line text field.
//
// It shares the text field's container, label, states, and supporting text, and differs in
// size: the container grows with the text area instead of keeping one height, the text area
// resizes vertically, and the label rests on the first line. Set the visible lines with the
// textarea's `rows`, or turn on `autoGrow` to grow it with the text.
//
//   <div class={root}>
//     <div class={container}>
//       <textarea class={input} id="bio" placeholder=" " rows={3} />
//       <label class={label} for="bio">Bio</label>
//     </div>
//     <span class={supportingText}>Helper or error text</span>
//   </div>

import { defineSlotComponent } from "@pureform/core";
import {
    content,
    flex,
    mul,
    none,
    px,
    unitless,
    vertical,
} from "@pureform/core/ast";
import { spacing } from "@pureform/theme";

import { FIELD_SLOTS, fieldParts, fieldTokens } from "./field";
import { COLOR_GROUPS, DEFAULT_GROUP } from "./shared";
import type { ColorGroups } from "./shared";

const { tokens, ref } = fieldTokens("textArea");

// The first line's center: half the single-line height, so the label rests where a text
// field's would.
const { base, variant, colors } = fieldParts(ref, {
    labelRest: mul(ref("height"), unitless(0.5)),
});

/** Build the text area with a `color` variant per group in `groups`, setting its focus
 *  color. Errors keep the error color. */
export const createTextArea = (groups: ColorGroups = COLOR_GROUPS) => {
    const color = colors(groups);
    return defineSlotComponent({
        name: "textArea",
        $meta: {
            description:
                "Material text area, filled or outlined. Give the textarea a placeholder (a space works) and rows, and put the label after it; mark errors with aria-invalid. autoGrow grows it with the text.",
        },
        tokens,
        slots: [...FIELD_SLOTS],
        structure: {
            root: ["container", "supportingText"],
            container: ["input", "label"],
        },
        recipe: {
            base: {
                ...base,
                container: {
                    ...base.container,
                    display: flex,
                    minHeight: ref("height"),
                },
                input: { ...base.input, resize: vertical },
            },
            // A textarea scrolls its text through its own padding, under the floated label, so the
            // label's room is a margin outside the scroll area instead.
            variants: {
                color: color.color,
                // Grow with the text instead of scrolling. Browsers without field-sizing keep
                // the rows' height.
                autoGrow: {
                    true: { input: { fieldSizing: content, resize: none } },
                    false: {},
                },
                variant: {
                    filled: {
                        ...variant.filled,
                        input: {
                            ...variant.filled.input,
                            paddingBlockStart: px(0),
                            marginBlockStart: spacing("6"),
                        },
                    },
                    outlined: {
                        ...variant.outlined,
                        input: {
                            ...variant.outlined.input,
                            paddingBlockStart: spacing("2"),
                            marginBlockStart: spacing("2"),
                        },
                    },
                },
            },
            compoundVariants: color.compoundVariants,
            defaultVariants: {
                variant: "filled",
                color: DEFAULT_GROUP,
                autoGrow: "false",
            },
        },
    });
};

export const textArea = createTextArea();
