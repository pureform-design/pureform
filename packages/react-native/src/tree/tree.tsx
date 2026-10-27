// The tree: an optional label over the tree, each node a pressable row (an optional leading icon
// and its text), a branch's row ending in the expand indicator, which turns over while it's
// expanded, over its children, indented from the start while it's expanded. React Native has no
// Zag machine: the expanded and selected nodes are React state, and each node says what it is to
// assistive technology. On the web, as the web's tree and WAI-ARIA APG's: every node is a tree
// item holding what's below it, as Safari needs: a leaf's row, or a branch's view around its row
// and its group of children, which takes focus and the keys for its row (the row shows the focus)
// and is named from the row's text. Each says its level, its place among its siblings and how
// many they are. The tree is one tab stop: the focused row (else the first
// selected one shown, else the first) takes Tab, and the keys move from row to row (up and down,
// Home and End, a letter to the next row starting with it), into and out of branches (the arrow
// toward the inline end expands or goes to the first child, the other collapses or goes to the
// parent), and Enter and Space select and toggle. On iOS and Android, which have no tree item, the
// row says it: its label carries the level (in the tree's `translations`), its state whether it's
// expanded and selected.

import { treeAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { isPresent, isTreeBranch, treeSelection } from "@pureform/binding-core";
import type {
    IndicationProps,
    TreeBehaviorProps,
    TreeInstances,
    TreeNode,
    TreeNodeInstance,
    TreePart,
    TreeVariantProps,
} from "@pureform/binding-core";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";

import { Expanding } from "../expand";
import { iconParts } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, useControllable, withEngine } from "../parts";
import { useDirection } from "../provider";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { NativeSlotProps, PartSlots } from "../slot-props";
import { useComponentSlots } from "../styles";

const [INDICATION] = treeAnatomy.indication!;

type Node = TreeNode<ReactNode>;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface TreeHosts {
    readonly leading: "View";
    readonly indicator: "View";
    readonly node: "Pressable";
    readonly text: "Text";
    readonly branch: "View";
    readonly group: "View";
    readonly root: "View";
    readonly label: "Text";
    readonly tree: "View";
}

/** The tree's props, with `style` and `slotProps` keyed by part (a node's parts also by node,
 *  `TreeNodeInstance`). */
export interface TreeProps
    extends
        TreeVariantProps,
        Omit<TreeBehaviorProps, "id" | "expandOnClick">,
        IndicationProps,
        NativeSlotProps<TreeHosts, TreeInstances<ReactNode>> {
    readonly items: readonly Node[];
    /** A label over the tree, which names it. */
    readonly label?: ReactNode;
    readonly "aria-label"?: string | undefined;
    /** Its words, for another language: what a row says on iOS and Android, its label with its
     *  level (`"src, level 1"` by default). */
    readonly translations?: TreeTranslations | undefined;
    readonly testId?: TestIdOverride<TreePart> | undefined;
}

interface TreeState {
    readonly props: TreeProps;
    readonly expanded: readonly string[];
    readonly selected: readonly string[];
    readonly toggle: (value: string) => void;
    readonly select: (value: string) => void;
    /** On the web, the row that takes Tab. */
    readonly tabStop: string | undefined;
    readonly focused: (value: string) => void;
    /** On the web, each row's element, to move focus to. */
    readonly rows: Map<string, Focusable>;
}

interface Focusable {
    focus(): void;
}

/** What a row says on iOS and Android, which have no tree item: its label with its level (when
 *  the label is text, through `translations.level`), and whether it's expanded (a branch),
 *  selected and disabled. */
export const nativeTreeRow = (
    node: Node,
    level: number,
    state: { readonly expanded: boolean; readonly selected: boolean },
    translations?: TreeTranslations,
) => ({
    ...(typeof node.label === "string"
        ? {
              accessibilityLabel: (translations?.level ?? treeLevelLabel)(
                  node.label,
                  level,
              ),
          }
        : {}),
    accessibilityState: {
        selected: state.selected,
        disabled: !!node.disabled,
        ...(isTreeBranch(node) ? { expanded: state.expanded } : {}),
    },
});

const NODE_PARTS = [
    "branch",
    "node",
    "leading",
    "text",
    "indicator",
    "group",
] as const;

// The tree's per-part props for one node: each part's function of the copy gets the node.
const forNode = (
    slot: PartSlots,
    instance: () => TreeNodeInstance<ReactNode>,
): PartSlots => {
    if (!NODE_PARTS.some((part) => slot.each(part))) return slot;
    const each = instance();
    return {
        props: (part) => slot.props(part, each),
        style: (part, own) => slot.style(part, own, each),
        on: (part, name, own) => slot.on(part, name, own, each),
        with: (part, own) => slot.with(part, own, each),
        each: slot.each,
    };
};

function Row(props: {
    readonly node: Node;
    readonly level: number;
    /** Its place among its siblings, from 1, and how many they are. */
    readonly position: number;
    readonly count: number;
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
    const slot = forNode(nativeSlots(tree.props), () => ({
        node,
        depth: props.level,
        branch,
        expanded,
        selected: selectedNode,
    }));
    const icon = iconParts(slots, id, slot);
    const textId = useId();
    const web = Platform.OS === "web";
    // The tree item's own ARIA: on a leaf's row, or a branch's view around its row and group.
    const item = {
        role: "treeitem",
        "aria-level": props.level,
        "aria-setsize": props.count,
        "aria-posinset": props.position,
        "aria-selected": selectedNode,
        "aria-labelledby": textId,
        ...(disabled ? { "aria-disabled": true } : {}),
        ...(branch ? { "aria-expanded": expanded } : {}),
    } as const;
    const press = () => {
        tree.select(node.value);
        if (branch) tree.toggle(node.value);
    };
    const { onFocus, onBlur, ...pointer } = indication.handlers as {
        onFocus?: (event: never) => void;
        onBlur?: (event: never) => void;
    };
    // What takes focus and the keys on the web: the treeitem (a leaf's row, a branch's view).
    const focusable = {
        ...item,
        ref: (element: Focusable | null) => {
            if (element) tree.rows.set(node.value, element);
            else tree.rows.delete(node.value);
        },
        tabIndex: tree.tabStop === node.value ? 0 : -1,
        onFocus: (event: { target: unknown; currentTarget: unknown }) => {
            if (event.target !== event.currentTarget) return;
            onFocus?.(event as never);
            tree.focused(node.value);
        },
        onBlur: (event: { target: unknown; currentTarget: unknown }) => {
            if (event.target === event.currentTarget) onBlur?.(event as never);
        },
    };
    const row = (
        <v.node.Pressable
            {...slot.props("node")}
            {...(web && branch ? pointer : indication.handlers)}
            {...(web
                ? branch
                    ? {
                          // Plain inside its treeitem, out of the tab order: focus arriving
                          // by a press moves on to the treeitem.
                          tabIndex: -1,
                          onFocus: (event: {
                              currentTarget: {
                                  parentElement?: Focusable | null;
                              };
                          }) => event.currentTarget.parentElement?.focus(),
                      }
                    : focusable
                : nativeTreeRow(
                      node,
                      props.level,
                      { expanded, selected: selectedNode },
                      tree.props.translations,
                  ))}
            onPress={slot.on("node", "onPress", press)}
            // React Native Web presses a tree item on Enter only; Space acts too, as the web's
            // tree.
            {...(web && !branch
                ? ({
                      onKeyDown: (event: {
                          nativeEvent: { key: string };
                          preventDefault?(): void;
                      }) => {
                          if (event.nativeEvent.key !== " " || disabled) return;
                          event.preventDefault?.();
                          press();
                      },
                  } as object)
                : {})}
            disabled={disabled}
            style={slot.style("node", withUnselectable(s.node))}
            testID={id("node")}
        >
            {icon("leading", node.leading)}
            <v.text.Text
                {...slot.props("text")}
                nativeID={textId}
                selectable={false}
                style={slot.style("text", s.text)}
                testID={id("text")}
            >
                {node.label}
            </v.text.Text>
            {branch ? icon("indicator", "⌄") : null}
            {indication.layer(selected)}
        </v.node.Pressable>
    );
    if (!branch) return row;
    return (
        <v.branch.View
            {...slot.props("branch")}
            {...(web
                ? ({
                      ...focusable,
                      // Enter and Space on the treeitem press its row.
                      onKeyDown: (event: {
                          target: unknown;
                          currentTarget: unknown;
                          nativeEvent: { key: string };
                          preventDefault?(): void;
                      }) => {
                          if (event.target !== event.currentTarget || disabled)
                              return;
                          const { key } = event.nativeEvent;
                          if (key !== "Enter" && key !== " ") return;
                          event.preventDefault?.();
                          press();
                      },
                  } as object)
                : {})}
            style={slot.style("branch", s.branch)}
            testID={id("branch")}
        >
            {row}
            <Expanding open={expanded}>
                <v.group.View
                    {...slot.props("group")}
                    style={slot.style("group", s.group)}
                    role="group"
                    testID={id("group")}
                >
                    {(node.children ?? []).map((child, index, all) => (
                        <Row
                            key={child.value}
                            node={child}
                            level={props.level + 1}
                            position={index + 1}
                            count={all.length}
                            tree={tree}
                        />
                    ))}
                </v.group.View>
            </Expanding>
        </v.branch.View>
    );
}

// The rows shown, in order: each node with its parent's value, the branches' children while
// they're expanded.
const shownRows = (
    nodes: readonly Node[],
    expanded: readonly string[],
    parent?: string,
): { readonly node: Node; readonly parent: string | undefined }[] =>
    nodes.flatMap((node) => [
        { node, parent },
        ...(isTreeBranch(node) && expanded.includes(node.value)
            ? shownRows(node.children ?? [], expanded, node.value)
            : []),
    ]);

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
    const rtl = useDirection() === "rtl";
    const shown = shownRows(props.items, expanded);
    const [focusedValue, setFocused] = useState<string>();
    const rows = useRef(new Map<string, Focusable>()).current;
    // A row to move focus to once it's shown (a branch's first child, as it expands).
    const [focusTo, setFocusTo] = useState<string>();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- after each render, a row waiting for focus takes it; done clears it
    useEffect(() => {
        if (focusTo === undefined) return;
        const row = rows.get(focusTo);
        if (!row) return;
        setFocusTo(undefined);
        row.focus();
    });
    const isShown = (value: string | undefined) =>
        shown.some((row) => row.node.value === value);
    const tabStop = isShown(focusedValue)
        ? focusedValue
        : (shown.find((row) => selected.includes(row.node.value)) ?? shown[0])
              ?.node.value;
    const tree: TreeState = {
        tabStop,
        rows,
        focused: setFocused,
        props,
        expanded,
        selected,
        toggle: (value) => {
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
    const slot = nativeSlots(props);
    const go = (value: string | undefined) => {
        if (value === undefined) return;
        setFocused(value);
        setFocusTo(value);
    };
    // The keys, on the web, from the focused row.
    const onKeyDown = (event: {
        nativeEvent: {
            key: string;
            altKey?: boolean;
            ctrlKey?: boolean;
            metaKey?: boolean;
        };
        preventDefault(): void;
    }) => {
        const { key } = event.nativeEvent;
        if (
            event.nativeEvent.altKey ||
            event.nativeEvent.ctrlKey ||
            event.nativeEvent.metaKey
        )
            return;
        const at = shown.findIndex((row) => row.node.value === focusedValue);
        if (at < 0) return;
        const { node, parent } = shown[at]!;
        const branch = isTreeBranch(node);
        const open = branch && expanded.includes(node.value);
        const inward = rtl ? "ArrowLeft" : "ArrowRight";
        const outward = rtl ? "ArrowRight" : "ArrowLeft";
        const handled = () => event.preventDefault();
        if (key === "ArrowDown")
            return (handled(), go(shown[at + 1]?.node.value));
        if (key === "ArrowUp")
            return (handled(), go(shown[at - 1]?.node.value));
        if (key === "Home") return (handled(), go(shown[0]?.node.value));
        if (key === "End") return (handled(), go(shown.at(-1)?.node.value));
        if (key === inward) {
            if (!branch) return undefined;
            handled();
            if (!open)
                return node.disabled ? undefined : tree.toggle(node.value);
            return go(node.children?.[0]?.value);
        }
        if (key === outward) {
            handled();
            if (open && !node.disabled) return tree.toggle(node.value);
            return go(parent);
        }
        if (key.length === 1 && key !== " ") {
            // The next row whose text starts with the letter, after this one, round again.
            const letter = key.toLocaleLowerCase();
            const next = [
                ...shown.slice(at + 1),
                ...shown.slice(0, at + 1),
            ].find(
                (row) =>
                    typeof row.node.label === "string" &&
                    row.node.label.toLocaleLowerCase().startsWith(letter),
            );
            if (next) {
                handled();
                go(next.node.value);
            }
        }
        return undefined;
    };
    return (
        <v.root.View
            {...slot.props("root")}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            {isPresent(props.label) ? (
                <v.label.Text
                    {...slot.props("label")}
                    selectable={false}
                    style={slot.style("label", s.label)}
                    testID={id("label")}
                >
                    {props.label}
                </v.label.Text>
            ) : null}
            <v.tree.View
                {...slot.props("tree")}
                style={slot.style("tree", s.tree)}
                role="tree"
                aria-label={props["aria-label"]}
                {...(Platform.OS === "web" ? ({ onKeyDown } as object) : {})}
                testID={id("tree")}
            >
                {props.items.map((node, index, all) => (
                    <Row
                        key={node.value}
                        node={node}
                        level={1}
                        position={index + 1}
                        count={all.length}
                        tree={tree}
                    />
                ))}
            </v.tree.View>
        </v.root.View>
    );
}

/** The tree's words, for another language. */
export interface TreeTranslations {
    /** What a row says on iOS and Android: its label with its level. */
    readonly level?: ((label: string, level: number) => string) | undefined;
}

/** The English default for `TreeTranslations.level`: `"src, level 1"`. */
export const treeLevelLabel = (label: string, level: number): string =>
    `${label}, level ${level}`;

/** A tree, as Angular Material has it, its nodes drawn as Material list rows:
 *  `<Tree aria-label="Files" items={[{ value: "src", label: "src", children: [ … ] }]} />`. */
export const Tree = withEngine(TreeImpl, "Tree");
