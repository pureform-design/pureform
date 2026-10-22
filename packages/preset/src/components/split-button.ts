// The pureform split button: M3 Expressive's leading button and trailing menu button, side by
// side, sharing a fill, a color group and a size.
//
// The leading button runs the main action; the trailing button opens a menu (render the menu
// component under it) and its icon turns over while the menu is open. The two buttons are round
// on the outside and meet with small inner corners 2px apart; pressing a button rounds its inner
// corners a little more, and the open trailing button is round all over.
//
//   <div class={root}>
//     <button class={leadingButton}>✎ Edit</button>
//     <button class={trailingButton} aria-haspopup="menu" aria-expanded="false">
//       <span class={trailingIcon}>▾</span>
//     </button>
//   </div>
//
// Sizes follow M3 Expressive's buttons (`xsmall` to `xlarge`, `small` the default). Fills are the
// split button's four: `filled` (default), `tonal`, `outlined` and `elevated`.

import { typed } from "@pureform/core";
import {
    add,
    inlineFlex,
    numeric,
    px,
    rotate,
    row,
    slot,
    transform,
    when,
} from "@pureform/core/ast";
import type { NumericValue, StyleMap } from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import { BUTTON_SIZES } from "./button";
import {
    DEFAULT_GROUP,
    colorTokenVariants,
    componentTokens,
    cornerTransition,
    defaultDensities,
    defaultGroups,
    DENSITY_TOKEN,
    densitySteps,
    densityTokenVariant,
    entriesOf,
    fillTokenColors,
    fillVariant,
    groupTokens,
    iconBox,
    INDICATION_ROOT,
    keysOf,
    pressableRoot,
    sizeTokenName,
    sizeTokens,
    sys,
    variantsOf,
} from "./shared";
import { spatialTweens } from "./shaped";
import type { ColorGroup, ColorGroups, Densities, Fill } from "./shared";
import { runCorners } from "./tiles";

const FILLS = {
    filled: "filled",
    tonal: "tonal",
    outlined: "outlined",
    elevated: "elevated",
} satisfies Record<string, Fill>;

/** One of the split button's sizes: the button size it takes its height, padding, gap, icon and
 *  type from, and its own inner corners, at rest and pressed, and the trailing button's padding. */
export interface SplitButtonSize {
    inner: NumericValue;
    pressed: NumericValue;
    trailingPadding: NumericValue;
}

export const SPLIT_BUTTON_SIZES = {
    xsmall: {
        inner: radius("extraSmall"),
        pressed: radius("small"),
        trailingPadding: spacing("3"),
    },
    small: {
        inner: radius("extraSmall"),
        pressed: radius("small"),
        trailingPadding: spacing("3"),
    },
    medium: {
        inner: radius("extraSmall"),
        pressed: radius("medium"),
        trailingPadding: spacing("4"),
    },
    large: {
        inner: radius("small"),
        pressed: radius("large"),
        trailingPadding: spacing("8"),
    },
    xlarge: {
        inner: radius("medium"),
        pressed: radius("large"),
        trailingPadding: spacing("10"),
    },
} satisfies Record<string, SplitButtonSize>;

type Size = keyof typeof SPLIT_BUTTON_SIZES;

const { tokens, ref } = componentTokens("splitButton", {
    // The outside corners, the inner ones at rest and pressed (each size sets them), and the
    // space between the buttons.
    radius: radius("full"),
    innerRadius: radius("extraSmall"),
    pressedInnerRadius: radius("small"),
    gap: px(2),
    iconSize: px(20),
    leadingGap: spacing("2"),
    trailingPadding: spacing("3"),
    outlineWidth: px(1),
    outlineColor: sys("outline"),
    // Each size's height and padding, so a theme can retune a size.
    ...sizeTokens(
        Object.fromEntries(
            keysOf(SPLIT_BUTTON_SIZES).map((s) => [s, BUTTON_SIZES[s]]),
        ) as Record<Size, (typeof BUTTON_SIZES)[Size]>,
        "height",
        "height",
    ),
    ...sizeTokens(
        Object.fromEntries(
            keysOf(SPLIT_BUTTON_SIZES).map((s) => [s, BUTTON_SIZES[s]]),
        ) as Record<Size, (typeof BUTTON_SIZES)[Size]>,
        "padding",
        "padding",
    ),
    ...groupTokens(DEFAULT_GROUP),
    ...DENSITY_TOKEN,
    ...INDICATION_TOKENS,
});

const EXPANDED = slot("trailingButton", "expanded");

/** A button's inner corners: the size's, rounder while pressed. */
const inner = (part: "leadingButton" | "trailingButton") =>
    when()
        .on(slot(part, "pressed"), ref("pressedInnerRadius"))
        .else(ref("innerRadius"));

/** What both buttons share: a pressable row at the size's height, in the fill's colors. */
const button: StyleMap = {
    ...pressableRoot(ref),
    transition: cornerTransition,
};

const pf = typed();

/** Build the split button with a `color` variant per group in `groups`. */
export const createSplitButton = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
        pf.slotComponent({
            name: "splitButton",
            $meta: {
                description:
                    "M3 Expressive split button: a leading button for the main action and a trailing button that opens a menu (mark it aria-expanded while open; its trailingIcon turns over). Both share the fill, color, size and density.",
            },
            tokens,
            slots: ["root", "leadingButton", "trailingButton", "trailingIcon"],
            structure: {
                root: ["leadingButton", "trailingButton"],
                trailingButton: ["trailingIcon"],
            },
            indication: [
                {
                    trigger: "leadingButton",
                    surface: "leadingButton",
                    centered: false,
                    focus: "leadingButton",
                },
                {
                    trigger: "trailingButton",
                    surface: "trailingButton",
                    centered: false,
                    focus: "trailingButton",
                },
            ],
            variants: {
                color: groups as ColorGroups,
                variant: keysOf(FILLS),
                size: keysOf(SPLIT_BUTTON_SIZES),
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    root: {
                        ...INDICATION_ROOT,
                        display: inlineFlex,
                        flexDirection: row,
                        gap: ref("gap"),
                    },
                    leadingButton: {
                        ...button,
                        gap: ref("leadingGap"),
                        textStyle: textStyle("labelLarge"),
                        ...runCorners(
                            ref("radius"),
                            inner("leadingButton"),
                            "inline",
                        ),
                    },
                    trailingButton: {
                        ...button,
                        paddingInlineStart: ref("trailingPadding"),
                        paddingInlineEnd: ref("trailingPadding"),
                        borderStartEndRadius: ref("radius"),
                        borderEndEndRadius: ref("radius"),
                        // Round all over while its menu is open.
                        borderStartStartRadius: when()
                            .on(EXPANDED, ref("radius"))
                            .on(
                                slot("trailingButton", "pressed"),
                                ref("pressedInnerRadius"),
                            )
                            .else(ref("innerRadius")),
                        borderEndStartRadius: when()
                            .on(EXPANDED, ref("radius"))
                            .on(
                                slot("trailingButton", "pressed"),
                                ref("pressedInnerRadius"),
                            )
                            .else(ref("innerRadius")),
                    },
                    // Turns over while the menu is open.
                    trailingIcon: {
                        ...iconBox(ref("iconSize")),
                        transform: when()
                            .on(
                                EXPANDED,
                                transform(rotate(numeric(180, "deg"))),
                            )
                            .else(transform(rotate(numeric(0, "deg")))),
                        transition: spatialTweens("spatialFast", "transform"),
                    },
                },
                variants: {
                    color: colorTokenVariants(groups),
                    variant: Object.fromEntries(
                        entriesOf(FILLS).map(([name, fill]) => {
                            const { root } = fillVariant(fill, ref);
                            const colors = fillTokenColors(fill, ref);
                            const style: StyleMap = {
                                ...root,
                                ...colors,
                                states: {
                                    ...root.states,
                                    disabled: {
                                        ...root.states?.disabled,
                                        ...colors.states?.disabled,
                                    },
                                },
                            };
                            return [
                                name,
                                { leadingButton: style, trailingButton: style },
                            ];
                        }),
                    ),
                    size: Object.fromEntries(
                        entriesOf(SPLIT_BUTTON_SIZES).map(([name, s]) => {
                            const b = BUTTON_SIZES[name];
                            const height = add(
                                ref(sizeTokenName("height", name)),
                                ref("densityOffset"),
                            );
                            const padding = ref(sizeTokenName("padding", name));
                            return [
                                name,
                                {
                                    root: {
                                        tokens: {
                                            iconSize: b.icon,
                                            leadingGap: b.gap,
                                            outlineWidth: b.outline,
                                            innerRadius: s.inner,
                                            pressedInnerRadius: s.pressed,
                                            trailingPadding: s.trailingPadding,
                                        },
                                        height,
                                    },
                                    leadingButton: {
                                        height,
                                        paddingInlineStart: padding,
                                        paddingInlineEnd: padding,
                                        textStyle: textStyle(b.label),
                                    },
                                    trailingButton: { height },
                                },
                            ];
                        }),
                    ),
                    density: densityTokenVariant(densities),
                },
                defaultVariants: {
                    color: DEFAULT_GROUP,
                    variant: "filled",
                    size: "small",
                    density: "inherit",
                },
            }),
        }),
    );

export const splitButton = createSplitButton();
