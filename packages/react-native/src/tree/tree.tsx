// The tree: an optional label over the tree, each node a pressable row (an optional leading icon
// and its text), a branch's row ending in the expand indicator, which turns over while it's
// expanded, over its children, indented from the start while it's expanded. React Native has no
// Zag machine: the expanded and selected nodes are React state, and each node says what it is to
// assistive technology. On the web, as the web's tree and WAI-ARIA APG's: every row is its node's
// tree item, named from its text, a branch's owning its group of children (`aria-owns`; the group
// stays beside the row in the branch's plain view). Each says its level, its place among its
// siblings and how many they are. The tree is one tab stop: the focused row (else the first
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
    TreeNode,
    TreePart,
    TreeVariantProps,
} from "@pureform/binding-core";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";

import { Expanding } from "../expand";
import { iconParts } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useDirection } from "../provider";
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
    const icon = iconParts(slots, id);
    const textId = useId();
    const groupId = useId();
    const web = Platform.OS === "web";
    // The tree item's own ARIA, on its row (a branch's owning its group).
    const item = {
        role: "treeitem",
        "aria-level": props.level,
        "aria-setsize": props.count,
        "aria-posinset": props.position,
        "aria-selected": selectedNode,
        "aria-labelledby": textId,
        ...(disabled ? { "aria-disabled": true } : {}),
        ...(branch ? { "aria-expanded": expanded, "aria-owns": groupId } : {}),
    } as const;
    const press = () => {
        tree.select(node.value);
        if (branch) tree.toggle(node.value);
    };
    const row = (
        <v.node.Pressable
            {...indication.handlers}
            {...(web
                ? {
                      ...item,
                      ref: (element: Focusable | null) => {
                          if (element) tree.rows.set(node.value, element);
                          else tree.rows.delete(node.value);
                      },
                      tabIndex: tree.tabStop === node.value ? 0 : -1,
                      onFocus: (event: {
                          target: unknown;
                          currentTarget: unknown;
                      }) => {
                          (
                              indication.handlers as {
                                  onFocus?: (event: never) => void;
                              }
                          ).onFocus?.(event as never);
                          if (event.target === event.currentTarget)
                              tree.focused(node.value);
                      },
                  }
                : nativeTreeRow(
                      node,
                      props.level,
                      { expanded, selected: selectedNode },
                      tree.props.translations,
                  ))}
            onPress={press}
            // React Native Web presses a tree item on Enter only; Space acts too, as the web's
            // tree.
            {...(web
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
            style={{ ...s.node, ...unselectable }}
            testID={id("node")}
        >
            {icon("leading", node.leading)}
            <v.text.Text
                nativeID={textId}
                selectable={false}
                style={s.text}
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
        <v.branch.View style={s.branch} testID={id("branch")}>
            {row}
            <Expanding open={expanded}>
                <v.group.View
                    style={s.group}
                    role="group"
                    nativeID={groupId}
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
