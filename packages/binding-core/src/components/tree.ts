// The tree's contract, shared by every binding: the props Root takes for itself, how they map onto
// the selection and Zag's tree view machine, and the nodes the ready-made tree takes as data. The
// bindings render Root (the preset's root), an optional label, and the tree; each node as a row
// (an optional leading icon and its text) and each branch as its row, ending in the expand
// indicator, over a group of its children.

import type { PartName, TestIdOverride, treeAnatomy } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import type { VariantProp } from "./variants";

/** The tree's parts: `"root" | "label" | "tree" | "branch"` (a branch's row and group) `| "node"`
 *  (a row) `| "leading" | "text" | "indicator" | "group"` (a branch's children). */
export type TreePart = PartName<typeof treeAnatomy>;

/** The tree's variant groups and instance tokens. */
export interface TreeVariantProps {
    readonly density?: VariantProp<"tree", "density">;
    /** The color group of a selected node. */
    readonly color?: VariantProp<"tree", "color">;
    readonly tokens?: InstanceTokens<"tree"> | undefined;
}

/** One node of the tree, as data: a leaf, or a branch with `children`. Its label, icon in the
 *  framework's node type. */
export interface TreeNode<Node = unknown> extends InteractionSourceProps {
    /** Its key, unique in the tree. */
    readonly value: string;
    readonly label: Node;
    /** The text typeahead matches, when the label isn't a string. @default the label, else the
     *  value */
    readonly textValue?: string | undefined;
    /** An icon before the label. */
    readonly leading?: Node;
    /** Flip the leading icon under `rtl`, for an icon that points. */
    readonly mirrorLeading?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    /** Its children, which make it a branch. */
    readonly children?: readonly TreeNode<Node>[] | undefined;
}

/** What Zag's tree view machine takes from Root's props: the expanded branches' and the selected
 *  nodes' values. */
export interface TreeBehaviorProps
    extends
        Controllable<"expandedValue", string[]>,
        Controllable<"selectedValue", string[]> {
    /** `"multiple"` lets Shift and the modifier keys select more than one node. @default "single" */
    readonly selectionMode?: "single" | "multiple" | undefined;
    /** Whether a click on a branch's row expands it, besides selecting it. @default true */
    readonly expandOnClick?: boolean | undefined;
    /** Root's id; the machine builds the other ids from it.
     *  @control none */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface TreeRootOwnProps
    extends TreeVariantProps, TreeBehaviorProps, IndicationProps {
    /** A prefix for every part's test id (`files` → `files-node`), or ids by part. */
    readonly testId?: TestIdOverride<TreePart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<TreePart> | undefined;
}

/** The keys of `TreeRootOwnProps`, which Root keeps off its element. */
export const TREE_ROOT_PROPS = [
    "density",
    "color",
    "tokens",
    "selectionMode",
    "expandOnClick",
    "id",
    "expandedValue",
    "defaultExpandedValue",
    "onExpandedValueChange",
    "selectedValue",
    "defaultSelectedValue",
    "onSelectedValueChange",
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof TreeRootOwnProps)[];

/** What the ready-made tree renders inside Root, in the framework's node type. */
export interface TreeContentProps<Node> {
    /** The top level's nodes, in order. */
    readonly items?: readonly TreeNode<Node>[] | undefined;
    /** A label over the tree, which names it. Without one, name it with `aria-label`. */
    readonly label?: Node;
}

/** The keys of `TreeContentProps`. */
export const TREE_CONTENT_PROPS = [
    "items",
    "label",
] as const satisfies readonly (keyof TreeContentProps<unknown>)[];

/** The tree's registry selection from Root's props. */
export const treeSelection = (props: TreeVariantProps): Selection<"tree"> => ({
    density: props.density,
    color: props.color,
    tokens: props.tokens,
});

/** Zag's tree view props from Root's, besides `id`, `dir`, the collection and the controllable
 *  values. */
export const treeMachineProps = (props: TreeBehaviorProps) => ({
    selectionMode: props.selectionMode,
    expandOnClick: props.expandOnClick,
});

/** Zag's controllable props from the bindings' (`expandedValue`, `selectedValue` and their
 *  `default*` and `on*Change`), under Zag's names. */
export const treeControlProps = (
    expanded: Readonly<Record<string, unknown>>,
    selected: Readonly<Record<string, unknown>>,
) => ({
    expandedValue: expanded.expandedValue as string[] | undefined,
    defaultExpandedValue: expanded.defaultExpandedValue as string[] | undefined,
    onExpandedChange: expanded.onExpandedValueChange as
        | ((details: { expandedValue: string[] }) => void)
        | undefined,
    selectedValue: selected.selectedValue as string[] | undefined,
    defaultSelectedValue: selected.defaultSelectedValue as string[] | undefined,
    onSelectionChange: selected.onSelectedValueChange as
        | ((details: { selectedValue: string[] }) => void)
        | undefined,
});

/** The options of Zag's tree collection over the nodes as data: a root node holding `items`, each
 *  node's value, its typeahead text, its children, and whether it's disabled. */
export const treeCollectionOptions = <N extends TreeNode>(
    items: readonly N[],
) => ({
    rootNode: { value: "", label: "", children: items } as unknown as N,
    nodeToValue: (node: N) => node.value,
    nodeToString: (node: N) =>
        node.textValue ??
        (typeof node.label === "string" ? node.label : node.value),
    nodeToChildren: (node: N) => (node.children ?? []) as N[],
    isNodeDisabled: (node: N) => !!node.disabled,
});

/** Whether a node is a branch: one with `children`, even none. */
export const isTreeBranch = (node: Pick<TreeNode, "children">): boolean =>
    node.children !== undefined;

/** Zag's tree props, named as the tree is: by its label while one is rendered (`labelled`), else
 *  by Zag's default text unless the app names it, without pointing at a label that isn't there. */
export const treeNaming = <P extends object>(
    props: P,
    labelled: boolean,
): P => {
    if (labelled) return props;
    const { "aria-labelledby": _, ...named } = props as P & {
        "aria-labelledby"?: unknown;
    };
    return named as P;
};
