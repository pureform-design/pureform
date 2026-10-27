// The selection list: a List (`listAnatomy`) whose rows are options of Zag's listbox, each a
// ListItem marked with `aria-selected`. Root is the listbox and takes focus; the arrow keys move a
// highlight across the options (the highlighted one hovers), and a press or Enter or Space selects
// one. Options are passed as data, so the machine's collection follows them.

import type { listAnatomy, listItemAnatomy } from "@pureform/anatomy";
import {
    SELECTION_LIST_CONTENT_PROPS,
    selectionListOptions,
} from "@pureform/binding-core";
import type {
    ListInstances,
    SelectionListItem,
    SelectionListRootOwnProps,
} from "@pureform/binding-core";
import { overDefaults, selectionListMachineProps } from "@pureform/binding-web";
import * as selectionList from "@pureform/machines/selection-list";
import type { JSX } from "@solidjs/web";
import { createMemo, createUniqueId, For, merge, omit } from "solid-js";

import { useControllable } from "../controllable";
import { itemInteractionSources } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import { ListItem } from "../list-item/list-item";
import type { ListItemProps } from "../list-item/list-item";
import { List } from "../list/list";
import type { ListRootProps } from "../list/list";
import { createSlotProps } from "../parts";
import type { InnerPropsOf, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type ListItemDefaults = InnerPropsOf<typeof listItemAnatomy>;

/** One option of the selection list: a list item's content and variants, its value, and its own
 *  customizing props. */
export type SelectionListEntry = SelectionListItem<JSX.Element> &
    ListItemDefaults;

type Keyed = SlotKeyedProps<
    typeof listAnatomy,
    never,
    ListInstances<SelectionListEntry>
>;

/** The selection list's props: the list's variants (`variant`, `density`, `color`, …) and own
 *  tokens, the selection (`selectionMode`, `value`, …), the options as data, `class`, `style`,
 *  `slotProps` and `unstyled` keyed by the list's parts (`root`, `item`; an item's also by option,
 *  `ListInstances`), `listItemProps` for every option
 *  under its own, `testId`, and the list element's own props. Name it with `aria-label` or
 *  `aria-labelledby`. */
export interface SelectionListProps
    extends
        Omit<
            PartProps,
            keyof SelectionListRootOwnProps | keyof Keyed | "children"
        >,
        Omit<SelectionListRootOwnProps, keyof Keyed>,
        Keyed {
    /** The options, in order: each a list item's content and variants, its value, and its own
     *  `class`, `style`, `slotProps`, `unstyled`, `testId` and `tokens`, over `listItemProps`. */
    readonly items?: readonly SelectionListEntry[] | undefined;
    /** Every option's `class`, `style`, `slotProps`, `unstyled`, `testId` and `tokens`, under
     *  the option's own. */
    readonly listItemProps?: ListItemDefaults | undefined;
}

// The selection's props, which the machine takes rather than the list.
const BEHAVIOR_PROPS = [
    "selectionMode",
    "deselectable",
    "loopFocus",
    "disabled",
    "id",
    "value",
    "defaultValue",
    "onValueChange",
] as const;

/** A list of options to select, one or many (`selectionMode`, `single` by default), as
 *  Angular's selection list: `<SelectionList aria-label="Folders" items={[{ value: "inbox",
 *  headline: "Inbox" }, …]} />`. A selected option takes the list item's selected colors. */
export function SelectionList(props: SelectionListProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", string[]>(
        "SelectionList",
        "value",
        props,
    );
    // Read once per change: items written in place make their content each time they're read.
    const items = createMemo(() => props.items ?? []);
    const collection = createMemo(() =>
        selectionList.collection({ items: selectionListOptions(items()) }),
    );
    const sources = itemInteractionSources();
    const service = useMachine(selectionList.machine, () => ({
        id: props.id ?? id,
        ...sources.machineProps,
        dir: dir(),
        collection: collection(),
        ...selectionListMachineProps(props),
        ...value.machineProps(),
    }));
    const api = createMemo(() =>
        selectionList.connect(service, normalizeProps),
    );
    const slots = createSlotProps<
        typeof listAnatomy,
        never,
        ListInstances<SelectionListEntry>
    >(props);
    const root = slots("root");
    // The list's variants and the element's props, with the listbox's props over them.
    const list = merge(
        omit(
            props,
            ...BEHAVIOR_PROPS,
            ...SELECTION_LIST_CONTENT_PROPS,
            "class",
            "style",
            "slotProps",
            "listItemProps",
        ),
        root,
        () => api().getContentProps(),
    ) as ListRootProps;
    return (
        <List.Root {...list}>
            <For
                each={items()}
                keyed={(item: SelectionListItem<JSX.Element>) => item.value}
            >
                {(item, index) => {
                    const option = () => collection().find(item().value)!;
                    const source = sources.item(
                        () => item().value,
                        () => item().interactionSource,
                    );
                    const row = merge(
                        () =>
                            overDefaults(
                                props.listItemProps as object | undefined,
                                omit(
                                    item(),
                                    "value",
                                    "textValue",
                                    "disabled",
                                    "interactionSource",
                                ),
                            ),
                        () => api().getItemProps({ item: option() }),
                        {
                            interactive: true,
                            get disabled() {
                                return !!(item().disabled || props.disabled);
                            },
                            get interactionSource() {
                                return source();
                            },
                        },
                    ) as ListItemProps;
                    return (
                        <List.Item
                            {...slots("item", () => ({
                                index: index(),
                                item: item() as SelectionListEntry,
                            }))}
                            role="presentation"
                        >
                            <ListItem {...row} />
                        </List.Item>
                    );
                }}
            </For>
        </List.Root>
    );
}
