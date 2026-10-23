// The pureform number field: a Material text field (filled or outlined) for a number, with a
// decrement and an increment button at its end. Material has no number field; this one is
// pureform's own, built from the text field's parts and the icon button's size (c9a).
//
// Markup: the text field's, with the trailing icon's place taken by the control, a group holding
// the two buttons. The input is a `spinbutton` (Zag's number input): the arrow keys step it, and
// pressing and holding a button repeats.
//
//   <div class={root}>
//     <div class={container}>
//       <span class={leadingIcon}>…</span>
//       <span class={prefixText}>$</span>
//       <input class={input} id="qty" role="spinbutton" placeholder=" " />
//       <span class={suffixText}>kg</span>
//       <label class={label} for="qty">Quantity</label>
//       <div class={control}>
//         <button class={decrementTrigger}>…</button>
//         <button class={incrementTrigger}>…</button>
//       </div>
//     </div>
//     <span class={supportingText}>Helper or error text</span>
//   </div>
//
// The buttons are round and `triggerSize` across (40, a small icon button), with a state layer
// and a focus ring, and sit `controlInset` from the container's end; the input (or the suffix)
// ends clear of them. A button turns to the disabled color at its limit.

import { typed } from "@pureform/core";
import {
    absolute,
    center,
    add,
    flex,
    mul,
    none,
    pct,
    pointer,
    px,
    relative,
    row,
    slot,
    translateY,
    transform,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { spacing } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import { AFFIX_TOKENS, affixField, DISABLED, fieldTokens } from "./field";
import {
    blend,
    DEFAULT_GROUP,
    defaultDensities,
    defaultGroups,
    densitySteps,
    disabledColor,
    INDICATION_ROOT,
    iconFill,
    variantsOf,
    roundIconButton,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const { tokens, ref } = fieldTokens("numberField", {
    ...AFFIX_TOKENS,
    triggerSize: px(40),
    controlInset: spacing("1"),
    ...INDICATION_TOKENS,
});

const field = affixField(ref);

// Where the text ends: past the control, its inset, and the gap before the text.
const textInsetWithControl = add(
    add(ref("controlInset"), mul(ref("triggerSize"), unitless(2))),
    spacing("1"),
);

const trigger = (part: "decrementTrigger" | "incrementTrigger"): StyleMap => {
    const button = roundIconButton(ref, ref("triggerSize"), {
        fill: iconFill(ref("iconFill")),
        content: ref("iconColor"),
    });
    return {
        ...button,
        // The button is the icon button's size; its icon stays the field's icon size.
        fontSize: ref("iconSize"),
        flexShrink: unitless(0),
        // At its limit a button is disabled.
        color: when()
            .on(slot(part, "disabled"), disabledColor("disabledContent"))
            .else(ref("iconColor")),
        // A disabled button takes no hover or press, so it shows no state layer.
        states: { ...button.states, disabled: { pointerEvents: none } },
    };
};

const control: StyleMap = {
    position: absolute,
    top: pct(50),
    insetInlineEnd: ref("controlInset"),
    display: flex,
    flexDirection: row,
    alignItems: center,
    transform: transform(translateY(pct(-50))),
    color: when()
        .on(DISABLED, disabledColor("disabledContent"))
        .else(ref("iconColor")),
};

// The affix field's parts draw a trailing icon; the control takes its place.
const withoutTrailingIcon = <T extends { trailingIcon?: unknown }>({
    trailingIcon: _trailingIcon,
    ...rest
}: T): Omit<T, "trailingIcon"> => rest;

const pf = typed();

/** Build the number field with a `color` variant per group in `groups`, setting its focus
 *  color. Errors keep the error color. */
export const createNumberField = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) => {
    const { density, ...parts } = field.parts(groups, densities);
    const { trailingIcon: _trailingIcon, ...variants } = parts.variants;
    const { trailingIcon: _default, ...defaultVariants } =
        parts.defaultVariants;
    return variantsOf<{
        color: G | typeof DEFAULT_GROUP;
        density: "inherit" | D;
    }>()(
        pf.slotComponent({
            name: "numberField",
            $meta: {
                description:
                    "Number field (pureform's own, not in M3): a text field, filled or outlined, whose input is a spinbutton, with decrement and increment buttons in a control at its end. Give the input a placeholder (a space works) and put the label after it; mark errors with aria-invalid. Turn on leadingIcon, prefixText or suffixText when you render one.",
            },
            tokens,
            slots: [
                "root",
                "container",
                "leadingIcon",
                "prefixText",
                "input",
                "suffixText",
                "label",
                "control",
                "decrementTrigger",
                "incrementTrigger",
                "supportingText",
            ],
            structure: {
                root: ["container", "supportingText"],
                container: [
                    "leadingIcon",
                    "prefixText",
                    "input",
                    "suffixText",
                    "label",
                    "control",
                ],
                control: ["decrementTrigger", "incrementTrigger"],
            },
            indication: [
                {
                    trigger: "decrementTrigger",
                    surface: "decrementTrigger",
                    centered: true,
                    focus: "decrementTrigger",
                },
                {
                    trigger: "incrementTrigger",
                    surface: "incrementTrigger",
                    centered: true,
                    focus: "incrementTrigger",
                },
            ],
            variants: {
                variant: ["filled", "outlined"],
                color: groups as ColorGroups,
                leadingIcon: ["true", "false"],
                prefixText: ["true", "false"],
                suffixText: ["true", "false"],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    ...withoutTrailingIcon(parts.base),
                    root: { ...parts.base.root, ...INDICATION_ROOT },
                    // The control takes the trailing icon's room, on the input or the suffix.
                    input: {
                        ...parts.base.input,
                        paddingInlineEnd: blend(
                            textInsetWithControl,
                            px(0),
                            ref("suffixed"),
                        ),
                    },
                    suffixText: {
                        ...parts.base.suffixText,
                        paddingInlineEnd: textInsetWithControl,
                    },
                    control,
                    decrementTrigger: trigger("decrementTrigger"),
                    incrementTrigger: trigger("incrementTrigger"),
                },
                variants: { ...variants, ...density.variants },
                compoundVariants: parts.compoundVariants,
                defaultVariants: {
                    ...defaultVariants,
                    ...density.defaultVariants,
                },
            }),
        }),
    );
};

export const numberField = createNumberField();
