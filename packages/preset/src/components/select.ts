// The pureform select: Material's filled and outlined select fields.
//
// A select is a text field whose input picks from a menu: a read-only combobox with the
// arrow as its trailing icon, which turns while the menu is open. Mark the input
// `aria-expanded="true"` then, and render the menu component below it. Opening, closing, and
// choosing are the app's job.
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

import { FIELD_SLOTS, FIELD_STRUCTURE, fieldParts, fieldTokens } from "./field";
import {
    DEFAULT_GROUP,
    defaultDensities,
    defaultGroups,
    densitySteps,
    tweens,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const { tokens, ref } = fieldTokens("select");

const { base, variant, colors, icons, densityParts } = fieldParts(ref, {
    labelRest: pct(50),
    iconRoom: "input",
    density: true,
});

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
                    "Material select field over a read-only combobox input. Mark it aria-expanded while its menu is open; render the menu component below.",
            },
            tokens,
            slots: [...FIELD_SLOTS],
            structure: FIELD_STRUCTURE,
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
                    container: { ...base.container, height: density.height },
                    input: { ...base.input, height: pct(100), cursor: pointer },
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
                    variant,
                    color: color.color,
                    ...icons.variants,
                    ...density.variants,
                },
                compoundVariants: [
                    ...icons.compoundVariants,
                    ...density.compoundVariants,
                ],
                // The arrow is always there.
                defaultVariants: {
                    color: DEFAULT_GROUP,
                    variant: "filled",
                    ...icons.defaultVariants,
                    ...density.defaultVariants,
                    trailingIcon: "true",
                },
            }),
        }),
    );
};

export const select = createSelect();
