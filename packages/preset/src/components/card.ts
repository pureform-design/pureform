// The pureform card: a Material surface that groups related content.
//
// A card is static by default. Set `interactive` when the whole card is clickable; it then
// takes a state layer, lifts on hover, and dims when disabled. Render the touch target slot in
// an interactive card so even a small card meets the Material minimum hit area.

import { defineSlotComponent } from "@pureform/core";
import {
    colorMix,
    none,
    pointer,
    px,
    relative,
    solid,
} from "@pureform/core/ast";
import type { ColorValue, StyleMap } from "@pureform/core/ast";
import { opacity, radius, spacing } from "@pureform/theme";

import { stateLayer } from "../state-layer";
import {
    componentTokens,
    disabledColor,
    sys,
    touchTarget,
    stateTransition,
    focusRing,
} from "./shared";

type CardFill = "elevated" | "filled" | "outlined";

const { tokens, ref } = componentTokens("card", {
    radius: radius("medium"),
    padding: spacing("4"),
    content: sys("onSurface"),
    outlineWidth: px(1),
    outlineColor: sys("outlineVariant"),
    elevatedContainer: sys("surfaceContainerLow"),
    filledContainer: sys("surfaceContainerHighest"),
    outlinedContainer: sys("surface"),
});

const CONTAINER: Record<CardFill, ColorValue> = {
    elevated: ref("elevatedContainer"),
    filled: ref("filledContainer"),
    outlined: ref("outlinedContainer"),
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

const content = ref("content");

const fillVariant = (fill: CardFill): { root: StyleMap } => ({
    root: {
        backgroundColor: CONTAINER[fill],
        apply: { shadowElevation: RESTING[fill] },
        ...(fill === "outlined"
            ? {
                  borderWidth: ref("outlineWidth"),
                  borderStyle: solid,
                  borderColor: ref("outlineColor"),
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
                        opacity("disabledContainer"),
                    ),
                    color: disabledColor("disabledContent"),
                    apply: { shadowElevation: "level0" },
                    ...(fill === "outlined"
                        ? { borderColor: disabledColor("disabledContainer") }
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
    tokens,
    slots: ["root", "touchTarget"],
    structure: { root: ["touchTarget"] },
    recipe: {
        base: {
            root: {
                ...focusRing(),
                transition: stateTransition,
                position: relative,
                color: content,
                borderRadius: ref("radius"),
                paddingBlockStart: ref("padding"),
                paddingBlockEnd: ref("padding"),
                paddingInlineStart: ref("padding"),
                paddingInlineEnd: ref("padding"),
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
