// The menu: Root on Zag's menu machine, an unstyled element around the trigger and the menu; the
// trigger, a `<button>` or any component (`as={Button}`); Zag's positioner, which places the menu
// under the trigger; the menu's surface (`Content`) and its items, as the preset draws them; and
// the ready-made Menu over them. Everything renders in place, inside Root. A submenu is another
// menu machine under `Submenu`, inside its parent's content: its `TriggerItem` is the parent's
// item that opens it, beside it.

import { menuOverlayAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    hasSubmenu,
    isPresent,
    MENU_CONTENT_PROPS,
    MENU_ITEM_PROPS,
    MENU_ROOT_PROPS,
    menuGrouped,
    menuItemMachineProps,
    menuItemProps,
    menuMachineProps,
    menuSelection,
    overlayPositionerProps,
    presentProps,
    submenuPositioning,
} from "@pureform/binding-core";
import type {
    MenuContentProps,
    MenuGroup,
    MenuItem,
    MenuBehaviorProps,
    MenuItemBehaviorProps,
    MenuRootOwnProps,
    MenuVariantProps,
} from "@pureform/binding-core";
import { markMenuGroupEdges } from "@pureform/binding-core/dom";
import * as menu from "@pureform/machines/menu";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    For,
    omit,
    onCleanup,
    onSettled,
    Show,
    untrack,
} from "solid-js";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { ChevronEndIcon } from "../glyphs";
import { itemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof menuOverlayAnatomy;

/** What Root shares with its parts. */
interface MenuContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<menu.Api<PropTypes>>;
    readonly service: menu.Service;
    readonly sources: ItemInteractionSources;
    readonly presence: Presence;
    /** The variants, which a submenu takes as its own defaults. */
    readonly variants: Accessor<MenuVariantProps>;
    /** What a submenu takes from its parent unless given: choosing an item reports to the
     *  parent's `onSelect`, and the parent's keyboard options. */
    readonly behavior: Accessor<InheritedBehavior>;
    /** A submenu's parent menu. */
    readonly parent?: MenuContextValue | undefined;
}

type InheritedBehavior = Pick<
    MenuBehaviorProps,
    "onSelect" | "closeOnSelect" | "loopFocus" | "typeahead"
>;

/** What an item shares with its parts. */
interface ItemContextValue {
    readonly value: Accessor<string>;
}

const context = createPartContext<MenuContextValue>("Menu");
const itemContext = createPartContext<ItemContextValue>("Menu", "Item");

/** Root's props: the variants and tokens, the machine's props (`open`, `onSelect`,
 *  `positioning`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface MenuRootProps
    extends Omit<PartProps, keyof MenuRootOwnProps>, MenuRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface MenuPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface MenuTriggerProps extends MenuPartProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface MenuIconProps extends MenuPartProps {
    readonly mirror?: boolean | undefined;
}

/** An item's props: Zag's (`value`, `valueText`, `disabled`, `closeOnSelect`), for a toggleable
 *  item its `type`, `checked`, and `onCheckedChange`, and a part's. */
export interface MenuItemProps extends MenuPartProps, MenuItemBehaviorProps {}

/** A group's props: its `id` among the groups, and a part's. The surface marks its first and
 *  last groups itself. */
export interface MenuItemGroupProps extends MenuPartProps {
    readonly id: string;
}

/** A group label's props: the `id` of the group it names, and a part's. */
export interface MenuItemGroupLabelProps extends MenuPartProps {
    readonly htmlFor: string;
}

/** A menu's machine and scope, a submenu's under its `parent`: what Root and Submenu share. */
function useMenu(
    props: MenuRootProps,
    parent?: MenuContextValue,
): MenuContextValue {
    const id = createUniqueId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("Menu", "open", props);
    const sources = itemInteractionSources();
    const behavior = (): InheritedBehavior => {
        const inherited = parent?.behavior();
        return {
            onSelect: props.onSelect ?? inherited?.onSelect,
            closeOnSelect: props.closeOnSelect ?? inherited?.closeOnSelect,
            loopFocus: props.loopFocus ?? inherited?.loopFocus,
            typeahead: props.typeahead ?? inherited?.typeahead,
        };
    };
    const service = useMachine(menu.machine, () => ({
        id,
        ...sources.machineProps,
        dir: dir(),
        ...menuMachineProps({
            ...behavior(),
            "aria-label": props["aria-label"],
            ids: props.ids,
            positioning: parent
                ? submenuPositioning(dir(), props.positioning)
                : props.positioning,
        }),
        ...open.machineProps(),
    }));
    const api = createMemo(() => menu.connect(service, normalizeProps));
    const presence = usePresence(() => api().open);
    // A submenu draws as its parent does, unless told otherwise; it isn't grouped.
    const variants = (): MenuVariantProps => {
        const own = menuSelection(props);
        if (!parent) return own;
        const inherited = parent.variants();
        return {
            color: own.color ?? inherited.color,
            density: own.density ?? inherited.density,
            vibrant: own.vibrant ?? inherited.vibrant,
            grouped: own.grouped,
            tokens: own.tokens ?? inherited.tokens,
        } as MenuVariantProps;
    };
    const scope = useComponent(menuOverlayAnatomy, {
        selection: () => menuSelection(variants()),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    if (parent) {
        onSettled(() => {
            parent.api().setChild(service as never);
            api().setParent(parent.service as never);
        });
    }
    return {
        scope,
        api,
        service: service as unknown as menu.Service,
        sources,
        presence,
        variants,
        behavior,
        parent,
    };
}

/** The menu's root, a `<div>` around the trigger and the menu. The registry doesn't style it. */
function Root(props: MenuRootProps): JSX.Element {
    const value = useMenu(props);
    return (
        <context.Provider value={value}>
            {value.scope.render("root", {
                element: "div",
                as: () => props.as,
                props: omit(props, "as", ...MENU_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** A submenu, inside its parent's content: a menu of its own, opened by its `TriggerItem` and
 *  placed beside it. It takes Root's props, its variants defaulting to its parent's. */
function Submenu(props: MenuRootProps): JSX.Element {
    const parent = context.use("Submenu");
    const value = useMenu(props, parent);
    return (
        <context.Provider value={value}>
            {value.scope.render("root", {
                element: "div",
                as: () => props.as,
                props: omit(props, "as", ...MENU_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The attributes Trigger gives its element to name the menu's part. A component that renders its
 *  own part as the trigger drops them, keeping its own. */
export const MENU_TRIGGER_ATTRIBUTES = [
    "data-scope",
    "data-pf-part",
    "data-testid",
] as const;

/** The button that opens the menu: a click, Enter, Space, or the arrow keys up and down. */
function Trigger(props: MenuTriggerProps): JSX.Element {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** Places the menu under the trigger; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
function Positioner(props: MenuPartProps): JSX.Element {
    const { scope, api, presence } = context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        machine: () =>
            overlayPositionerProps(
                api().getPositionerProps(),
                presence.present(),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The menu's surface, which holds focus while it's open and moves through the items with the
 *  arrow keys. It stays while its exit animation runs. */
function Content(props: MenuPartProps): JSX.Element {
    const { scope, api, presence } = context.use("Content");
    // Its groups' first and last are marked from the DOM, so composed menus round them too.
    let stop: (() => void) | undefined;
    onCleanup(() => stop?.());
    return scope.render("content", {
        element: "div",
        ref: (element: HTMLElement) => {
            presence.ref(element);
            stop?.();
            stop = markMenuGroupEdges(element);
        },
        machine: () =>
            presentProps(api().getContentProps(), presence.present()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A group of items, named by the ItemGroupLabel whose `htmlFor` is its `id`. */
function ItemGroup(props: MenuItemGroupProps): JSX.Element {
    const { scope, api } = context.use("ItemGroup");
    return scope.render("itemGroup", {
        element: "div",
        machine: () => api().getItemGroupProps({ id: props.id }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "id"),
    });
}

/** A group's label. */
function ItemGroupLabel(props: MenuItemGroupLabelProps): JSX.Element {
    const { scope, api } = context.use("ItemGroupLabel");
    return scope.render("itemGroupLabel", {
        element: "div",
        machine: () => api().getItemGroupLabelProps({ htmlFor: props.htmlFor }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "htmlFor"),
    });
}

/** An item; the highlighted one shows the hover state. A toggleable item (`type`) fills while
 *  `checked`. */
function Item(props: MenuItemProps): JSX.Element {
    const { scope, api, sources } = context.use("Item");
    const source = sources.item(
        () => props.value,
        () => props.interactionSource,
    );
    const item = () => ({
        value: props.value,
        valueText: props.valueText,
        disabled: props.disabled,
        closeOnSelect: props.closeOnSelect,
        type: props.type,
        checked: props.checked,
        onCheckedChange: props.onCheckedChange,
    });
    const highlighted = () => {
        const { type, checked, ...rest } = item();
        return type === undefined
            ? api().getItemState(rest).highlighted
            : api().getOptionItemState({
                  ...rest,
                  type,
                  checked: checked ?? false,
              }).highlighted;
    };
    return (
        <itemContext.Provider value={{ value: () => props.value }}>
            {scope.render("item", {
                element: "div",
                interactionSource: source,
                machine: () => menuItemMachineProps(api(), item()),
                states: () => ({ hover: highlighted() }),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled", ...MENU_ITEM_PROPS),
            })}
        </itemContext.Provider>
    );
}

/** A submenu's item in its parent: it opens the submenu (the pointer resting on it, a click,
 *  Enter, Space, or the arrow toward the end of the line) instead of being chosen, and shows as
 *  hovered while the submenu is open. Its parts are the parent's item parts. */
function TriggerItem(props: MenuPartProps): JSX.Element {
    const child = context.use("TriggerItem");
    const parent = child.parent;
    if (!parent) {
        throw new Error("Menu.TriggerItem must be used within Menu.Submenu");
    }
    const value = () => child.api().getTriggerProps().id as string;
    const source = parent.sources.item(value, () => undefined);
    return (
        <context.Provider value={parent}>
            <itemContext.Provider value={{ value }}>
                {parent.scope.render("item", {
                    element: "div",
                    interactionSource: source,
                    machine: () =>
                        parent.api().getTriggerItemProps(child.api()),
                    states: () => ({
                        hover:
                            parent.api().highlightedValue === value() ||
                            child.api().open,
                    }),
                    unstyled: () => props.unstyled,
                    props: omit(props, "unstyled"),
                })}
            </itemContext.Provider>
        </context.Provider>
    );
}

/** An icon before an item's label, hidden from assistive technology. */
function ItemLeading(props: MenuIconProps): JSX.Element {
    const { scope } = context.use("ItemLeading");
    itemContext.use("ItemLeading");
    return scope.render("itemLeading", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

/** An item's text: its label and supporting text. */
function ItemContent(props: MenuPartProps): JSX.Element {
    const { scope } = context.use("ItemContent");
    itemContext.use("ItemContent");
    return scope.render("itemContent", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A line under an item's label. */
function ItemSupportingText(props: MenuPartProps): JSX.Element {
    const { scope } = context.use("ItemSupportingText");
    itemContext.use("ItemSupportingText");
    return scope.render("itemSupportingText", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** An item's label. */
function ItemLabel(props: MenuPartProps): JSX.Element {
    const { scope } = context.use("ItemLabel");
    itemContext.use("ItemLabel");
    return scope.render("itemLabel", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** An icon after an item's label, hidden from assistive technology. */
function ItemTrailing(props: MenuIconProps): JSX.Element {
    const { scope } = context.use("ItemTrailing");
    itemContext.use("ItemTrailing");
    return scope.render("itemTrailing", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

/** Text after an item's label, such as a keyboard shortcut. */
function ItemTrailingText(props: MenuPartProps): JSX.Element {
    const { scope } = context.use("ItemTrailingText");
    itemContext.use("ItemTrailingText");
    return scope.render("itemTrailingText", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** `Items`' props: the items as data, and the slot props each of their parts takes. */
export interface MenuItemsProps {
    readonly items: readonly MenuItem<JSX.Element>[];
    readonly slot?: ((part: PartName<Anatomy>) => PartProps) | undefined;
}

const NO_SLOT = (): PartProps => ({});

/** An `Item` per entry of `items`, with its icons, label, supporting text and trailing text, or
 *  a `Submenu` for an entry with `items` of its own: what the ready-made menu renders, for a component that holds a menu (the split button). */
function Items(props: MenuItemsProps): JSX.Element {
    const slot = untrack(() => props.slot) ?? NO_SLOT;
    // Views, so every item reads the same ones.
    const itemSlot = slot("item");
    const itemLeading = slot("itemLeading");
    const itemContent = slot("itemContent");
    const itemLabel = slot("itemLabel");
    const itemSupportingText = slot("itemSupportingText");
    const itemTrailing = slot("itemTrailing");
    const itemTrailingText = slot("itemTrailingText");
    const positioner = slot("positioner");
    const content = slot("content");
    const parts = (
        item: () => MenuItem<JSX.Element>,
        trailing?: JSX.Element,
    ) => (
        <>
            <Show when={isPresent(item().leadingIcon)}>
                <ItemLeading mirror={item().mirrorLeadingIcon} {...itemLeading}>
                    {item().leadingIcon}
                </ItemLeading>
            </Show>
            <ItemContent {...itemContent}>
                <ItemLabel {...itemLabel}>{item().label}</ItemLabel>
                <Show when={isPresent(item().supportingText)}>
                    <ItemSupportingText {...itemSupportingText}>
                        {item().supportingText}
                    </ItemSupportingText>
                </Show>
            </ItemContent>
            <Show when={isPresent(item().trailingIcon)}>
                <ItemTrailing
                    mirror={item().mirrorTrailingIcon}
                    {...itemTrailing}
                >
                    {item().trailingIcon}
                </ItemTrailing>
            </Show>
            <Show when={isPresent(item().trailingText)}>
                <ItemTrailingText {...itemTrailingText}>
                    {item().trailingText}
                </ItemTrailingText>
            </Show>
            {trailing}
        </>
    );
    return (
        <For
            each={props.items}
            keyed={(item: MenuItem<JSX.Element>) => item.value}
        >
            {(item) => (
                <Show
                    when={hasSubmenu(item())}
                    fallback={
                        <Item {...menuItemProps(item())} {...itemSlot}>
                            {parts(item)}
                        </Item>
                    }
                >
                    <Submenu>
                        <TriggerItem {...itemSlot}>
                            {parts(
                                item,
                                <ItemTrailing mirror {...itemTrailing}>
                                    <ChevronEndIcon />
                                </ItemTrailing>,
                            )}
                        </TriggerItem>
                        <Positioner {...positioner}>
                            <Content {...content}>
                                <Items items={item().items ?? []} slot={slot} />
                            </Content>
                        </Positioner>
                    </Submenu>
                </Show>
            )}
        </For>
    );
}

/** The ready-made menu's props: Root's, with `class`, `style`, and `slotProps` keyed by part, the
 *  trigger's label, and the items as data. */
export interface MenuProps
    extends
        Omit<MenuRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        MenuContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...MENU_CONTENT_PROPS,
] as const;

/** The ready-made menu: the trigger, drawn as a button, when given a label, and the menu with an
 *  item per entry of `items`, then a group per entry of `groups`. */
function ReadyMade(props: MenuProps): JSX.Element {
    const items = () => props.items ?? [];
    const groups = () => props.groups ?? [];
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as MenuRootProps;
    const root = slots("root") as object;
    const trigger = slots("trigger") as object;
    const positioner = slots("positioner");
    const content = slots("content");
    const itemGroup = slots("itemGroup");
    const itemGroupLabel = slots("itemGroupLabel");
    return (
        <Root {...own} grouped={menuGrouped(props) || props.grouped} {...root}>
            <Show when={isPresent(props.trigger)}>
                <Trigger as={Button} label={props.trigger} {...trigger} />
            </Show>
            <Positioner {...positioner}>
                <Content {...content}>
                    <Items items={items()} slot={slots} />
                    <For
                        each={groups()}
                        keyed={(group: MenuGroup<JSX.Element>) => group.id}
                    >
                        {(group) => (
                            <ItemGroup {...itemGroup} id={group().id}>
                                <Show when={isPresent(group().label)}>
                                    <ItemGroupLabel
                                        htmlFor={group().id}
                                        {...itemGroupLabel}
                                    >
                                        {group().label}
                                    </ItemGroupLabel>
                                </Show>
                                <Items items={group().items} slot={slots} />
                            </ItemGroup>
                        )}
                    </For>
                </Content>
            </Positioner>
        </Root>
    );
}

/** Material's menu. Use it ready-made, `<Menu trigger="Edit" items={[{ value: "cut", label:
 *  "Cut" }, …]} onSelect={…} />`, or compose its parts under `Menu.Root`: `Trigger` (`as={Button}`
 *  draws it as a button), then `Positioner` holding `Content`, with an `Item` per entry holding
 *  `ItemLeading`, `ItemContent` (holding `ItemLabel` and `ItemSupportingText`), `ItemTrailing`,
 *  and `ItemTrailingText`. Items can sit in an `ItemGroup`, named by an `ItemGroupLabel`. A
 *  `Submenu` in the content holds its `TriggerItem` (the parent's item that opens it, an arrow in
 *  its `ItemTrailing`), then its own `Positioner` and `Content`; a ready-made item opens one when
 *  given `items`. */
export const Menu = Object.assign(ReadyMade, {
    Root,
    Submenu,
    Trigger,
    Positioner,
    Content,
    ItemGroup,
    ItemGroupLabel,
    Item,
    TriggerItem,
    Items,
    ItemLeading,
    ItemContent,
    ItemLabel,
    ItemSupportingText,
    ItemTrailing,
    ItemTrailingText,
});
