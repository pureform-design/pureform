// The pureform chip: Material's assist, filter, input, and suggestion chips share one shape.
//
// A chip is outlined by default, or `elevated` with no outline. Marking it selected
// (`aria-selected="true"` or `data-selected`) fills it with the secondary container, as a
// selected filter or input chip. Render the icon slot only when there is an icon.

import { defineSlotComponent } from "@pureform/core";
import {
    center,
    inlineFlex,
    mul,
    none,
    pointer,
    px,
    relative,
    row,
    solid,
    transparent,
    unitless,
} from "@pureform/core/ast";
import type { ColorValue, StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";

import { stateLayer } from "../state-layer";
import {
    componentTokens,
    disabledColor,
    stateTransition,
    sys,
    touchTarget,
} from "./shared";

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

// The resting, selected, and disabled colors over a given container. Each variant sets them
// all, since a variant's color would otherwise override a selected color set in the base.
const colors = (container: ColorValue): StyleMap => ({
    backgroundColor: stateLayer({ base: container, content: ref("content") }),
    color: ref("content"),
    states: {
        selected: {
            backgroundColor: stateLayer({
                base: ref("selectedContainer"),
                content: ref("selectedContent"),
            }),
            color: ref("selectedContent"),
            outlineColor: transparent,
        },
        disabled: {
            backgroundColor: transparent,
            color: disabledColor("disabledContent"),
            outlineColor: disabledColor("disabledContainer"),
        },
    },
});

export const chip = defineSlotComponent({
    name: "chip",
    $meta: {
        description:
            "Material chip. Mark it selected with aria-selected or data-selected. Render the icon slot only when there is an icon.",
    },
    tokens,
    slots: ["root", "icon", "label", "touchTarget"],
    recipe: {
        base: {
            root: {
                transition: stateTransition,
                position: relative,
                display: inlineFlex,
                flexDirection: row,
                alignItems: center,
                gap: ref("gap"),
                height: ref("height"),
                paddingInlineStart: ref("padding"),
                paddingInlineEnd: ref("padding"),
                borderWidth: px(0),
                borderRadius: ref("radius"),
                cursor: pointer,
                states: { disabled: { pointerEvents: none } },
            },
            icon: {
                width: ref("iconSize"),
                height: ref("iconSize"),
                color: ref("iconColor"),
            },
            label: { textStyle: textStyle("labelLarge") },
            touchTarget,
        },
        variants: {
            variant: {
                outlined: {
                    root: {
                        ...colors(ref("container")),
                        outlineWidth: ref("outlineWidth"),
                        outlineStyle: solid,
                        outlineColor: ref("outlineColor"),
                        outlineOffset: mul(ref("outlineWidth"), unitless(-1)),
                    },
                },
                elevated: {
                    root: {
                        ...colors(ref("elevatedContainer")),
                        apply: { shadowElevation: "level1" },
                        states: {
                            ...colors(ref("elevatedContainer")).states,
                            hover: { apply: { shadowElevation: "level2" } },
                            disabled: {
                                ...colors(ref("elevatedContainer")).states
                                    ?.disabled,
                                apply: { shadowElevation: "level0" },
                            },
                        },
                    },
                },
            },
        },
        defaultVariants: { variant: "outlined" },
    },
});
