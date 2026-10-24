// The list: Root, a `<ul>` that gives its list items its variants as their defaults; Item, the
// `<li>` around each list item; and the ready-made List, which renders a ListItem per entry of
// `items`. A segmented list sets its items apart as tiles, each by its position.

import { listAnatomy } from "@pureform/anatomy";
import type { listItemAnatomy } from "@pureform/anatomy";
import {
    LIST_CONTENT_PROPS,
    LIST_ROOT_PROPS,
    listItemPosition,
    listSelection,
    overDefaults,
} from "@pureform/binding-core";
import type { ListItemData, ListRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { createMemo, For, omit } from "solid-js";

import { ListDefaults, ListItem } from "../list-item/list-item";
import type { ListItemProps } from "../list-item/list-item";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, InnerPropsOf, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";

/** What Root shares with its items. */
interface ListContextValue {
    readonly scope: ComponentScope<typeof listAnatomy>;
}

const context = createPartContext<ListContextValue>("List");

/** Root's props: the list's `variant` and own `tokens`, every list item's default variants,
 *  `testId`, `unstyled`, `as`, and the element's own props. */
export interface ListRootProps
    extends Omit<PartProps, keyof ListRootOwnProps>, ListRootOwnProps {
    /** Another element or component to render instead of `<ul>`. */
    readonly as?: ValidComponent | undefined;
}

/** An item's props: the `<li>`'s own. */
export type ListItemWrapperProps = PartProps;

/** The list's root, a `<ul>`. A segmented list's items take their `position` among the tiles
 *  (`listItemPosition`). */
function Root(props: ListRootProps): JSX.Element {
    const scope = useComponent(listAnatomy, {
        selection: () => listSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope }}>
            <ListDefaults
                value={() => ({
                    density: props.density,
                    color: props.color,
                    leadingType: props.leadingType,
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

/** The `<li>` around a list item. */
function Item(props: ListItemWrapperProps): JSX.Element {
    const { scope } = context.use("Item");
    return scope.render("item", { element: "li", props });
}

type Keyed = SlotKeyedProps<typeof listAnatomy>;
type ListItemDefaults = InnerPropsOf<typeof listItemAnatomy>;

/** The ready-made list's props: Root's, with `class`, `style` and `slotProps` keyed by the list's
 *  own parts (`root`, the `<ul>`; `item`, each `<li>`), the items as data, and `listItemProps`,
 *  every list item's defaults, under each item's own. */
export interface ListProps
    extends Omit<ListRootProps, keyof Keyed | "children">, Keyed {
    /** The items, in order: each a list item's content, variants, and its own `class`, `style`,
     *  `slotProps`, `unstyled`, `testId` and `tokens`, over `listItemProps`. */
    readonly items?:
        | readonly (ListItemData<JSX.Element> & ListItemDefaults)[]
        | undefined;
    /** Every list item's `class`, `style`, `slotProps`, `unstyled`, `testId` and `tokens`, under
     *  the item's own: `{ class: { headline: "bold" }, tokens: { … } }`. */
    readonly listItemProps?: ListItemDefaults | undefined;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "listItemProps",
    ...LIST_CONTENT_PROPS,
] as const;

interface ListEntry {
    readonly key: string | number;
    readonly item: ListItemData<JSX.Element> & ListItemDefaults;
}

/** The ready-made list: an item per entry of `items`, each a ListItem in an `<li>`, with its
 *  position among the tiles when segmented (an item's own `position` wins). An item's row
 *  is kept while its `value` (else its index) stays among the items, and follows its props. */
function ReadyMade(props: ListProps): JSX.Element {
    const slots = createSlotProps(props);
    const root = slots("root");
    const item = slots("item");
    // An entry per item, kept while its item is the same object, so a row's props change only
    // when its item does.
    let previous = new Map<string | number, ListEntry>();
    const entries = createMemo(() => {
        const next = new Map<string | number, ListEntry>();
        const list = (props.items ?? []).map((item, index) => {
            const key = item.value ?? index;
            const kept = previous.get(key);
            const entry = kept?.item === item ? kept : { key, item };
            next.set(key, entry);
            return entry;
        });
        previous = next;
        return list;
    });
    const position = (index: number) =>
        props.variant === "segmented"
            ? listItemPosition(index, entries().length, true)
            : undefined;
    return (
        <Root
            {...(omit(props, ...READY_MADE_PROPS) as ListRootProps)}
            {...root}
        >
            <For each={entries()} keyed={(entry) => entry.key}>
                {(entry, index) => {
                    const own = createMemo(
                        () =>
                            overDefaults(
                                props.listItemProps as
                                    | ListItemProps
                                    | undefined,
                                omit(entry().item, "value") as ListItemProps,
                            ) as ListItemProps,
                    );
                    return (
                        <Item {...item}>
                            <ListItem position={position(index())} {...own()} />
                        </Item>
                    );
                }}
            </For>
        </Root>
    );
}

/** Material's list. Use it ready-made, `<List items={[{ headline: "Inbox", href: "/inbox" }, …]}
 *  />`, or compose it: `List.Root` holding a `List.Item` per item, each holding a `ListItem`. */
export const List = Object.assign(ReadyMade, { Root, Item });
