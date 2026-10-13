// The pureform card: a Material surface that groups related content.
//
// A card is static by default. Set `interactive` when the whole card is clickable; it then
// takes a state layer, lifts on hover, and dims when disabled. Render the touch target slot in
// an interactive card so even a small card meets the Material minimum hit area.

import { defineSlotComponent } from "@pureform/core";
import {
    alias,
    colorMix,
    none,
    pointer,
    px,
    relative,
    solid,
} from "@pureform/core/ast";
import type { ColorValue, StyleMap } from "@pureform/core/ast";

import { stateLayer } from "../state-layer";
import { disabledColor, sys, touchTarget } from "./shared";

type CardFill = "elevated" | "filled" | "outlined";

const CONTAINER: Record<CardFill, ColorValue> = {
    elevated: sys("surfaceContainerLow"),
    filled: sys("surfaceContainerHighest"),
    outlined: sys("surface"),
};

const RESTING: Record<CardFill, string> = {
    elevated: "level1",
    filled: "level0",
    outlined: "level0",
};

const HOVERED: Record<CardFill, string> = {
    elevated: "level2",
    filled: "level1",
    outlined: "level1",
};

const content = sys("onSurface");

const fillVariant = (fill: CardFill): { root: StyleMap } => ({
    root: {
        backgroundColor: CONTAINER[fill],
        apply: { shadowElevation: RESTING[fill] },
        ...(fill === "outlined"
            ? {
                  outlineWidth: px(1),
                  outlineStyle: solid,
                  outlineColor: sys("outlineVariant"),
                  outlineOffset: px(-1),
              }
            : {}),
    },
});

// Interactive styling lives in compound variants because the container differs per fill.
const interactive = (fill: CardFill) => ({
    match: { interactive: "true", variant: fill },
    style: {
        root: {
            backgroundColor: stateLayer({ base: CONTAINER[fill], content }),
            states: {
                hover: { apply: { shadowElevation: HOVERED[fill] } },
                disabled: {
                    backgroundColor: colorMix(
                        CONTAINER[fill],
                        sys("onSurface"),
                        alias("tokens", "opacity", "disabledContainer"),
                    ),
                    color: disabledColor("disabledContent"),
                    apply: { shadowElevation: "level0" },
                    ...(fill === "outlined"
                        ? { outlineColor: disabledColor("disabledContainer") }
                        : {}),
                },
            },
        },
    },
});

export const card = defineSlotComponent({
    name: "card",
    $meta: {
        description:
            "Material card. Set interactive when the whole card is clickable.",
    },
    slots: ["root", "touchTarget"],
    recipe: {
        base: {
            root: {
                position: relative,
                color: content,
                borderRadius: alias("tokens", "radii", "medium"),
                paddingBlockStart: alias("tokens", "spacing", "4"),
                paddingBlockEnd: alias("tokens", "spacing", "4"),
                paddingInlineStart: alias("tokens", "spacing", "4"),
                paddingInlineEnd: alias("tokens", "spacing", "4"),
            },
            touchTarget,
        },
        variants: {
            variant: {
                elevated: fillVariant("elevated"),
                filled: fillVariant("filled"),
                outlined: fillVariant("outlined"),
            },
            interactive: {
                true: {
                    root: {
                        cursor: pointer,
                        states: { disabled: { pointerEvents: none } },
                    },
                },
                false: { root: {} },
            },
        },
        compoundVariants: [
            interactive("elevated"),
            interactive("filled"),
            interactive("outlined"),
        ],
        defaultVariants: { variant: "elevated", interactive: "false" },
    },
});
