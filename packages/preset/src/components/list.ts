// The parts Material's list items and menu items share: a row with an optional leading part,
// text, and an optional trailing part.
//
// A row takes a state layer of its content color when it is interactive, fills with the
// selected colors once marked selected (`aria-selected` or `aria-current`), and dims when
// disabled. The parts inside follow the row through slot conditions, so `rowParts` takes the
// row's slot name.

import { typed } from "@pureform/core";
import {
    center,
    column,
    flex,
    none,
    pointer,
    px,
    relative,
    row,
    slot,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type {
    AliasNode,
    ColorValue,
    StyleMap,
    ValueNode,
} from "@pureform/core/ast";
import { size as sizeToken, spacing, textStyle } from "@pureform/theme";

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import {
    componentTokens,
    disabledColor,
    focusRing,
    iconBox,
    iconFill,
    stateTransition,
    sys,
} from "./shared";

/** The tokens every row has. */
export const ROW_TOKENS = {
    container: sys("surface"),
    content: sys("onSurface"),
    supportingColor: sys("onSurfaceVariant"),
    iconColor: sys("onSurfaceVariant"),
    trailingColor: sys("onSurfaceVariant"),
    selectedContainer: sys("secondaryContainer"),
    selectedContent: sys("onSecondaryContainer"),
    iconSize: sizeToken("iconMedium"),
    iconFill: unitless(0),
    ...INDICATION_TOKENS,
} satisfies Record<string, ValueNode>;

export type RowToken = keyof typeof ROW_TOKENS;

/** A row component's tokens: the shared ones plus its own. */
export const rowTokens = <K extends string = never>(
    name: string,
    extra: Record<K, ValueNode> = {} as Record<K, ValueNode>,
) => componentTokens<RowToken | K>(name, { ...ROW_TOKENS, ...extra });

/** The colors a selected row takes: its tokens by default, or a color group's container. */
export interface RowSelected {
    container: ColorValue;
    content: ColorValue;
}

/** The styles of a row's parts, over its tokens. `rowSlot` names the row's slot, which the
 *  parts read their state from. */
export const rowParts = (
    ref: (token: RowToken) => AliasNode,
    rowSlot: string,
    selectedColors: RowSelected = {
        container: ref("selectedContainer"),
        content: ref("selectedContent"),
    },
    // The states that mark the row chosen: a toggleable menu item is `checked` too.
    chosen: readonly ("selected" | "checked")[] = ["selected"],
) => {
    const disabled = slot(rowSlot, "disabled");
    const byChosen = (style: StyleMap) =>
        Object.fromEntries(chosen.map((state) => [state, style]));

    // A part's color: its own at rest, the selected content once selected, dimmed if disabled.
    const partColor = (rest: ColorValue) => {
        const cases = when();
        for (const state of chosen)
            cases.on(slot(rowSlot, state), selectedColors.content);
        return cases.on(disabled, disabledColor("disabledContent")).else(rest);
    };

    const row_: StyleMap = {
        transition: stateTransition,
        position: relative,
        display: flex,
        flexDirection: row,
        alignItems: center,
        backgroundColor: ref("container"),
        color: ref("content"),
        states: {
            ...byChosen({
                backgroundColor: selectedColors.container,
                color: selectedColors.content,
            }),
            disabled: { color: disabledColor("disabledContent") },
        },
    };

    // An interactive row takes the state layer, the focus ring, and the pointer.
    const interactive: StyleMap = {
        ...focusRing(ref),
        cursor: pointer,
        backgroundColor: stateLayer(ref, {
            base: ref("container"),
            content: ref("content"),
        }),
        states: {
            ...byChosen({
                backgroundColor: stateLayer(ref, {
                    base: selectedColors.container,
                    content: selectedColors.content,
                }),
                color: selectedColors.content,
            }),
            disabled: {
                pointerEvents: none,
                color: disabledColor("disabledContent"),
            },
        },
    };

    const part = (color: ColorValue): StyleMap => ({
        ...iconBox(ref("iconSize"), { fill: iconFill(ref("iconFill")) }),
        color: partColor(color),
    });

    return {
        row: row_,
        interactive,
        leading: part(ref("iconColor")),
        trailing: part(ref("trailingColor")),
        // Trailing text, such as a count or a keyboard shortcut. It dims when disabled but keeps
        // its color when selected, as Material's does.
        trailingText: (style: string): StyleMap => ({
            textStyle: textStyle(style),
            color: when()
                .on(disabled, disabledColor("disabledContent"))
                .else(ref("trailingColor")),
        }),
        supportingText: {
            textStyle: textStyle("bodyMedium"),
            color: partColor(ref("supportingColor")),
        } satisfies StyleMap,
    };
};

/** A row's colors in a color group: the selected container and content, on the row and its
 *  parts. */
export const rowGroupColors = (
    ref: (token: RowToken) => AliasNode,
    rowSlot: string,
    group: { container: ColorValue; onContainer: ColorValue },
    chosen: readonly ("selected" | "checked")[] = ["selected"],
) => {
    const p = rowParts(
        ref,
        rowSlot,
        { container: group.container, content: group.onContainer },
        chosen,
    );
    const color = (style: StyleMap): StyleMap =>
        style.color === undefined ? {} : { color: style.color };
    const pick = (style: StyleMap) =>
        Object.fromEntries(
            chosen.map((state) => [state, style.states?.[state] ?? {}]),
        );
    return {
        row: { states: pick(p.row) },
        interactive: { states: pick(p.interactive) },
        leading: color(p.leading),
        trailing: color(p.trailing),
        supportingText: color(p.supportingText),
    } satisfies Record<string, StyleMap>;
};

const listPf = typed();

const LIST = componentTokens("list", {
    container: sys("surface"),
    paddingBlock: spacing("2"),
    segmentedGap: px(2),
});

/** The list around list items: a `<ul>` with the list's padding and container color, and an
 *  `<li>` per item. `segmented` sets its items apart as tiles with a gap between them; the
 *  binding gives each item its `position`, which rounds its corners. */
export const list = listPf.slotComponent({
    name: "list",
    $meta: {
        description:
            "Material list container: a ul around list items in li elements. Segmented sets the items apart as tiles; give each item its position.",
    },
    tokens: LIST.tokens,
    slots: ["root", "item"],
    structure: { root: ["item"] },
    variants: { variant: ["standard", "segmented"] },
    recipe: () => ({
        base: {
            root: {
                display: flex,
                flexDirection: column,
                backgroundColor: LIST.ref("container"),
                marginBlockStart: px(0),
                marginBlockEnd: px(0),
                paddingInlineStart: px(0),
                paddingInlineEnd: px(0),
                paddingBlockStart: LIST.ref("paddingBlock"),
                paddingBlockEnd: LIST.ref("paddingBlock"),
            },
            // A flex box draws no list marker.
            item: { display: flex, flexDirection: column },
        },
        variants: {
            variant: {
                standard: {},
                // The tiles carry the color; the gap between them shows what's behind.
                segmented: {
                    root: {
                        gap: LIST.ref("segmentedGap"),
                        backgroundColor: transparent,
                    },
                },
            },
        },
        defaultVariants: { variant: "standard" },
    }),
});
