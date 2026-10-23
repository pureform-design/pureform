// The pureform input chip: Material's input chip, a piece of user input (a tag, a recipient) with
// an optional leading avatar or icon, a label, and a remove button.
//
// It is outlined at rest; marking it selected (`aria-selected="true"`) fills it with the
// secondary container. The tags input renders one per value, and its highlighted chip (the one
// Backspace or the arrow keys reached) hovers. Render the avatar or the icon only when there is
// one, never both; the remove button is a `<button>` of its own, with its own state layer.
//
// The insets differ by what the chip starts and ends with (Material: 4 before an avatar, 8
// before an icon, 12 before the label; 8 after the remove button, else 12). The root pads 12 on
// each side, and the avatar, icon and remove button pull themselves out with negative margins,
// so no variant has to say which are rendered.
//
// The corners morph as the chip's (c1d): `square` at rest, tighter while pressed, and with
// `toggle: "true"` swapped once selected.

import { typed } from "@pureform/core";
import {
    add,
    center,
    hidden,
    inlineFlex,
    px,
    slot,
    solid,
    sub,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import { chipShape } from "./chip";
import {
    DEFAULT_GROUP,
    colorVariant,
    componentTokens,
    cornerMorphTokens,
    cornerMorphVariants,
    defaultDensities,
    defaultGroups,
    densitySteps,
    densityVariant,
    disabledColor,
    iconBox,
    iconFill,
    sys,
    touchTarget,
    variantsOf,
    roundIconButton,
    pillRadius,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const { tokens, ref } = componentTokens("inputChip", {
    height: sizeToken("controlSmall"),
    ...cornerMorphTokens("square", radius("medium"), radius("small")),
    gap: spacing("2"),
    padding: spacing("3"),
    // Where the leading avatar, the leading icon and the remove button sit from the edge.
    avatarInset: spacing("1"),
    iconInset: spacing("2"),
    removeInset: spacing("2"),
    avatarSize: sizeToken("iconMedium"),
    avatarRadius: radius("full"),
    iconSize: sizeToken("iconSmall"),
    iconFill: unitless(0),
    iconColor: sys("onSurfaceVariant"),
    removeSize: sizeToken("iconSmall"),
    removeColor: sys("onSurfaceVariant"),
    outlineWidth: px(1),
    outlineColor: sys("outlineVariant"),
    container: transparent,
    content: sys("onSurfaceVariant"),
    selectedContainer: sys("secondaryContainer"),
    selectedContent: sys("onSecondaryContainer"),
    ...INDICATION_TOKENS,
});

const SELECTED = slot("root", "selected");
const DISABLED = slot("root", "disabled");

// The icon and the remove button: their resting color, the selected content color when the
// chip is selected, and the disabled content color when it's disabled.
const partColor = (rest: "iconColor" | "removeColor") =>
    when()
        .on(SELECTED, ref("selectedContent"))
        .on(DISABLED, disabledColor("disabledContent"))
        .else(ref(rest));

// A negative margin that moves a part from the root's padding to its own inset.
const pullOut = (inset: "avatarInset" | "iconInset" | "removeInset") =>
    sub(ref(inset), ref("padding"));

const root: StyleMap = {
    ...chipShape(ref),
    backgroundColor: stateLayer(ref, {
        base: ref("container"),
        content: ref("content"),
    }),
    color: ref("content"),
    borderWidth: ref("outlineWidth"),
    borderStyle: solid,
    borderColor: ref("outlineColor"),
    states: {
        selected: {
            backgroundColor: stateLayer(ref, {
                base: ref("selectedContainer"),
                content: ref("selectedContent"),
            }),
            color: ref("selectedContent"),
            borderColor: transparent,
        },
        disabled: {
            backgroundColor: transparent,
            color: disabledColor("disabledContent"),
            borderColor: disabledColor("disabledContainer"),
        },
    },
};

const pf = typed();

/** Build the input chip with a `color` variant per group in `groups`. A group colors the
 *  selected chip: its container and content, and its icons. At rest, every chip is neutral. */
export const createInputChip = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
        pf.slotComponent({
            name: "inputChip",
            $meta: {
                description:
                    "Material input chip, as the tags input renders it: an optional avatar or icon, the label, and a remove button. Mark it selected with aria-selected. Render the avatar or the icon only when there is one.",
            },
            tokens,
            slots: ["root", "avatar", "icon", "label", "remove", "touchTarget"],
            structure: {
                root: ["touchTarget", "avatar", "icon", "label", "remove"],
            },
            indication: [
                {
                    trigger: "root",
                    surface: "root",
                    centered: false,
                    focus: "root",
                },
                {
                    trigger: "remove",
                    surface: "remove",
                    centered: true,
                    focus: "remove",
                },
            ],
            variants: {
                corner: ["round", "square"],
                toggle: ["false", "true"],
                color: groups as ColorGroups,
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    root,
                    avatar: {
                        display: inlineFlex,
                        alignItems: center,
                        justifyContent: center,
                        flexShrink: unitless(0),
                        overflow: hidden,
                        width: ref("avatarSize"),
                        height: ref("avatarSize"),
                        borderRadius: ref("avatarRadius"),
                        marginInlineStart: pullOut("avatarInset"),
                    },
                    icon: {
                        ...iconBox(ref("iconSize"), {
                            fill: iconFill(ref("iconFill")),
                        }),
                        marginInlineStart: pullOut("iconInset"),
                        color: partColor("iconColor"),
                    },
                    label: { textStyle: textStyle("labelLarge") },
                    // A borderless round button around the remove icon.
                    remove: {
                        ...roundIconButton(ref, ref("removeSize"), {
                            fill: iconFill(ref("iconFill")),
                            content: ref("removeColor"),
                        }),
                        marginInlineEnd: pullOut("removeInset"),
                        color: partColor("removeColor"),
                    },
                    touchTarget,
                },
                variants: {
                    ...cornerMorphVariants("square"),
                    // A group points the selected colors, which the root and the icons read, at
                    // its container roles.
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
                                radius: pillRadius(add(ref("height"), offset)),
                            },
                        },
                    })),
                },
                defaultVariants: {
                    corner: "square",
                    toggle: "false",
                    color: DEFAULT_GROUP,
                    density: "inherit",
                },
            }),
        }),
    );

export const inputChip = createInputChip();
