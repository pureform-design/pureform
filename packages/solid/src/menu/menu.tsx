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
    MENU_BACK_VALUE,
    MENU_CONTENT_PROPS,
    MENU_ITEM_PROPS,
    MENU_ROOT_PROPS,
    menuDrillLevel,
    menuDrillPathTo,
    menuDrillPick,
    menuGrouped,
    menuItemProps,
    menuSelection,
    menuSubmenuAdapt,
    menuSubmenuRoomOf,
    menuSubmenuMode,
    submenuPositioning,
} from "@pureform/binding-core";
import type {
    MenuContentProps,
    MenuGroup,
    MenuInstances,
    MenuItem,
    MenuItemInstance,
    MenuBehaviorProps,
    MenuItemBehaviorProps,
    MenuRootOwnProps,
    MenuSelectDetails,
    MenuVariantProps,
} from "@pureform/binding-core";
import {
    menuItemMachineProps,
    menuMachineProps,
    overlayPositionerProps,
    presentProps,
} from "@pureform/binding-web";
import {
    markMenuGroupEdges,
    menuDrillFrom,
    menuDrillTiming,
    menuDrillTo,
    menuSubmenuPressed,
    menuSubmenuBoundary,
    menuSubmenuRoom,
    watchScroll,
    noteMenuSubmenuPresses,
    springRoleVar,
} from "@pureform/binding-web";
import type { MenuDrillSnapshot } from "@pureform/binding-web";
import * as menu from "@pureform/machines/menu";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createEffect,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    omit,
    onCleanup,
    onSettled,
    Show,
    untrack,
    useContext,
} from "solid-js";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { ChevronEndIcon, ChevronStartIcon } from "../glyphs";
import { itemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent, asRoot } from "../parts";
import type { ComponentScope, SlotKeyedProps, SlotPropsOf } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection, usePureform } from "../provider";

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
    /** The test ids and `unstyled`, which a submenu takes unless given its own. */
    readonly testId: Accessor<MenuRootProps["testId"]>;
    readonly unstyled: Accessor<MenuRootProps["unstyled"]>;
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
 *  last groups itself (a grouped menu rounds their outside corners); `first` and `last`
 *  override that marking. */
export interface MenuItemGroupProps extends MenuPartProps {
    readonly id: string;
    readonly first?: boolean | undefined;
    readonly last?: boolean | undefined;
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
    const testId = () => props.testId ?? parent?.testId();
    const unstyled = () => props.unstyled ?? parent?.unstyled();
    const scope = useComponent(menuOverlayAnatomy, {
        selection: () => menuSelection(variants()),
        testId,
        unstyled,
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
        testId,
        unstyled,
        parent,
    };
}

/** The menu's root, a `<div>` around the trigger and the menu. The registry doesn't style it. */
function Root(props: MenuRootProps): JSX.Element {
    const value = useMenu(props);
    const rest = omit(props, "as", ...MENU_ROOT_PROPS);
    return (
        <context.Provider value={value}>
            {value.scope.render("root", {
                element: "div",
                as: () => props.as,
                props: rest,
            })}
        </context.Provider>
    );
}

/** A submenu, inside its parent's content: a menu of its own, opened by its `TriggerItem` and
 *  placed beside it. It takes Root's props, its variants defaulting to its parent's. */
function Submenu(props: MenuRootProps): JSX.Element {
    const parent = context.use("Submenu");
    const value = useMenu(props, parent);
    const rest = omit(props, "as", ...MENU_ROOT_PROPS);
    return (
        <context.Provider value={value}>
            {value.scope.render("root", {
                element: "div",
                as: () => props.as,
                props: rest,
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
    const rest = omit(props, "unstyled", "as");
    return scope.render("trigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getTriggerProps(),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** An area that opens the menu at the pointer: a right-click, a touch held down, or the context
 *  menu key or Shift+F10 pressed in it. The menu opens where the pointer was, and what's inside
 *  keeps its own behaviour. The registry doesn't style it. */
function ContextTrigger(props: MenuTriggerProps): JSX.Element {
    const { scope, api } = context.use("ContextTrigger");
    const rest = omit(props, "unstyled", "as");
    return scope.render("contextTrigger", {
        element: "div",
        as: () => props.as,
        machine: () => api().getContextTriggerProps(),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** Places the menu under the trigger; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
function Positioner(props: MenuPartProps): JSX.Element {
    const { scope, api, presence } = context.use("Positioner");
    const rest = omit(props, "unstyled");
    return scope.render("positioner", {
        element: "div",
        machine: () =>
            overlayPositionerProps(
                api().getPositionerProps(),
                presence.present(),
            ),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The menu's surface, which holds focus while it's open and moves through the items with the
 *  arrow keys. It stays while its exit animation runs. */
function Content(props: MenuPartProps): JSX.Element {
    const { scope, api, presence } = context.use("Content");
    // Its groups' first and last are marked from the DOM, so composed menus round them too.
    let stop: (() => void) | undefined;
    onCleanup(() => stop?.());
    const rest = omit(props, "unstyled");
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
        props: rest,
    });
}

/** A group of items, named by the ItemGroupLabel whose `htmlFor` is its `id`. */
function ItemGroup(props: MenuItemGroupProps): JSX.Element {
    const { scope, api } = context.use("ItemGroup");
    const rest = omit(props, "unstyled", "id", "first", "last");
    return scope.render("itemGroup", {
        element: "div",
        machine: () =>
            api().getItemGroupProps({
                id: props.id,
                first: props.first,
                last: props.last,
            }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** A group's label. */
function ItemGroupLabel(props: MenuItemGroupLabelProps): JSX.Element {
    const { scope, api } = context.use("ItemGroupLabel");
    const rest = omit(props, "unstyled", "htmlFor");
    return scope.render("itemGroupLabel", {
        element: "div",
        machine: () => api().getItemGroupLabelProps({ htmlFor: props.htmlFor }),
        unstyled: () => props.unstyled,
        props: rest,
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
    const rest = omit(props, "unstyled", ...MENU_ITEM_PROPS);
    return (
        <itemContext.Provider value={{ value: () => props.value }}>
            {scope.render("item", {
                element: "div",
                interactionSource: source,
                machine: () => menuItemMachineProps(api(), item()),
                states: () => ({ hover: highlighted() }),
                unstyled: () => props.unstyled,
                props: rest,
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
    const rest = omit(props, "unstyled");
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
                    props: rest,
                })}
            </itemContext.Provider>
        </context.Provider>
    );
}

/** An icon before an item's label, hidden from assistive technology. */
function ItemLeading(props: MenuIconProps): JSX.Element {
    const { scope } = context.use("ItemLeading");
    itemContext.use("ItemLeading");
    const rest = omit(props, "unstyled", "mirror");
    return scope.render("itemLeading", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** An item's text: its label and supporting text. */
function ItemContent(props: MenuPartProps): JSX.Element {
    const { scope } = context.use("ItemContent");
    itemContext.use("ItemContent");
    const rest = omit(props, "unstyled");
    return scope.render("itemContent", {
        element: "span",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** A line under an item's label. */
function ItemSupportingText(props: MenuPartProps): JSX.Element {
    const { scope } = context.use("ItemSupportingText");
    itemContext.use("ItemSupportingText");
    const rest = omit(props, "unstyled");
    return scope.render("itemSupportingText", {
        element: "span",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** An item's label. */
function ItemLabel(props: MenuPartProps): JSX.Element {
    const { scope } = context.use("ItemLabel");
    itemContext.use("ItemLabel");
    const rest = omit(props, "unstyled");
    return scope.render("itemLabel", {
        element: "span",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** An icon after an item's label, hidden from assistive technology. */
function ItemTrailing(props: MenuIconProps): JSX.Element {
    const { scope } = context.use("ItemTrailing");
    itemContext.use("ItemTrailing");
    const rest = omit(props, "unstyled", "mirror");
    return scope.render("itemTrailing", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** Text after an item's label, such as a keyboard shortcut. */
function ItemTrailingText(props: MenuPartProps): JSX.Element {
    const { scope } = context.use("ItemTrailingText");
    itemContext.use("ItemTrailingText");
    const rest = omit(props, "unstyled");
    return scope.render("itemTrailingText", {
        element: "span",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The slot props `Items` gives each part of an item: a ready-made's `createSlotProps`, whose
 *  functions of the row (`MenuItemInstance`) it resolves, or one function of the part. */
export type MenuItemSlot =
    | SlotPropsOf<PartName<Anatomy>, MenuInstances<JSX.Element>>
    | ((part: PartName<Anatomy>) => PartProps);

// What `Items` calls: either form, read loosely.
type RowSlot = (
    part: string,
    instance?: Accessor<MenuItemInstance<JSX.Element>>,
) => PartProps;

/** `Items`' props: the items as data, and the slot props each of their parts takes. */
export interface MenuItemsProps {
    readonly items: readonly MenuItem<JSX.Element>[];
    readonly slot?: MenuItemSlot | undefined;
    /** An entry with `items` is a row that drills into them (the menu's `onSelect` hears its
     *  value) rather than a submenu beside it. */
    readonly drill?: boolean | undefined;
    /** How deep their submenu is, for a function of the row: `0` for the menu's own items. */
    readonly depth?: number | undefined;
}

const NO_SLOT: MenuItemSlot = () => ({});

/** What a ready-made menu under `submenu="auto"` gives its cascading submenus: the container
 *  they keep within, and what drills into one that doesn't fit. */
interface AutoSubmenuValue {
    readonly active: () => boolean;
    readonly container: () => string | undefined;
    /** The submenu items found not to fit, which drill when chosen. */
    readonly drills: () => ReadonlySet<string>;
    /** Notes `value` doesn't fit, and drills into it when `now`. */
    readonly drill: (value: string, now: boolean) => void;
    /** What was measured as `value` stopped fitting, to tell when it would again. */
    readonly remember: (value: string, fit: SubmenuFit) => void;
    /** The submenu item that opens as a cascade again once its room returns. */
    readonly reopen: () => string | undefined;
}

/** A submenu's measure as it stopped fitting: what to compare the room against once the menu
 *  has drilled and the cascade isn't there to measure. */
interface SubmenuFit {
    readonly anchor: Element | null;
    readonly menuWidth: number;
    readonly rowTop: number;
    readonly rowBottom: number;
    readonly size: { readonly width: number; readonly height: number };
}

const AutoSubmenuContext = createContext<AutoSubmenuValue | null>(null);

/** An `Item` per entry of `items`, with its icons, label, supporting text and trailing text, or
 *  a `Submenu` for an entry with `items` of its own: what the ready-made menu renders, for a component that holds a menu (the split button). */
function Items(props: MenuItemsProps): JSX.Element {
    const given = untrack(() => props.slot) ?? NO_SLOT;
    const slot = given as RowSlot;
    const auto = useContext(AutoSubmenuContext);
    const drills = (value: string) =>
        props.drill || (auto?.active() && auto.drills().has(value));
    const positioner = slot("positioner");
    const content = slot("content");
    const parts = (
        item: () => MenuItem<JSX.Element>,
        row: Accessor<MenuItemInstance<JSX.Element>>,
        trailing?: JSX.Element,
    ) => (
        <>
            <Show when={isPresent(item().leadingIcon)}>
                <ItemLeading
                    mirror={item().mirrorLeadingIcon}
                    {...slot("itemLeading", row)}
                >
                    {item().leadingIcon}
                </ItemLeading>
            </Show>
            <ItemContent {...slot("itemContent", row)}>
                <ItemLabel {...slot("itemLabel", row)}>
                    {item().label}
                </ItemLabel>
                <Show when={isPresent(item().supportingText)}>
                    <ItemSupportingText {...slot("itemSupportingText", row)}>
                        {item().supportingText}
                    </ItemSupportingText>
                </Show>
            </ItemContent>
            <Show when={isPresent(item().trailingIcon)}>
                <ItemTrailing
                    mirror={item().mirrorTrailingIcon}
                    {...slot("itemTrailing", row)}
                >
                    {item().trailingIcon}
                </ItemTrailing>
            </Show>
            <Show when={isPresent(item().trailingText)}>
                <ItemTrailingText {...slot("itemTrailingText", row)}>
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
            {(item, index) => {
                const row = () => ({
                    item: item(),
                    index: index(),
                    depth: props.depth ?? 0,
                });
                const itemSlot = slot("item", row);
                const itemTrailing = slot("itemTrailing", row);
                return (
                    <Show
                        when={hasSubmenu(item()) && !drills(item().value)}
                        fallback={
                            <Show
                                when={hasSubmenu(item())}
                                fallback={
                                    <Item
                                        {...menuItemProps(item())}
                                        {...itemSlot}
                                    >
                                        {parts(item, row)}
                                    </Item>
                                }
                            >
                                <Item
                                    {...menuItemProps(item())}
                                    closeOnSelect={false}
                                    aria-haspopup="menu"
                                    {...itemSlot}
                                >
                                    {parts(
                                        item,
                                        row,
                                        <ItemTrailing mirror {...itemTrailing}>
                                            <ChevronEndIcon />
                                        </ItemTrailing>,
                                    )}
                                </Item>
                            </Show>
                        }
                    >
                        <Submenu
                            defaultOpen={
                                auto?.reopen() === item().value || undefined
                            }
                        >
                            <AutoSubmenu value={item().value} />
                            <TriggerItem {...itemSlot}>
                                {parts(
                                    item,
                                    row,
                                    <ItemTrailing mirror {...itemTrailing}>
                                        <ChevronEndIcon />
                                    </ItemTrailing>,
                                )}
                            </TriggerItem>
                            <Positioner {...positioner}>
                                <Content {...content}>
                                    <Items
                                        items={item().items ?? []}
                                        slot={given}
                                        depth={(props.depth ?? 0) + 1}
                                    />
                                </Content>
                            </Positioner>
                        </Submenu>
                    </Show>
                );
            }}
        </For>
    );
}

/** The ready-made menu's props: Root's, with `class`, `style`, `slotProps` and `unstyled` keyed by
 *  part (an item's parts also by row, `MenuItemInstance`, at every submenu's level), the trigger's
 *  label, and the items as data. */
export interface MenuProps
    extends
        Omit<MenuRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy, never, MenuInstances<JSX.Element>>,
        MenuContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...MENU_CONTENT_PROPS,
] as const;

/** Under `submenu="auto"`, decides as its submenu opens, before it's painted: the submenu, laid
 *  out at its own size, cascades when it fits beside the menu and down or up from its item;
 *  else its item drills from then on: at once when a press or a key opened it, at the next press
 *  when the pointer resting on the item did. */
function AutoSubmenu(props: { readonly value: string }): JSX.Element {
    const auto = useContext(AutoSubmenuContext);
    const child = context.use("Submenu");
    if (!auto || !child.parent) return null;
    const parent = child.parent;
    noteMenuSubmenuPresses();
    createEffect(
        () => child.api().open,
        // The measuring reads what it needs now (props, the api's ids), none of it a dependency.
        (open) =>
            untrack(() => {
                if (!open || !untrack(auto.active)) return;
                const api = untrack(child.api);
                const byId = (id: unknown) =>
                    typeof id === "string" ? document.getElementById(id) : null;
                const submenu = byId(api.getContentProps().id);
                const menu = byId(untrack(parent.api).getContentProps().id);
                const row = byId(api.getTriggerProps().id);
                if (!submenu || !menu || !row) return;
                submenu.style.visibility = "";
                let top: MenuContextValue = parent;
                while (top.parent) top = top.parent;
                const anchor = byId(untrack(top.api).getTriggerProps().id);
                const room = () =>
                    menuSubmenuRoom(
                        menu,
                        row,
                        submenu,
                        anchor,
                        untrack(auto.container),
                    );
                const remember = () => {
                    const box = menu.getBoundingClientRect();
                    const at = row.getBoundingClientRect();
                    auto.remember(props.value, {
                        anchor,
                        menuWidth: box.width,
                        rowTop: at.top - box.top,
                        rowBottom: at.bottom - box.top,
                        size: submenu.getBoundingClientRect(),
                    });
                };
                if (menuSubmenuMode("auto", room()) === "cascade") {
                    // Cascading: watched while it's open, so it drills if the room goes (a
                    // narrowing window, a growing submenu or menu, a moving panel), keeping the
                    // submenu and the keys.
                    const watch = () => {
                        if (!submenu.isConnected || !menu.isConnected) return;
                        if (menuSubmenuAdapt("cascade", room()) === "cascade")
                            return;
                        stop();
                        remember();
                        submenu.style.visibility = "hidden";
                        auto.drill(props.value, true);
                        menu.focus();
                    };
                    const observer = new ResizeObserver(watch);
                    for (
                        let element: Element | null = anchor;
                        element;
                        element = element.parentElement
                    )
                        observer.observe(element);
                    observer.observe(menu);
                    observer.observe(submenu);
                    window.addEventListener("resize", watch);
                    const unscroll = watchScroll(watch);
                    const stop = () => {
                        observer.disconnect();
                        window.removeEventListener("resize", watch);
                        unscroll();
                    };
                    return stop;
                }
                remember();
                // Hidden from now, so its way out isn't seen.
                submenu.style.visibility = "hidden";
                // Its item drills from now on (so the submenu goes), at once when it was pressed.
                const pressed = menuSubmenuPressed(row, menu);
                auto.drill(props.value, pressed);
                if (pressed) menu.focus();
                return undefined;
            }),
    );
    return null;
}

/** A drilled-in level's first row, highlighted as the level comes in, so the keys go on from
 *  there. */
function HighlightOnDrill(props: {
    readonly level: string;
    readonly first: string | undefined;
}): JSX.Element {
    const { api } = context.use("Content");
    createEffect(
        () => [props.level, props.first] as const,
        ([level, first]) => {
            if (level !== "" && first !== undefined)
                untrack(api).setHighlightedValue(first);
        },
    );
    return null;
}

/** A drilled menu's motion between levels: it notes the content's id for the step's start, and
 *  runs the step once the new level is drawn (`menuDrillTo`). */
function DrillMotion(props: {
    readonly level: string;
    readonly drill: {
        contentId?: string | undefined;
        from?: MenuDrillSnapshot | undefined;
    };
}): JSX.Element {
    const { api } = context.use("Content");
    const state = usePureform();
    createEffect(
        () => [props.level, api().getContentProps().id] as const,
        ([, id]) => {
            props.drill.contentId = typeof id === "string" ? id : undefined;
            const snapshot = props.drill.from;
            props.drill.from = undefined;
            if (!snapshot || !props.drill.contentId) return;
            const content = document.getElementById(props.drill.contentId);
            const spring = untrack(() =>
                springRoleVar(state().registry, "spatialDefault"),
            );
            menuDrillTo(content, snapshot, menuDrillTiming(content, spring));
        },
    );
    return null;
}

/** The ready-made menu: the trigger, drawn as a button, when given a label, and the menu with an
 *  item per entry of `items`, then a group per entry of `groups`; an entry with `items` opens
 *  its submenu as `submenu` says. */
function ReadyMade(props: MenuProps): JSX.Element {
    const auto = () => props.submenu === undefined || props.submenu === "auto";
    // The submenu items drilled into, outermost first. Once drilled into (`auto` drills into a
    // submenu that doesn't fit as it opens), the menu stays a drill until it's back out.
    const [path, setPath] = createSignal<readonly string[]>([]);
    const drill = () =>
        props.submenu === "drill" || (auto() && path().length > 0);
    // Under `auto`, the submenu items found not to fit as they opened.
    const [drills, setDrills] = createSignal<ReadonlySet<string>>(new Set());
    const fits = new Map<string, SubmenuFit>();
    // The submenu item to open as a cascade once, when room returns to a drilled one.
    const [reopen, setReopen] = createSignal<string>();
    const level = createMemo(() =>
        menuDrillLevel(
            props.items ?? [],
            props.groups ?? [],
            drill() ? path() : [],
        ),
    );
    const items = () => level().items;
    const groups = () => level().groups;
    // Out of any submenu once it closes.
    createEffect(
        () => props.open,
        (open) => {
            if (open === false) {
                setPath([]);
                setDrills(new Set<string>());
            }
        },
    );
    // The drill motion's content id and the step it starts from: plain, not reactive.
    const drillState: {
        contentId?: string | undefined;
        from?: MenuDrillSnapshot | undefined;
    } = {};
    const drillTo = (next: readonly string[], value: string) => {
        const content = drillState.contentId
            ? document.getElementById(drillState.contentId)
            : null;
        // In: the pressed item's label goes into the header. Out: the header's goes back into
        // the submenu's item.
        drillState.from =
            next.length > path().length
                ? menuDrillFrom(content, value, MENU_BACK_VALUE)
                : menuDrillFrom(content, MENU_BACK_VALUE, path().at(-1)!);
        setPath(next);
    };
    const onSelect = (details: MenuSelectDetails) => {
        const next = drill()
            ? menuDrillPick(
                  props.items ?? [],
                  props.groups ?? [],
                  path(),
                  details.value,
              )
            : drills().has(details.value)
              ? menuDrillPathTo(
                    props.items ?? [],
                    props.groups ?? [],
                    details.value,
                )
              : undefined;
        if (next) return drillTo(next, details.value);
        props.onSelect?.(details);
    };
    const autoSubmenu: AutoSubmenuValue = {
        active: () => auto() && !drill(),
        container: () => props.container,
        drills,
        reopen,
        remember: (value, fit) => fits.set(value, fit),
        drill: (value, now) => {
            setDrills((before) => new Set(before).add(value));
            const next = now
                ? menuDrillPathTo(props.items ?? [], props.groups ?? [], value)
                : undefined;
            if (next) drillTo(next, value);
        },
    };
    // Drilled for want of room: watched, so the item cascades again once the room is back with
    // some to spare (a drill into it opens it beside the menu once more).
    createEffect(
        () => [auto(), drills(), path()] as const,
        ([isAuto, drilled, at]) => {
            if (!isAuto || drilled.size === 0) return undefined;
            const content = () =>
                drillState.contentId
                    ? document.getElementById(drillState.contentId)
                    : null;
            const check = () => {
                const shown = content();
                if (!shown) return;
                const box = shown.getBoundingClientRect();
                for (const value of drilled) {
                    const fit = fits.get(value);
                    if (!fit) continue;
                    const room = menuSubmenuRoomOf(
                        { left: box.left, right: box.left + fit.menuWidth },
                        menuSubmenuBoundary(fit.anchor, props.container),
                        {
                            row: {
                                top: box.top + fit.rowTop,
                                bottom: box.top + fit.rowBottom,
                            },
                            size: fit.size,
                        },
                    );
                    if (menuSubmenuAdapt("drill", room) === "drill") continue;
                    // A drill into a deeper level stays until it's back out.
                    if (at.length > 1 || (at.length === 1 && at[0] !== value))
                        continue;
                    setDrills((before) => {
                        const next = new Set(before);
                        next.delete(value);
                        return next;
                    });
                    if (at.length === 1) {
                        setReopen(value);
                        setPath([]);
                    }
                    return;
                }
            };
            const observer = new ResizeObserver(check);
            const shown = content();
            if (shown) observer.observe(shown);
            for (const fit of fits.values())
                for (
                    let element = fit.anchor;
                    element;
                    element = element.parentElement
                )
                    observer.observe(element);
            window.addEventListener("resize", check);
            const unscroll = watchScroll(check);
            return () => {
                observer.disconnect();
                window.removeEventListener("resize", check);
                unscroll();
            };
        },
    );
    createEffect(reopen, (value) => {
        if (value !== undefined) setReopen(undefined);
    });
    const onOpenChange: MenuRootProps["onOpenChange"] = (details) => {
        if (!details.open) {
            setPath([]);
            setDrills(new Set<string>());
        }
        props.onOpenChange?.(details);
    };
    const slots = createSlotProps<Anatomy, never, MenuInstances<JSX.Element>>(
        props,
    );
    const depth = () => (drill() ? level().depth : 0);
    const own = omit(
        props,
        ...READY_MADE_PROPS,
        "onSelect",
        "onOpenChange",
    ) as MenuRootProps;
    const root = slots("root") as object;
    const trigger = slots("trigger");
    const contextTrigger = slots("contextTrigger") as object;
    const positioner = slots("positioner");
    const content = slots("content");
    const itemGroup = slots("itemGroup");
    const itemGroupLabel = slots("itemGroupLabel");
    return (
        <AutoSubmenuContext value={autoSubmenu}>
            <Root
                {...own}
                onSelect={onSelect}
                onOpenChange={onOpenChange}
                grouped={
                    level().submenu
                        ? props.grouped
                        : menuGrouped(props) || props.grouped
                }
                {...root}
            >
                <Show when={isPresent(props.trigger)}>
                    <Trigger
                        as={Button}
                        label={props.trigger}
                        {...asRoot(trigger)}
                    />
                </Show>
                <Show when={isPresent(props.contextTrigger)}>
                    <ContextTrigger {...contextTrigger}>
                        {props.contextTrigger}
                    </ContextTrigger>
                </Show>
                <Positioner {...positioner}>
                    <Content {...content}>
                        <Show when={drill()}>
                            <DrillMotion
                                level={path().join("\u0000")}
                                drill={drillState}
                            />
                        </Show>
                        <Show when={drill()}>
                            <HighlightOnDrill
                                level={path().join("\u0000")}
                                first={
                                    level().submenu
                                        ? MENU_BACK_VALUE
                                        : items()[0]?.value
                                }
                            />
                        </Show>
                        <Show when={level().submenu}>
                            {(submenu) => {
                                const back = () => ({
                                    item: submenu(),
                                    index: -1,
                                    depth: depth(),
                                });
                                return (
                                    // The row that goes back out, headed by the submenu's item.
                                    <Item
                                        value={MENU_BACK_VALUE}
                                        valueText={submenu().valueText}
                                        closeOnSelect={false}
                                        {...slots("item", back)}
                                    >
                                        <ItemLeading
                                            mirror
                                            {...slots("itemLeading", back)}
                                        >
                                            <ChevronStartIcon />
                                        </ItemLeading>
                                        <ItemContent
                                            {...slots("itemContent", back)}
                                        >
                                            <ItemLabel
                                                {...slots("itemLabel", back)}
                                            >
                                                {submenu().label}
                                            </ItemLabel>
                                        </ItemContent>
                                    </Item>
                                );
                            }}
                        </Show>
                        <Items
                            items={items()}
                            slot={slots}
                            drill={drill()}
                            depth={depth()}
                        />
                        <For
                            each={groups()}
                            keyed={(group: MenuGroup<JSX.Element>) => group.id}
                        >
                            {(group) => (
                                <ItemGroup {...itemGroup} id={group().id}>
                                    <Show when={isPresent(group().label)}>
                                        <ItemGroupLabel
                                            // oxlint-disable-next-line solid/no-react-specific-props -- a component prop for Zag's getItemGroupLabelProps({ htmlFor }), not the DOM attribute
                                            htmlFor={group().id}
                                            {...itemGroupLabel}
                                        >
                                            {group().label}
                                        </ItemGroupLabel>
                                    </Show>
                                    <Items
                                        items={group().items}
                                        slot={slots}
                                        drill={drill()}
                                        depth={depth()}
                                    />
                                </ItemGroup>
                            )}
                        </For>
                    </Content>
                </Positioner>
            </Root>
        </AutoSubmenuContext>
    );
}

/** Material's menu. Use it ready-made, `<Menu trigger="Edit" items={[{ value: "cut", label:
 *  "Cut" }, …]} onSelect={…} />`, or compose its parts under `Menu.Root`: `Trigger` (`as={Button}`
 *  draws it as a button) and, to open it at a right-click or long press, a `ContextTrigger` around
 *  the area, then `Positioner` holding `Content`, with an `Item` per entry holding
 *  `ItemLeading`, `ItemContent` (holding `ItemLabel` and `ItemSupportingText`), `ItemTrailing`,
 *  and `ItemTrailingText`. Items can sit in an `ItemGroup`, named by an `ItemGroupLabel`. A
 *  `Submenu` in the content holds its `TriggerItem` (the parent's item that opens it, an arrow in
 *  its `ItemTrailing`), then its own `Positioner` and `Content`; a ready-made item opens one when
 *  given `items`. */
export const Menu = Object.assign(ReadyMade, {
    Root,
    Submenu,
    Trigger,
    ContextTrigger,
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
