// The pureform tags input: a Material text field (filled or outlined) whose values are input
// chips, laid out before the input and wrapping onto more lines as they grow.
//
// Markup: the text field's. The container holds the optional leading icon, an input chip per
// value (the `inputChip` component), the input, the label, and the optional trailing icon; the
// supporting text sits below. The label floats once there is a chip or text: the bindings mark
// the container filled (`data-pf-filled`) while it holds a chip, and the input needs a
// placeholder (a single space when none should show), as the text field's does.
//
//   <div class={root}>
//     <div class={container} data-pf-filled>
//       <div class={inputChip.root}>…</div>
//       <input class={input} id="tags" placeholder=" " />
//       <label class={label} for="tags">Tags</label>
//     </div>
//     <span class={supportingText}>Press Enter to add a tag</span>
//   </div>
//
// The container pads the row instead of the input, so chips and text start at the same inset,
// and grows a line at a time from the text field's height. The label rests on the first line's
// center. Turn on `leadingIcon` or `trailingIcon` when you render one.

import { typed } from "@pureform/core";
import {
    add,
    center,
    flex,
    mul,
    px,
    row,
    unitless,
    wrap,
} from "@pureform/core/ast";
import type { NumericValue, StyleMap } from "@pureform/core/ast";
import { size as sizeToken, spacing } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import {
    FIELD_SLOTS,
    FIELD_STRUCTURE,
    fieldParts,
    fieldTokens,
    floated,
} from "./field";
import {
    DEFAULT_GROUP,
    defaultDensities,
    defaultGroups,
    densitySteps,
    densityTokenVariant,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const { tokens, ref } = fieldTokens("tagsInput", {
    chipGap: spacing("2"),
    // The input's narrowest width beside the chips, before it wraps to its own line.
    inputMinWidth: px(80),
    // A line's height: the input chip's.
    lineHeight: sizeToken("controlSmall"),
});

// The first line's center: half the single-line height, so the label rests where a text
// field's would.
const labelRest = mul(ref("height"), unitless(0.5));
const { base, variant, colors, icons } = fieldParts(ref, {
    labelRest,
    iconRoom: "container",
});

// The container's block padding per fill, at a density offset: half of it off each side. A
// filled field leaves room above for the floated label; an outlined one centers its first line
// on the field's height.
const sized = (offset: NumericValue) => {
    const plus = (value: NumericValue) =>
        add(value, mul(offset, unitless(0.5)));
    return {
        filled: {
            container: {
                minHeight: add(ref("height"), offset),
                paddingBlockStart: plus(spacing("6")),
                paddingBlockEnd: plus(spacing("2")),
            },
            label: { top: floated(plus(labelRest), plus(spacing("2"))) },
        },
        outlined: {
            container: {
                minHeight: add(ref("height"), offset),
                paddingBlockStart: plus(spacing("3")),
                paddingBlockEnd: plus(spacing("3")),
            },
            label: { top: floated(plus(labelRest), px(0)) },
        },
    } satisfies Record<string, Record<string, StyleMap>>;
};
const themeSized = sized(ref("densityOffset"));

// The input sits in the row after the chips, with no padding of its own.
const input: StyleMap = {
    flexGrow: unitless(1),
    flexShrink: unitless(1),
    flexBasis: ref("inputMinWidth"),
    minWidth: ref("inputMinWidth"),
    height: ref("lineHeight"),
    paddingInlineStart: px(0),
    paddingInlineEnd: px(0),
    paddingBlockStart: px(0),
    paddingBlockEnd: px(0),
};

const fill = (name: "filled" | "outlined"): Record<string, StyleMap> => ({
    ...variant[name],
    container: { ...variant[name].container, ...themeSized[name].container },
    input,
    label: { ...variant[name].label, ...themeSized[name].label },
});

const pf = typed();

/** Build the tags input with a `color` variant per group in `groups`, setting its focus
 *  color. Errors keep the error color. */
export const createTagsInput = <
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
            name: "tagsInput",
            bindingVariants: ["leadingIcon", "trailingIcon", "density"],
            $meta: {
                description:
                    "Material text field whose values are input chips, filled or outlined. Render an inputChip per value in the container before the input; give the input a placeholder (a space works) and put the label after it. Mark the container filled while it holds a chip. Turn on leadingIcon or trailingIcon when you render one.",
            },
            tokens,
            slots: [...FIELD_SLOTS],
            structure: { ...FIELD_STRUCTURE },
            variants: {
                variant: ["filled", "outlined"],
                color: groups as ColorGroups,
                leadingIcon: ["true", "false"],
                trailingIcon: ["true", "false"],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    ...base,
                    ...icons.base,
                    container: {
                        ...base.container,
                        display: flex,
                        flexDirection: row,
                        flexWrap: wrap,
                        alignItems: center,
                        gap: ref("chipGap"),
                        paddingInlineStart: ref("paddingInline"),
                        paddingInlineEnd: ref("paddingInline"),
                    },
                    input: { ...base.input, ...input },
                },
                variants: {
                    variant: {
                        filled: fill("filled"),
                        outlined: fill("outlined"),
                    },
                    color: color.color,
                    // An icon's room goes to the container, which pads the row past it.
                    leadingIcon: {
                        true: {
                            container: {
                                paddingInlineStart: ref("textInsetWithIcon"),
                            },
                            label: {
                                insetInlineStart: ref("textInsetWithIcon"),
                            },
                        },
                        false: {},
                    },
                    trailingIcon: {
                        true: {
                            container: {
                                paddingInlineEnd: ref("textInsetWithIcon"),
                            },
                        },
                        false: {},
                    },
                    density: densityTokenVariant(densities),
                },
                compoundVariants: [...icons.compoundVariants],
                defaultVariants: {
                    variant: "filled",
                    color: DEFAULT_GROUP,
                    ...icons.defaultVariants,
                    density: "inherit",
                },
            }),
        }),
    );
};

export const tagsInput = createTagsInput();
