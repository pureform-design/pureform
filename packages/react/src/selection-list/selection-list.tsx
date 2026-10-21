// The selection list: a List (`listAnatomy`) whose rows are options of Zag's listbox, each a
// ListItem marked with `aria-selected`. Root is the listbox and takes focus; the arrow keys move a
// highlight across the options (the highlighted one hovers), and a press or Enter or Space selects
// one. Options are passed as data, so the machine's collection follows them.

import {
    SELECTION_LIST_CONTENT_PROPS,
    selectionListMachineProps,
    selectionListOptions,
} from "@pureform/binding-core";
import type {
    ListItemPart,
    SelectionListContentProps,
    SelectionListRootOwnProps,
    SlotKeyed,
    Unstyled,
} from "@pureform/binding-core";
import * as selectionList from "@pureform/machines/selection-list";
import { normalizeProps } from "@zag-js/react";
import { type ReactNode, useId, useMemo } from "react";

import { useControllable } from "../controllable";
import { useItemInteractionSources } from "../interaction";
import { ListItem } from "../list-item/list-item";
import type { ListItemPartProps, ListItemProps } from "../list-item/list-item";
import { List } from "../list/list";
import type { ListRootProps } from "../list/list";
import { useMachine } from "../machine";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

/** The selection list's props: the list's variants (`variant`, `density`, `color`, …), the
 *  selection (`selectionMode`, `value`, …), the options as data, props for every option's parts
 *  keyed by part, `testId`, and the list element's own props. Name it with `aria-label` or
 *  `aria-labelledby`. */
export interface SelectionListProps
    extends
        Omit<PartProps, keyof SelectionListRootOwnProps | "children">,
        SelectionListRootOwnProps,
        SelectionListContentProps<ReactNode> {
    /** Every option's parts' props, by part: `{ headline: { className: "…" } }`. */
    readonly slotProps?: SlotKeyed<ListItemPart, ListItemPartProps> | undefined;
    /** Every option's parts, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ListItemPart> | undefined;
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
    "slotProps",
    "unstyled",
    ...SELECTION_LIST_CONTENT_PROPS,
] as const;

/** A list of options to select, one or many (`selectionMode`, `multiple` by default), as
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
    const { items = [], slotProps, unstyled } = props;
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
                    <List.Item key={value} role="presentation">
                        <ListItem
                            {...(item as ListItemProps)}
                            {...({
                                slotProps,
                                unstyled,
                            } as Partial<ListItemProps>)}
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
