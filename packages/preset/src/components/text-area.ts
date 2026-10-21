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
//     <span class={counter}>12 / 200</span>
//   </div>
//
// The root is a wrapping row: the container takes the first line, and the supporting text and
// the optional counter share the next.

import { typed } from "@pureform/core";
import {
    add,
    content,
    flex,
    mul,
    none,
    px,
    unitless,
    vertical,
} from "@pureform/core/ast";
import type { NumericValue, StyleMap } from "@pureform/core/ast";
import { spacing } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import {
    COUNTER_SLOTS,
    COUNTER_STRUCTURE,
    FIELD_SLOTS,
    FIELD_STRUCTURE,
    counterParts,
    fieldParts,
    fieldTokens,
    floated,
} from "./field";
import {
    DEFAULT_GROUP,
    defaultDensities,
    defaultGroups,
    densityTokenVariant,
    densitySteps,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const { tokens, ref } = fieldTokens("textArea");

// The first line's center: half the single-line height, so the label rests where a text
// field's would.
const labelRest = mul(ref("height"), unitless(0.5));
const { base, variant, colors, icons } = fieldParts(ref, {
    labelRest,
    iconRoom: "container",
});
const counter = counterParts(ref);

// The sizes density changes, at an offset: half of it off each side of the text, and the
// label's resting line moving with it. The text scrolls through its own padding, under the
// floated label, so the label's room is a margin outside the scroll area instead.
const sized = (offset: NumericValue) => {
    const plus = (value: NumericValue) =>
        add(value, mul(offset, unitless(0.5)));
    return {
        filled: {
            container: { minHeight: add(ref("height"), offset) },
            input: {
                paddingBlockStart: px(0),
                paddingBlockEnd: plus(spacing("2")),
                marginBlockStart: plus(spacing("6")),
            },
            label: { top: floated(plus(labelRest), plus(spacing("2"))) },
        },
        outlined: {
            container: { minHeight: add(ref("height"), offset) },
            input: {
                paddingBlockStart: spacing("2"),
                paddingBlockEnd: plus(spacing("4")),
                marginBlockStart: plus(spacing("2")),
            },
            label: { top: floated(plus(labelRest), px(0)) },
        },
    } satisfies Record<string, Record<string, StyleMap>>;
};
const themeSized = sized(ref("densityOffset"));

const pf = typed();

/** Build the text area with a `color` variant per group in `groups`, setting its focus
 *  color. Errors keep the error color. */
export const createTextArea = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) => {
    const color = colors(groups);
    return variantsOf<{
        color: G | typeof DEFAULT_GROUP;
        density: "inherit" | D;
    }>()(
        pf.slotComponent({
            name: "textArea",
            $meta: {
                description:
                    "Material text area, filled or outlined. Give the textarea a placeholder (a space works) and rows, and put the label after it; mark errors with aria-invalid. autoGrow grows it with the text. Turn on leadingIcon or trailingIcon when you render one. A counter sits after the supporting text, on its line.",
            },
            tokens,
            slots: [...FIELD_SLOTS, ...COUNTER_SLOTS],
            structure: { ...FIELD_STRUCTURE, ...COUNTER_STRUCTURE },
            variants: {
                color: groups as ColorGroups,
                leadingIcon: ["true", "false"],
                trailingIcon: ["true", "false"],
                autoGrow: ["true", "false"],
                variant: ["filled", "outlined"],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    ...base,
                    ...icons.base,
                    ...counter,
                    root: { ...base.root, ...counter.root },
                    supportingText: {
                        ...base.supportingText,
                        ...counter.supportingText,
                    },
                    container: {
                        ...base.container,
                        ...counter.container,
                        display: flex,
                    },
                    input: { ...base.input, resize: vertical },
                },
                variants: {
                    color: color.color,
                    ...icons.variants,
                    // Grow with the text instead of scrolling. Browsers without field-sizing keep
                    // the rows' height.
                    autoGrow: {
                        true: { input: { fieldSizing: content, resize: none } },
                        false: {},
                    },
                    variant: {
                        filled: {
                            ...variant.filled,
                            container: {
                                ...variant.filled.container,
                                ...themeSized.filled.container,
                            },
                            input: {
                                ...variant.filled.input,
                                ...themeSized.filled.input,
                            },
                            label: {
                                ...variant.filled.label,
                                ...themeSized.filled.label,
                            },
                        },
                        outlined: {
                            ...variant.outlined,
                            container: {
                                ...variant.outlined.container,
                                ...themeSized.outlined.container,
                            },
                            input: {
                                ...variant.outlined.input,
                                ...themeSized.outlined.input,
                            },
                            label: {
                                ...variant.outlined.label,
                                ...themeSized.outlined.label,
                            },
                        },
                    },
                    density: densityTokenVariant(densities),
                },
                compoundVariants: [...icons.compoundVariants],
                defaultVariants: {
                    variant: "filled",
                    color: DEFAULT_GROUP,
                    autoGrow: "false",
                    ...icons.defaultVariants,
                    density: "inherit",
                },
            }),
        }),
    );
};

export const textArea = createTextArea();
