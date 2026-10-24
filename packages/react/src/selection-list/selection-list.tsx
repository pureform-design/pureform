// The selection list: a List (`listAnatomy`) whose rows are options of Zag's listbox, each a
// ListItem marked with `aria-selected`. Root is the listbox and takes focus; the arrow keys move a
// highlight across the options (the highlighted one hovers), and a press or Enter or Space selects
// one. Options are passed as data, so the machine's collection follows them.

import type { listAnatomy, listItemAnatomy } from "@pureform/anatomy";
import {
    overDefaults,
    SELECTION_LIST_CONTENT_PROPS,
    selectionListMachineProps,
    selectionListOptions,
} from "@pureform/binding-core";
import type {
    SelectionListItem,
    SelectionListRootOwnProps,
} from "@pureform/binding-core";
import * as selectionList from "@pureform/machines/selection-list";
import { normalizeProps } from "@zag-js/react";
import { type ReactNode, useId, useMemo } from "react";

import { useControllable } from "../controllable";
import { useItemInteractionSources } from "../interaction";
import { ListItem } from "../list-item/list-item";
import type { ListItemProps } from "../list-item/list-item";
import { List } from "../list/list";
import type { ListRootProps } from "../list/list";
import { useMachine } from "../machine";
import { useSlotProps } from "../parts";
import type { InnerPropsOf, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Keyed = SlotKeyedProps<typeof listAnatomy>;

/** The selection list's props: the list's variants (`variant`, `density`, `color`, …) and own
 *  tokens, the selection (`selectionMode`, `value`, …), the options as data, `className`,
 *  `style` and `slotProps` keyed by the list's parts (`root`, `item`), `listItemProps` for every
 *  option under its own, `testId`, and the list element's own props. Name it with `aria-label`
 *  or `aria-labelledby`. */
export interface SelectionListProps
    extends
        Omit<
            PartProps,
            keyof SelectionListRootOwnProps | keyof Keyed | "children"
        >,
        Omit<SelectionListRootOwnProps, keyof Keyed>,
        Keyed {
    /** The options, in order: each a list item's content and variants, its value, and its own
     *  `className`, `style`, `slotProps`, `unstyled`, `testId` and `tokens`, over
     *  `listItemProps`. */
    readonly items?:
        | readonly (SelectionListItem<ReactNode> &
              InnerPropsOf<typeof listItemAnatomy>)[]
        | undefined;
    /** Every option's `className`, `style`, `slotProps`, `unstyled`, `testId` and `tokens`,
     *  under the option's own. */
    readonly listItemProps?: InnerPropsOf<typeof listItemAnatomy> | undefined;
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
    "className",
    "style",
    "slotProps",
    "listItemProps",
    ...SELECTION_LIST_CONTENT_PROPS,
] as const;

/** A list of options to select, one or many (`selectionMode`, `single` by default), as
 *  Angular's selection list: `<SelectionList aria-label="Folders" items={[{ value: "inbox",
 *  headline: "Inbox" }, …]} />`. A selected option takes the list item's selected colors. */
export function SelectionList(props: SelectionListProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", string[]>(
        "SelectionList",
        "value",
        props,
    );
    const { items = [], listItemProps } = props;
    const slot = useSlotProps(props);
    const collection = useMemo(
        () => selectionList.collection({ items: selectionListOptions(items) }),
        [items],
    );
    const sources = useItemInteractionSources();
    const service = useMachine(selectionList.machine, {
        id: props.id ?? id,
        ...sources.machineProps,
        dir,
        collection,
        ...selectionListMachineProps(props),
        ...value.machineProps,
    });
    const api = selectionList.connect(service, normalizeProps);
    const rest = omitProps(props, BEHAVIOR_PROPS);
    return (
        <List.Root
            {...(rest as ListRootProps)}
            {...slot("root")}
            {...(api.getContentProps() as object)}
        >
            {items.map(
                ({
                    value,
                    textValue: _text,
                    disabled,
                    interactionSource,
                    ...item
                }) => (
                    <List.Item
                        key={value}
                        {...slot("item")}
                        role="presentation"
                    >
                        <ListItem
                            {...overDefaults(
                                listItemProps as ListItemProps | undefined,
                                item as ListItemProps,
                            )}
                            {...(api.getItemProps({
                                item: collection.find(value)!,
                            }) as object)}
                            interactive
                            disabled={!!(disabled || props.disabled)}
                            interactionSource={sources.item(
                                value,
                                interactionSource,
                            )}
                        />
                    </List.Item>
                ),
            )}
        </List.Root>
    );
}
