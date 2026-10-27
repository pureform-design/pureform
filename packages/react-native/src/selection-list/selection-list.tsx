// The selection list: a list whose rows are options, each an interactive list item marked with
// `aria-selected`, which its selected colors read. A press selects one: one in a `single` list
// (the default), any number in a `multiple` list.

import { listAnatomy } from "@pureform/anatomy";
import {
    listItemPosition,
    listSelection,
    selectionListDefaults,
} from "@pureform/binding-core";
import type {
    ListPart,
    ListInstances,
    SelectionListContentProps,
    SelectionListItem,
    SelectionListRootOwnProps,
} from "@pureform/binding-core";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { overDefaults } from "../defaults";
import { ListDefaults, ListItem } from "../list-item/list-item";
import type { ListItemProps } from "../list-item/list-item";
import type { ListItemDefaults } from "../list/list";
import { testIdOf, useControllable, withEngine } from "../parts";
import { nativeSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface SelectionListHosts {
    readonly root: "View";
    readonly item: "View";
}

export interface SelectionListProps
    extends
        Omit<SelectionListRootOwnProps, "unstyled">,
        SelectionListContentProps<ReactNode>,
        NativeSlotProps<
            SelectionListHosts,
            ListInstances<SelectionListItem<ReactNode>>
        > {
    readonly "aria-label"?: string | undefined;
    /** Every option's `style`, `slotProps`, `tokens` and `testId`, under the option's own. */
    readonly listItemProps?: ListItemDefaults | undefined;
}

function SelectionListImpl(props: SelectionListProps): ReactNode {
    const { styles: s, views: v } = useComponentSlots<ListPart>(
        "list",
        listSelection(props),
    );
    const { density, color, leadingType } = props;
    const defaults = useMemo(
        () => ({ density, color, leadingType }),
        [density, color, leadingType],
    );
    const [value, setValue] = useControllable(
        "SelectionList",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        [] as string[],
    );
    const { selectionMode, deselectable } = selectionListDefaults(props);
    const press = (key: string) => {
        const on = value.includes(key);
        if (selectionMode === "multiple")
            setValue(on ? value.filter((v) => v !== key) : [...value, key]);
        else if (!on) setValue([key]);
        else if (deselectable) setValue([]);
    };
    const items = props.items ?? [];
    const segmented = props.variant === "segmented";
    const id = (part: ListPart) => testIdOf(listAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const each = slot.each("item");
    return (
        <ListDefaults value={defaults}>
            <v.root.View
                {...slot.props("root")}
                role="listbox"
                aria-multiselectable={selectionMode === "multiple"}
                {...(props["aria-label"] === undefined
                    ? {}
                    : { "aria-label": props["aria-label"] })}
                style={slot.style("root", s.root)}
                testID={id("root")}
            >
                {items.map(
                    (
                        {
                            value: key,
                            textValue: _textValue,
                            disabled,
                            ...item
                        },
                        index,
                    ) => (
                        <v.item.View
                            {...slot.props(
                                "item",
                                each
                                    ? { index, item: items[index]! }
                                    : undefined,
                            )}
                            key={key}
                            style={slot.style(
                                "item",
                                s.item,
                                each
                                    ? { index, item: items[index]! }
                                    : undefined,
                            )}
                            testID={id("item")}
                        >
                            <ListItem
                                {...overDefaults(
                                    props.listItemProps as
                                        | ListItemProps
                                        | undefined,
                                    item as ListItemProps,
                                )}
                                role="option"
                                selected={value.includes(key)}
                                disabled={disabled || props.disabled}
                                onPress={() => press(key)}
                                position={
                                    item.position ??
                                    listItemPosition(
                                        index,
                                        items.length,
                                        segmented,
                                    )
                                }
                            />
                        </v.item.View>
                    ),
                )}
            </v.root.View>
        </ListDefaults>
    );
}

/** A list of options to select, one or many (`selectionMode`, `single` by default), as
 *  Angular's selection list: `<SelectionList aria-label="Folders" items={[{ value: "inbox",
 *  headline: "Inbox" }]} />`. */
export const SelectionList = withEngine(SelectionListImpl, "SelectionList");
