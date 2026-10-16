// The parts Material's text inputs share: the text field and the text area.
//
// Each input has a container (filled or outlined) holding the input and a floating label, and
// supporting text below. The container reads its state from the input inside it; the label
// follows the container, and the supporting text the root. `fieldParts` builds those styles
// over a component's own tokens, so each component keeps its own overridable vars.

import {
    absolute,
    add,
    alias,
    sub,
    column,
    flex,
    mul,
    none,
    pct,
    px,
    relative,
    shadow,
    slot,
    solid,
    transform,
    translateY,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type {
    AliasNode,
    ColorValue,
    NumericValue,
    StyleMap,
    ValueNode,
} from "@pureform/core/ast";
import {
    colorRole,
    radius,
    size as sizeToken,
    spacing,
    textStyle,
} from "@pureform/theme";

import {
    iconBox,
    iconFill,
    inputText,
    DENSITY_TOKEN,
    densityTokenVariant,
    colorVariant,
    componentTokens,
    disabledColor,
    stateTransition,
    sys,
    tweens,
} from "./shared";
import type { ColorGroups, Densities } from "./shared";
import { supportingTextStyle } from "./supporting-text";

/** The tokens every text input has. */
export const FIELD_TOKENS = {
    height: px(56),
    radius: radius("extraSmall"),
    paddingInline: spacing("4"),
    container: sys("surfaceContainerHighest"),
    labelBackground: sys("surface"),
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
    iconSize: sizeToken("iconMedium"),
    iconInset: spacing("3"),
    iconColor: sys("onSurfaceVariant"),
    iconFill: unitless(0),
    // The icon inset, the icon, and the gap before the text.
    textInsetWithIcon: px(52),
    ...DENSITY_TOKEN,
} satisfies Record<string, ValueNode>;

export type FieldToken = keyof typeof FIELD_TOKENS;

/** A text input's tokens: the shared ones plus any of its own. */
export const fieldTokens = <K extends string = never>(
    name: string,
    extra: Record<K, ValueNode> = {} as Record<K, ValueNode>,
) => componentTokens<FieldToken | K>(name, { ...FIELD_TOKENS, ...extra });

/** The slots every text input has, in markup order. */
export const FIELD_SLOTS = [
    "root",
    "container",
    "leadingIcon",
    "input",
    "label",
    "trailingIcon",
    "supportingText",
] as const;

/** How the slots nest: the container holds the optional icons around the input and label. */
export const FIELD_STRUCTURE: {
    root: (typeof FIELD_SLOTS)[number][];
    container: (typeof FIELD_SLOTS)[number][];
} = {
    root: ["container", "supportingText"],
    container: ["leadingIcon", "input", "label", "trailingIcon"],
};

// The container's states, read from the input inside it. The adapter ranks them, so a later
// state wins: hover, then focus, then invalid, then disabled.
export const HOVER = slot("container", "hover");
export const FOCUSED = slot("container", "focusWithin");
export const FILLED = slot("container", "filled");
export const INVALID = slot("container", "invalid");
export const DISABLED = slot("container", "disabled");

/** A value per container state. */
export const byState = <T extends ValueNode>(
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

/** A label value: resting, or floated by focus or a value. */
export const floated = (rest: ValueNode, float: ValueNode) =>
    when().on(FILLED, float).on(FOCUSED, float).else(rest);

const textValue = (
    property: "fontSize" | "lineHeight" | "letterSpacing",
    style: string,
): AliasNode => alias("tokens", property, style);

// The label floats with its color. Its inset moves too where a leading icon pushes it in, and
// the outlined label's notch (padding, margin, background) grows with it.
const labelTransition = tweens(
    "top",
    "insetInlineStart",
    "paddingInlineStart",
    "paddingInlineEnd",
    "marginInlineStart",
    "backgroundColor",
    "transform",
    "fontSize",
    "lineHeight",
    "letterSpacing",
    "color",
);

// The filled container's bottom indicator, an inset shadow so it thickens without moving
// anything.
const indicator = (width: NumericValue, color: ColorValue) =>
    shadow({
        x: px(0),
        y: mul(width, unitless(-1)),
        blur: px(0),
        spread: px(0),
        color,
        inset: true,
    });

export interface FieldOptions {
    /** Where the label's center rests before it floats, from the top of the container. */
    labelRest: NumericValue;
    /** How the text makes room for an icon: `input` pads the input, and `container` pads the
     *  container, so a textarea's scrollbar and resize handle stay clear of the icons. */
    iconRoom: "input" | "container";
    /** Whether density shrinks the field: its height, and the input's padding and a filled
     *  label's floated position, half off the top and half off the bottom. */
    density?: boolean;
}

/** The shared slot styles and variants of a text input, over its tokens. */
export const fieldParts = (
    ref: (token: FieldToken) => AliasNode,
    { labelRest, iconRoom, density = false }: FieldOptions,
) => {
    // The filled indicator and outlined stroke, in a given focus color.
    const indicatorShadow = (focus: ColorValue) =>
        byState(indicator(ref("indicatorWidth"), ref("indicatorColor")), {
            hover: indicator(ref("indicatorWidth"), ref("hoverColor")),
            focus: indicator(ref("focusIndicatorWidth"), focus),
            error: indicator(ref("indicatorWidth"), ref("errorColor")),
            errorFocus: indicator(
                ref("focusIndicatorWidth"),
                ref("errorColor"),
            ),
            disabled: indicator(
                ref("indicatorWidth"),
                disabledColor("disabledContent"),
            ),
        });

    const strokeColor = (focus: ColorValue) =>
        byState(ref("outlineColor"), {
            hover: ref("hoverColor"),
            focus,
            error: ref("errorColor"),
            errorFocus: ref("errorColor"),
            disabled: disabledColor("disabledContainer"),
        });

    const labelColor = (focus: ColorValue) =>
        when()
            .on(FOCUSED, focus)
            .on(INVALID, ref("errorColor"))
            .on(DISABLED, disabledColor("disabledContent"))
            .else(ref("labelColor"));

    const filled: StyleMap = {
        backgroundColor: when()
            .on(DISABLED, disabledColor("disabledContainer"))
            .else(ref("container")),
        borderStartStartRadius: ref("radius"),
        borderStartEndRadius: ref("radius"),
        boxShadow: indicatorShadow(ref("focusColor")),
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
        outlineColor: strokeColor(ref("focusColor")),
    };

    const base = {
        root: { display: flex, flexDirection: column },
        container: {
            transition: stateTransition,
            position: relative,
        },
        input: {
            ...inputText(ref("inputColor")),
            paddingInlineStart: ref("paddingInline"),
            paddingInlineEnd: ref("paddingInline"),
        },
        label: {
            textStyle: textStyle("bodyLarge"),
            fontSize: floated(
                textValue("fontSize", "bodyLarge"),
                textValue("fontSize", "bodySmall"),
            ),
            lineHeight: floated(
                textValue("lineHeight", "bodyLarge"),
                textValue("lineHeight", "bodySmall"),
            ),
            letterSpacing: floated(
                textValue("letterSpacing", "bodyLarge"),
                textValue("letterSpacing", "bodySmall"),
            ),
            position: absolute,
            insetInlineStart: ref("paddingInline"),
            pointerEvents: none,
            color: labelColor(ref("focusColor")),
            transition: labelTransition,
        },
        supportingText: {
            ...supportingTextStyle,
            color: when()
                .on(slot("root", "invalid"), ref("errorColor"))
                .on(slot("root", "disabled"), disabledColor("disabledContent"))
                .else(ref("supportingColor")),
            paddingInlineStart: ref("paddingInline"),
            paddingInlineEnd: ref("paddingInline"),
        },
    } satisfies Record<string, StyleMap>;

    // The sizes density changes, at an offset: half of it off each side.
    const sized = (offset: NumericValue | undefined) => {
        const plus = (value: NumericValue) =>
            offset ? add(value, mul(offset, unitless(0.5))) : value;
        return {
            filled: {
                input: {
                    paddingBlockStart: plus(spacing("6")),
                    paddingBlockEnd: plus(spacing("2")),
                },
                label: { top: floated(labelRest, plus(spacing("2"))) },
            },
            outlined: {
                input: {
                    paddingBlockStart: plus(spacing("4")),
                    paddingBlockEnd: plus(spacing("4")),
                },
            },
        } satisfies Record<string, Record<string, StyleMap>>;
    };
    const themeSized = sized(density ? ref("densityOffset") : undefined);

    const variant = {
        filled: {
            container: filled,
            input: themeSized.filled.input,
            label: {
                ...themeSized.filled.label,
                transform: floated(transform(translateY(pct(-50))), none),
            },
        },
        outlined: {
            container: outlined,
            input: themeSized.outlined.input,
            label: {
                top: floated(labelRest, px(0)),
                transform: transform(translateY(pct(-50))),
                paddingInlineStart: floated(px(0), spacing("1")),
                paddingInlineEnd: floated(px(0), spacing("1")),
                marginInlineStart: floated(
                    px(0),
                    mul(spacing("1"), unitless(-1)),
                ),
                backgroundColor: floated(transparent, ref("labelBackground")),
            },
        },
    } satisfies Record<string, Record<string, StyleMap>>;

    // A color group points the focus color, which the label, indicator, and stroke read, at
    // its main color.
    const colors = (groups: ColorGroups) => ({
        color: colorVariant(groups, (g) => ({
            root: { tokens: { focusColor: g.main } },
        })),
    });

    // Icons sit centered on the container's height, at either end, as in Material's own text
    // field; the text and the resting label move in past them.
    const icon = (side: "Start" | "End"): StyleMap => ({
        position: absolute,
        top: pct(50),
        [`insetInline${side}`]: ref("iconInset"),
        ...iconBox(ref("iconSize"), {
            fill: iconFill(ref("iconFill")),
            transform: [translateY(pct(-50))],
        }),
        color: when()
            .on(DISABLED, disabledColor("disabledContent"))
            .else(ref("iconColor")),
    });

    const room = (side: "Start" | "End"): Record<string, StyleMap> =>
        iconRoom === "input"
            ? { input: { [`paddingInline${side}`]: ref("textInsetWithIcon") } }
            : {
                  container: {
                      [`paddingInline${side}`]: sub(
                          ref("textInsetWithIcon"),
                          ref("paddingInline"),
                      ),
                  },
              };

    const icons = {
        base: {
            leadingIcon: icon("Start"),
            // Material turns the trailing icon to the error color with the field.
            trailingIcon: {
                ...icon("End"),
                color: when()
                    .on(INVALID, ref("errorColor"))
                    .on(DISABLED, disabledColor("disabledContent"))
                    .else(ref("iconColor")),
            },
        } satisfies Record<string, StyleMap>,
        variants: {
            leadingIcon: {
                true: {
                    ...room("Start"),
                    label: { insetInlineStart: ref("textInsetWithIcon") },
                },
                false: {},
            },
            trailingIcon: { true: room("End"), false: {} },
        },
        // An outlined label floats onto the border at the usual inset, clear of the icon.
        compoundVariants: [
            {
                match: {
                    variant: "outlined" as const,
                    leadingIcon: "true" as const,
                },
                style: {
                    label: {
                        insetInlineStart: floated(
                            ref("textInsetWithIcon"),
                            ref("paddingInline"),
                        ),
                    },
                },
            },
        ],
        defaultVariants: {
            leadingIcon: "false" as const,
            trailingIcon: "false" as const,
        },
    };

    // The density variant over the given steps, each setting the density token the fills'
    // sizes and the container's `height` read.
    const densityParts = (steps: Densities) => ({
        height: add(ref("height"), ref("densityOffset")),
        variants: { density: densityTokenVariant(steps) },
        defaultVariants: { density: "inherit" as const },
    });

    return { base, variant, colors, icons, densityParts };
};
