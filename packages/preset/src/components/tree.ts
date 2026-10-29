// The pureform tree: Angular Material's tree, its nodes drawn as Material 3 list rows. Material 3
// has no tree; its parts come from Angular's tree tokens (a node's container, its text and its
// height) and Zag's tree view (root, label, tree, branch, branch control, item, branch content).
//
// Markup: an optional label over the tree. Each node is a row with an optional leading icon and
// its text; a branch's row ends in the expand indicator, which turns over while it's expanded,
// and the branch holds its children in a group indented from the start, which Zag hides while
// it's collapsed. Every node is a `treeitem` holding what's below it (WAI-ARIA APG's tree, as
// Safari needs): a leaf's row is its treeitem, and a branch's element is, around its row and its
// group, named from the row's text.
//
//   <div class={root}>
//     <span class={label}>Files</span>
//     <div class={tree} role="tree">
//       <div class={branch} role="treeitem" aria-expanded="true" aria-labelledby="src-text" tabindex="0">
//         <div class={node}>
//           <span class={leading}>📁</span>
//           <span class={text} id="src-text">src</span>
//           <span class={indicator}>⌄</span>
//         </div>
//         <div class={group} role="group">
//           <div class={node} role="treeitem"><span class={text}>index.ts</span></div>
//         </div>
//       </div>
//     </div>
//   </div>
//
// Mark a leaf's row, or a branch's element, selected with `aria-selected` or `aria-current`,
// disabled with `aria-disabled`, and a branch's element `aria-expanded` while it's expanded. A
// branch's row reads its state from the branch's element, its parent; a leaf's row reads its own.

import { typed } from "@pureform/core";
import {
    add,
    colorMix,
    column,
    flex,
    hidden,
    none,
    numeric,
    px,
    rotate,
    slot,
    solid,
    transform,
    transparent,
    unitless,
} from "@pureform/core/ast";
import type { ColorValue, StyleMap } from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { stateLayer } from "../state-layer";
import { expandIndicator, rowParts, rowTokens } from "./list";
import {
    collapseTransition,
    colorVariant,
    DEFAULT_GROUP,
    defaultDensities,
    defaultGroups,
    DENSITY_TOKEN,
    densitySteps,
    disabledColor,
    densityTokenVariant,
    indicationRoot,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const pf = typed();

const { tokens, ref } = rowTokens("tree", {
    // The tree and its unselected rows show what they sit on, as Angular's tree does.
    container: transparent,
    nodeHeight: px(48),
    nodeRadius: radius("full"),
    indent: spacing("6"),
    paddingInline: spacing("4"),
    gap: spacing("3"),
    ...DENSITY_TOKEN,
});

const parts = rowParts(ref, "node");

// A branch's row and its parts take the branch's state from the branch's element, the treeitem
// they sit in (`below` the row, for a part), as a leaf's row takes its own: selected, focused by
// keyboard (the ring and the focus tint on the row, never around the group), disabled, and
// expanded. Only through the element they sit in directly, so a branch's children never take it.
const ofBranch = (state: string, below = "") =>
    `[role=treeitem]${state} > ${below}&`;
const SELECTED =
    ":is([aria-selected=true], [aria-current]:not([aria-current=false]))";
const DISABLED = "[aria-disabled=true]";

const focusTint = (base: ColorValue, content: ColorValue) =>
    colorMix(base, content, ref("stateFocusOpacity"));

const branchRow: Record<string, StyleMap> = {
    [ofBranch(SELECTED)]: {
        backgroundColor: stateLayer(ref, {
            base: ref("selectedContainer"),
            content: ref("selectedContent"),
        }),
        color: ref("selectedContent"),
    },
    [ofBranch(":focus-visible")]: {
        outlineStyle: solid,
        backgroundColor: focusTint(ref("container"), ref("content")),
    },
    [ofBranch(`${SELECTED}:focus-visible`)]: {
        backgroundColor: focusTint(
            ref("selectedContainer"),
            ref("selectedContent"),
        ),
    },
    [ofBranch(DISABLED)]: {
        pointerEvents: none,
        color: disabledColor("disabledContent"),
    },
};

const branchPart: Record<string, StyleMap> = {
    [ofBranch(SELECTED, "* > ")]: { color: ref("selectedContent") },
    [ofBranch(DISABLED, "* > ")]: {
        color: disabledColor("disabledContent"),
    },
};

/** Build the tree with a `color` variant per group in `groups`, which colors the selected node,
 *  and a `density` step per entry of `densities`. */
export const createTree = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
        pf.slotComponent({
            name: "tree",
            $meta: {
                description:
                    "A tree (Angular Material's tree) of Material list rows. Each node is a row; a branch's row ends in the expand indicator and its children sit in a group indented from the start. Mark a row aria-selected or aria-current, and a branch's row aria-expanded.",
            },
            tokens,
            slots: [
                "root",
                "label",
                "tree",
                "branch",
                "node",
                "leading",
                "text",
                "indicator",
                "group",
            ],
            structure: {
                root: ["label", "tree"],
                // A leaf's row sits in the tree or a group too, and a branch in a group.
                tree: ["branch"],
                branch: ["node", "group"],
                node: ["leading", "text", "indicator"],
            },
            indication: [
                {
                    trigger: "node",
                    surface: "node",
                    centered: false,
                    focus: "node",
                },
            ],
            variants: {
                density: densitySteps<string>(densities),
                color: groups as ColorGroups,
            },
            recipe: () => ({
                base: {
                    root: {
                        ...indicationRoot(ref),
                        display: flex,
                        flexDirection: column,
                        gap: spacing("2"),
                        color: ref("content"),
                    },
                    label: {
                        textStyle: textStyle("titleSmall"),
                        color: ref("supportingColor"),
                        paddingInlineStart: ref("paddingInline"),
                        paddingInlineEnd: ref("paddingInline"),
                    },
                    tree: { display: flex, flexDirection: column },
                    // The treeitem's own outline gives way to its row's focus ring.
                    branch: {
                        display: flex,
                        flexDirection: column,
                        outlineStyle: none,
                    },
                    node: {
                        ...parts.row,
                        ...parts.interactive,
                        minHeight: add(ref("nodeHeight"), ref("densityOffset")),
                        gap: ref("gap"),
                        paddingInlineStart: ref("paddingInline"),
                        paddingInlineEnd: ref("paddingInline"),
                        borderRadius: ref("nodeRadius"),
                        rawRules: { css: branchRow },
                    },
                    leading: {
                        ...parts.leading,
                        rawRules: { css: branchPart },
                    },
                    text: {
                        textStyle: textStyle("bodyLarge"),
                        flexGrow: unitless(1),
                        minWidth: px(0),
                        overflow: hidden,
                    },
                    indicator: {
                        ...expandIndicator(
                            parts.trailing,
                            slot("node", "expanded"),
                        ),
                        rawRules: {
                            css: {
                                ...branchPart,
                                [ofBranch("[aria-expanded=true]", "* > ")]: {
                                    transform: transform(
                                        rotate(numeric(180, "deg")),
                                    ),
                                },
                            },
                        },
                    },
                    // A branch's children, indented from the start. No display of its own, so
                    // Zag's `hidden` hides it; it grows open and shrinks shut as that changes.
                    group: {
                        paddingInlineStart: ref("indent"),
                        transition: collapseTransition,
                    },
                },
                variants: {
                    density: densityTokenVariant(densities),
                    // A group points the selected colors, which the row and its parts read, at
                    // its container roles.
                    color: colorVariant(groups, (g) => ({
                        root: {
                            tokens: {
                                selectedContainer: g.container,
                                selectedContent: g.onContainer,
                            },
                        },
                    })),
                },
                defaultVariants: { density: "inherit", color: DEFAULT_GROUP },
            }),
        }),
    );

export const tree = createTree();
