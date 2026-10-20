// The pureform autocomplete: Material's editable exposed dropdown menu, a text field whose
// suggestions open in a menu below it (a combobox).
//
// The select's field with an editable input: typing filters the suggestions, and the arrow at
// the end (its trailing icon) turns while the menu is open. Mark the input
// `aria-expanded="true"` then, and render the menu component below it. Optional prefix and
// suffix text sit around the input, as in the text field (`prefixText`, `suffixText`). The
// suggestions are drawn with the menu's parts; groups come with the menu's group parts.
//
//   <div class={root}>
//     <div class={container}>
//       <input class={input} id="city" role="combobox" aria-expanded="false"
//              aria-autocomplete="list" placeholder=" " value="Par" />
//       <label class={label} for="city">City</label>
//       <span class={trailingIcon}>▾</span>
//     </div>
//     <span class={supportingText}>Helper text</span>
//   </div>

import { typed } from "@pureform/core";
import {
    numeric,
    pct,
    rotate,
    slot,
    transform,
    translateY,
    when,
} from "@pureform/core/ast";
import type { MaterialDensity } from "@pureform/theme";

import {
    AFFIX_FIELD_SLOTS,
    AFFIX_FIELD_STRUCTURE,
    AFFIX_TOKENS,
    affixField,
    fieldTokens,
} from "./field";
import {
    DEFAULT_GROUP,
    defaultDensities,
    defaultGroups,
    densitySteps,
    tweens,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const { tokens, ref } = fieldTokens("autocomplete", AFFIX_TOKENS);

const field = affixField(ref);

const EXPANDED = slot("container", "expanded");

const pf = typed();

/** Build the autocomplete with a `color` variant per group in `groups`, setting its focus color. */
export const createAutocomplete = <
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
            name: "autocomplete",
            $meta: {
                description:
                    "Material autocomplete (editable exposed dropdown menu): the select's field over an editable combobox input that filters suggestions. Mark it aria-expanded while its menu is open; render the menu component below. Turn on prefixText or suffixText when you render one.",
            },
            tokens,
            slots: [...AFFIX_FIELD_SLOTS],
            structure: AFFIX_FIELD_STRUCTURE,
            variants: {
                variant: ["filled", "outlined"],
                color: groups as ColorGroups,
                leadingIcon: ["true", "false"],
                trailingIcon: ["true", "false"],
                prefixText: ["true", "false"],
                suffixText: ["true", "false"],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    ...parts.base,
                    // The arrow turns over while the menu is open.
                    trailingIcon: {
                        ...field.icons.base.trailingIcon,
                        transform: when()
                            .on(
                                EXPANDED,
                                transform(
                                    translateY(pct(-50)),
                                    rotate(numeric(180, "deg")),
                                ),
                            )
                            .else(transform(translateY(pct(-50)))),
                        transition: tweens("transform", "color"),
                    },
                },
                variants: {
                    ...parts.variants,
                    ...density.variants,
                },
                compoundVariants: parts.compoundVariants,
                // The arrow is always there: it opens the suggestions.
                defaultVariants: {
                    ...parts.defaultVariants,
                    ...density.defaultVariants,
                    trailingIcon: "true",
                },
            }),
        }),
    );
};

export const autocomplete = createAutocomplete();
