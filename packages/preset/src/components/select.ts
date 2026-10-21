// The pureform select: Material's filled and outlined select fields.
//
// A select is a text field whose input picks from a menu: a read-only combobox with the
// arrow as its trailing icon, which turns while the menu is open. Mark the input
// `aria-expanded="true"` then, and render the menu component below it. Opening, closing, and
// choosing are the app's job. Optional prefix and suffix text sit around the value, as in the
// text field (`prefixText`, `suffixText`). The options are drawn with the menu's parts; option
// groups come with the menu's group parts.
//
//   <div class={root}>
//     <div class={container}>
//       <input class={input} id="size" role="combobox" aria-expanded="false" readonly
//              placeholder=" " value="Medium" />
//       <label class={label} for="size">Size</label>
//       <span class={trailingIcon}>▾</span>
//     </div>
//     <span class={supportingText}>Helper text</span>
//   </div>

import { typed } from "@pureform/core";
import {
    numeric,
    pct,
    pointer,
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
    affixFieldVariants,
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

const EXPANDED = slot("container", "expanded");

const pf = typed();

/** What tells a select-like field apart: its name, description and whether its input is typed in. */
export interface SelectFieldOptions<N extends string> {
    name: N;
    description: string;
    /** An editable input (the autocomplete) keeps the text cursor; a read-only one points. */
    editable: boolean;
}

/**
 * Build a select-like field (the select, the autocomplete): the affix text field whose trailing
 * icon is a drop-down arrow, always there and turned over while the menu is open.
 */
export const selectField = <
    N extends string,
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    { name, description, editable }: SelectFieldOptions<N>,
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) => {
    const { tokens, ref } = fieldTokens(name, AFFIX_TOKENS);
    const field = affixField(ref);
    const { density, ...parts } = field.parts(groups, densities);
    return variantsOf<{
        color: G | typeof DEFAULT_GROUP;
        density: "inherit" | D;
    }>()(
        pf.slotComponent({
            name,
            $meta: { description },
            tokens,
            slots: [...AFFIX_FIELD_SLOTS],
            structure: AFFIX_FIELD_STRUCTURE,
            variants: {
                ...affixFieldVariants(groups as ColorGroups),
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    ...parts.base,
                    input: editable
                        ? parts.base.input
                        : { ...parts.base.input, cursor: pointer },
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
                // The arrow is always there.
                defaultVariants: {
                    ...parts.defaultVariants,
                    ...density.defaultVariants,
                    trailingIcon: "true",
                },
            }),
        }),
    );
};

/** Build the select with a `color` variant per group in `groups`, setting its focus color. */
export const createSelect = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    selectField(
        {
            name: "select",
            description:
                "Material select field over a read-only combobox input. Mark it aria-expanded while its menu is open; render the menu component below. Turn on prefixText or suffixText when you render one.",
            editable: false,
        },
        groups,
        densities,
    );

export const select = createSelect();
