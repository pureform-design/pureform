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

import { typed } from "@pureform/core";
import {
    add,
    column,
    flex,
    hidden,
    pct,
    px,
    slot,
    start,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { expandIndicator } from "./accordion";
import { rowParts, rowTokens } from "./list";
import {
    DEFAULT_GROUP,
    colorVariant,
    defaultDensities,
    defaultGroups,
    DENSITY_TOKEN,
    densityTokenVariant,
    densitySteps,
    INDICATION_ROOT,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";
import type { Position } from "./tiles";
import { positionCorners, POSITIONS, TILE_RADII } from "./tiles";

const pf = typed();

const { tokens, ref } = rowTokens("listItem", {
    paddingInline: spacing("4"),
    gap: spacing("4"),
    heightOne: px(56),
    heightTwo: px(72),
    heightThree: px(88),
    // A segmented list's tiles.
    segmentedContainer: sys("surfaceContainer"),
    ...TILE_RADII,
    // The leading part's sizes by type.
    avatarSize: px(40),
    thumbnailSize: px(56),
    videoWidth: px(114),
    videoHeight: px(64),
    // An expandable item's nested region: how far its rows sit in from the item's.
    regionIndent: spacing("4"),
    ...DENSITY_TOKEN,
});

const parts = rowParts(ref, "root");

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
});

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
                    "Material list item. Set lines to the number of text lines, interactive when it is clickable, leadingType to what the leading part holds, and position in a segmented list. Mark it selected with aria-selected or aria-current. An expandable item is a button marked aria-expanded, with its indicator and the nested region after it.",
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
            ],
            // The region is the row's sibling, not its child: the row is a button.
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
                density: densitySteps<string>(densities),
                color: groups as ColorGroups,
            },
            recipe: () => ({
                base: {
                    root: {
                        ...INDICATION_ROOT,
                        ...parts.row,
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
                    trailing: parts.trailing,
                    trailingText: parts.trailingText("labelSmall"),
                    indicator: expandIndicator(
                        parts.trailing,
                        slot("root", "expanded"),
                    ),
                    // Its display is left to the `hidden` attribute that collapses it.
                    region: { paddingInlineStart: ref("regionIndent") },
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
                    color: DEFAULT_GROUP,
                    density: "inherit",
                },
            }),
        }),
    );

export const listItem = createListItem();
