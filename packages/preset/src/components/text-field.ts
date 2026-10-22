// The pureform text field: Material's filled and outlined single-line text fields.
//
// Markup: a root holding the container and the supporting text. Inside the container, the
// optional leading icon, the optional prefix text, the input, the optional suffix text, the
// label, and the optional trailing icon, in that order. The input needs a placeholder (a single
// space when none should show), so CSS can tell when it holds a value and float the label. Turn
// on `leadingIcon`, `trailingIcon`, `prefixText` or `suffixText` when you render one, so the
// text makes room for it. The prefix and suffix show once the label floats.
//
//   <div class={root}>
//     <div class={container}>
//       <span class={leadingIcon}>…</span>
//       <span class={prefixText}>$</span>
//       <input class={input} id="price" placeholder=" " />
//       <span class={suffixText}>.00</span>
//       <label class={label} for="price">Price</label>
//     </div>
//     <span class={supportingText}>Helper or error text</span>
//     <span class={counter}>3 / 20</span>
//   </div>
//
// The root is a wrapping row: the container takes the first line, and the supporting text and
// the optional counter share the next.
// Mark an error with `aria-invalid="true"` on the input, and a count over the limit too. The
// container reads its state from the input, and the label, icons, supporting text and counter
// follow it. `secure` is the password field: the trailing icon is a button that shows or hides
// the text.

import { typed } from "@pureform/core";
import { pointer, px, transparent } from "@pureform/core/ast";
import { radius } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { themeIndication } from "../state-layer";
import {
    AFFIX_FIELD_SLOTS,
    AFFIX_FIELD_STRUCTURE,
    AFFIX_TOKENS,
    COUNTER_SLOTS,
    COUNTER_STRUCTURE,
    affixField,
    affixFieldVariants,
    counterParts,
    fieldTokens,
} from "./field";
import {
    focusRing,
    DEFAULT_GROUP,
    defaultDensities,
    defaultGroups,
    densitySteps,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const { tokens, ref } = fieldTokens("textField", AFFIX_TOKENS);

const field = affixField(ref);
const counter = counterParts(ref);

// The secure field's trailing icon is a button that shows or hides the text: no button chrome,
// and a focus ring around the icon.
const visibilityToggle = {
    cursor: pointer,
    backgroundColor: transparent,
    borderWidth: px(0),
    paddingInlineStart: px(0),
    paddingInlineEnd: px(0),
    paddingBlockStart: px(0),
    paddingBlockEnd: px(0),
    borderRadius: radius("full"),
    ...focusRing(themeIndication),
};

const pf = typed();

/** Build the text field with a `color` variant per group in `groups`, setting its focus
 *  color. Errors keep the error color. */
export const createTextField = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) => {
    const { density, ...parts } = field.parts(groups, densities);
    return variantsOf<{
        color: G | typeof DEFAULT_GROUP;
        density: "inherit" | D;
    }>()(
        pf.slotComponent({
            name: "textField",
            $meta: {
                description:
                    "Material text field, filled or outlined. Give the input a placeholder (a space works) and put the label after it; mark errors with aria-invalid. Turn on leadingIcon, trailingIcon, prefixText or suffixText when you render one. A counter sits after the supporting text, on its line. secure makes the trailing icon a show/hide button for a password.",
            },
            tokens,
            slots: [...AFFIX_FIELD_SLOTS, ...COUNTER_SLOTS],
            structure: { ...AFFIX_FIELD_STRUCTURE, ...COUNTER_STRUCTURE },
            variants: {
                ...affixFieldVariants(groups as ColorGroups),
                secure: ["true", "false"],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    ...parts.base,
                    ...counter,
                    root: { ...parts.base.root, ...counter.root },
                    container: {
                        ...parts.base.container,
                        ...counter.container,
                    },
                    supportingText: {
                        ...field.base.supportingText,
                        ...counter.supportingText,
                    },
                },
                variants: {
                    ...parts.variants,
                    secure: {
                        true: { trailingIcon: visibilityToggle },
                        false: {},
                    },
                    ...density.variants,
                },
                compoundVariants: parts.compoundVariants,
                defaultVariants: {
                    ...parts.defaultVariants,
                    secure: "false",
                    ...density.defaultVariants,
                },
            }),
        }),
    );
};

export const textField = createTextField();
