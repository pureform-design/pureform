// The tree: Root on Zag's tree view machine (the preset's root, around an optional label and the
// tree); each node a row (a leaf's item, or a branch's control) holding an optional leading icon
// and its text, a branch's row ending in the expand indicator over a group of its children, which
// Zag hides while it's collapsed; and the ready-made Tree, which renders the nodes it's given.

import { treeAnatomy } from "@pureform/anatomy";
import {
    isTreeBranch,
    TREE_CONTENT_PROPS,
    TREE_ROOT_PROPS,
    treeCollectionOptions,
    treeControlProps,
    treeMachineProps,
    treeNaming,
    treeSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    TreeContentProps,
    TreeNode,
    TreeRootOwnProps,
} from "@pureform/binding-core";
import * as treeView from "@pureform/machines/tree-view";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    For,
    merge,
    omit,
    Show,
    untrack,
} from "solid-js";

import { useControllable } from "../controllable";
import { ExpandIcon } from "../glyphs";
import { itemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { collapsible } from "../motion";
import { createPartContext } from "../part-context";
import {
    createSlotProps,
    iconParts,
    optionalPart,
    useComponent,
} from "../parts";
import type {
    ComponentScope,
    IconPartProps,
    PlainPartProps,
    SlotKeyedProps,
} from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof treeAnatomy;
type Node = TreeNode<JSX.Element>;

/** What Root shares with its parts. */
interface TreeContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<treeView.Api<PropTypes>>;
    readonly sources: ItemInteractionSources;
    /** Whether a `Label` names the tree: a label renders before the tree, so it's known by
     *  the time the tree renders. */
    readonly naming: { labelled: boolean };
}

/** A node and where it sits, as Zag's tree view takes it. */
interface NodeRef {
    readonly node: Node;
    readonly indexPath: number[];
}

/** What a node shares with its parts. */
interface NodeContextValue {
    readonly ref: Accessor<NodeRef>;
    readonly branch: boolean;
}

const context = createPartContext<TreeContextValue>("Tree");
const nodeContext = createPartContext<NodeContextValue>("Tree", "Item");

/** Root's props: the variants and tokens, the machine's props (`expandedValue`, `selectedValue`,
 *  …), the nodes as data, `testId` and `unstyled` for every part, `as`, and the element's own
 *  props. */
export interface TreeRootProps
    extends Omit<PartProps, keyof TreeRootOwnProps>, TreeRootOwnProps {
    /** The top level's nodes, which the machine walks. */
    readonly items: readonly Node[];
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export type TreePartProps = PlainPartProps;

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export type TreeIconProps = IconPartProps;

/** A node's props: the node, where it sits (its index at each level), and a part's. */
export interface TreeNodeProps extends TreePartProps {
    readonly node: Node;
    readonly indexPath: number[];
}

/** A row's props: a part's, and the node's interaction source. */
export interface TreeRowProps extends TreePartProps, InteractionSourceProps {}

/** The tree's root, a `<div>` around its label and the tree. */
function Root(props: TreeRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const expanded = useControllable<"expandedValue", string[]>(
        "Tree",
        "expandedValue",
        props,
    );
    const selected = useControllable<"selectedValue", string[]>(
        "Tree",
        "selectedValue",
        props,
    );
    const sources = itemInteractionSources();
    const collection = createMemo(() =>
        treeView.collection<Node>(treeCollectionOptions(props.items)),
    );
    const service = useMachine(treeView.machine, () => ({
        id: props.id ?? id,
        ...sources.machineProps,
        dir: dir(),
        collection: collection(),
        ...treeMachineProps(props),
        ...treeControlProps(expanded.machineProps(), selected.machineProps()),
    }));
    const api = createMemo(() => treeView.connect(service, normalizeProps));
    const scope = useComponent(treeAnatomy, {
        selection: () => treeSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    const naming = { labelled: false };
    return (
        <context.Provider value={{ scope, api, sources, naming }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", "items", ...TREE_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The tree's label, which names it. */
function Label(props: TreePartProps): JSX.Element {
    const { scope, api, naming } = context.use("Label");
    naming.labelled = true;
    return scope.render("label", {
        element: "span",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The tree: the arrow keys move between the rows it shows, by direction; right expands a branch
 *  and left collapses it or goes to its parent; Home and End go to the first and last row; and
 *  typing goes to the next row starting with it. Name it with a `Label` or `aria-label`. */
function TreeElement(props: TreePartProps): JSX.Element {
    const { scope, api, naming } = context.use("Tree");
    return scope.render("tree", {
        element: "div",
        machine: () => treeNaming(api().getTreeProps(), naming.labelled),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A branch: its row (`BranchControl`) over its children (`Group`). */
function Branch(props: TreeNodeProps): JSX.Element {
    const { scope, api } = context.use("Branch");
    const ref = () => ({ node: props.node, indexPath: props.indexPath });
    return (
        <nodeContext.Provider value={{ ref, branch: true }}>
            {scope.render("branch", {
                element: "div",
                machine: () => api().getBranchProps(ref()),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled", "node", "indexPath"),
            })}
        </nodeContext.Provider>
    );
}

const row = (
    name: string,
    props: TreeRowProps,
    machine: (api: treeView.Api<PropTypes>, ref: NodeRef) => object,
) => {
    const { scope, api, sources } = context.use(name);
    const { ref } = nodeContext.use(name);
    const source = sources.item(
        () => ref().node.value,
        () => props.interactionSource,
    );
    return scope.render("node", {
        element: "div",
        interactionSource: source,
        machine: () => machine(api(), ref()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "interactionSource"),
    });
};

/** A branch's row: a click or Enter selects it and expands or collapses it. */
function BranchControl(props: TreeRowProps): JSX.Element {
    return row("BranchControl", props, (api, ref) =>
        api.getBranchControlProps(ref),
    );
}

/** A leaf: its row, selected with a click or Enter. */
function Item(props: TreeNodeProps & InteractionSourceProps): JSX.Element {
    const ref = () => ({ node: props.node, indexPath: props.indexPath });
    return (
        <nodeContext.Provider value={{ ref, branch: false }}>
            {row(
                "Item",
                omit(props, "node", "indexPath") as TreeRowProps,
                (api, node) => api.getItemProps(node),
            )}
        </nodeContext.Provider>
    );
}

/** A branch's children, indented from the start, which Zag hides while it's collapsed. */
function Group(props: TreePartProps): JSX.Element {
    const { scope, api } = context.use("Group");
    const { ref } = nodeContext.use("Group");
    return scope.render("group", {
        element: "div",
        ref: collapsible,
        machine: () => api().getBranchContentProps(ref()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A row's text. */
function Text(props: TreePartProps): JSX.Element {
    const { scope, api } = context.use("Text");
    const { ref, branch } = nodeContext.use("Text");
    return scope.render("text", {
        element: "span",
        machine: () =>
            branch
                ? api().getBranchTextProps(ref())
                : api().getItemTextProps(ref()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A branch's expand indicator, hidden from assistive technology, turned over while it's
 *  expanded. Without children it shows Material's chevron. */
function Indicator(props: TreePartProps): JSX.Element {
    const { scope, api } = context.use("Indicator");
    const { ref } = nodeContext.use("Indicator");
    return scope.render("indicator", {
        element: "span",
        machine: () => api().getBranchIndicatorProps(ref()),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), {
            get children() {
                return props.children ?? <ExpandIcon />;
            },
        }),
    });
}

const leading = iconParts<Anatomy, TreeIconProps>(
    (use) => ({
        scope: context.use(use).scope,
        machine: () => ({ "aria-hidden": "true" }),
    }),
    "Leading",
    "leading",
    { mirror: true },
);

/** An icon before the text, hidden from assistive technology. */
const Leading = leading.Part;

/** The ready-made tree's props: Root's, with `class`, `style`, and `slotProps` keyed by part, the
 *  nodes as data, and a label. */
export interface TreeProps
    extends
        Omit<
            TreeRootProps,
            keyof SlotKeyedProps<Anatomy> | "children" | "items"
        >,
        SlotKeyedProps<Anatomy>,
        TreeContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "aria-label",
    "aria-labelledby",
    ...TREE_CONTENT_PROPS,
] as const;

/** The ready-made tree: the label when given, then a row per node, each branch over a group of its
 *  children. */
function ReadyMade(props: TreeProps): JSX.Element {
    const items = createMemo(() => props.items ?? []);
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as Omit<
        TreeRootProps,
        "items"
    >;
    const root = slots("root") as object;
    // Views, so every node reads the same ones.
    const label = slots("label");
    const tree = slots("tree");
    const branch = slots("branch");
    const node = slots("node");
    const leadingSlot = slots("leading");
    const text = slots("text");
    const indicator = slots("indicator");
    const group = slots("group");

    const RowContent = (rowProps: { readonly node: Node }) => {
        const LeadingPart = optionalPart(
            untrack(() => rowProps.node),
            "leading",
            Leading,
            leading.Optional,
        );
        return (
            <>
                <LeadingPart
                    mirror={rowProps.node.mirrorLeading}
                    {...leadingSlot}
                >
                    {rowProps.node.leading}
                </LeadingPart>
                <Text {...text}>{rowProps.node.label}</Text>
            </>
        );
    };

    const Nodes = (nodesProps: {
        readonly nodes: readonly Node[];
        readonly path: readonly number[];
    }): JSX.Element => (
        <For each={nodesProps.nodes} keyed={(entry: Node) => entry.value}>
            {(entry, index) => {
                const indexPath = () => [...nodesProps.path, index()];
                return (
                    <Show
                        when={isTreeBranch(entry())}
                        fallback={
                            <Item
                                node={entry()}
                                indexPath={indexPath()}
                                interactionSource={entry().interactionSource}
                                {...node}
                            >
                                <RowContent node={entry()} />
                            </Item>
                        }
                    >
                        <Branch
                            node={entry()}
                            indexPath={indexPath()}
                            {...branch}
                        >
                            <BranchControl
                                interactionSource={entry().interactionSource}
                                {...node}
                            >
                                <RowContent node={entry()} />
                                <Indicator {...indicator} />
                            </BranchControl>
                            <Group {...group}>
                                <Nodes
                                    nodes={entry().children ?? []}
                                    path={indexPath()}
                                />
                            </Group>
                        </Branch>
                    </Show>
                );
            }}
        </For>
    );

    return (
        <Root {...own} items={items()} {...root}>
            <Show when={props.label !== undefined}>
                <Label {...label}>{props.label}</Label>
            </Show>
            <TreeElement
                aria-label={props["aria-label"]}
                aria-labelledby={props["aria-labelledby"]}
                {...tree}
            >
                <Nodes nodes={items()} path={[]} />
            </TreeElement>
        </Root>
    );
}

/** A tree, as Angular Material has it, its nodes drawn as Material list rows. Use it ready-made,
 *  `<Tree aria-label="Files" items={[{ value: "src", label: "src", children: [ … ] }, …]} />`, or
 *  compose its parts under `Tree.Root` (which takes the `items`): `Label`, then `Tree` holding a
 *  `Branch` (its `BranchControl` with `Leading`, `Text` and `Indicator`, then a `Group` of its
 *  children) or an `Item` (with `Leading` and `Text`) per node. */
export const Tree = Object.assign(ReadyMade, {
    Root,
    Label,
    Tree: TreeElement,
    Branch,
    BranchControl,
    Item,
    Group,
    Leading,
    Text,
    Indicator,
});
