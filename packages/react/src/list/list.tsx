// The list: Root, a `<ul>` that gives its list items its variants as their defaults; Item, the
// `<li>` around each list item; and the ready-made List, which renders a ListItem per entry of
// `items`, each in its place among the tiles of a segmented list.

import { listAnatomy } from "@pureform/anatomy";
import {
    LIST_ROOT_PROPS,
    listItemPosition,
    listSelection,
} from "@pureform/binding-core";
import type {
    ListContentProps,
    ListItemPart,
    ListRootOwnProps,
    SlotKeyed,
    Unstyled,
} from "@pureform/binding-core";
import { type ElementType, type ReactNode, useMemo } from "react";

import { ListDefaults, ListItem } from "../list-item/list-item";
import type { ListItemPartProps, ListItemProps } from "../list-item/list-item";
import { createPartContext } from "../part-context";
import { useComponent } from "../parts";
import type { ComponentScope } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";

/** What Root shares with its items. */
interface ListContextValue {
    readonly scope: ComponentScope<typeof listAnatomy>;
}

const context = createPartContext<ListContextValue>("List");

/** Root's props: every list item's default variants and tokens, `testId`, `as`, and the element's
 *  own props. */
export interface ListRootProps
    extends Omit<PartProps, keyof ListRootOwnProps>, ListRootOwnProps {
    /** Another element or component to render instead of `<ul>`. */
    readonly as?: ElementType | undefined;
}

/** An item's props: the `<li>`'s own. */
export type ListItemWrapperProps = PartProps;

/** The list's root, a `<ul>`. */
function Root(props: ListRootProps): ReactNode {
    const scope = useComponent(listAnatomy, {
        selection: listSelection(props),
        testId: props.testId,
    });
    const { density, color, tokens, leadingType } = props;
    const defaults = useMemo(
        () => ({ density, color, tokens, leadingType }),
        [density, color, tokens, leadingType],
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
function Item(props: ListItemWrapperProps): ReactNode {
    const { scope } = context.use("Item");
    return scope.render("item", { element: "li", props });
}

/** The ready-made list's props: Root's (`className` and `style` are the `<ul>`'s), the items as
 *  data, and props for every list item's parts, keyed by part. */
export interface ListProps
    extends Omit<ListRootProps, "children">, ListContentProps<ReactNode> {
    /** Every list item's parts' props, by part: `{ headline: { className: "…" } }`. */
    readonly slotProps?: SlotKeyed<ListItemPart, ListItemPartProps> | undefined;
    /** Every list item's parts, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ListItemPart> | undefined;
}

/** The ready-made list: an item per entry of `items`, each a ListItem in an `<li>`. In a segmented
 *  list, each item takes its position among the tiles unless given one. */
function ReadyMade(props: ListProps): ReactNode {
    const { slotProps, unstyled, items = [], ...rootProps } = props;
    const segmented = props.variant === "segmented";
    return (
        <Root {...rootProps}>
            {items.map(({ value, ...item }, index) => (
                <Item key={value ?? index}>
                    <ListItem
                        position={listItemPosition(
                            index,
                            items.length,
                            segmented,
                        )}
                        {...(item as ListItemProps)}
                        {...({ slotProps, unstyled } as Partial<ListItemProps>)}
                    />
                </Item>
            ))}
        </Root>
    );
}

/** Material's list. Use it ready-made, `<List items={[{ headline: "Inbox", href: "/inbox" }, …]}
 *  />`, or compose it: `List.Root` holding a `List.Item` per item, each holding a `ListItem`. */
export const List = Object.assign(ReadyMade, { Root, Item });
