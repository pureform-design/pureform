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

import type { MaterialDensity } from "@pureform/theme";

import { selectField } from "./select";
import { defaultDensities, defaultGroups } from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

/** Build the autocomplete with a `color` variant per group in `groups`, setting its focus color. */
export const createAutocomplete = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    selectField(
        {
            name: "autocomplete",
            description:
                "Material autocomplete (editable exposed dropdown menu): the select's field over an editable combobox input that filters suggestions. Mark it aria-expanded while its menu is open; render the menu component below. Turn on prefixText or suffixText when you render one.",
            editable: true,
        },
        groups,
        densities,
    );

export const autocomplete = createAutocomplete();
