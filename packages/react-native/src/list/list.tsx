// The list: a view the registry styles, holding each list item in an `item` view. It gives its
// items its variants as their defaults, and in a segmented list each item its place among the
// tiles, which rounds its corners.

import { listAnatomy } from "@pureform/anatomy";
import { listItemPosition, listSelection } from "@pureform/binding-core";
import type {
    ListContentProps,
    ListPart,
    ListRootOwnProps,
} from "@pureform/binding-core";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { ListDefaults, ListItem } from "../list-item/list-item";
import type { ListItemProps } from "../list-item/list-item";
import { testIdOf, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

export interface ListProps
    extends ListRootOwnProps, ListContentProps<ReactNode> {
    readonly "aria-label"?: string | undefined;
}

function ListImpl(props: ListProps): ReactNode {
    const { styles: s, views: v } = useComponentSlots<ListPart>(
        "list",
        listSelection(props),
    );
    const { density, color, tokens, leadingType } = props;
    const defaults = useMemo(
        () => ({ density, color, tokens, leadingType }),
        [density, color, tokens, leadingType],
    );
    const items = props.items ?? [];
    const segmented = props.variant === "segmented";
    const id = (part: ListPart) => testIdOf(listAnatomy, part, props.testId);
    return (
        <ListDefaults value={defaults}>
            <v.root.View
                role="list"
                {...(props["aria-label"] === undefined
                    ? {}
                    : { "aria-label": props["aria-label"] })}
                style={s.root}
                testID={id("root")}
            >
                {items.map(({ value, ...item }, index) => (
                    <v.item.View
                        key={value ?? index}
                        style={s.item}
                        testID={id("item")}
                    >
                        <ListItem
                            {...(item as ListItemProps)}
                            position={
                                item.position ??
                                listItemPosition(index, items.length, segmented)
                            }
                        />
                    </v.item.View>
                ))}
            </v.root.View>
        </ListDefaults>
    );
}

/** Material's list: `<List variant="segmented" items={[{ headline: "Inbox" }, …]} />`. Each item
 *  is a `ListItem`, which takes the list's density, color, tokens, and leading type unless it sets
 *  its own. */
export const List = withEngine(ListImpl, "List");
