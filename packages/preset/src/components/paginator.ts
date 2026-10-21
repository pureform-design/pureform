// The pureform paginator: a row at the foot of a table or list that says which items are
// shown, lets people pick how many a page holds, and steps through the pages. M3 has no
// paginator; this follows Angular Material's (read for its parts and token names): the page-size
// label and select, the range label ("1 – 10 of 100"), and the first, previous, next and last
// icon buttons.
//
//   <div class={root} role="group" aria-label="Pagination">
//     <div class={pageSize}><span class={pageSizeLabel}>Items per page:</span><div class={pageSizeSelect}>…</div></div>
//     <span class={rangeLabel} aria-live="polite">1 – 10 of 100</span>
//     <div class={actions}><button class={firstTrigger}>…</button> … <button class={lastTrigger}>…</button></div>
//   </div>
//
// The triggers are icon buttons (the part's class goes on the button); the page-size select is
// the library's select. The row ends at the inline end, so it follows the direction, and sits
// at the theme's density.

import { typed } from "@pureform/core";
import { center, end, flex, px, row, unitless, wrap } from "@pureform/core/ast";
import { spacing, textStyle } from "@pureform/theme";

import { componentTokens, dense, sys } from "./shared";

const { tokens, ref } = componentTokens("paginator", {
    container: sys("surface"),
    content: sys("onSurface"),
    // The row's height, before the theme's density.
    height: px(56),
    padding: spacing("2"),
    gap: spacing("2"),
    // The page-size label's and the select's room, and the range label's inline margins.
    pageSizeGap: spacing("2"),
    pageSizeWidth: px(104),
    // The select's field height, which the select reads through the paginator (before density).
    pageSizeFieldHeight: px(40),
    rangeStart: spacing("6"),
    rangeEnd: spacing("8"),
});

const pf = typed();

export const paginator = pf.slotComponent({
    name: "paginator",
    $meta: {
        description:
            "Paginator (Angular Material parity, not in M3): the page-size select, the range label, and first, previous, next and last icon buttons. The triggers are icon buttons; the page-size select is the select.",
    },
    tokens,
    slots: [
        "root",
        "pageSize",
        "pageSizeLabel",
        "pageSizeSelect",
        "rangeLabel",
        "actions",
        "firstTrigger",
        "prevTrigger",
        "nextTrigger",
        "lastTrigger",
    ],
    structure: {
        root: ["pageSize", "rangeLabel", "actions"],
        pageSize: ["pageSizeLabel", "pageSizeSelect"],
        actions: ["firstTrigger", "prevTrigger", "nextTrigger", "lastTrigger"],
    },
    variants: {},
    recipe: () => ({
        base: {
            root: {
                display: flex,
                flexDirection: row,
                flexWrap: wrap,
                alignItems: center,
                justifyContent: end,
                minHeight: dense(ref("height")),
                paddingInlineStart: ref("padding"),
                paddingInlineEnd: ref("padding"),
                gap: ref("gap"),
                textStyle: textStyle("bodySmall"),
                backgroundColor: ref("container"),
                color: ref("content"),
            },
            pageSize: {
                display: flex,
                flexDirection: row,
                alignItems: center,
                gap: ref("pageSizeGap"),
            },
            pageSizeLabel: { textStyle: textStyle("bodySmall") },
            pageSizeSelect: {
                width: ref("pageSizeWidth"),
                flexShrink: unitless(0),
                // The select inside is compact, as Angular's is: a shorter field than a form's.
                providedTokens: {
                    select: { height: ref("pageSizeFieldHeight") },
                },
            },
            rangeLabel: {
                textStyle: textStyle("bodySmall"),
                marginInlineStart: ref("rangeStart"),
                marginInlineEnd: ref("rangeEnd"),
            },
            actions: {
                display: flex,
                flexDirection: row,
                alignItems: center,
            },
            firstTrigger: { flexShrink: unitless(0) },
            prevTrigger: { flexShrink: unitless(0) },
            nextTrigger: { flexShrink: unitless(0) },
            lastTrigger: { flexShrink: unitless(0) },
        },
        variants: {},
    }),
});
