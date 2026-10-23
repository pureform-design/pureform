// The pureform code field: a row of single-character cells for a verification code, a one-time
// code or a PIN. Material has no code field; this one is pureform's own (c9a): each cell is a
// small text field container (filled or outlined, in the text field's tokens and states), with
// the field's label above the row and its supporting text below.
//
// Markup (Zag's pin input):
//
//   <div class={root}>
//     <label class={label}>Verification code</label>
//     <div class={control}>
//       <input class={input} autocomplete="one-time-code" placeholder="" />
//       …one input per character
//     </div>
//     <span class={supportingText}>Helper or error text</span>
//   </div>
//
// Each cell reads its own states: hover, focus, `aria-invalid` and `disabled`. The label and the
// supporting text follow the root (focus inside it, an invalid cell, a disabled one). The cells
// are `cellWidth` across and the text field's `height` tall (less the density offset); their
// text is centered, in `headlineSmall`.

import { typed } from "@pureform/core";
import {
    column,
    flex,
    mul,
    px,
    row,
    shadow,
    slot,
    solid,
    unitless,
    when,
    add,
    center,
} from "@pureform/core/ast";
import type {
    ColorValue,
    NumericValue,
    StyleMap,
    ValueNode,
} from "@pureform/core/ast";
import { colorRole, radius, spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import {
    colorVariant,
    componentTokens,
    DEFAULT_GROUP,
    DENSITY_TOKEN,
    defaultDensities,
    defaultGroups,
    densitySteps,
    densityTokenVariant,
    disabledColor,
    inputText,
    stateTransition,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";
import { supportingTextStyle } from "./supporting-text";

const { tokens, ref } = componentTokens("codeField", {
    height: px(56),
    cellWidth: px(48),
    cellGap: spacing("2"),
    labelGap: spacing("1"),
    radius: radius("extraSmall"),
    container: sys("surfaceContainerHighest"),
    indicatorColor: sys("onSurfaceVariant"),
    outlineColor: sys("outline"),
    hoverColor: sys("onSurface"),
    focusColor: sys("primary"),
    errorColor: colorRole("error"),
    labelColor: sys("onSurfaceVariant"),
    inputColor: sys("onSurface"),
    supportingColor: sys("onSurfaceVariant"),
    indicatorWidth: px(1),
    focusIndicatorWidth: px(2),
    ...DENSITY_TOKEN,
});

// A cell's states, on the cell itself; a later state wins, as the text field's container's.
const HOVER = slot("input", "hover");
const FOCUSED = slot("input", "focusWithin");
const INVALID = slot("input", "invalid");
const DISABLED = slot("input", "disabled");

const byState = <T extends ValueNode>(
    rest: T,
    states: { hover?: T; focus: T; error: T; errorFocus: T; disabled: T },
) => {
    const builder = when();
    if (states.hover) builder.on(HOVER, states.hover);
    return builder
        .on(FOCUSED, states.focus)
        .on(INVALID, states.error)
        .on([INVALID, FOCUSED], states.errorFocus)
        .on(DISABLED, states.disabled)
        .else(rest);
};

const indicator = (width: NumericValue, color: ColorValue) =>
    shadow({
        x: px(0),
        y: mul(width, unitless(-1)),
        blur: px(0),
        spread: px(0),
        color,
        inset: true,
    });

const filled: StyleMap = {
    backgroundColor: when()
        .on(DISABLED, disabledColor("disabledContainer"))
        .else(ref("container")),
    borderStartStartRadius: ref("radius"),
    borderStartEndRadius: ref("radius"),
    boxShadow: byState(
        indicator(ref("indicatorWidth"), ref("indicatorColor")),
        {
            hover: indicator(ref("indicatorWidth"), ref("hoverColor")),
            focus: indicator(ref("focusIndicatorWidth"), ref("focusColor")),
            error: indicator(ref("indicatorWidth"), ref("errorColor")),
            errorFocus: indicator(
                ref("focusIndicatorWidth"),
                ref("errorColor"),
            ),
            disabled: indicator(
                ref("indicatorWidth"),
                disabledColor("disabledContent"),
            ),
        },
    ),
};

const strokeWidth = byState<NumericValue>(ref("indicatorWidth"), {
    focus: ref("focusIndicatorWidth"),
    error: ref("indicatorWidth"),
    errorFocus: ref("focusIndicatorWidth"),
    disabled: ref("indicatorWidth"),
});

const outlined: StyleMap = {
    borderRadius: ref("radius"),
    outlineStyle: solid,
    outlineWidth: strokeWidth,
    outlineOffset: byState<NumericValue>(
        mul(ref("indicatorWidth"), unitless(-1)),
        {
            focus: mul(ref("focusIndicatorWidth"), unitless(-1)),
            error: mul(ref("indicatorWidth"), unitless(-1)),
            errorFocus: mul(ref("focusIndicatorWidth"), unitless(-1)),
            disabled: mul(ref("indicatorWidth"), unitless(-1)),
        },
    ),
    outlineColor: byState<ColorValue>(ref("outlineColor"), {
        hover: ref("hoverColor"),
        focus: ref("focusColor"),
        error: ref("errorColor"),
        errorFocus: ref("errorColor"),
        disabled: disabledColor("disabledContainer"),
    }),
};

// The label and the supporting text follow the root: focus inside it, an invalid or disabled
// cell.
const ROOT_FOCUSED = slot("root", "focusWithin");
const ROOT_INVALID = slot("root", "invalid");
const ROOT_DISABLED = slot("root", "disabled");

const pf = typed();

/** Build the code field with a `color` variant per group in `groups`, setting its focus color.
 *  Errors keep the error color. */
export const createCodeField = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{
        color: G | typeof DEFAULT_GROUP;
        density: "inherit" | D;
    }>()(
        pf.slotComponent({
            name: "codeField",
            $meta: {
                description:
                    "Code field (pureform's own, not in M3): a row of single-character cells, filled or outlined, for a verification code, one-time code or PIN, with the label above and supporting text below. Mark errors with aria-invalid on the cells.",
            },
            tokens,
            slots: ["root", "label", "control", "input", "supportingText"],
            structure: {
                root: ["label", "control", "supportingText"],
                control: ["input"],
            },
            variants: {
                variant: ["filled", "outlined"],
                color: groups as ColorGroups,
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    root: {
                        display: flex,
                        flexDirection: column,
                        gap: ref("labelGap"),
                    },
                    label: {
                        textStyle: textStyle("bodySmall"),
                        color: when()
                            .on(ROOT_FOCUSED, ref("focusColor"))
                            .on(ROOT_INVALID, ref("errorColor"))
                            .on(ROOT_DISABLED, disabledColor("disabledContent"))
                            .else(ref("labelColor")),
                    },
                    control: {
                        display: flex,
                        flexDirection: row,
                        alignItems: center,
                        gap: ref("cellGap"),
                    },
                    input: {
                        ...inputText(ref("inputColor")),
                        textStyle: textStyle("headlineSmall"),
                        textAlign: center,
                        flexShrink: unitless(0),
                        width: ref("cellWidth"),
                        height: add(ref("height"), ref("densityOffset")),
                        paddingInlineStart: px(0),
                        paddingInlineEnd: px(0),
                        paddingBlockStart: px(0),
                        paddingBlockEnd: px(0),
                        transition: stateTransition,
                    },
                    supportingText: {
                        ...supportingTextStyle,
                        color: when()
                            .on(ROOT_INVALID, ref("errorColor"))
                            .on(ROOT_DISABLED, disabledColor("disabledContent"))
                            .else(ref("supportingColor")),
                    },
                },
                variants: {
                    variant: {
                        filled: { input: filled },
                        outlined: { input: outlined },
                    },
                    // A color group points the focus color, which the label and the cells'
                    // indicator and stroke read, at its main color.
                    color: colorVariant(groups, (g) => ({
                        root: { tokens: { focusColor: g.main } },
                    })),
                    density: densityTokenVariant(densities),
                },
                defaultVariants: {
                    variant: "filled",
                    color: DEFAULT_GROUP,
                    density: "inherit",
                },
            }),
        }),
    );

export const codeField = createCodeField();
