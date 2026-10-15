// The parts Material's list items and menu items share: a row with an optional leading part,
// text, and an optional trailing part.
//
// A row takes a state layer of its content color when it is interactive, fills with the
// selected colors once marked selected (`aria-selected` or `data-selected`), and dims when
// disabled. The parts inside follow the row through slot conditions, so `rowParts` takes the
// row's slot name.

import {
    center,
    flex,
    none,
    pointer,
    relative,
    row,
    slot,
    when,
} from "@pureform/core/ast";
import type {
    AliasNode,
    ColorValue,
    StyleMap,
    ValueNode,
} from "@pureform/core/ast";
import { size as sizeToken, textStyle } from "@pureform/theme";

import { stateLayer } from "../state-layer";
import {
    componentTokens,
    disabledColor,
    focusRing,
    iconBox,
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
) => {
    const selected = slot(rowSlot, "selected");
    const disabled = slot(rowSlot, "disabled");

    // A part's color: its own at rest, the selected content once selected, dimmed if disabled.
    const partColor = (rest: ColorValue) =>
        when()
            .on(selected, selectedColors.content)
            .on(disabled, disabledColor("disabledContent"))
            .else(rest);

    const row_: StyleMap = {
        transition: stateTransition,
        position: relative,
        display: flex,
        flexDirection: row,
        alignItems: center,
        backgroundColor: ref("container"),
        color: ref("content"),
        states: {
            selected: {
                backgroundColor: selectedColors.container,
                color: selectedColors.content,
            },
            disabled: { color: disabledColor("disabledContent") },
        },
    };

    // An interactive row takes the state layer, the focus ring, and the pointer.
    const interactive: StyleMap = {
        ...focusRing(),
        cursor: pointer,
        backgroundColor: stateLayer({
            base: ref("container"),
            content: ref("content"),
        }),
        states: {
            selected: {
                backgroundColor: stateLayer({
                    base: selectedColors.container,
                    content: selectedColors.content,
                }),
                color: selectedColors.content,
            },
            disabled: {
                pointerEvents: none,
                color: disabledColor("disabledContent"),
            },
        },
    };

    const part = (color: ColorValue): StyleMap => ({
        ...iconBox(ref("iconSize")),
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
) => {
    const p = rowParts(ref, rowSlot, {
        container: group.container,
        content: group.onContainer,
    });
    const color = (style: StyleMap): StyleMap =>
        style.color === undefined ? {} : { color: style.color };
    return {
        row: { states: { selected: p.row.states?.selected ?? {} } },
        interactive: {
            states: { selected: p.interactive.states?.selected ?? {} },
        },
        leading: color(p.leading),
        trailing: color(p.trailing),
        supportingText: color(p.supportingText),
    } satisfies Record<string, StyleMap>;
};
