// The pureform list item: Material's one-, two-, and three-line list items.
//
// Markup: a row holding an optional leading icon, the text, and an optional trailing icon or
// text. Inside the text, an optional overline, the headline, and optional supporting text.
//
//   <li class={root}>
//     <span class={leading}>★</span>
//     <div class={content}>
//       <span class={headline}>Headline</span>
//       <span class={supportingText}>Supporting text</span>
//     </div>
//     <span class={trailingText}>100+</span>
//   </li>
//
// Set `interactive` when the item is clickable (a button or link, or `tabindex`); it then takes
// a state layer and the focus ring. Mark it selected with `aria-selected` or `aria-current`.
//
// An expandable item is a button marked `aria-expanded`, its expand `indicator` in the trailing
// place (turned over while expanded, as the accordion's), and the nested `region` it shows after
// the row, beside it rather than inside it:
//
//   <li>
//     <button class={root} aria-expanded="true" aria-controls="r">
//       <div class={content}>…</div>
//       <span class={indicator}>⌄</span>
//     </button>
//     <div class={region} id="r" role="region">…nested list items…</div>
//   </li>
//
// A swipeable item sits in a `frame` with its `action`: the action under the row, at the frame's
// end, and the row sliding toward the start to uncover it. The action is the row's sibling, so
// an expandable item (a button) or a link swipes too:
//
//   <div class={frame}>
//     <button class={root} aria-expanded="false">…</button>
//     <div class={action} inert><button>Delete</button></div>
//   </div>
//
// The action comes after the row, so Tab reaches the row first; the row is stacked over it.

import { typed } from "@pureform/core";
import {
    absolute,
    add,
    center,
    column,
    flex,
    hidden,
    mul,
    pct,
    relative,
    px,
    slot,
    start,
    transform,
    translateX,
    tween,
    unitless,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, spacing, spring, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { expandIndicator, rowParts, rowTokens } from "./list";
import {
    DEFAULT_GROUP,
    collapseTransition,
    colorVariant,
    disabledColor,
    on,
    defaultDensities,
    defaultGroups,
    DENSITY_TOKEN,
    densityTokenVariant,
    densitySteps,
    indicationRoot,
    motionTransition,
    STATE_TWEENS,
    stateTransition,
    sys,
    variantsOf,
    isolated,
    stackAbove,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";
import type { Position } from "./tiles";
import { positionCorners, POSITIONS, TILE_RADII } from "./tiles";

const pf = typed();

const { tokens, ref, own } = rowTokens(
    "listItem",
    {
        paddingInline: spacing("4"),
        gap: spacing("4"),
        heightOne: px(56),
        heightTwo: px(72),
        heightThree: px(88),
        // A segmented list's tiles.
        segmentedContainer: sys("surfaceContainer"),
        ...TILE_RADII,
        // Swipe to reveal: the action under the row, and how far the row has slid (`swipeOffset`,
        // in pixels along the inline axis, 0 to `actionWidth`; the binding keeps it in step).
        // `actionColor: error` points them at the error container, for a destructive action.
        actionContainer: sys("secondaryContainer"),
        actionContent: on("secondaryContainer"),
        actionWidth: unitless(80),
        swipeOffset: unitless(0),
        // The leading part's sizes by type.
        avatarSize: px(40),
        thumbnailSize: px(56),
        videoWidth: px(114),
        videoHeight: px(64),
        // An expandable item's nested region: how far its rows sit in from the item's.
        regionIndent: spacing("4"),
        ...DENSITY_TOKEN,
    },
    // The offset transitions as a token, so the parts reading it slide without being views that move.
    { swipeOffset: "number" },
);

const parts = rowParts(ref, "root");
// The trailing part without the icon box's fixed width and height: it is at least an icon's box
// (its `minWidth`, `minHeight`) and as large as the control it holds (a remove button).
const {
    width: _fixedWidth,
    height: _fixedHeight,
    ...trailing
} = parts.trailing;

type LineHeight = "heightOne" | "heightTwo" | "heightThree";

const box = (
    width: ReturnType<typeof ref>,
    height: ReturnType<typeof ref>,
    corners: StyleMap = {},
) => ({
    leading: {
        minWidth: width,
        width,
        height,
        overflow: hidden,
        ...corners,
    } satisfies StyleMap,
});

const corners = positionCorners(ref("outerRadius"), ref("innerRadius"));

const tile = (position: Exclude<Position, "none">) => ({
    root: {
        ...corners[position],
        tokens: { container: ref("segmentedContainer") },
    },
    // A swipeable tile's frame clips the action to the tile's corners.
    frame: corners[position],
});

// How far the row has slid, in pixels, along the inline axis: toward the start, so the action
// at the end shows.
const SLID = mul(ref("swipeOffset"), px(1));
const SLID_BACK = mul(ref("swipeOffset"), px(-1));

// The row slides over the action, its state colors fading as ever; it follows a drag at once
// (the drag sets `pressed`) and settles on the fast spatial spring.
const slides: StyleMap = {
    transform: when(
        "rtl",
        transform(translateX(SLID)),
        transform(translateX(SLID_BACK)),
    ),
    transition: when()
        .on(slot("root", "pressed"), stateTransition)
        .else(
            motionTransition(
                ...STATE_TWEENS,
                tween(own("swipeOffset"), { spring: spring("spatialFast") }),
            ),
        ),
};

const lines = (height: LineHeight) => ({
    root: { minHeight: add(ref(height), ref("densityOffset")) },
});

/** Build the list item with a `color` variant per group in `groups`. A group colors the
 *  selected item and its parts with the group's container; at rest, every item is neutral. */
export const createListItem = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
        pf.slotComponent({
            name: "listItem",
            $meta: {
                description:
                    "Material list item. Set lines to the number of text lines, interactive when it is clickable, leadingType to what the leading part holds, and position in a segmented list. Mark it selected with aria-selected or aria-current. An expandable item is a button marked aria-expanded, with its indicator and the nested region after it. swipeable lets the row slide to uncover an action (its swipeOffset token says how far, in pixels); actionColor error colours a destructive action.",
            },
            tokens,
            slots: [
                "root",
                "leading",
                "content",
                "overline",
                "headline",
                "supportingText",
                "trailing",
                "trailingText",
                "indicator",
                "region",
                "frame",
                "action",
            ],
            // The region is the row's sibling, not its child: the row is a button. A swipeable
            // item's frame holds the action and the row, as siblings.
            structure: {
                root: [
                    "leading",
                    "content",
                    "trailing",
                    "trailingText",
                    "indicator",
                ],
                content: ["overline", "headline", "supportingText"],
            },
            // When interactive: a link or a button.
            indication: [
                {
                    trigger: "root",
                    surface: "root",
                    centered: false,
                    focus: "root",
                },
            ],
            variants: {
                lines: ["one", "two", "three"],
                interactive: ["true", "false"],
                leadingType: ["icon", "avatar", "thumbnail", "video"],
                position: [...POSITIONS],
                swipeable: ["false", "true"],
                actionColor: ["secondary", "error"],
                density: densitySteps<string>(densities),
                color: groups as ColorGroups,
            },
            recipe: () => ({
                base: {
                    root: {
                        ...indicationRoot(ref),
                        ...parts.row,
                        // The whole line, as Compose's `ListItem` (`fillMaxWidth`): a `<button>`
                        // would otherwise take only its content's width.
                        width: pct(100),
                        gap: ref("gap"),
                        paddingInlineStart: ref("paddingInline"),
                        paddingInlineEnd: ref("paddingInline"),
                        paddingBlockStart: spacing("2"),
                        paddingBlockEnd: spacing("2"),
                    },
                    leading: parts.leading,
                    // Its text starts at the line's start, in a button too.
                    content: {
                        display: flex,
                        flexDirection: column,
                        width: pct(100),
                        textAlign: start,
                    },
                    overline: {
                        textStyle: textStyle("labelSmall"),
                        color: parts.supportingText.color,
                    },
                    headline: { textStyle: textStyle("bodyLarge") },
                    supportingText: parts.supportingText,
                    trailing: {
                        ...trailing,
                        minHeight: ref("iconSize"),
                    },
                    trailingText: parts.trailingText("labelSmall"),
                    indicator: expandIndicator(
                        parts.trailing,
                        slot("root", "expanded"),
                    ),
                    // Its display is left to the `hidden` attribute that collapses it; it grows
                    // open and shrinks shut as that changes.
                    region: {
                        paddingInlineStart: ref("regionIndent"),
                        transition: collapseTransition,
                    },
                    // A swipeable item's frame: the action and the row, clipped to it. It
                    // isolates them, so the row stacks only against its action.
                    frame: {
                        position: relative,
                        overflow: hidden,
                        ...isolated,
                    },
                    // The revealed action, pinned to the frame's end under the row and
                    // uncovered as the row slides away.
                    action: {
                        position: absolute,
                        insetInlineEnd: px(0),
                        insetBlockStart: px(0),
                        insetBlockEnd: px(0),
                        width: mul(ref("actionWidth"), px(1)),
                        display: flex,
                        alignItems: center,
                        justifyContent: center,
                        backgroundColor: ref("actionContainer"),
                        color: ref("actionContent"),
                        textStyle: textStyle("labelLarge"),
                        states: {
                            disabled: {
                                color: disabledColor("disabledContent"),
                            },
                        },
                    },
                },
                variants: {
                    lines: {
                        one: lines("heightOne"),
                        two: lines("heightTwo"),
                        // Material tops the leading and trailing parts in a three-line item.
                        three: {
                            root: {
                                minHeight: add(
                                    ref("heightThree"),
                                    ref("densityOffset"),
                                ),
                                alignItems: start,
                                paddingBlockStart: spacing("3"),
                                paddingBlockEnd: spacing("3"),
                            },
                        },
                    },
                    interactive: {
                        true: { root: parts.interactive },
                        false: {},
                    },
                    // What the leading part holds: an icon, a round avatar, a square
                    // thumbnail, or a video's frame.
                    leadingType: {
                        icon: {},
                        avatar: box(ref("avatarSize"), ref("avatarSize"), {
                            borderRadius: radius("full"),
                        }),
                        thumbnail: box(
                            ref("thumbnailSize"),
                            ref("thumbnailSize"),
                        ),
                        video: box(ref("videoWidth"), ref("videoHeight")),
                    },
                    // Its place among a segmented list's tiles: a tile's color, and its
                    // corners rounded on the run's outside.
                    position: {
                        none: {},
                        first: tile("first"),
                        middle: tile("middle"),
                        last: tile("last"),
                        single: tile("single"),
                    },
                    // A row that swipes: it slides over the action, in its frame. The binding
                    // sets `touch-action: pan-y` on the web, so a horizontal drag is the row's
                    // and the page scrolls only along the list. The frame clips, so the focus
                    // ring sits inside the row.
                    swipeable: {
                        false: {},
                        true: {
                            root: {
                                ...slides,
                                // Over the action, which follows it in the frame.
                                ...stackAbove(),
                                tokens: {
                                    focusIndicatorOuterOffset: mul(
                                        ref("focusIndicatorThickness"),
                                        unitless(-1),
                                    ),
                                },
                            },
                        },
                    },
                    // The revealed action's colours: the secondary container, or the error
                    // container for a destructive action. Tokens only, read by the action.
                    actionColor: {
                        secondary: {},
                        error: {
                            action: {
                                tokens: {
                                    actionContainer: sys("errorContainer"),
                                    actionContent: on("errorContainer"),
                                },
                            },
                        },
                    },
                    density: densityTokenVariant(densities),
                    // A group points the selected colors, which the row and its parts read,
                    // at its container roles.
                    color: colorVariant(groups, (g) => ({
                        root: {
                            tokens: {
                                selectedContainer: g.container,
                                selectedContent: g.onContainer,
                            },
                        },
                    })),
                },
                defaultVariants: {
                    lines: "one",
                    interactive: "false",
                    leadingType: "icon",
                    position: "none",
                    swipeable: "false",
                    actionColor: "secondary",
                    color: DEFAULT_GROUP,
                    density: "inherit",
                },
            }),
        }),
    );

export const listItem = createListItem();
