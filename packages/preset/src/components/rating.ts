// The pureform rating: a row of star icons that picks a value, as a radio group does, with
// half values and a read-only display. Material 3 has no rating, so the design is pureform's own,
// built from the icon button's pieces (an icon in a box, the focus ring, the touch size) and
// the color groups.
//
// Each item draws the empty star; the binding adds the `fill` part over it for a star the value
// reaches, or `halfFill` (clipped to the inline start half) for a half one. All three hold the
// same icon, and the filled ones draw it with Material Symbols' fill axis on.
//
//   <div class={root}>
//     <label class={label}>Quality</label>
//     <div class={control} role="radiogroup">
//       <span class={item} role="radio">
//         <span class={icon}>★</span>
//         <span class={fill}>★</span>
//       </span>
//       …
//     </div>
//   </div>
//
// Sizes: `small` (20), `medium` (24, the default) and `large` (32), each icon in an item with 4px
// around it. The filled stars take the color group's color; empty ones, on-surface-variant.

import { typed } from "@pureform/core";
import {
    absolute,
    add,
    center,
    column,
    flex,
    hidden,
    inlineFlex,
    none,
    mul,
    pointer,
    px,
    relative,
    start,
    unitless,
} from "@pureform/core/ast";
import type { NumericValue, StyleMap } from "@pureform/core/ast";
import { radius, textStyle } from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import type { IndicationRef } from "../state-layer";
import {
    DEFAULT_GROUP,
    colorTokenVariants,
    componentTokens,
    defaultGroups,
    disabledColor,
    entriesOf,
    focusRing,
    groupTokens,
    iconBox,
    iconFill,
    keysOf,
    stateTransition,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

export const RATING_SIZES = {
    small: px(20),
    medium: px(24),
    large: px(32),
} satisfies Record<string, NumericValue>;

const FOCUS_TOKENS = {
    focusIndicatorThickness: INDICATION_TOKENS.focusIndicatorThickness,
    focusIndicatorOuterOffset: INDICATION_TOKENS.focusIndicatorOuterOffset,
    focusIndicatorColor: INDICATION_TOKENS.focusIndicatorColor,
};

const { tokens, ref } = componentTokens("rating", {
    iconSize: px(24),
    // The space around the icon in an item, which is also its touch size.
    itemPadding: px(4),
    gap: px(4),
    emptyColor: sys("onSurfaceVariant"),
    // The stars draw only the group's main role, and no state layer: only the focus ring's
    // indication tokens.
    accent: groupTokens(DEFAULT_GROUP).accent,
    ...FOCUS_TOKENS,
});

/** The focus ring's tokens, the only indication tokens a star draws. */
const focusRef: IndicationRef = (token) =>
    ref(token as keyof typeof FOCUS_TOKENS);

const itemSide = add(
    ref("iconSize"),
    add(ref("itemPadding"), ref("itemPadding")),
);

/** A filled star laid over the empty one, as wide as `share` of the item's icon. */
const filled = (share: number): StyleMap => ({
    ...iconBox(ref("iconSize"), { fill: iconFill(unitless(1)) }),
    // A column, so the glyph keeps its own width and the box clips it instead of squeezing it.
    display: flex,
    flexDirection: column,
    alignItems: start,
    position: absolute,
    insetBlockStart: ref("itemPadding"),
    insetInlineStart: ref("itemPadding"),
    width:
        share === 1 ? ref("iconSize") : mul(ref("iconSize"), unitless(share)),
    minWidth: unitless(0),
    overflow: hidden,
    color: ref("accent"),
    pointerEvents: none,
    states: { disabled: { color: disabledColor("disabledContent") } },
});

const pf = typed();

/** Build the rating with a `color` variant per group in `groups`. */
export const createRating = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "rating",
            $meta: {
                description:
                    "Rating: a radiogroup of star icons with half values and a read-only display. Each item holds the empty icon; the binding adds fill or halfFill over it for the stars the value reaches.",
            },
            tokens,
            slots: [
                "root",
                "label",
                "control",
                "item",
                "icon",
                "fill",
                "halfFill",
            ],
            structure: {
                root: ["label", "control"],
                control: ["item"],
                item: ["icon", "fill", "halfFill"],
            },
            variants: {
                color: groups as ColorGroups,
                size: keysOf(RATING_SIZES),
            },
            recipe: () => ({
                base: {
                    root: {
                        tokens: FOCUS_TOKENS,
                        display: inlineFlex,
                        flexDirection: column,
                        gap: px(4),
                    },
                    label: {
                        textStyle: textStyle("labelLarge"),
                        color: sys("onSurface"),
                    },
                    control: {
                        display: inlineFlex,
                        gap: ref("gap"),
                    },
                    item: {
                        ...focusRing(focusRef),
                        transition: stateTransition,
                        position: relative,
                        display: inlineFlex,
                        alignItems: center,
                        justifyContent: center,
                        width: itemSide,
                        height: itemSide,
                        borderRadius: radius("full"),
                        cursor: pointer,
                    },
                    icon: {
                        ...iconBox(ref("iconSize"), {
                            fill: iconFill(unitless(0)),
                        }),
                        color: ref("emptyColor"),
                        states: {
                            disabled: {
                                color: disabledColor("disabledContent"),
                            },
                        },
                    },
                    fill: filled(1),
                    halfFill: filled(0.5),
                },
                variants: {
                    // The default group's accent is the base's.
                    color: colorTokenVariants(groups, (group) => ({
                        accent: groupTokens(group).accent,
                    })),
                    size: Object.fromEntries(
                        entriesOf(RATING_SIZES).map(([name, icon]) => [
                            name,
                            { root: { tokens: { iconSize: icon } } },
                        ]),
                    ),
                },
                defaultVariants: { color: DEFAULT_GROUP, size: "medium" },
            }),
        }),
    );

export const rating = createRating();
