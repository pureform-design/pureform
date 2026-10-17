// The list: Root, an unstyled `<ul>` that gives its list items its variants as their defaults; Item,
// the `<li>` around each list item; and the ready-made List, which renders a ListItem per entry of
// `items`.

import { listAnatomy } from "@pureform/anatomy";
import { LIST_CONTENT_PROPS, LIST_ROOT_PROPS } from "@pureform/binding-core";
import type {
    ListContentProps,
    ListItemData,
    ListItemPart,
    ListRootOwnProps,
    SlotKeyed,
    Unstyled,
} from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { For, omit } from "solid-js";

import { ListDefaults, ListItem } from "../list-item/list-item";
import type { ListItemPartProps, ListItemProps } from "../list-item/list-item";
import { createPartContext } from "../part-context";
import { useUnstyledComponent } from "../parts";
import type { PartScope } from "../parts";
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
    readonly as?: ValidComponent | undefined;
}

/** An item's props: the `<li>`'s own. */
export type ListItemWrapperProps = PartProps;

/** The list's root, a `<ul>`. The registry doesn't style it. */
function Root(props: ListRootProps): JSX.Element {
    const scope = useUnstyledComponent(listAnatomy, {
        testId: () => props.testId,
    });
    return (
        <context.Provider value={{ scope }}>
            <ListDefaults
                value={() => ({
                    density: props.density,
                    color: props.color,
                    tokens: props.tokens,
                })}
            >
                {scope.render("root", {
                    element: "ul",
                    as: () => props.as,
                    props: omit(props, "as", ...LIST_ROOT_PROPS),
                })}
            </ListDefaults>
        </context.Provider>
    );
}

/** The `<li>` around a list item. The registry doesn't style it. */
function Item(props: ListItemWrapperProps): JSX.Element {
    const { scope } = context.use("Item");
    return scope.render("item", { element: "li", props });
}

/** The ready-made list's props: Root's (`class` and `style` are the `<ul>`'s), the items as data,
 *  and props for every list item's parts, keyed by part. */
export interface ListProps
    extends Omit<ListRootProps, "children">, ListContentProps<JSX.Element> {
    /** Every list item's parts' props, by part: `{ headline: { class: "…" } }`. */
    readonly slotProps?: SlotKeyed<ListItemPart, ListItemPartProps> | undefined;
    /** Every list item's parts, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ListItemPart> | undefined;
}

const READY_MADE_PROPS = [
    "slotProps",
    "unstyled",
    ...LIST_CONTENT_PROPS,
] as const;

/** The ready-made list: an item per entry of `items`, each a ListItem in an `<li>`. */
function ReadyMade(props: ListProps): JSX.Element {
    const shared = {
        get slotProps() {
            return props.slotProps;
        },
        get unstyled() {
            return props.unstyled;
        },
    };
    return (
        <Root {...(omit(props, ...READY_MADE_PROPS) as ListRootProps)}>
            <For each={props.items ?? []}>
                {(item: ListItemData<JSX.Element>) => (
                    <Item>
                        <ListItem
                            {...(omit(item, "value") as ListItemProps)}
                            {...(shared as Partial<ListItemProps>)}
                        />
                    </Item>
                )}
            </For>
        </Root>
    );
}

/** Material's list. Use it ready-made, `<List items={[{ headline: "Inbox", href: "/inbox" }, …]}
 *  />`, or compose it: `List.Root` holding a `List.Item` per item, each holding a `ListItem`. */
export const List = Object.assign(ReadyMade, { Root, Item });
