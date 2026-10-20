// The button group: a row of buttons or icon buttons, as M3 Expressive lays them out.
//
// A standard group spaces its buttons by its size's gap, and the button being pressed widens
// (each button sets `position: "single"`, which turns its `pressedGrowth` on). A `connected`
// group sets them 2px apart and squares the corners where neighbours meet: each button sets
// its `position` in the run (`first`, `middle`, `last`), and `groupCorners` rounds the run's
// outside with the button's own morphing corners and its inside with the button's inner radii.
// The connected group replaces the deprecated segmented button.
//
// Selection (one or several buttons on) comes from Zag's toggle group in the bindings; the
// buttons are toggles, so they draw their selected colors and corners from `aria-pressed`.

import { typed } from "@pureform/core";
import {
    add,
    center,
    flex,
    mul,
    px,
    row,
    slot,
    tween,
    unitless,
    when,
} from "@pureform/core/ast";
import type { NumericValue, StyleMap } from "@pureform/core/ast";
import { duration, easing, radius, spacing } from "@pureform/theme";

import {
    blend,
    componentTokens,
    cornerRadius,
    entriesOf,
    keysOf,
    motionTransition,
    STATE_TWEENS,
} from "./shared";
import { positionCorners } from "./tiles";
import type { Position } from "./tiles";

/** The gap between a standard group's buttons, per size (M3 Expressive's button group
 *  spacing: 18, 12, then 8 from medium up). */
export const BUTTON_GROUP_GAPS = {
    xsmall: px(18),
    small: spacing("3"),
    medium: spacing("2"),
    large: spacing("2"),
    xlarge: spacing("2"),
} satisfies Record<string, NumericValue>;

const { tokens, ref } = componentTokens("buttonGroup", {
    gap: spacing("3"),
    connectedGap: px(2),
    // The `connected` variant's flag.
    connected: unitless(0),
});

/** The tokens a grouped button reads for its corners where it meets a neighbour, besides the
 *  ones `cornerRadius` reads. */
export type GroupCornerToken =
    | "radius"
    | "squareRadius"
    | "pressedRadius"
    | "square"
    | "toggles"
    | "innerRadius"
    | "pressedInnerRadius";

/** A grouped button's corners by its `position` in a connected group, along the inline axis:
 *  the run's outside corners morph as the button's own (`cornerRadius`), and the inside ones
 *  take `innerRadius`, `pressedInnerRadius` while pressed, and the round radius once a toggle
 *  is on. `none` and `single` keep the button's own corners. */
export const groupCorners = (
    ref: (token: GroupCornerToken) => NumericValue,
): Record<Position, StyleMap> => {
    const outer = cornerRadius(ref);
    const inner = when()
        .on(
            slot("root", "selected"),
            blend(ref("innerRadius"), ref("radius"), ref("toggles")),
        )
        .on(slot("root", "pressed"), ref("pressedInnerRadius"))
        .else(ref("innerRadius"));
    return { ...positionCorners(outer, inner, "inline"), single: {} };
};

/** A grouped button's own tokens: its inner corners (where a connected group's buttons meet;
 *  each size sets them from `GROUP_INNER_RADII`), and how much wider it grows while pressed,
 *  which the `position` variant turns on in a standard group. */
export const GROUPED_TOKENS = {
    innerRadius: radius("small"),
    pressedInnerRadius: radius("extraSmall"),
    pressedGrowth: px(0),
} satisfies Record<string, NumericValue>;

/** How much wider a button in a standard group grows while pressed (Compose widens it by
 *  about 15%; a fixed step keeps it a token). */
export const GROUP_GROWTH = spacing("3");

/** A grouped button's transition: the state colors, and its corners and width, which reduced
 *  motion changes at once. */
export const GROUP_TRANSITION = motionTransition(
    ...STATE_TWEENS,
    tween("borderRadius", duration("medium1"), easing("emphasized")),
    tween("paddingInlineStart", duration("medium1"), easing("emphasized")),
    tween("paddingInlineEnd", duration("medium1"), easing("emphasized")),
    tween("width", duration("medium1"), easing("emphasized")),
);

/** A grouped button's `position` variant: `single` in a standard group (it widens while
 *  pressed, on `root`), and the run's corners in a connected one on each slot in `corners`
 *  that draws them. */
export const groupPositionVariant = <S extends string>(
    ref: (token: GroupCornerToken) => NumericValue,
    corners: readonly S[],
): Record<Position, Partial<Record<S | "root", StyleMap>>> => {
    const run = groupCorners(ref);
    const at = (position: "first" | "middle" | "last") =>
        Object.fromEntries(
            corners.map((part) => [part, run[position]]),
        ) as Record<S, StyleMap>;
    return {
        none: {},
        first: at("first"),
        middle: at("middle"),
        last: at("last"),
        single: {
            root: {
                tokens: { pressedGrowth: GROUP_GROWTH },
                transition: GROUP_TRANSITION,
            },
        },
    } as Record<Position, Partial<Record<S | "root", StyleMap>>>;
};

/** A grouped button's inner corners per size, at rest and pressed, for the button's and icon
 *  button's `innerRadius` and `pressedInnerRadius` tokens. */
export const GROUP_INNER_RADII = {
    xsmall: {
        innerRadius: radius("extraSmall"),
        pressedInnerRadius: mul(radius("extraSmall"), unitless(0.5)),
    },
    small: {
        innerRadius: radius("small"),
        pressedInnerRadius: radius("extraSmall"),
    },
    medium: {
        innerRadius: radius("small"),
        pressedInnerRadius: radius("extraSmall"),
    },
    large: {
        innerRadius: radius("large"),
        pressedInnerRadius: radius("medium"),
    },
    xlarge: {
        innerRadius: add(radius("large"), radius("extraSmall")),
        pressedInnerRadius: radius("large"),
    },
    compact: {
        innerRadius: radius("small"),
        pressedInnerRadius: radius("extraSmall"),
    },
} satisfies Record<
    string,
    Record<"innerRadius" | "pressedInnerRadius", NumericValue>
>;

const pf = typed();

/** The button group's container. Its buttons set their own `position`. */
export const buttonGroup = pf.slotComponent({
    name: "buttonGroup",
    $meta: {
        description:
            "M3 Expressive button group: a row of buttons or icon buttons. Give each button position single in a standard group (it widens while pressed), or first, middle and last in a connected one (its inner corners square off). Selection uses toggle buttons with aria-pressed.",
    },
    tokens,
    slots: ["root"],
    variants: {
        size: keysOf(BUTTON_GROUP_GAPS),
        connected: ["false", "true"],
    },
    recipe: () => ({
        base: {
            root: {
                display: flex,
                flexDirection: row,
                alignItems: center,
                gap: blend(ref("gap"), ref("connectedGap"), ref("connected")),
            },
        },
        variants: {
            size: Object.fromEntries(
                entriesOf(BUTTON_GROUP_GAPS).map(([name, gap]) => [
                    name,
                    { root: { tokens: { gap } } },
                ]),
            ),
            connected: {
                false: {},
                true: { root: { tokens: { connected: unitless(1) } } },
            },
        },
        defaultVariants: { size: "small", connected: "false" },
    }),
});
