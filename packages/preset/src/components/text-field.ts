// The pureform text field: Material's filled and outlined text fields.
//
// Markup: a root holding the container and the supporting text, with the input before the
// label inside the container. The input needs a placeholder (a single space when none should
// show), so CSS can tell when it holds a value and float the label.
//
//   <div class={root}>
//     <div class={container}>
//       <input class={input} id="name" placeholder=" " />
//       <label class={label} for="name">Name</label>
//     </div>
//     <span class={supportingText}>Helper or error text</span>
//   </div>
//
// Mark an error with `aria-invalid="true"` on the input. The label and supporting text follow
// their parent's state (focused, filled, invalid), which core's conditions do not express, so
// they use raw parent selectors.

import { defineSlotComponent } from "@pureform/core";
import {
    absolute,
    alias,
    column,
    flex,
    mul,
    none,
    pct,
    px,
    rawCondition,
    relative,
    shadow,
    solid,
    transform,
    transition,
    translateY,
    transparent,
    tween,
    unitless,
    when,
} from "@pureform/core/ast";
import type {
    ColorValue,
    NumericValue,
    StyleMap,
    ValueNode,
} from "@pureform/core/ast";
import {
    colorRole,
    duration,
    easing,
    radius,
    size as sizeToken,
    spacing,
    textStyle,
} from "@pureform/theme";

import { componentTokens, disabledColor, stateTransition, sys } from "./shared";
import { INVALID_INPUT, supportingTextStyle } from "./supporting-text";

const { tokens, ref } = componentTokens("textField", {
    height: px(56),
    radius: radius("extraSmall"),
    paddingInline: spacing("4"),
    container: sys("surfaceContainerHighest"),
    labelBackground: sys("surface"),
    indicatorColor: sys("onSurfaceVariant"),
    outlineColor: sys("outline"),
    hoverColor: sys("onSurface"),
    focusColor: sys("primary"),
    errorColor: colorRole("negative"),
    labelColor: sys("onSurfaceVariant"),
    inputColor: sys("onSurface"),
    supportingColor: sys("onSurfaceVariant"),
    indicatorWidth: px(1),
    focusIndicatorWidth: px(2),
    iconSize: sizeToken("iconMedium"),
});

const css = (selector: string) => rawCondition({ css: selector });

// States of the container, read from the input inside it. Focus repeats its pseudo-class so
// it outranks hover, and the error selectors repeat the attribute so they outrank focus,
// wherever Panda orders the rules.
const INVALID = INVALID_INPUT;
const FOCUSED = css("&:focus-within:focus-within");
const ERRORED = css(`&:has(${INVALID})`);
const ERRORED_FOCUSED = css(`&:has(${INVALID}):focus-within`);
const DISABLED = css("&:has(:disabled)");

// States of the container, from the label (its child) or the supporting text (the root's).
const PARENT_FLOATED = css(
    ":is(:focus-within, :has(:is(input, textarea):not(:placeholder-shown))) > &",
);
const PARENT_FOCUSED = css(":focus-within > &");
const PARENT_ERRORED = css(`:has(${INVALID}) > &`);
const PARENT_DISABLED = css(":has(:disabled) > &");

// A value per container state, the later ones winning.
const byState = <T extends ValueNode>(
    rest: T,
    states: { hover?: T; focus: T; error: T; errorFocus: T; disabled: T },
) => {
    const builder = when();
    if (states.hover) builder.on("hover", states.hover);
    return builder
        .on(FOCUSED, states.focus)
        .on(ERRORED, states.error)
        .on(ERRORED_FOCUSED, states.errorFocus)
        .on(DISABLED, states.disabled)
        .else(rest);
};

// The filled field's bottom indicator, an inset shadow so it thickens without moving anything.
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

const strokeWidth = byState(ref("indicatorWidth"), {
    focus: ref("focusIndicatorWidth"),
    error: ref("indicatorWidth"),
    errorFocus: ref("focusIndicatorWidth"),
    disabled: ref("indicatorWidth"),
});

const outlined: StyleMap = {
    borderRadius: ref("radius"),
    outlineStyle: solid,
    outlineWidth: strokeWidth,
    outlineOffset: byState(mul(ref("indicatorWidth"), unitless(-1)), {
        focus: mul(ref("focusIndicatorWidth"), unitless(-1)),
        error: mul(ref("indicatorWidth"), unitless(-1)),
        errorFocus: mul(ref("focusIndicatorWidth"), unitless(-1)),
        disabled: mul(ref("indicatorWidth"), unitless(-1)),
    }),
    outlineColor: byState(ref("outlineColor"), {
        hover: ref("hoverColor"),
        focus: ref("focusColor"),
        error: ref("errorColor"),
        errorFocus: ref("errorColor"),
        disabled: disabledColor("disabledContainer"),
    }),
};

// A label value: resting in the middle, or floated by focus or a value.
const floated = (rest: ValueNode, float: ValueNode) =>
    when().on(PARENT_FLOATED, float).else(rest);

const labelColor = when()
    .on(PARENT_FOCUSED, ref("focusColor"))
    .on(PARENT_ERRORED, ref("errorColor"))
    .on(PARENT_DISABLED, disabledColor("disabledContent"))
    .else(ref("labelColor"));

const smallText = {
    fontSize: floated(
        textStyleValue("fontSize", "bodyLarge"),
        textStyleValue("fontSize", "bodySmall"),
    ),
    lineHeight: floated(
        textStyleValue("lineHeight", "bodyLarge"),
        textStyleValue("lineHeight", "bodySmall"),
    ),
    letterSpacing: floated(
        textStyleValue("letterSpacing", "bodyLarge"),
        textStyleValue("letterSpacing", "bodySmall"),
    ),
};

function textStyleValue(
    property: "fontSize" | "lineHeight" | "letterSpacing",
    style: string,
): ValueNode {
    return alias("tokens", property, style);
}

// The label floats with its color, under reduced motion instantly.
const labelTransition = when(
    "reducedMotion",
    none,
    transition(
        ...(
            [
                "top",
                "transform",
                "fontSize",
                "lineHeight",
                "letterSpacing",
                "color",
            ] as const
        ).map((property) =>
            tween(property, duration("short3"), easing("standard")),
        ),
    ),
);

export const textField = defineSlotComponent({
    name: "textField",
    $meta: {
        description:
            "Material text field, filled or outlined. Give the input a placeholder (a space works) and put the label after it; mark errors with aria-invalid.",
    },
    tokens,
    slots: ["root", "container", "input", "label", "supportingText"],
    recipe: {
        base: {
            root: { display: flex, flexDirection: column },
            container: {
                transition: stateTransition,
                position: relative,
                height: ref("height"),
            },
            input: {
                textStyle: textStyle("bodyLarge"),
                width: pct(100),
                height: pct(100),
                paddingInlineStart: ref("paddingInline"),
                paddingInlineEnd: ref("paddingInline"),
                borderWidth: px(0),
                outlineStyle: none,
                backgroundColor: transparent,
                color: ref("inputColor"),
                states: {
                    disabled: { color: disabledColor("disabledContent") },
                },
            },
            label: {
                textStyle: textStyle("bodyLarge"),
                ...smallText,
                position: absolute,
                insetInlineStart: ref("paddingInline"),
                pointerEvents: none,
                color: labelColor,
                transition: labelTransition,
            },
            supportingText: {
                ...supportingTextStyle({
                    rest: ref("supportingColor"),
                    error: ref("errorColor"),
                }),
                paddingInlineStart: ref("paddingInline"),
                paddingInlineEnd: ref("paddingInline"),
            },
        },
        variants: {
            variant: {
                filled: {
                    container: filled,
                    input: {
                        paddingBlockStart: spacing("6"),
                        paddingBlockEnd: spacing("2"),
                    },
                    label: {
                        top: floated(pct(50), spacing("2")),
                        transform: floated(
                            transform(translateY(pct(-50))),
                            none,
                        ),
                    },
                },
                outlined: {
                    container: outlined,
                    input: {
                        paddingBlockStart: spacing("4"),
                        paddingBlockEnd: spacing("4"),
                    },
                    label: {
                        top: floated(pct(50), px(0)),
                        transform: transform(translateY(pct(-50))),
                        paddingInlineStart: floated(px(0), spacing("1")),
                        paddingInlineEnd: floated(px(0), spacing("1")),
                        marginInlineStart: floated(
                            px(0),
                            mul(spacing("1"), unitless(-1)),
                        ),
                        backgroundColor: floated(
                            transparent,
                            ref("labelBackground"),
                        ),
                    },
                },
            },
        },
        defaultVariants: { variant: "filled" },
    },
});
