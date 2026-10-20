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
    affixParts,
    fieldParts,
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

const { tokens, ref } = fieldTokens("select", AFFIX_TOKENS);

const { base, variant, colors, icons, densityParts } = fieldParts(ref, {
    labelRest: pct(50),
    iconRoom: "input",
    density: true,
});
const affixes = affixParts(ref, variant);

const EXPANDED = slot("container", "expanded");

const pf = typed();

/** Build the select with a `color` variant per group in `groups`, setting its focus color. */
export const createSelect = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) => {
    const color = colors(groups);
    const density = densityParts(densities);
    return variantsOf<{
        color: G | typeof DEFAULT_GROUP;
        density: "inherit" | D;
    }>()(
        pf.slotComponent({
            name: "select",
            $meta: {
                description:
                    "Material select field over a read-only combobox input. Mark it aria-expanded while its menu is open; render the menu component below. Turn on prefixText or suffixText when you render one.",
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
                    ...base,
                    ...icons.base,
                    ...affixes.base,
                    container: {
                        ...base.container,
                        ...affixes.base.container,
                        height: density.height,
                    },
                    input: {
                        ...base.input,
                        ...affixes.base.input,
                        height: pct(100),
                        cursor: pointer,
                    },
                    // The arrow turns over while the menu is open.
                    trailingIcon: {
                        ...icons.base.trailingIcon,
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
                    variant: {
                        filled: {
                            ...variant.filled,
                            ...affixes.variant.filled,
                        },
                        outlined: {
                            ...variant.outlined,
                            ...affixes.variant.outlined,
                        },
                    },
                    color: color.color,
                    ...affixes.icons,
                    ...affixes.variants,
                    ...density.variants,
                },
                compoundVariants: [...icons.compoundVariants],
                // The arrow is always there.
                defaultVariants: {
                    color: DEFAULT_GROUP,
                    variant: "filled",
                    ...icons.defaultVariants,
                    ...affixes.defaultVariants,
                    ...density.defaultVariants,
                    trailingIcon: "true",
                },
            }),
        }),
    );
};

export const select = createSelect();
