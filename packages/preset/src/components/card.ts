// The pureform card: a Material surface that groups related content.
//
// A card is static by default. Set `interactive` when the whole card is clickable; it then
// takes a state layer, lifts on hover, and dims when disabled. Render the touch target slot in
// an interactive card so even a small card meets the Material minimum hit area.

import { typed } from "@pureform/core";
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

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import {
    componentTokens,
    disabledColor,
    surface,
    sys,
    touchTarget,
    stateTransition,
    focusRing,
    INDICATION_ROOT,
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
    ...INDICATION_TOKENS,
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
        ...surface(CONTAINER[fill], content, RESTING[fill]),
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
    match: { interactive: "true" as const, variant: fill },
    style: {
        root: {
            backgroundColor: stateLayer(ref, {
                base: CONTAINER[fill],
                content,
            }),
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

const pf = typed();

export const card = pf.slotComponent({
    name: "card",
    $meta: {
        description:
            "Material card. Set interactive when the whole card is clickable.",
    },
    tokens,
    slots: ["root", "touchTarget"],
    structure: { root: ["touchTarget"] },
    // When interactive: a link or a button.
    indication: [
        { trigger: "root", surface: "root", centered: false, focus: "root" },
    ],
    variants: {
        variant: ["elevated", "filled", "outlined"],
        interactive: ["true", "false"],
    },
    recipe: () => ({
        base: {
            root: {
                ...INDICATION_ROOT,
                ...focusRing(ref),
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
    }),
});
