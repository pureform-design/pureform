// The pureform accordion: Angular Material's expansion panels, drawn with Material 3's list parts.
// Material 3 has no accordion; its parts come from Angular's expansion panel tokens (container,
// header, title, description, indicator) and Zag's accordion (root, item, item trigger, item
// content, item indicator).
//
// Markup: a column of items, each a tile holding its header (a button) and its content, which
// Zag hides while the item is collapsed. The header is a list row: an optional leading icon, the
// title over an optional description, and the expand indicator, which turns over while the item
// is expanded.
//
//   <div class={root}>
//     <div class={item}>
//       <button class={trigger} aria-expanded="true">
//         <span class={leading}>★</span>
//         <span class={text}>
//           <span class={title}>Title</span>
//           <span class={description}>Description</span>
//         </span>
//         <span class={indicator}>⌄</span>
//       </button>
//       <div class={content}>Content</div>
//     </div>
//   </div>

import { typed } from "@pureform/core";
import {
    add,
    column,
    flex,
    px,
    slot,
    start,
    unitless,
    when,
} from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { expandIndicator, rowParts, rowTokens } from "./list";
import {
    collapseTransition,
    defaultDensities,
    DENSITY_TOKEN,
    densitySteps,
    densityTokenVariant,
    indicationRoot,
    sys,
    variantsOf,
} from "./shared";
import type { Densities } from "./shared";

const pf = typed();

const { tokens, ref } = rowTokens("accordion", {
    // Each item is a tile on the surface container, as a segmented list's items are.
    container: sys("surfaceContainer"),
    radius: radius("medium"),
    itemGap: px(2),
    headerHeight: px(56),
    paddingInline: spacing("4"),
    gap: spacing("4"),
    contentPaddingBlockEnd: spacing("4"),
    contentColor: sys("onSurfaceVariant"),
    ...DENSITY_TOKEN,
});

const parts = rowParts(ref, "trigger");
const EXPANDED = slot("trigger", "expanded");

/** Build the accordion with a `density` step per entry of `densities`. */
export const createAccordion = <D extends string = MaterialDensity>(
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ density: "inherit" | D }>()(
        pf.slotComponent({
            name: "accordion",
            $meta: {
                description:
                    "Expansion panels (Angular Material's accordion) as Material list rows: each item a tile with a header button and its content. Mark the header aria-expanded while its item is open.",
            },
            tokens,
            slots: [
                "root",
                "item",
                "trigger",
                "leading",
                "text",
                "title",
                "description",
                "indicator",
                "content",
            ],
            structure: {
                root: ["item"],
                item: ["trigger", "content"],
                trigger: ["leading", "text", "indicator"],
                text: ["title", "description"],
            },
            indication: [
                {
                    trigger: "trigger",
                    surface: "trigger",
                    centered: false,
                    focus: "trigger",
                },
            ],
            variants: { density: densitySteps<string>(densities) },
            recipe: () => ({
                base: {
                    root: {
                        ...indicationRoot(ref),
                        display: flex,
                        flexDirection: column,
                        gap: ref("itemGap"),
                    },
                    item: {
                        display: flex,
                        flexDirection: column,
                        backgroundColor: ref("container"),
                        color: ref("content"),
                        borderRadius: ref("radius"),
                    },
                    // The header: a full-width list row, its bottom corners square while its
                    // content shows under it.
                    trigger: {
                        ...parts.row,
                        ...parts.interactive,
                        minHeight: add(
                            ref("headerHeight"),
                            ref("densityOffset"),
                        ),
                        gap: ref("gap"),
                        paddingInlineStart: ref("paddingInline"),
                        paddingInlineEnd: ref("paddingInline"),
                        paddingBlockStart: spacing("2"),
                        paddingBlockEnd: spacing("2"),
                        borderWidth: px(0),
                        textAlign: start,
                        borderStartStartRadius: ref("radius"),
                        borderStartEndRadius: ref("radius"),
                        borderEndStartRadius: when(
                            "expanded",
                            px(0),
                            ref("radius"),
                        ),
                        borderEndEndRadius: when(
                            "expanded",
                            px(0),
                            ref("radius"),
                        ),
                    },
                    leading: parts.leading,
                    text: {
                        display: flex,
                        flexDirection: column,
                        alignItems: start,
                        flexGrow: unitless(1),
                        minWidth: px(0),
                    },
                    title: { textStyle: textStyle("titleMedium") },
                    description: parts.supportingText,
                    indicator: expandIndicator(parts.trailing, EXPANDED),
                    // It grows open and shrinks shut as Zag's `hidden` changes.
                    content: {
                        transition: collapseTransition,
                        textStyle: textStyle("bodyMedium"),
                        color: ref("contentColor"),
                        paddingInlineStart: ref("paddingInline"),
                        paddingInlineEnd: ref("paddingInline"),
                        paddingBlockEnd: ref("contentPaddingBlockEnd"),
                    },
                },
                variants: { density: densityTokenVariant(densities) },
                defaultVariants: { density: "inherit" },
            }),
        }),
    );

export const accordion = createAccordion();
