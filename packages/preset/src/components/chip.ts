// The pureform chip: Material's assist, filter, input, and suggestion chips share one shape.
//
// A chip is outlined by default, or `elevated` with no outline. Marking it selected
// (`aria-selected="true"` or `data-selected`) fills it with the secondary container, as a
// selected filter or input chip. Render the icon slot only when there is an icon.

import { typed } from "@pureform/core";
import { px, solid, transparent, slot, when, add } from "@pureform/core/ast";
import type { ColorValue, StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";

import { stateLayer } from "../state-layer";
import {
    COLOR_GROUPS,
    DEFAULT_GROUP,
    colorVariant,
    componentTokens,
    groupRoles,
    disabledColor,
    sys,
    touchTarget,
    iconBox,
    pressableRoot,
    dense,
    densityVariant,
    DEFAULT_DENSITIES,
} from "./shared";
import type { ColorGroups, Densities } from "./shared";

const { tokens, ref } = componentTokens("chip", {
    height: sizeToken("controlSmall"),
    radius: radius("small"),
    gap: spacing("2"),
    padding: spacing("4"),
    iconSize: sizeToken("iconSmall"),
    iconColor: sys("primary"),
    outlineWidth: px(1),
    outlineColor: sys("outlineVariant"),
    container: transparent,
    elevatedContainer: sys("surfaceContainerLow"),
    content: sys("onSurfaceVariant"),
    selectedContainer: sys("secondaryContainer"),
    selectedContent: sys("onSecondaryContainer"),
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
    backgroundColor: stateLayer({ base: container, content: ref("content") }),
    color: ref("content"),
    states: {
        selected: {
            backgroundColor: stateLayer({
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

const pf = typed();

/** Build the chip with a `color` variant per group in `groups`. A group colors the selected
 *  chip: its container and content, and the icon. At rest, every chip is neutral. */
export const createChip = (
    groups: ColorGroups = COLOR_GROUPS,
    densities: Densities = DEFAULT_DENSITIES,
) =>
    pf.slotComponent({
        name: "chip",
        $meta: {
            description:
                "Material chip. Mark it selected with aria-selected or data-selected. Render the icon slot only when there is an icon.",
        },
        tokens,
        slots: ["root", "icon", "label", "touchTarget"],
        structure: { root: ["touchTarget", "icon", "label"] },
        variants: {
            variant: ["outlined", "elevated"],
            color: groups,
            density: ["inherit", ...Object.keys(densities)],
        },
        recipe: () => ({
            base: {
                root: {
                    ...pressableRoot,
                    gap: ref("gap"),
                    height: dense(ref("height")),
                    paddingInlineStart: ref("padding"),
                    paddingInlineEnd: ref("padding"),
                    borderRadius: ref("radius"),
                },
                icon: {
                    ...iconBox(ref("iconSize")),
                    color: iconColor(ref("selectedContent")),
                },
                label: { textStyle: textStyle("labelLarge") },
                touchTarget,
            },
            variants: {
                variant: {
                    outlined: { root: fillRoot("outlined", TOKEN_SELECTED) },
                    elevated: { root: fillRoot("elevated", TOKEN_SELECTED) },
                },
                color: colorVariant(groups, (g) => ({
                    icon: { color: iconColor(g.onContainer) },
                })),
                density: densityVariant(densities, (offset) => ({
                    root: { height: add(ref("height"), offset) },
                })),
            },
            // The selected colors sit in each fill's states, so a compound variant per fill and
            // group replaces them in the later layer.
            compoundVariants: groups
                .filter((group) => group !== DEFAULT_GROUP)
                .flatMap((group) =>
                    (["outlined", "elevated"] as const).map((fill) => {
                        const g = groupRoles(group);
                        const root = fillRoot(fill, {
                            container: g.container,
                            content: g.onContainer,
                        });
                        return {
                            match: { variant: fill, color: group },
                            style: { root: { states: root.states ?? {} } },
                        };
                    }),
                ),
            defaultVariants: {
                variant: "outlined",
                color: DEFAULT_GROUP,
                density: "inherit",
            },
        }),
    });

export const chip = createChip();
