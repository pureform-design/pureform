// The list: Root, an unstyled `<ul>` that gives its list items its variants as their defaults; Item,
// the `<li>` around each list item; and the ready-made List, which renders a ListItem per entry of
// `items`.

import { listAnatomy } from "@pureform/anatomy";
import { LIST_ROOT_PROPS } from "@pureform/binding-core";
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
import { useUnstyledComponent } from "../parts";
import type { PartScope } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";

/** What Root shares with its items. */
interface ListContextValue {
    readonly scope: PartScope<typeof listAnatomy>;
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

/** The list's root, a `<ul>`. The registry doesn't style it. */
function Root(props: ListRootProps): ReactNode {
    const scope = useUnstyledComponent(listAnatomy, { testId: props.testId });
    const { density, color, tokens } = props;
    const defaults = useMemo(
        () => ({ density, color, tokens }),
        [density, color, tokens],
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

/** The `<li>` around a list item. The registry doesn't style it. */
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

/** The ready-made list: an item per entry of `items`, each a ListItem in an `<li>`. */
function ReadyMade(props: ListProps): ReactNode {
    const { slotProps, unstyled, items = [], ...rootProps } = props;
    return (
        <Root {...rootProps}>
            {items.map(({ value, ...item }, index) => (
                <Item key={value ?? index}>
                    <ListItem
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
