// The tree: Root on Zag's tree view machine (the preset's root, around an optional label and the
// tree); each node a row (a leaf's item, or a branch's control) holding an optional leading icon
// and its text, a branch's row ending in the expand indicator over a group of its children, which
// Zag hides while it's collapsed; and the ready-made Tree, which renders the nodes it's given.
// Every node is a `treeitem` holding what's below it: a leaf's row, or a branch's element around
// its row and its group, which takes focus and the keys and is named from the row's text.

import { treeAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    isPresent,
    isTreeBranch,
    TREE_ROOT_PROPS,
    treeCollectionOptions,
    treeControlProps,
    treeNaming,
    treeSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    TreeContentProps,
    TreeInstances,
    TreeNode,
    TreeNodeInstance,
    TreeRootOwnProps,
} from "@pureform/binding-core";
import { treeMachineProps } from "@pureform/binding-web";
import * as treeView from "@pureform/machines/tree-view";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId, useMemo } from "react";

import { useControllable } from "../controllable";
import { ExpandIcon } from "../glyphs";
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { collapsible } from "../motion";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type {
    ComponentScope,
    PlainPartProps,
    SlotKeyedProps,
    SlotPropsOf,
} from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof treeAnatomy;
type Node = TreeNode<ReactNode>;

/** What Root shares with its parts. */
interface TreeContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: treeView.Api<PropTypes>;
    readonly sources: ItemInteractionSources;
    /** Whether a `Label` names the tree: a label renders before the tree, so it's known by the
     *  time the tree renders. */
    readonly naming: { labelled: boolean };
}

/** A node and where it sits, as Zag's tree view takes it. */
interface NodeRef {
    readonly node: Node;
    readonly indexPath: number[];
}

/** What a node shares with its parts. */
interface NodeContextValue {
    readonly ref: NodeRef;
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
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export type TreePartProps = PlainPartProps;

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface TreeIconProps extends TreePartProps {
    readonly mirror?: boolean | undefined;
}

/** A node's props: the node, where it sits (its index at each level), and a part's. */
export interface TreeNodeProps extends TreePartProps {
    readonly node: Node;
    readonly indexPath: number[];
}

/** A row's props: a part's, and the node's interaction source. */
export interface TreeRowProps extends TreePartProps, InteractionSourceProps {}

/** The tree's root, a `<div>` around its label and the tree. */
function Root(props: TreeRootProps): ReactNode {
    const own = useId();
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
    const sources = useItemInteractionSources();
    const collection = useMemo(
        () => treeView.collection<Node>(treeCollectionOptions(props.items)),
        [props.items],
    );
    const service = useMachine(treeView.machine, {
        id: props.id ?? own,
        ...sources.machineProps,
        dir,
        collection,
        ...treeMachineProps(props),
        ...treeControlProps(expanded.machineProps, selected.machineProps),
    });
    const api = treeView.connect(service, normalizeProps);
    const scope = useComponent(treeAnatomy, {
        selection: treeSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const naming = { labelled: false };
    const { as, items: _items, ...rest } = omitProps(props, TREE_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, sources, naming }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

/** The tree's label, which names it. */
function Label({ unstyled, ...props }: TreePartProps): ReactNode {
    const { scope, api, naming } = context.use("Label");
    naming.labelled = true;
    return scope.render("label", {
        element: "span",
        machine: api.getLabelProps(),
        unstyled,
        props,
    });
}

/** The tree: the arrow keys move between the rows it shows, by direction; right expands a branch
 *  and left collapses it or goes to its parent; Home and End go to the first and last row; and
 *  typing goes to the next row starting with it. Name it with a `Label` or `aria-label`. */
function TreeElement({ unstyled, ...props }: TreePartProps): ReactNode {
    const { scope, api, naming } = context.use("Tree");
    return scope.render("tree", {
        element: "div",
        machine: treeNaming(api.getTreeProps(), naming.labelled),
        unstyled,
        props,
    });
}

/** A branch: its treeitem, which takes focus and the keys, named from its row's text, around its
 *  row (`BranchControl`) over its children (`Group`). */
function Branch({
    unstyled,
    node,
    indexPath,
    ...props
}: TreeNodeProps): ReactNode {
    const { scope, api } = context.use("Branch");
    const ref = { node, indexPath };
    return (
        <nodeContext.Provider value={{ ref, branch: true }}>
            {scope.render("branch", {
                element: "div",
                machine: api.getBranchProps(ref),
                unstyled,
                props,
            })}
        </nodeContext.Provider>
    );
}

function Row({
    name,
    machine,
    unstyled,
    interactionSource,
    ...props
}: TreeRowProps & {
    readonly name: string;
    readonly machine: (api: treeView.Api<PropTypes>, ref: NodeRef) => object;
}): ReactNode {
    const { scope, api, sources } = context.use(name);
    const { ref } = nodeContext.use(name);
    const source = sources.item(ref.node.value, interactionSource);
    return scope.render("node", {
        element: "div",
        interactionSource: source,
        machine: machine(api, ref),
        unstyled,
        props,
    });
}

const branchControl = (api: treeView.Api<PropTypes>, ref: NodeRef) =>
    api.getBranchControlProps(ref);
const itemRow = (api: treeView.Api<PropTypes>, ref: NodeRef) =>
    api.getItemProps(ref);

/** A branch's row, plain inside its treeitem: a click (or Enter on the treeitem) selects it and
 *  expands or collapses it. */
function BranchControl(props: TreeRowProps): ReactNode {
    return <Row {...props} name="BranchControl" machine={branchControl} />;
}

/** A leaf: its row, selected with a click or Enter. */
function Item({
    node,
    indexPath,
    ...props
}: TreeNodeProps & InteractionSourceProps): ReactNode {
    return (
        <nodeContext.Provider
            value={{ ref: { node, indexPath }, branch: false }}
        >
            <Row {...props} name="Item" machine={itemRow} />
        </nodeContext.Provider>
    );
}

/** A branch's children, indented from the start, which Zag hides while it's collapsed. */
function Group({ unstyled, ...props }: TreePartProps): ReactNode {
    const { scope, api } = context.use("Group");
    const { ref } = nodeContext.use("Group");
    return scope.render("group", {
        element: "div",
        ref: collapsible,
        machine: api.getBranchContentProps(ref),
        unstyled,
        props,
    });
}

/** A row's text. */
function Text({ unstyled, ...props }: TreePartProps): ReactNode {
    const { scope, api } = context.use("Text");
    const { ref, branch } = nodeContext.use("Text");
    return scope.render("text", {
        element: "span",
        machine: branch
            ? api.getBranchTextProps(ref)
            : api.getItemTextProps(ref),
        unstyled,
        props,
    });
}

/** A branch's expand indicator, hidden from assistive technology, turned over while it's
 *  expanded. Without children it shows Material's chevron. */
function Indicator({ unstyled, children, ...props }: TreePartProps): ReactNode {
    const { scope, api } = context.use("Indicator");
    const { ref } = nodeContext.use("Indicator");
    return scope.render("indicator", {
        element: "span",
        machine: api.getBranchIndicatorProps(ref),
        unstyled,
        props: { ...props, children: children ?? <ExpandIcon /> },
    });
}

/** An icon before the text, hidden from assistive technology. */
function Leading({ unstyled, mirror, ...props }: TreeIconProps): ReactNode {
    const { scope } = context.use("Leading");
    return scope.render("leading", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The ready-made tree's props: Root's, with `className`, `style`, `slotProps` and `unstyled`
 *  keyed by part (a node's parts also by node, `TreeNodeInstance`), the nodes as data, and a
 *  label. */
export interface TreeProps
    extends
        Omit<
            TreeRootProps,
            keyof SlotKeyedProps<Anatomy> | "children" | "items"
        >,
        SlotKeyedProps<Anatomy, never, TreeInstances<ReactNode>>,
        TreeContentProps<ReactNode> {}

type Slot = SlotPropsOf<PartName<Anatomy>, TreeInstances<ReactNode>>;

const NODE_PARTS = [
    "branch",
    "node",
    "leading",
    "text",
    "indicator",
    "group",
] as const;

/** The ready-made tree: the label when given, then a row per node, each branch over a group of its
 *  children. */
function ReadyMade(props: TreeProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        items = EMPTY,
        label,
        "aria-label": ariaLabel,
        "aria-labelledby": labelledBy,
        ...rootProps
    } = props;
    const slot = useSlotProps<Anatomy, never, TreeInstances<ReactNode>>(props);
    return (
        <Root {...rootProps} items={items} {...(slot("root") as object)}>
            {isPresent(label) ? (
                <Label {...slot("label")}>{label}</Label>
            ) : null}
            <TreeElement
                aria-label={ariaLabel}
                aria-labelledby={labelledBy}
                {...slot("tree")}
            >
                <Nodes items={items} slotOf={slot} />
            </TreeElement>
        </Root>
    );
}

// The ready-made's nodes, under Root, which knows which are expanded and selected.
function Nodes(props: {
    readonly items: readonly Node[];
    readonly slotOf: Slot;
}): ReactNode {
    const { api } = context.use("Tree");
    const slot = props.slotOf;
    const each = NODE_PARTS.some((part) => slot.each(part));

    const content = (
        node: Node,
        at: TreeNodeInstance<ReactNode> | undefined,
    ) => (
        <>
            {isPresent(node.leading) ? (
                <Leading mirror={node.mirrorLeading} {...slot("leading", at)}>
                    {node.leading}
                </Leading>
            ) : null}
            <Text {...slot("text", at)}>{node.label}</Text>
        </>
    );

    const render = (level: readonly Node[], path: readonly number[]) =>
        level.map((node, index) => {
            const indexPath = [...path, index];
            const branch = isTreeBranch(node);
            const at: TreeNodeInstance<ReactNode> | undefined = each
                ? {
                      node,
                      depth: indexPath.length,
                      branch,
                      expanded:
                          branch && api.expandedValue.includes(node.value),
                      selected: api.selectedValue.includes(node.value),
                  }
                : undefined;
            return branch ? (
                <Branch
                    key={node.value}
                    node={node}
                    indexPath={indexPath}
                    {...slot("branch", at)}
                >
                    <BranchControl
                        interactionSource={node.interactionSource}
                        {...slot("node", at)}
                    >
                        {content(node, at)}
                        <Indicator {...slot("indicator", at)} />
                    </BranchControl>
                    <Group {...slot("group", at)}>
                        {render(node.children ?? [], indexPath)}
                    </Group>
                </Branch>
            ) : (
                <Item
                    key={node.value}
                    node={node}
                    indexPath={indexPath}
                    interactionSource={node.interactionSource}
                    {...slot("node", at)}
                >
                    {content(node, at)}
                </Item>
            );
        });

    return render(props.items, []);
}

const EMPTY: readonly Node[] = [];

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
