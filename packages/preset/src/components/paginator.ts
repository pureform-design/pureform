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
// the library's select. The row ends at the inline end, so it follows the direction. Its height
// follows the density (the theme's, or its `density` step), 56px at the default.

import { typed } from "@pureform/core";
import {
    add,
    center,
    end,
    flex,
    px,
    row,
    unitless,
    wrap,
} from "@pureform/core/ast";
import { spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import {
    componentTokens,
    defaultDensities,
    DENSITY_TOKEN,
    densitySteps,
    densityTokenVariant,
    disabledColor,
    sys,
    variantsOf,
} from "./shared";
import type { Densities } from "./shared";

const { tokens, ref } = componentTokens("paginator", {
    container: sys("surface"),
    content: sys("onSurface"),
    // The row's height, before the density's offset.
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
    // The page buttons' icons, as Angular's paginator-enabled-icon-color and
    // paginator-disabled-icon-color: the icon buttons read them.
    iconColor: sys("onSurfaceVariant"),
    disabledIconColor: disabledColor("disabledContent"),
    ...DENSITY_TOKEN,
});

const pf = typed();

/** Build the paginator with a `density` step per entry of `densities`. */
export const createPaginator = <D extends string = MaterialDensity>(
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ density: "inherit" | D }>()(
        pf.slotComponent({
            name: "paginator",
            bindingVariants: ["density"],
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
                actions: [
                    "firstTrigger",
                    "prevTrigger",
                    "nextTrigger",
                    "lastTrigger",
                ],
            },
            variants: { density: densitySteps<string>(densities) },
            recipe: () => ({
                base: {
                    root: {
                        display: flex,
                        flexDirection: row,
                        flexWrap: wrap,
                        alignItems: center,
                        justifyContent: end,
                        minHeight: add(ref("height"), ref("densityOffset")),
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
                        // The page buttons' icons: on-surface-variant, and on-surface at 38% disabled.
                        providedTokens: {
                            iconButton: {
                                accent: ref("iconColor"),
                                disabledContent: ref("disabledIconColor"),
                            },
                        },
                    },
                    firstTrigger: { flexShrink: unitless(0) },
                    prevTrigger: { flexShrink: unitless(0) },
                    nextTrigger: { flexShrink: unitless(0) },
                    lastTrigger: { flexShrink: unitless(0) },
                },
                variants: { density: densityTokenVariant(densities) },
                defaultVariants: { density: "inherit" },
            }),
        }),
    );

export const paginator = createPaginator();
