// The pureform card: a Material surface that groups related content.
//
// A card is static by default. Set `interactive` when the whole card is clickable (Root is a
// link or a button); it then takes a state layer, lifts on hover, and dims when disabled. Render
// the touch target slot in an interactive card so even a small card meets the Material minimum
// hit area.
//
// Material's anatomy, for a card with more than one thing to do: the media, a header (an avatar,
// the headline and subhead, and an action such as an overflow menu), the content with its
// supporting text, a row of actions, and a footer. A card with its own action and other controls
// wraps the part that acts in the action area, a link or a button, and keeps the other controls
// outside it, so no control sits inside another:
//
//   <div class={root}>                        padded: false, the sections pad themselves
//     <a class={actionArea} href="…">
//       <div class={media}><img … /></div>
//       <div class={header}>
//         <div class={headerText}>
//           <div class={headline}>Basic plan</div>
//           <div class={subhead}>$4 a month</div>
//         </div>
//       </div>
//       <div class={content}><div class={supportingText}>…</div></div>
//     </a>
//     <div class={actions}><button …>Upgrade</button></div>
//   </div>
//
// The container follows the action area: it tints, lifts, draws the focus indicator, and dims
// with it, as Material draws a card's states on the whole container, while the controls beside
// the action area show only their own. The action area is left unpositioned, so the ripple's
// layer inside it spans the whole card.

import { typed } from "@pureform/core";
import {
    alias,
    colorMix,
    column,
    center,
    end,
    flex,
    hidden,
    none,
    pct,
    pointer,
    px,
    relative,
    row,
    slot,
    solid,
    staticPos,
    start,
    stretch,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { ColorValue, StyleMap } from "@pureform/core/ast";
import { opacity, radius, spacing, textStyle } from "@pureform/theme";

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import { tint } from "./shaped";
import {
    componentTokens,
    disabledColor,
    slotStateLayer,
    sys,
    touchTarget,
    stateTransition,
    focusRing,
    indicationRoot,
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
    // The anatomy's sections: the header's row, its text, the supporting text, and the actions.
    headerGap: spacing("4"),
    headlineColor: sys("onSurface"),
    subheadColor: sys("onSurfaceVariant"),
    supportingTextColor: sys("onSurfaceVariant"),
    actionsGap: spacing("2"),
    // Set by each fill, for the container to follow its action area.
    container: sys("surfaceContainerLow"),
    restingShadow: alias("semanticTokens", "shadows", "level1"),
    hoveredShadow: alias("semanticTokens", "shadows", "level2"),
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

// The elevation's shadow alone, for a lift the container takes while another slot is hovered.
const shadow = (level: string) => alias("semanticTokens", "shadows", level);

const ACTION_AREA_HOVER = slot("actionArea", "hover");
const ACTION_AREA_FOCUS = slot("actionArea", "focusVisibleWithin");
const ACTION_AREA_DISABLED = slot("actionArea", "disabled");

const dimmed = (fill: CardFill | "any") =>
    colorMix(
        fill === "any" ? ref("container") : CONTAINER[fill],
        sys("onSurface"),
        opacity("disabledContainer"),
    );

// A fill sets the tokens the container's colors and shadow read (`interactive` reads them, so the
// two groups never set the same property), and draws its resting tint and outline.
const fillVariant = (fill: CardFill): { root: StyleMap } => ({
    root: {
        backgroundImage: tint(RESTING[fill]),
        tokens: {
            container: CONTAINER[fill],
            restingShadow: shadow(RESTING[fill]),
            hoveredShadow: shadow(HOVERED[fill]),
        },
        ...(fill === "outlined"
            ? {
                  borderWidth: ref("outlineWidth"),
                  borderStyle: solid,
                  borderColor: when(
                      ACTION_AREA_DISABLED,
                      disabledColor("disabledContainer"),
                      ref("outlineColor"),
                  ),
              }
            : {}),
    },
});

// A container following its action area, when it has one: the action area's hover, focus, and
// press tint the whole container, its hover lifts it, and a disabled action area dims it. A card
// without an action area never matches these, and its fill's colors hold (the tokens the fill
// sets).
const followsActionArea: StyleMap = {
    backgroundColor: slotStateLayer(ref, "actionArea", {
        base: ref("container"),
        content,
        disabled: dimmed("any"),
    }),
    color: when(
        ACTION_AREA_DISABLED,
        disabledColor("disabledContent"),
        content,
    ),
    boxShadow: when()
        .on(ACTION_AREA_DISABLED, shadow("level0"))
        .on(ACTION_AREA_HOVER, ref("hoveredShadow"))
        .else(ref("restingShadow")),
};

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
                    backgroundColor: dimmed(fill),
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

// A section of the anatomy: padded at its start and sides, the card's bottom padding closing
// the last one.
const section: StyleMap = {
    paddingBlockStart: ref("padding"),
    paddingInlineStart: ref("padding"),
    paddingInlineEnd: ref("padding"),
};

const pf = typed();

export const card = pf.slotComponent({
    name: "card",
    $meta: {
        description:
            "Material card. Set interactive when the whole card is clickable. With other controls, wrap the part that acts in the actionArea (a link or a button), keep the controls outside it, and set padded false to lay it out with the media, header, content, actions, and footer.",
    },
    tokens,
    slots: [
        "root",
        "touchTarget",
        "actionArea",
        "media",
        "header",
        "avatar",
        "headerText",
        "headline",
        "subhead",
        "headerAction",
        "content",
        "supportingText",
        "actions",
        "footer",
    ],
    structure: {
        root: [
            "touchTarget",
            "actionArea",
            "media",
            "header",
            "content",
            "actions",
            "footer",
        ],
        header: ["avatar", "headerText", "headerAction"],
        headerText: ["headline", "subhead"],
        content: ["supportingText"],
    },
    indication: [
        // When interactive: Root is a link or a button.
        { trigger: "root", surface: "root", centered: false, focus: "root" },
        // With an action area: the container shows its states, and the ripple's layer sits in
        // the action area, which leaves it unpositioned so the layer spans the card.
        {
            trigger: "actionArea",
            surface: "root",
            centered: false,
            focus: "root",
            layer: "actionArea",
        },
    ],
    variants: {
        variant: ["elevated", "filled", "outlined"],
        interactive: ["true", "false"],
        padded: ["true", "false"],
        actionsAlign: ["end", "start"],
    },
    recipe: () => ({
        base: {
            root: {
                ...indicationRoot(ref),
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
            // The primary action: a link or a button around the media, header, and content, its
            // own box what a press reaches. The container draws its states and its focus.
            actionArea: {
                position: staticPos,
                display: flex,
                flexDirection: column,
                alignItems: stretch,
                width: pct(100),
                textAlign: start,
                textStyle: textStyle("bodyMedium"),
                color: content,
                backgroundColor: transparent,
                borderWidth: px(0),
                borderRadius: ref("radius"),
                outlineStyle: none,
                paddingBlockStart: px(0),
                paddingBlockEnd: px(0),
                paddingInlineStart: px(0),
                paddingInlineEnd: px(0),
                marginBlockStart: px(0),
                marginBlockEnd: px(0),
                marginInlineStart: px(0),
                marginInlineEnd: px(0),
                cursor: pointer,
                states: { disabled: { pointerEvents: none } },
            },
            // Full bleed at the card's top, as Material places it: the container clips it to its
            // corners. Holds an image, a video, or a Media.
            media: {
                display: flex,
                flexDirection: column,
                overflow: hidden,
            },
            header: {
                ...section,
                display: flex,
                flexDirection: row,
                alignItems: center,
                gap: ref("headerGap"),
            },
            avatar: { display: flex, flexShrink: unitless(0) },
            headerText: {
                display: flex,
                flexDirection: column,
                flexGrow: unitless(1),
                minWidth: px(0),
            },
            headline: {
                textStyle: textStyle("titleMedium"),
                color: ref("headlineColor"),
            },
            subhead: {
                textStyle: textStyle("bodyMedium"),
                color: ref("subheadColor"),
            },
            // An icon button or a menu at the header's end; it's a control of its own, outside
            // the action area.
            headerAction: {
                display: flex,
                flexShrink: unitless(0),
                marginInlineEnd: px(-8),
            },
            content: { ...section, display: flex, flexDirection: column },
            supportingText: {
                textStyle: textStyle("bodyMedium"),
                color: ref("supportingTextColor"),
            },
            actions: {
                ...section,
                display: flex,
                flexDirection: row,
                alignItems: center,
                gap: ref("actionsGap"),
            },
            footer: section,
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
                        boxShadow: ref("restingShadow"),
                        cursor: pointer,
                        states: { disabled: { pointerEvents: none } },
                    },
                },
                // Root doesn't act, so it follows its action area, if it has one, from the
                // tokens the fill sets.
                false: {
                    root: {
                        ...followsActionArea,
                        outlineStyle: when(ACTION_AREA_FOCUS, solid, none),
                    },
                },
            },
            // Sections pad themselves, and the media bleeds to the edges, so the container keeps
            // only its bottom padding and clips what's inside to its corners.
            padded: {
                true: { root: {} },
                false: {
                    root: {
                        paddingBlockStart: px(0),
                        paddingInlineStart: px(0),
                        paddingInlineEnd: px(0),
                        overflow: hidden,
                    },
                },
            },
            actionsAlign: {
                end: { actions: { justifyContent: end } },
                start: { actions: { justifyContent: start } },
            },
        },
        compoundVariants: [
            interactive("elevated"),
            interactive("filled"),
            interactive("outlined"),
        ],
        defaultVariants: {
            variant: "elevated",
            interactive: "false",
            padded: "true",
            actionsAlign: "end",
        },
    }),
});
