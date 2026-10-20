// The pureform button: Material's common button in five fills and seven color groups, at M3
// Expressive's five sizes, with round or square corners and an optional toggle.
//
// Each color group points the button's group tokens at its roles, and each fill reads them, so
// every pairing of fill and group comes from two rules rather than one of its own.
//
// Sizes follow M3 Expressive: `xsmall` (32), `small` (40, the default), `medium` (56), `large`
// (96), and `xlarge` (136), each with its own padding, icon size, gap, label type, and outline
// width. `compact` (48) keeps the earlier large button and is deprecated.
//
// `corner` picks round (fully rounded) or square corners. Pressing a button squares its corners
// a little further, and a toggle that's on swaps them: round turns square and square turns
// round, as Expressive's shape morphs do.
//
// A toggle button sets `toggle: "true"` and marks its state with `aria-pressed`: it rests in
// Material's unselected colors and takes the selected ones once `aria-pressed="true"`.
//
// The icon slot is styled but never toggled by a variant. Render the icon element only when
// there is one, before or after the label; the root's gap spaces it from the label.

import { typed } from "@pureform/core";
import { add, px, slot, transparent, unitless, when } from "@pureform/core/ast";
import type { ColorValue, NumericValue, StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import {
    DEFAULT_GROUP,
    colorTokenVariants,
    cornerRadius,
    cornerTransition,
    componentTokens,
    defaultDensities,
    defaultGroups,
    DENSITY_TOKEN,
    densityTokenVariant,
    densitySteps,
    disabledColor,
    entriesOf,
    fillTokenColors,
    fillVariant,
    groupTokens,
    iconBox,
    iconFill,
    INDICATION_ROOT,
    keysOf,
    sizeTokenName,
    sizeTokens,
    pressableRoot,
    slotStateLayer,
    sys,
    touchTarget,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities, Fill } from "./shared";

const FILLS = {
    filled: "filled",
    tonal: "tonal",
    outlined: "outlined",
    text: "text",
    elevated: "elevated",
} satisfies Record<string, Fill>;

/** One of M3 Expressive's button sizes, or the deprecated `compact` one. */
export interface ButtonSize {
    height: NumericValue;
    padding: NumericValue;
    gap: NumericValue;
    icon: NumericValue;
    label: string;
    outline: NumericValue;
    /** The corner radius of a square button. */
    square: NumericValue;
    /** The corner radius while pressed, whatever the corners at rest. */
    pressed: NumericValue;
}

export const BUTTON_SIZES = {
    xsmall: {
        height: sizeToken("controlSmall"),
        padding: spacing("3"),
        gap: spacing("1"),
        icon: px(20),
        label: "labelLarge",
        outline: px(1),
        square: radius("medium"),
        pressed: radius("small"),
    },
    small: {
        height: sizeToken("controlMedium"),
        padding: spacing("4"),
        gap: spacing("2"),
        icon: px(20),
        label: "labelLarge",
        outline: px(1),
        square: radius("medium"),
        pressed: radius("small"),
    },
    medium: {
        height: px(56),
        padding: spacing("6"),
        gap: spacing("2"),
        icon: px(24),
        label: "titleMedium",
        outline: px(1),
        square: radius("large"),
        pressed: radius("medium"),
    },
    large: {
        height: px(96),
        padding: spacing("12"),
        gap: spacing("3"),
        icon: px(32),
        label: "headlineSmall",
        outline: px(2),
        square: radius("extraLarge"),
        pressed: radius("large"),
    },
    xlarge: {
        height: px(136),
        padding: spacing("16"),
        gap: spacing("4"),
        icon: px(40),
        label: "headlineLarge",
        outline: px(3),
        square: radius("extraLarge"),
        pressed: radius("large"),
    },
    // Deprecated: the earlier large button, kept for apps that use it.
    compact: {
        height: sizeToken("controlLarge"),
        padding: spacing("8"),
        gap: spacing("2"),
        icon: sizeToken("iconSmall"),
        label: "labelLarge",
        outline: px(1),
        square: radius("medium"),
        pressed: radius("small"),
    },
} satisfies Record<string, ButtonSize>;

const { tokens, ref } = componentTokens("button", {
    radius: radius("full"),
    // The size's square and pressed corners, and the `corner` variant's flag between round (0)
    // and square (1), which `cornerRadius` reads.
    squareRadius: radius("medium"),
    pressedRadius: radius("small"),
    square: unitless(0),
    // The `toggle` variant's flag: only a toggle swaps its corners when selected.
    toggles: unitless(0),
    gap: spacing("2"),
    iconSize: px(20),
    iconFill: unitless(0),
    outlineWidth: px(1),
    outlineColor: sys("outline"),
    // Each size's height and padding, so a theme can retune a size.
    ...sizeTokens(BUTTON_SIZES, "height", "height"),
    ...sizeTokens(BUTTON_SIZES, "padding", "padding"),
    ...groupTokens(DEFAULT_GROUP),
    ...DENSITY_TOKEN,
    ...INDICATION_TOKENS,
});

const SELECTED = slot("root", "selected");

/** A toggle button's colors per fill, off and on, as M3 Expressive's toggle buttons draw them. */
const toggleColors = (
    fill: Fill,
): {
    unselected: { container: ColorValue; content: ColorValue };
    selected: { container: ColorValue; content: ColorValue };
} => {
    switch (fill) {
        case "elevated":
            return {
                unselected: {
                    container: sys("surfaceContainerLow"),
                    content: ref("accent"),
                },
                selected: {
                    container: ref("accent"),
                    content: ref("onAccent"),
                },
            };
        case "filled":
            return {
                unselected: {
                    container: sys("surfaceContainer"),
                    content: sys("onSurfaceVariant"),
                },
                selected: {
                    container: ref("accent"),
                    content: ref("onAccent"),
                },
            };
        case "tonal":
            return {
                unselected: {
                    container: ref("accentContainer"),
                    content: ref("onAccentContainer"),
                },
                selected: {
                    container: ref("accent"),
                    content: ref("onAccent"),
                },
            };
        case "outlined":
            return {
                unselected: {
                    container: transparent,
                    content: sys("onSurfaceVariant"),
                },
                selected: {
                    container: sys("inverseSurface"),
                    content: sys("inverseOnSurface"),
                },
            };
        case "text":
            return {
                unselected: {
                    container: transparent,
                    content: sys("onSurfaceVariant"),
                },
                selected: { container: transparent, content: ref("accent") },
            };
    }
};

const toggleStyle = (fill: Fill): { root: StyleMap } => {
    const { unselected, selected } = toggleColors(fill);
    const faint = (container: ColorValue) =>
        container === transparent
            ? transparent
            : disabledColor("disabledContainer");
    return {
        root: {
            backgroundColor: slotStateLayer(
                ref,
                "root",
                {
                    base: unselected.container,
                    content: unselected.content,
                    disabled: faint(unselected.container),
                },
                {
                    state: SELECTED,
                    base: selected.container,
                    content: selected.content,
                    disabled: faint(selected.container),
                },
            ),
            color: when(SELECTED, selected.content, unselected.content),
            // A selected outlined toggle fills instead of drawing its outline.
            ...(fill === "outlined"
                ? {
                      borderColor: when(
                          SELECTED,
                          transparent,
                          ref("outlineColor"),
                      ),
                  }
                : {}),
            states: {
                disabled: {
                    color: disabledColor("disabledContent"),
                    ...(fill === "outlined"
                        ? { borderColor: disabledColor("disabledContainer") }
                        : {}),
                },
            },
        },
    };
};

const pf = typed();

/** Build the button with a `color` variant per group in `groups`. */
export const createButton = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
        pf.slotComponent({
            name: "button",
            $meta: {
                description:
                    'Material common button at M3 Expressive\'s sizes (xsmall to xlarge; compact is deprecated), with round or square corners. Render the icon slot only when there is an icon. A toggle sets toggle to "true" and marks itself selected with aria-pressed="true".',
            },
            tokens,
            slots: ["root", "label", "icon", "touchTarget"],
            structure: { root: ["touchTarget", "icon", "label"] },
            indication: [
                {
                    trigger: "root",
                    surface: "root",
                    centered: false,
                    focus: "root",
                },
            ],
            variants: {
                color: groups as ColorGroups,
                variant: keysOf(FILLS),
                size: keysOf(BUTTON_SIZES),
                corner: ["round", "square"],
                toggle: ["false", "true"],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    root: {
                        ...INDICATION_ROOT,
                        ...pressableRoot(ref),
                        transition: cornerTransition,
                        gap: ref("gap"),
                        borderRadius: cornerRadius(ref),
                    },
                    label: { textStyle: textStyle("labelLarge") },
                    icon: iconBox(ref("iconSize"), {
                        fill: iconFill(ref("iconFill")),
                    }),
                    touchTarget,
                },
                variants: {
                    color: colorTokenVariants(groups),
                    variant: Object.fromEntries(
                        Object.entries(FILLS).map(([name, fill]) => {
                            const { root } = fillVariant(fill, ref);
                            const colors = fillTokenColors(fill, ref);
                            return [
                                name,
                                {
                                    root: {
                                        ...root,
                                        ...colors,
                                        states: {
                                            ...root.states,
                                            disabled: {
                                                ...root.states?.disabled,
                                                ...colors.states?.disabled,
                                            },
                                        },
                                    },
                                },
                            ];
                        }),
                    ),
                    size: Object.fromEntries(
                        entriesOf(BUTTON_SIZES).map(([name, s]) => [
                            name,
                            {
                                root: {
                                    tokens: {
                                        gap: s.gap,
                                        iconSize: s.icon,
                                        outlineWidth: s.outline,
                                        squareRadius: s.square,
                                        pressedRadius: s.pressed,
                                    },
                                    height: add(
                                        ref(sizeTokenName("height", name)),
                                        ref("densityOffset"),
                                    ),
                                    paddingInlineStart: ref(
                                        sizeTokenName("padding", name),
                                    ),
                                    paddingInlineEnd: ref(
                                        sizeTokenName("padding", name),
                                    ),
                                },
                                label: { textStyle: textStyle(s.label) },
                            },
                        ]),
                    ),
                    corner: {
                        round: {},
                        square: { root: { tokens: { square: unitless(1) } } },
                    },
                    toggle: {
                        false: {},
                        true: { root: { tokens: { toggles: unitless(1) } } },
                    },
                    density: densityTokenVariant(densities),
                },
                // A toggle's colors need both its fill and the toggle: one compound per fill.
                compoundVariants: entriesOf(FILLS).map(([variant, fill]) => ({
                    match: { variant, toggle: "true" as const },
                    style: toggleStyle(fill),
                })),
                defaultVariants: {
                    color: "primary",
                    variant: "filled",
                    size: "small",
                    corner: "round",
                    toggle: "false",
                    density: "inherit",
                },
            }),
        }),
    );

export const button = createButton();
