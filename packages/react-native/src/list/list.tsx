// The list: a view the registry styles, holding each list item in an `item` view. It gives its
// items its variants as their defaults, and in a segmented list each item its place among the
// tiles, which rounds its corners.

import { listAnatomy } from "@pureform/anatomy";
import { listItemPosition, listSelection } from "@pureform/binding-core";
import type {
    ListContentProps,
    ListInstances,
    ListItemData,
    ListPart,
    ListRootOwnProps,
} from "@pureform/binding-core";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { overDefaults } from "../defaults";
import { ListDefaults, ListItem } from "../list-item/list-item";
import type { ListItemProps } from "../list-item/list-item";
import { testIdOf, withEngine } from "../parts";
import { nativeSlots } from "../slot-props";
import type { InnerPropsOf, NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What the list gives every list item under the item's own: its keyed `style` and
 *  `slotProps`, `tokens` and `testId`. */
export type ListItemDefaults = InnerPropsOf<ListItemProps>;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface ListHosts {
    readonly root: "View";
    readonly item: "View";
}

export interface ListProps
    extends
        Omit<ListRootOwnProps, "unstyled">,
        ListContentProps<ReactNode>,
        NativeSlotProps<ListHosts, ListInstances<ListItemData<ReactNode>>> {
    readonly "aria-label"?: string | undefined;
    /** Every list item's `style`, `slotProps`, `tokens` and `testId`, under the item's own. */
    readonly listItemProps?: ListItemDefaults | undefined;
}

function ListImpl(props: ListProps): ReactNode {
    const { styles: s, views: v } = useComponentSlots<ListPart>(
        "list",
        listSelection(props),
    );
    const { density, color, leadingType } = props;
    const defaults = useMemo(
        () => ({ density, color, leadingType }),
        [density, color, leadingType],
    );
    const items = props.items ?? [];
    const segmented = props.variant === "segmented";
    const id = (part: ListPart) => testIdOf(listAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const each = slot.each("item");
    return (
        <ListDefaults value={defaults}>
            <v.root.View
                {...slot.props("root")}
                role="list"
                {...(props["aria-label"] === undefined
                    ? {}
                    : { "aria-label": props["aria-label"] })}
                style={slot.style("root", s.root)}
                testID={id("root")}
            >
                {items.map(({ value, ...item }, index) => {
                    const row = each
                        ? { index, item: items[index]! }
                        : undefined;
                    return (
                        <v.item.View
                            {...slot.props("item", row)}
                            key={value ?? index}
                            role="listitem"
                            style={slot.style("item", s.item, row)}
                            testID={id("item")}
                        >
                            <ListItem
                                {...overDefaults(
                                    props.listItemProps as
                                        | ListItemProps
                                        | undefined,
                                    item as ListItemProps,
                                )}
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
                    );
                })}
            </v.root.View>
        </ListDefaults>
    );
}

/** Material's list: `<List variant="segmented" items={[{ headline: "Inbox" }, …]} />`. Each item
 *  is a `ListItem`, which takes the list's density, color, and leading type, and
 *  `listItemProps`' tokens, unless it sets its own. `tokens` are the list's own. */
export const List = withEngine(ListImpl, "List");
