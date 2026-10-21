// The pureform date input: Material's modal date input, a picker that takes the date as text.
//
// Markup: the surface holding the header (the headline, the date typed so far, and the mode toggle
// that switches to the calendar), a divider, the text field (`field` and the field's parts; the
// input is a group of segments, the month, the day and the year, each its own `segment`), and the
// actions. The binding runs Zag's date input, which reads and writes the segments in the locale's
// order, and marks the field filled, so the label stays floated over the segments' placeholders.
//
//   <div class={root} role="group" aria-labelledby="headline">
//     <div class={header}>
//       <span class={headline} id="headline">Select date</span>
//       <span class={selectedDate}>Aug 17, 2026</span>
//       <button class={modeToggle} aria-label="Switch to calendar">📅</button>
//     </div>
//     <hr class={divider} />
//     <div class={field}>
//       <div class={container} data-pf-filled>
//         <div class={input}>
//           <span class={segment} role="spinbutton">08</span>/<span class={segment}>17</span>…
//         </div>
//         <label class={label}>Date</label>
//       </div>
//       <span class={supportingText}>mm/dd/yyyy</span>
//     </div>
//     <div class={actions}>…Cancel, OK…</div>
//   </div>

import { typed } from "@pureform/core";
import {
    center,
    flex,
    none,
    px,
    row,
    transparent,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import type { MaterialDensity } from "@pureform/theme";
import { radius, spacing, textStyle } from "@pureform/theme";

import {
    CALENDAR_TOKENS,
    PICKER_HEADER_SLOTS,
    PICKER_TOKENS,
    pickerChrome,
} from "./calendar";
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
    surface,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const pf = typed();

// The field's slots under the picker's surface: its root is the picker's `field`.
const FIELD_SLOTS = AFFIX_FIELD_SLOTS.filter(
    (name): name is Exclude<(typeof AFFIX_FIELD_SLOTS)[number], "root"> =>
        name !== "root",
);

type SlotStyles = Record<string, StyleMap>;

// A field variant's styles with its root's moved to `field`, but for its tokens, which stay on
// the picker's root so every slot inside reads them.
const underField = (styles: SlotStyles): SlotStyles => {
    const { root, ...rest } = styles;
    if (!root) return rest;
    const { tokens, ...own } = root;
    return {
        ...rest,
        ...(tokens ? { root: { tokens } } : {}),
        ...(Object.keys(own).length > 0 ? { field: own } : {}),
    };
};

const mapVariants = <V extends Record<string, Record<string, SlotStyles>>>(
    variants: V,
): V =>
    Object.fromEntries(
        Object.entries(variants).map(([group, values]) => [
            group,
            Object.fromEntries(
                Object.entries(values).map(([value, styles]) => [
                    value,
                    underField(styles),
                ]),
            ),
        ]),
    ) as V;

/** Build the date input with a `color` variant per group in `groups`, setting the field's focus
 *  color. */
export const createDateInput = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) => {
    const { tokens, ref } = fieldTokens("dateInput", {
        ...AFFIX_TOKENS,
        ...PICKER_TOKENS,
        // The mode toggle's color, and the outlined label's notch in the picker's container.
        controlColor: CALENDAR_TOKENS.controlColor,
        labelBackground: PICKER_TOKENS.pickerContainer,
        fieldPadding: spacing("6"),
        segmentRadius: radius("extraSmall"),
    });
    const field = affixField(ref);
    const { density, ...parts } = field.parts(groups, densities);
    const chrome = pickerChrome(ref);
    const { root: fieldRoot, ...fieldBase } = parts.base;
    return variantsOf<{
        color: G | typeof DEFAULT_GROUP;
        density: "inherit" | D;
    }>()(
        pf.slotComponent({
            name: "dateInput",
            $meta: {
                description:
                    "Material modal date input: a surface with a header (headline, the date so far, mode toggle), a text field whose input is a group of date segments, and the actions.",
            },
            tokens,
            slots: [
                "root",
                ...PICKER_HEADER_SLOTS,
                "field",
                ...FIELD_SLOTS,
                "segment",
                "actions",
            ],
            structure: {
                root: ["header", "divider", "field", "actions"],
                header: ["headline", "selectedDate", "modeToggle"],
                field: AFFIX_FIELD_STRUCTURE.root,
                container: AFFIX_FIELD_STRUCTURE.container,
                input: ["segment"],
            },
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
                    ...fieldBase,
                    ...chrome,
                    root: {
                        ...surface(
                            ref("container"),
                            ref("selectedDateColor"),
                            "level3",
                        ),
                        ...chrome.root,
                    },
                    field: {
                        ...fieldRoot,
                        paddingInlineStart: ref("fieldPadding"),
                        paddingInlineEnd: ref("fieldPadding"),
                        paddingBlockStart: ref("fieldPadding"),
                        paddingBlockEnd: spacing("4"),
                    },
                    // The segments sit in a row where a text field's text would.
                    input: {
                        ...fieldBase.input,
                        display: flex,
                        flexDirection: row,
                        alignItems: center,
                    },
                    segment: {
                        textStyle: textStyle("bodyLarge"),
                        borderRadius: ref("segmentRadius"),
                        paddingInlineStart: px(1),
                        paddingInlineEnd: px(1),
                        outlineStyle: none,
                        backgroundColor: when(
                            "focus",
                            ref("focusColor"),
                            transparent,
                        ),
                        color: when(
                            "focus",
                            ref("pickerContainer"),
                            ref("inputColor"),
                        ),
                        textAlign: center,
                    },
                },
                variants: mapVariants({
                    ...parts.variants,
                    ...density.variants,
                }),
                compoundVariants: parts.compoundVariants,
                defaultVariants: {
                    ...parts.defaultVariants,
                    ...density.defaultVariants,
                    // M3's date input is an outlined field.
                    variant: "outlined",
                },
            }),
        }),
    );
};

export const dateInput = createDateInput();
