// The pureform table: a data table with a header, rows, a footer, sortable column headers and an
// optional selection column. Material 3 doesn't specify one; the parts and token names follow
// Angular Material's M3 table and sort header, drawn from the theme's roles.
//
// Markup: a table laid out as flex rows, so every target draws it alike, with the table roles
// written out (a flex `<table>` keeps them only when they're explicit).
//
//   <table class={root} role="table">
//     <thead class={header} role="rowgroup">
//       <tr class={headerRow} role="row">
//         <th class={selectionCell} role="columnheader"><Checkbox /></th>
//         <th class={headerCell} role="columnheader" aria-sort="ascending">
//           <button class={sortHeader} data-pf-filled>
//             <span class={sortLabel}>Name</span>
//             <span class={sortIndicator} aria-hidden="true"><ArrowUpward /></span>
//           </button>
//         </th>
//       </tr>
//     </thead>
//     <tbody class={body} role="rowgroup">
//       <tr class={row} role="row" aria-selected="true">
//         <td class={selectionCell} role="cell"><Checkbox /></td>
//         <td class={cell} role="cell">Hydrogen</td>
//       </tr>
//       <tr class={alternateRow} role="row">…</tr>
//     </thead>
//     <tfoot class={footer} role="rowgroup">
//       <tr class={footerRow} role="row"><td class={footerCell} role="cell">…</td></tr>
//     </tfoot>
//   </table>
//
// A striped table renders every other body row as `alternateRow`. A sorted column's sort header
// is marked `filled`. The arrow always points up and turns over, on the chevrons' spring, while
// its header cell is sorted descending (`aria-sort`).

import { typed } from "@pureform/core";
import {
    add,
    center,
    column,
    flex,
    literal,
    platform,
    pointer,
    px,
    relative,
    row,
    slot,
    solid,
    start,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { AliasNode, StyleMap } from "@pureform/core/ast";
import { size, spacing, textStyle, zIndex } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import {
    componentTokens,
    defaultDensities,
    DENSITY_TOKEN,
    densitySteps,
    densityTokenVariant,
    focusRing,
    iconBox,
    INDICATION_ROOT,
    slotStateLayer,
    springTweens,
    stateTransition,
    sys,
    turnedOver,
    variantsOf,
} from "./shared";
import type { Densities } from "./shared";

const { tokens, ref } = componentTokens("dataTable", {
    container: sys("surface"),
    // Every other body row of a striped table.
    alternateContainer: sys("surfaceContainerLow"),
    headerColor: sys("onSurface"),
    content: sys("onSurface"),
    footerColor: sys("onSurface"),
    selectedContainer: sys("secondaryContainer"),
    selectedContent: sys("onSecondaryContainer"),
    outlineColor: sys("outlineVariant"),
    outlineWidth: px(1),
    headerHeight: px(56),
    rowHeight: px(52),
    footerHeight: px(52),
    cellPaddingInline: spacing("4"),
    // The selection column: wide enough for a checkbox's 40px target and the cells' padding.
    selectionWidth: px(72),
    arrowColor: sys("onSurface"),
    arrowSize: size("iconSmall"),
    arrowGap: spacing("1"),
    // How much of the arrow shows on an unsorted column's hovered or focused header.
    arrowHintOpacity: unitless(0.38),
    ...DENSITY_TOKEN,
    ...INDICATION_TOKENS,
});

const pf = typed();

// A row: cells side by side, as tall as its height at the table's density, with a rule below.
const rowStyle = (height: AliasNode, color: AliasNode): StyleMap => ({
    display: flex,
    flexDirection: row,
    alignItems: center,
    minHeight: add(height, ref("densityOffset")),
    borderWidth: px(0),
    borderStyle: solid,
    borderBlockEndWidth: ref("outlineWidth"),
    borderBlockEndColor: ref("outlineColor"),
    color,
});

// A body row: tinted while hovered or while something inside it has keyboard focus, and filled
// with the selected colors once selected.
const bodyRow = (part: string, container: AliasNode): StyleMap => ({
    ...rowStyle(ref("rowHeight"), ref("content")),
    transition: stateTransition,
    backgroundColor: slotStateLayer(
        ref,
        part,
        { base: container, content: ref("content") },
        {
            state: slot(part, "selected"),
            base: ref("selectedContainer"),
            content: ref("selectedContent"),
        },
    ),
    states: { selected: { color: ref("selectedContent") } },
});

// A cell takes an equal share of the row, and its content starts at its inline start.
const cellStyle = (style: string): StyleMap => ({
    display: flex,
    flexDirection: row,
    alignItems: center,
    flexGrow: unitless(1),
    flexShrink: unitless(1),
    flexBasis: px(0),
    minWidth: px(0),
    paddingInlineStart: ref("cellPaddingInline"),
    paddingInlineEnd: ref("cellPaddingInline"),
    textStyle: textStyle(style),
    textAlign: start,
});

// The arrow shows in full on a sorted column, faintly while an unsorted one's header is hovered
// or focused, and not at all otherwise. A later case wins where several hold.
const arrowOpacity = when()
    .on(slot("sortHeader", "hover"), ref("arrowHintOpacity"))
    .on(slot("sortHeader", "focusVisibleWithin"), ref("arrowHintOpacity"))
    .on(slot("sortHeader", "filled"), unitless(1))
    .else(unitless(0));

// The arrow turns over while its column is sorted descending.
const arrowTurn = turnedOver(slot("headerCell", "descending"));

/** Build the table with a `density` step per entry of `densities`. */
export const createTable = <D extends string = MaterialDensity>(
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ density: "inherit" | D }>()(
        pf.slotComponent({
            name: "dataTable",
            bindingVariants: ["density"],
            $meta: {
                description:
                    "Data table: header, body and footer rows of cells, sortable column headers with an arrow, and an optional selection column. Striped tables render every other body row as alternateRow; stickyHeader keeps the header in view while the table scrolls.",
            },
            tokens,
            slots: [
                "root",
                "header",
                "body",
                "footer",
                "headerRow",
                "row",
                "alternateRow",
                "footerRow",
                "headerCell",
                "cell",
                "footerCell",
                "selectionCell",
                "sortHeader",
                "sortLabel",
                "sortIndicator",
            ],
            structure: {
                root: ["header", "body", "footer"],
                header: ["headerRow"],
                body: ["row", "alternateRow"],
                footer: ["footerRow"],
                // A part sits in one place: the cells of an alternate row, a header and a footer
                // are the same parts as a row's.
                headerRow: ["headerCell"],
                row: ["selectionCell", "cell"],
                footerRow: ["footerCell"],
                headerCell: ["sortHeader"],
                sortHeader: ["sortLabel", "sortIndicator"],
            },
            indication: [
                {
                    trigger: "sortHeader",
                    surface: "sortHeader",
                    centered: false,
                    focus: "sortHeader",
                },
            ],
            variants: {
                stickyHeader: ["true", "false"],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    root: {
                        ...INDICATION_ROOT,
                        display: flex,
                        flexDirection: column,
                        backgroundColor: ref("container"),
                        color: ref("content"),
                    },
                    header: {
                        display: flex,
                        flexDirection: column,
                        backgroundColor: ref("container"),
                    },
                    body: { display: flex, flexDirection: column },
                    footer: { display: flex, flexDirection: column },
                    headerRow: rowStyle(
                        ref("headerHeight"),
                        ref("headerColor"),
                    ),
                    row: bodyRow("row", ref("container")),
                    alternateRow: bodyRow(
                        "alternateRow",
                        ref("alternateContainer"),
                    ),
                    footerRow: {
                        ...rowStyle(ref("footerHeight"), ref("footerColor")),
                        borderBlockEndWidth: px(0),
                    },
                    headerCell: cellStyle("titleSmall"),
                    cell: cellStyle("bodyMedium"),
                    footerCell: cellStyle("bodyMedium"),
                    // The checkbox column: one width in every row, so an empty footer cell keeps
                    // the columns in line, with the checkbox in its middle.
                    selectionCell: {
                        display: flex,
                        flexDirection: row,
                        alignItems: center,
                        justifyContent: center,
                        flexGrow: unitless(0),
                        flexShrink: unitless(0),
                        width: ref("selectionWidth"),
                        minWidth: ref("selectionWidth"),
                        paddingInlineStart: px(0),
                        paddingInlineEnd: px(0),
                    },
                    // The button a sortable column's header holds: its label and the arrow.
                    sortHeader: {
                        ...focusRing(ref),
                        transition: stateTransition,
                        position: relative,
                        display: flex,
                        flexDirection: row,
                        alignItems: center,
                        gap: ref("arrowGap"),
                        paddingInlineStart: px(0),
                        paddingInlineEnd: px(0),
                        paddingBlockStart: px(0),
                        paddingBlockEnd: px(0),
                        borderWidth: px(0),
                        cursor: pointer,
                        textStyle: textStyle("titleSmall"),
                        color: ref("headerColor"),
                        backgroundColor: stateLayer(ref, {
                            base: transparent,
                            content: ref("headerColor"),
                        }),
                    },
                    sortLabel: { textStyle: textStyle("titleSmall") },
                    sortIndicator: {
                        ...iconBox(ref("arrowSize")),
                        transition: springTweens(
                            "spatialFast",
                            ["transform"],
                            ["opacity"],
                        ),
                        color: ref("arrowColor"),
                        opacity: arrowOpacity,
                        transform: arrowTurn,
                    },
                },
                variants: {
                    // The header stays at the top of the scrolling container. React Native has
                    // no sticky position, so there the header stays where it is.
                    stickyHeader: {
                        true: {
                            header: {
                                position: platform(
                                    { css: literal("sticky") },
                                    relative,
                                ),
                                insetBlockStart: px(0),
                                zIndex: zIndex("raised"),
                            },
                        },
                        false: {},
                    },
                    density: densityTokenVariant(densities),
                },
                defaultVariants: {
                    stickyHeader: "false",
                    density: "inherit",
                },
            }),
        }),
    );

export const table = createTable();
