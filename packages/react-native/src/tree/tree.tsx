// The tree: an optional label over the tree, each node a pressable row (an optional leading icon
// and its text), a branch's row ending in the expand indicator, which turns over while it's
// expanded, over its children, indented from the start while it's expanded. React Native has no
// Zag machine: the expanded and selected nodes are React state, and each row says what it is to
// assistive technology.

import { treeAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { isPresent, isTreeBranch, treeSelection } from "@pureform/binding-core";
import type {
    IndicationProps,
    TreeBehaviorProps,
    TreeNode,
    TreePart,
    TreeVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { useExpandMotion } from "../expand";
import { iconParts } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

const [INDICATION] = treeAnatomy.indication!;

type Node = TreeNode<ReactNode>;

export interface TreeProps
    extends
        TreeVariantProps,
        Omit<TreeBehaviorProps, "id" | "expandOnClick">,
        IndicationProps {
    readonly items: readonly Node[];
    /** A label over the tree, which names it. */
    readonly label?: ReactNode;
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<TreePart> | undefined;
}

interface TreeState {
    readonly props: TreeProps;
    readonly expanded: readonly string[];
    readonly selected: readonly string[];
    readonly toggle: (value: string) => void;
    readonly select: (value: string) => void;
}

function Row(props: {
    readonly node: Node;
    readonly level: number;
    readonly tree: TreeState;
}): ReactNode {
    const { node, tree } = props;
    const branch = isTreeBranch(node);
    const expanded = branch && tree.expanded.includes(node.value);
    const selectedNode = tree.selected.includes(node.value);
    const disabled = !!node.disabled;
    const indication = useSurfaceIndication(INDICATION!, {
        indication: tree.props.indication,
        interactionSource: node.interactionSource,
        disabled,
    });
    const slots = useComponentSlots<TreePart>(
        "tree",
        indication.select(treeSelection(tree.props)),
        indication.states({
            selected: selectedNode,
            ...(expanded ? { expanded: true } : {}),
            ...(disabled ? { disabled: true } : {}),
            ...(node.mirrorLeading ? { mirrored: true } : {}),
        }),
    );
    const { styles: s, selected, views: v } = slots;
    const id = (part: TreePart) =>
        testIdOf(treeAnatomy, part, tree.props.testId);
    const icon = iconParts(slots, id);
    const row = (
        <v.node.Pressable
            {...indication.handlers}
            role="treeitem"
            aria-level={props.level}
            aria-selected={selectedNode}
            {...(branch ? { "aria-expanded": expanded } : {})}
            onPress={() => {
                tree.select(node.value);
                if (branch) tree.toggle(node.value);
            }}
            disabled={disabled}
            style={{ ...s.node, ...unselectable }}
            testID={id("node")}
        >
            {icon("leading", node.leading)}
            <v.text.Text selectable={false} style={s.text} testID={id("text")}>
                {node.label}
            </v.text.Text>
            {branch ? icon("indicator", "⌄") : null}
            {indication.layer(selected)}
        </v.node.Pressable>
    );
    if (!branch) return row;
    return (
        <v.branch.View style={s.branch} testID={id("branch")}>
            {row}
            {expanded ? (
                <v.group.View style={s.group} role="group" testID={id("group")}>
                    {(node.children ?? []).map((child) => (
                        <Row
                            key={child.value}
                            node={child}
                            level={props.level + 1}
                            tree={tree}
                        />
                    ))}
                </v.group.View>
            ) : null}
        </v.branch.View>
    );
}

function TreeImpl(props: TreeProps): ReactNode {
    const [expanded, setExpanded] = useControllable<"expandedValue", string[]>(
        "Tree",
        "expandedValue",
        props.expandedValue,
        props.defaultExpandedValue,
        props.onExpandedValueChange,
        [],
    );
    const [selected, setSelected] = useControllable<"selectedValue", string[]>(
        "Tree",
        "selectedValue",
        props.selectedValue,
        props.defaultSelectedValue,
        props.onSelectedValueChange,
        [],
    );
    const { styles: s, views: v } = useComponentSlots<TreePart>(
        "tree",
        treeSelection(props),
    );
    const expandMotion = useExpandMotion();
    const tree: TreeState = {
        props,
        expanded,
        selected,
        toggle: (value) => {
            expandMotion();
            setExpanded(
                expanded.includes(value)
                    ? expanded.filter((open) => open !== value)
                    : [...expanded, value],
            );
        },
        select: (value) =>
            setSelected(
                props.selectionMode === "multiple"
                    ? selected.includes(value)
                        ? selected.filter((one) => one !== value)
                        : [...selected, value]
                    : [value],
            ),
    };
    const id = (part: TreePart) => testIdOf(treeAnatomy, part, props.testId);
    return (
        <v.root.View style={s.root} testID={id("root")}>
            {isPresent(props.label) ? (
                <v.label.Text
                    selectable={false}
                    style={s.label}
                    testID={id("label")}
                >
                    {props.label}
                </v.label.Text>
            ) : null}
            <v.tree.View
                style={s.tree}
                role="tree"
                aria-label={props["aria-label"]}
                testID={id("tree")}
            >
                {props.items.map((node) => (
                    <Row key={node.value} node={node} level={1} tree={tree} />
                ))}
            </v.tree.View>
        </v.root.View>
    );
}

/** A tree, as Angular Material has it, its nodes drawn as Material list rows:
 *  `<Tree aria-label="Files" items={[{ value: "src", label: "src", children: [ … ] }]} />`. */
export const Tree = withEngine(TreeImpl, "Tree");
