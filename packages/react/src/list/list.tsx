// The list: Root, a `<ul>` that gives its list items its variants as their defaults; Item, the
// `<li>` around each list item; and the ready-made List, which renders a ListItem per entry of
// `items`, each in its place among the tiles of a segmented list.

import { listAnatomy } from "@pureform/anatomy";
import type { listItemAnatomy } from "@pureform/anatomy";
import {
    LIST_ROOT_PROPS,
    listItemPosition,
    listSelection,
    overDefaults,
} from "@pureform/binding-core";
import type {
    ListInstances,
    ListItemData,
    ListRootOwnProps,
} from "@pureform/binding-core";
import { type ElementType, type ReactNode, useMemo } from "react";

import { ListDefaults, ListItem } from "../list-item/list-item";
import type { ListItemProps } from "../list-item/list-item";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, InnerPropsOf, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";

/** What Root shares with its items. */
interface ListContextValue {
    readonly scope: ComponentScope<typeof listAnatomy>;
}

const context = createPartContext<ListContextValue>("List");

/** Root's props: every list item's default variants, the list's own tokens, `testId`,
 *  `unstyled`, `as`, and the element's own props. */
export interface ListRootProps
    extends Omit<PartProps, keyof ListRootOwnProps>, ListRootOwnProps {
    /** Another element or component to render instead of `<ul>`. */
    readonly as?: ElementType | undefined;
}

/** An item's props: the `<li>`'s own, and the part's `unstyled`. */
export interface ListItemWrapperProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The list's root, a `<ul>`. */
function Root(props: ListRootProps): ReactNode {
    const scope = useComponent(listAnatomy, {
        selection: listSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { density, color, leadingType } = props;
    const defaults = useMemo(
        () => ({ density, color, leadingType }),
        [density, color, leadingType],
    );
    const { as, ...rest } = omitProps(props, LIST_ROOT_PROPS);
    return (
        <context.Provider value={{ scope }}>
            <ListDefaults value={defaults}>
                {scope.render("root", { element: "ul", as, props: rest })}
            </ListDefaults>
        </context.Provider>
    );
}

/** The `<li>` around a list item. */
function Item({ unstyled, ...props }: ListItemWrapperProps): ReactNode {
    const { scope } = context.use("Item");
    return scope.render("item", { element: "li", unstyled, props });
}

/** One item of the ready-made list: a list item's content, variants and own customizing props. */
export type ListEntry = ListItemData<ReactNode> &
    InnerPropsOf<typeof listItemAnatomy>;

/** The ready-made list's props: Root's, with `className`, `style`, `slotProps` and `unstyled` keyed
 *  by the list's own parts (`root`, the `<ul>`; `item`, each `<li>`, also by item, `ListInstances`),
 *  the items as data, and
 *  `listItemProps`, every list item's defaults, under each item's own. */
export interface ListProps
    extends
        Omit<
            ListRootProps,
            keyof SlotKeyedProps<typeof listAnatomy> | "children"
        >,
        SlotKeyedProps<typeof listAnatomy, never, ListInstances<ListEntry>> {
    /** The items, in order: each a list item's content, variants, and its own `className`,
     *  `style`, `slotProps`, `unstyled`, `testId` and `tokens`, over `listItemProps`. */
    readonly items?: readonly ListEntry[] | undefined;
    /** Every list item's `className`, `style`, `slotProps`, `unstyled`, `testId` and `tokens`,
     *  under the item's own: `{ className: { headline: "bold" }, tokens: { … } }`. */
    readonly listItemProps?: InnerPropsOf<typeof listItemAnatomy> | undefined;
}

/** The ready-made list: an item per entry of `items`, each a ListItem in an `<li>`. In a segmented
 *  list, each item takes its position among the tiles unless given one. */
function ReadyMade(props: ListProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        listItemProps,
        items = [],
        ...rootProps
    } = props;
    const slot = useSlotProps<
        typeof listAnatomy,
        never,
        ListInstances<ListEntry>
    >(props);
    const segmented = props.variant === "segmented";
    const each = slot.each("item");
    return (
        <Root {...rootProps} {...slot("root")}>
            {items.map(({ value, ...item }, index) => (
                <Item
                    key={value ?? index}
                    {...slot(
                        "item",
                        each ? { index, item: items[index]! } : undefined,
                    )}
                >
                    <ListItem
                        position={listItemPosition(
                            index,
                            items.length,
                            segmented,
                        )}
                        {...overDefaults(
                            listItemProps as ListItemProps | undefined,
                            item as ListItemProps,
                        )}
                    />
                </Item>
            ))}
        </Root>
    );
}

/** Material's list. Use it ready-made, `<List items={[{ headline: "Inbox", href: "/inbox" }, …]}
 *  />`, or compose it: `List.Root` holding a `List.Item` per item, each holding a `ListItem`. */
export const List = Object.assign(ReadyMade, { Root, Item });
