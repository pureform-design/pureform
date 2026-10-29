// The pureform chip: Material's assist, filter, and suggestion chips share one shape. Input chips
// are their own component, `inputChip` (`input-chip.ts`).
//
// A chip is outlined by default, or `elevated` with no outline. Marking it selected
// (`aria-selected="true"` or `aria-pressed="true"`) fills it with the secondary container, as a
// selected filter chip. Render the icon slot only when there is an icon.
//
// A chip's corners are `square` at rest (the medium radius) and tighten while pressed. `corner`
// picks them: `square` (the default) or `round`, and a filter chip, which sets `toggle: "true"`,
// swaps them once selected, as Expressive's filter chips morph. The optional `trailingIcon` slot
// (a filter chip's dropdown arrow) sits after the label with its own size and spacing.

import { typed } from "@pureform/core";
import {
    auto,
    center,
    flex,
    nowrap,
    px,
    row,
    solid,
    transparent,
    slot,
    when,
    add,
    unitless,
    wrap,
} from "@pureform/core/ast";
import type { ColorValue, NumericValue, StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import type { IndicationRef } from "../state-layer";
import { spatialCornerTransition } from "./shared";
import {
    DEFAULT_GROUP,
    colorVariant,
    cornerMorphTokens,
    cornerMorphVariants,
    cornerRadius,
    componentTokens,
    defaultDensities,
    defaultGroups,
    dense,
    densitySteps,
    densityVariant,
    disabledColor,
    iconBox,
    iconFill,
    indicationRoot,
    pressableRoot,
    sys,
    touchTarget,
    variantsOf,
    pillRadius,
    OWN_SIZE,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const { tokens, ref } = componentTokens("chip", {
    height: sizeToken("controlSmall"),
    // The round corner, and the square one the chip rests in, with the `corner` and `toggle`
    // variants' flags: only a toggle swaps when selected.
    ...cornerMorphTokens("chip", "square", radius("medium"), radius("small")),
    gap: spacing("2"),
    padding: spacing("4"),
    iconSize: sizeToken("iconSmall"),
    iconFill: unitless(0),
    iconColor: sys("primary"),
    trailingIconSize: sizeToken("iconSmall"),
    trailingIconSpacing: spacing("1"),
    outlineWidth: px(1),
    outlineColor: sys("outlineVariant"),
    container: transparent,
    elevatedContainer: sys("surfaceContainerLow"),
    content: sys("onSurfaceVariant"),
    selectedContainer: sys("secondaryContainer"),
    selectedContent: sys("onSecondaryContainer"),
    ...INDICATION_TOKENS,
});

/** The colors a selected chip takes from its color group. */
interface Selected {
    container: ColorValue;
    content: ColorValue;
}

const TOKEN_SELECTED: Selected = {
    container: ref("selectedContainer"),
    content: ref("selectedContent"),
};

// The resting, selected, and disabled colors over a given container. Each variant sets them
// all, since a variant's color would otherwise override a selected color set in the base.
const colors = (container: ColorValue, selected: Selected): StyleMap => ({
    backgroundColor: stateLayer(ref, {
        base: container,
        content: ref("content"),
    }),
    color: ref("content"),
    states: {
        selected: {
            backgroundColor: stateLayer(ref, {
                base: selected.container,
                content: selected.content,
            }),
            color: selected.content,
            borderColor: transparent,
        },
        disabled: {
            backgroundColor: transparent,
            color: disabledColor("disabledContent"),
            borderColor: disabledColor("disabledContainer"),
        },
    },
});

type Fill = "outlined" | "elevated";

// A fill's root, with the selected colors given.
const fillRoot = (fill: Fill, selected: Selected): StyleMap => {
    if (fill === "outlined") {
        return {
            ...colors(ref("container"), selected),
            borderWidth: ref("outlineWidth"),
            borderStyle: solid,
            borderColor: ref("outlineColor"),
        };
    }
    const elevated = colors(ref("elevatedContainer"), selected);
    return {
        ...elevated,
        apply: { shadowElevation: "level1" },
        states: {
            ...elevated.states,
            hover: { apply: { shadowElevation: "level2" } },
            disabled: {
                ...elevated.states?.disabled,
                backgroundColor: disabledColor("disabledContainer"),
                apply: { shadowElevation: "level0" },
            },
        },
    };
};

// The icon: the resting icon color, the selected content color when selected, and the
// disabled content color when disabled.
const iconColor = (selected: ColorValue) =>
    when()
        .on(slot("root", "selected"), selected)
        .on(slot("root", "disabled"), disabledColor("disabledContent"))
        .else(ref("iconColor"));

/** The tokens `chipShape` reads, besides the indication's. */
export type ChipShapeToken =
    | "gap"
    | "height"
    | "padding"
    | "radius"
    | "squareRadius"
    | "pressedRadius"
    | "square"
    | "toggles";

/** A chip's root without its colors, shared by the chip and the input chip: a pressable row at
 *  the density's height, padded inline, with the corner morph. */
export const chipShape = (
    name: "chip" | "inputChip",
    ref: IndicationRef & ((token: ChipShapeToken) => NumericValue),
): StyleMap => ({
    ...indicationRoot(ref),
    ...pressableRoot(ref),
    ...OWN_SIZE,
    gap: ref("gap"),
    height: dense(ref("height")),
    paddingInlineStart: ref("padding"),
    paddingInlineEnd: ref("padding"),
    transition: spatialCornerTransition,
    borderRadius: cornerRadius(ref),
    tokens: {
        ...indicationRoot(ref).tokens,
        defaultRadius: pillRadius(name, dense(ref("height"))),
    },
});

const pf = typed();

/** Build the chip with a `color` variant per group in `groups`. A group colors the selected
 *  chip: its container and content, and the icon. At rest, every chip is neutral. */
export const createChip = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
        pf.slotComponent({
            name: "chip",
            $meta: {
                description:
                    "Material chip. Mark it selected with aria-selected or aria-pressed. Render the icon slot only when there is an icon.",
            },
            tokens,
            slots: ["root", "icon", "label", "trailingIcon", "touchTarget"],
            structure: {
                root: ["touchTarget", "icon", "label", "trailingIcon"],
            },
            indication: [
                {
                    trigger: "root",
                    surface: "root",
                    centered: false,
                    focus: "root",
                },
            ],
            variants: {
                variant: ["outlined", "elevated"],
                corner: ["round", "square"],
                toggle: ["false", "true"],
                color: groups as ColorGroups,
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    root: chipShape("chip", ref),
                    icon: {
                        ...iconBox(ref("iconSize"), {
                            fill: iconFill(ref("iconFill")),
                        }),
                        color: iconColor(ref("selectedContent")),
                    },
                    trailingIcon: {
                        ...iconBox(ref("trailingIconSize"), {
                            fill: iconFill(ref("iconFill")),
                        }),
                        marginInlineStart: ref("trailingIconSpacing"),
                        color: iconColor(ref("selectedContent")),
                    },
                    label: { textStyle: textStyle("labelLarge") },
                    touchTarget,
                },
                variants: {
                    variant: {
                        outlined: {
                            root: fillRoot("outlined", TOKEN_SELECTED),
                        },
                        elevated: {
                            root: fillRoot("elevated", TOKEN_SELECTED),
                        },
                    },
                    ...cornerMorphVariants("square"),
                    // A group points the selected colors, which the fills and the icon read,
                    // at its container roles.
                    color: colorVariant(groups, (g) => ({
                        root: {
                            tokens: {
                                selectedContainer: g.container,
                                selectedContent: g.onContainer,
                            },
                        },
                    })),
                    density: densityVariant(densities, (offset) => ({
                        root: {
                            height: add(ref("height"), offset),
                            tokens: {
                                defaultRadius: pillRadius(
                                    "chip",
                                    add(ref("height"), offset),
                                ),
                            },
                        },
                    })),
                },
                defaultVariants: {
                    variant: "outlined",
                    corner: "square",
                    toggle: "false",
                    color: DEFAULT_GROUP,
                    density: "inherit",
                },
            }),
        }),
    );

export const chip = createChip();

const set = componentTokens("chipSet", {
    // Material's 8dp between chips, across and down.
    gap: spacing("2"),
});

/** A set of chips: a row that wraps them, or with `singleLine` keeps them on one line and
 *  scrolls sideways (Android's `ChipGroup`). Its behaviour (a filter set's single or multiple
 *  selection, with toggle chips) comes from the binding; the set only lays them out. */
export const chipSet = pf.slotComponent({
    name: "chipSet",
    $meta: {
        description:
            "A set of Material chips: a row that wraps them, or keeps them on one line and scrolls with singleLine. A selectable filter set's chips are toggle chips with aria-pressed.",
    },
    tokens: set.tokens,
    slots: ["root"],
    variants: { singleLine: ["false", "true"] },
    recipe: () => ({
        base: {
            root: {
                display: flex,
                flexDirection: row,
                alignItems: center,
                gap: set.ref("gap"),
            },
        },
        variants: {
            singleLine: {
                false: { root: { flexWrap: wrap } },
                // React Native has no scrolling overflow: its binding wraps the set in a
                // horizontal scroll view.
                true: { root: { flexWrap: nowrap, overflow: auto } },
            },
        },
        defaultVariants: { singleLine: "false" },
    }),
});
