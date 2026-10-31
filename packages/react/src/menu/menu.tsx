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
    MENU_ITEM_PROPS,
    MENU_ROOT_PROPS,
    menuGrouped,
    menuDrillLevel,
    menuDrillPathTo,
    menuDrillPick,
    menuItemProps,
    menuSelection,
    menuSubmenuAdapt,
    menuSubmenuRoomOf,
    menuSubmenuMode,
    submenuPositioning,
} from "@pureform/binding-core";
import type {
    MenuBehaviorProps,
    MenuContentProps,
    MenuItem as MenuItemData,
    MenuInstances,
    MenuItemBehaviorProps,
    MenuItemInstance,
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
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    createContext,
    type ElementType,
    type ReactNode,
    type RefObject,
    useCallback,
    useContext,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { ChevronEndIcon, ChevronStartIcon } from "../glyphs";
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps, asRoot } from "../parts";
import type { ComponentScope, SlotKeyedProps, SlotPropsOf } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useComponentState, useDirection } from "../provider";

type Anatomy = typeof menuOverlayAnatomy;

/** What Root shares with its parts. */
interface MenuContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: menu.Api<PropTypes>;
    readonly service: menu.Service;
    readonly sources: ItemInteractionSources;
    readonly presence: Presence;
    /** The variants, which a submenu takes as its own defaults. */
    readonly variants: MenuVariantProps;
    /** What a submenu takes from its parent unless given: choosing an item reports to the
     *  parent's `onSelect`, and the parent's keyboard options. */
    readonly behavior: InheritedBehavior;
    /** The test ids and `unstyled`, which a submenu takes unless given its own. */
    readonly testId: MenuRootProps["testId"];
    readonly unstyled: MenuRootProps["unstyled"];
    /** A submenu's parent menu. */
    readonly parent?: MenuContextValue | undefined;
}

type InheritedBehavior = Pick<
    MenuBehaviorProps,
    "onSelect" | "closeOnSelect" | "loopFocus" | "typeahead"
>;

/** What an item shares with its parts. */
interface ItemContextValue {
    readonly value: string;
}

const context = createPartContext<MenuContextValue>("Menu");
const itemContext = createPartContext<ItemContextValue>("Menu", "Item");

/** Root's props: the variants and tokens, the machine's props (`open`, `onSelect`,
 *  `positioning`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface MenuRootProps
    extends Omit<PartProps, keyof MenuRootOwnProps>, MenuRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface MenuPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface MenuTriggerProps extends MenuPartProps {
    readonly as?: ElementType | undefined;
    readonly [prop: string]: unknown;
}

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface MenuIconProps extends MenuPartProps {
    readonly mirror?: boolean | undefined;
}

/** An item's props: Zag's (`value`, `valueText`, `disabled`, `closeOnSelect`), a toggleable
 *  item's `type`, `checked`, and `onCheckedChange`, and a part's. */
export interface MenuItemProps
    extends
        Omit<MenuPartProps, keyof MenuItemBehaviorProps>,
        MenuItemBehaviorProps {}

/** A group's props: its `id`, which its label points at, and a part's. The surface marks its
 *  first and last groups itself (a grouped menu rounds their outside corners); `first` and
 *  `last` override that marking. */
export interface MenuItemGroupProps extends MenuPartProps {
    readonly id: string;
    readonly first?: boolean | undefined;
    readonly last?: boolean | undefined;
}

/** A group label's props: the `id` of its group, and a part's. */
export interface MenuItemGroupLabelProps extends Omit<MenuPartProps, "id"> {
    readonly group: string;
}

/** A menu's machine and scope, a submenu's under its `parent`: what Root and Submenu share. */
function useMenu(
    props: MenuRootProps,
    parent: MenuContextValue | null,
): MenuContextValue {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("Menu", "open", props);
    const sources = useItemInteractionSources();
    const behavior: InheritedBehavior = {
        onSelect: props.onSelect ?? parent?.behavior.onSelect,
        closeOnSelect: props.closeOnSelect ?? parent?.behavior.closeOnSelect,
        loopFocus: props.loopFocus ?? parent?.behavior.loopFocus,
        typeahead: props.typeahead ?? parent?.behavior.typeahead,
    };
    const service = useMachine(menu.machine, {
        id,
        ...sources.machineProps,
        dir,
        ...menuMachineProps({
            ...props,
            ...behavior,
            positioning: parent
                ? submenuPositioning(dir, props.positioning)
                : props.positioning,
        }),
        ...open.machineProps,
    });
    const api = menu.connect(service, normalizeProps);
    const presence = usePresence(api.open);
    // A submenu draws as its parent does, unless told otherwise; it isn't grouped.
    const own = menuSelection(props);
    const variants: MenuVariantProps = parent
        ? {
              color: own.color ?? parent.variants.color,
              density: own.density ?? parent.variants.density,
              vibrant: own.vibrant ?? parent.variants.vibrant,
              grouped: own.grouped,
              tokens: own.tokens ?? parent.variants.tokens,
          }
        : own;
    const testId = props.testId ?? parent?.testId;
    const unstyled = props.unstyled ?? parent?.unstyled;
    const scope = useComponent(menuOverlayAnatomy, {
        selection: menuSelection(variants),
        testId,
        unstyled,
        indication: props.indication,
    });
    const parentService = parent?.service;
    useEffect(() => {
        if (!parentService) return;
        menu.connect(parentService, normalizeProps).setChild(service as never);
        menu.connect(service, normalizeProps).setParent(parentService as never);
    }, [parentService, service]);
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
        parent: parent ?? undefined,
    };
}

/** The menu's root, a `<div>` around the trigger and the menu. The registry doesn't style it. */
function Root(props: MenuRootProps): ReactNode {
    const value = useMenu(props, null);
    const { as, ...rest } = omitProps(props, MENU_ROOT_PROPS);
    return (
        <context.Provider value={value}>
            {value.scope.render("root", { element: "div", as, props: rest })}
        </context.Provider>
    );
}

/** A submenu, inside its parent's content: a menu of its own, opened by its `TriggerItem` and
 *  placed beside it. It takes Root's props, its variants defaulting to its parent's. */
function Submenu(props: MenuRootProps): ReactNode {
    const parent = context.use("Submenu");
    const value = useMenu(props, parent);
    const { as, ...rest } = omitProps(props, MENU_ROOT_PROPS);
    return (
        <context.Provider value={value}>
            {value.scope.render("root", { element: "div", as, props: rest })}
        </context.Provider>
    );
}

/** The button that opens the menu: a click, Enter, Space, or the arrow keys up and down. */
function Trigger({ unstyled, as, ...props }: MenuTriggerProps): ReactNode {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: as as ElementType | undefined,
        machine: api.getTriggerProps(),
        unstyled,
        props,
    });
}

/** An area that opens the menu at the pointer: a right-click, a touch held down, or the context
 *  menu key or Shift+F10 pressed in it. The menu opens where the pointer was, and what's inside
 *  keeps its own behaviour. The registry doesn't style it. */
function ContextTrigger({
    unstyled,
    as,
    ...props
}: MenuTriggerProps): ReactNode {
    const { scope, api } = context.use("ContextTrigger");
    return scope.render("contextTrigger", {
        element: "div",
        as: as as ElementType | undefined,
        machine: api.getContextTriggerProps(),
        unstyled,
        props,
    });
}

/** Places the menu under the trigger; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
function Positioner({ unstyled, ...props }: MenuPartProps): ReactNode {
    const { scope, api, presence } = context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        machine: overlayPositionerProps(
            api.getPositionerProps(),
            presence.present,
        ),
        unstyled,
        props,
    });
}

/** The menu's surface, which holds focus while it's open and moves through the items with the
 *  arrow keys. It stays while its exit animation runs. */
function Content({ unstyled, ...props }: MenuPartProps): ReactNode {
    const { scope, api, presence } = context.use("Content");
    // Its groups' first and last are marked from the DOM, so composed menus round them too.
    const ref = useCallback(
        (element: HTMLElement | null) => {
            presence.ref(element);
            if (!element) return undefined;
            const stop = markMenuGroupEdges(element);
            return () => {
                stop();
                presence.ref(null);
            };
        },
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- presence.ref is the stable callback; presence itself is new each render
        [presence.ref],
    );
    return scope.render("content", {
        element: "div",
        ref,
        machine: presentProps(api.getContentProps(), presence.present),
        unstyled,
        props,
    });
}

/** A group of items, labelled by the ItemGroupLabel with its `id` as `group`. */
function ItemGroup({
    unstyled,
    id,
    first,
    last,
    ...props
}: MenuItemGroupProps): ReactNode {
    const { scope, api } = context.use("ItemGroup");
    return scope.render("itemGroup", {
        element: "div",
        machine: api.getItemGroupProps({ id, first, last }),
        unstyled,
        props,
    });
}

/** A group's label. */
function ItemGroupLabel({
    unstyled,
    group,
    ...props
}: MenuItemGroupLabelProps): ReactNode {
    const { scope, api } = context.use("ItemGroupLabel");
    return scope.render("itemGroupLabel", {
        element: "div",
        machine: api.getItemGroupLabelProps({ htmlFor: group }),
        unstyled,
        props,
    });
}

/** An item; the highlighted one shows the hover state. A toggleable item (`type`) fills while
 *  checked. */
function Item(props: MenuItemProps): ReactNode {
    const { scope, api, sources } = context.use("Item");
    const { unstyled, ...rest } = omitProps(props, MENU_ITEM_PROPS);
    const source = sources.item(props.value, props.interactionSource);
    const base = {
        value: props.value,
        valueText: props.valueText,
        disabled: props.disabled,
        closeOnSelect: props.closeOnSelect,
    };
    const state =
        props.type === undefined
            ? api.getItemState(base)
            : api.getOptionItemState({
                  ...base,
                  type: props.type,
                  checked: props.checked ?? false,
              });
    return (
        <itemContext.Provider value={{ value: props.value }}>
            {scope.render("item", {
                element: "div",
                interactionSource: source,
                machine: menuItemMachineProps(api, props),
                states: { hover: state.highlighted },
                unstyled,
                props: rest,
            })}
        </itemContext.Provider>
    );
}

/** A submenu's item in its parent: it opens the submenu (the pointer resting on it, a click,
 *  Enter, Space, or the arrow toward the end of the line) instead of being chosen, and shows as
 *  hovered while the submenu is open. Its parts are the parent's item parts. */
function TriggerItem({ unstyled, ...props }: MenuPartProps): ReactNode {
    const child = context.use("TriggerItem");
    const parent = child.parent;
    if (!parent) {
        throw new Error("Menu.TriggerItem must be used within Menu.Submenu");
    }
    const value = child.api.getTriggerProps().id as string;
    const source = parent.sources.item(value, undefined);
    return (
        <context.Provider value={parent}>
            <itemContext.Provider value={{ value }}>
                {parent.scope.render("item", {
                    element: "div",
                    interactionSource: source,
                    machine: parent.api.getTriggerItemProps(child.api),
                    states: {
                        hover:
                            parent.api.highlightedValue === value ||
                            child.api.open,
                    },
                    unstyled,
                    props,
                })}
            </itemContext.Provider>
        </context.Provider>
    );
}

/** An icon before an item's label, hidden from assistive technology. */
function ItemLeading({ unstyled, mirror, ...props }: MenuIconProps): ReactNode {
    const { scope } = context.use("ItemLeading");
    itemContext.use("ItemLeading");
    return scope.render("itemLeading", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The text of an item: its label and supporting text. */
function ItemContent({ unstyled, ...props }: MenuPartProps): ReactNode {
    const { scope } = context.use("ItemContent");
    itemContext.use("ItemContent");
    return scope.render("itemContent", { element: "span", unstyled, props });
}

/** An item's label. */
function ItemLabel({ unstyled, ...props }: MenuPartProps): ReactNode {
    const { scope } = context.use("ItemLabel");
    itemContext.use("ItemLabel");
    return scope.render("itemLabel", { element: "span", unstyled, props });
}

/** A line under an item's label. */
function ItemSupportingText({ unstyled, ...props }: MenuPartProps): ReactNode {
    const { scope } = context.use("ItemSupportingText");
    itemContext.use("ItemSupportingText");
    return scope.render("itemSupportingText", {
        element: "span",
        unstyled,
        props,
    });
}

/** An icon after an item's label, hidden from assistive technology. */
function ItemTrailing({
    unstyled,
    mirror,
    ...props
}: MenuIconProps): ReactNode {
    const { scope } = context.use("ItemTrailing");
    itemContext.use("ItemTrailing");
    return scope.render("itemTrailing", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** Text after an item's label, such as a keyboard shortcut. */
function ItemTrailingText({ unstyled, ...props }: MenuPartProps): ReactNode {
    const { scope } = context.use("ItemTrailingText");
    itemContext.use("ItemTrailingText");
    return scope.render("itemTrailingText", {
        element: "span",
        unstyled,
        props,
    });
}

/** What a ready-made menu under `submenu="auto"` gives its cascading submenus: the container
 *  they keep within, and what drills into one that doesn't fit. */
interface AutoSubmenuValue {
    readonly container: string | undefined;
    /** The submenu items found not to fit, which drill when chosen. */
    readonly drills: ReadonlySet<string>;
    /** Notes `value` doesn't fit, and drills into it when `now`. */
    readonly drill: (value: string, now: boolean) => void;
    /** What was measured as `value` stopped fitting, to tell when it would again. */
    readonly remember: (value: string, fit: SubmenuFit) => void;
    /** The submenu item that opens as a cascade again once its room returns. */
    readonly reopen: string | undefined;
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

const AutoSubmenuContext = createContext<AutoSubmenuValue | undefined>(
    undefined,
);

/** The slot props `ItemEntry` gives each part of an item: a ready-made's `useSlotProps`, whose
 *  functions of the row (`MenuItemInstance`) it resolves, or one function of the part. */
export type MenuItemSlot =
    | SlotPropsOf<PartName<Anatomy>, MenuInstances<ReactNode>>
    | ((part: PartName<Anatomy>) => PartProps);

// What `ItemEntry` calls: either form, read loosely.
type RowSlot = ((part: string, instance?: unknown) => PartProps) & {
    readonly each?: ((part: string) => boolean) | undefined;
};

/** `ItemEntry`'s props: the item as data, and the slot props each of its parts takes. */
export interface MenuItemEntryProps {
    readonly item: MenuItemData<ReactNode>;
    readonly slot?: MenuItemSlot | undefined;
    /** An item with `items` is a row that drills into them (the menu's `onSelect` hears its
     *  value) rather than a submenu beside it. */
    readonly drill?: boolean | undefined;
    /** Its index among its level's (or group's) items, for a function of the row. */
    readonly index?: number | undefined;
    /** How deep its submenu is, for a function of the row: `0` for the menu's own items. */
    readonly depth?: number | undefined;
}

const NO_SLOT: MenuItemSlot = () => ({});

const ITEM_PARTS = [
    "item",
    "itemLeading",
    "itemContent",
    "itemLabel",
    "itemSupportingText",
    "itemTrailing",
    "itemTrailingText",
] as const;

/** Whether a function of the row was passed for any of an item's parts. */
const eachRow = (slot: MenuItemSlot): boolean => {
    const { each } = slot as RowSlot;
    return !!each && ITEM_PARTS.some((part) => each(part));
};

/** An `Item` from data, with its icons, label, supporting text and trailing text: what the
 *  ready-made menu renders per entry, for a component that holds a menu (the split button). */
function ItemEntry({
    item,
    slot: given = NO_SLOT,
    drill,
    index = 0,
    depth = 0,
}: MenuItemEntryProps): ReactNode {
    const auto = useContext(AutoSubmenuContext);
    const slot = given as RowSlot;
    const row = eachRow(slot) ? { item, index, depth } : undefined;
    if (hasSubmenu(item) && (drill || auto?.drills.has(item.value))) {
        return (
            <Item
                {...menuItemProps(item)}
                closeOnSelect={false}
                aria-haspopup="menu"
                {...slot("item", row)}
            >
                <ItemParts item={item} slot={slot} row={row} />
                <ItemTrailing mirror {...slot("itemTrailing", row)}>
                    <ChevronEndIcon />
                </ItemTrailing>
            </Item>
        );
    }
    if (hasSubmenu(item)) {
        return (
            <Submenu defaultOpen={auto?.reopen === item.value || undefined}>
                <AutoSubmenu value={item.value} />
                <TriggerItem {...slot("item", row)}>
                    <ItemParts item={item} slot={slot} row={row} />
                    <ItemTrailing mirror {...slot("itemTrailing", row)}>
                        <ChevronEndIcon />
                    </ItemTrailing>
                </TriggerItem>
                <Positioner {...slot("positioner")}>
                    <Content {...slot("content")}>
                        {(item.items ?? []).map((entry, at) => (
                            <ItemEntry
                                key={entry.value}
                                item={entry}
                                slot={given}
                                index={at}
                                depth={depth + 1}
                            />
                        ))}
                    </Content>
                </Positioner>
            </Submenu>
        );
    }
    return (
        <Item {...menuItemProps(item)} {...slot("item", row)}>
            <ItemParts item={item} slot={slot} row={row} />
        </Item>
    );
}

/** An item's parts from its data. */
function ItemParts({
    item,
    slot,
    row,
}: {
    readonly item: MenuItemData<ReactNode>;
    readonly slot: RowSlot;
    readonly row: MenuItemInstance<ReactNode> | undefined;
}): ReactNode {
    return (
        <>
            {isPresent(item.leadingIcon) ? (
                <ItemLeading
                    mirror={item.mirrorLeadingIcon}
                    {...slot("itemLeading", row)}
                >
                    {item.leadingIcon}
                </ItemLeading>
            ) : null}
            <ItemContent {...slot("itemContent", row)}>
                <ItemLabel {...slot("itemLabel", row)}>{item.label}</ItemLabel>
                {isPresent(item.supportingText) ? (
                    <ItemSupportingText {...slot("itemSupportingText", row)}>
                        {item.supportingText}
                    </ItemSupportingText>
                ) : null}
            </ItemContent>
            {isPresent(item.trailingIcon) ? (
                <ItemTrailing
                    mirror={item.mirrorTrailingIcon}
                    {...slot("itemTrailing", row)}
                >
                    {item.trailingIcon}
                </ItemTrailing>
            ) : null}
            {isPresent(item.trailingText) ? (
                <ItemTrailingText {...slot("itemTrailingText", row)}>
                    {item.trailingText}
                </ItemTrailingText>
            ) : null}
        </>
    );
}

/** Under `submenu="auto"`, decides as its submenu opens, before it's painted: the submenu, laid
 *  out at its own size, cascades when it fits beside the menu and down or up from its item;
 *  else its item drills from then on: at once when a press or a key opened it, at the next press
 *  when the pointer resting on the item did. */
function AutoSubmenu(props: { readonly value: string }): null {
    const auto = useContext(AutoSubmenuContext);
    const child = context.use("Submenu");
    const { api, parent } = child;
    useEffect(() => {
        if (auto) noteMenuSubmenuPresses();
    }, [auto]);
    useLayoutEffect(() => {
        if (!auto || !parent || !api.open) return;
        const byId = (id: unknown) =>
            typeof id === "string" ? document.getElementById(id) : null;
        const submenu = byId(api.getContentProps().id);
        const menu = byId(parent.api.getContentProps().id);
        const row = byId(api.getTriggerProps().id);
        if (!submenu || !menu || !row) return;
        submenu.style.visibility = "";
        let top: MenuContextValue = parent;
        while (top.parent) top = top.parent;
        // Cascading: watched while it's open, so it drills if the room goes (a narrowing
        // window, a growing submenu or menu, a moving panel), keeping the submenu and the keys.
        const remember = (shown: HTMLElement) => {
            const box = menu.getBoundingClientRect();
            const at = row.getBoundingClientRect();
            auto.remember(props.value, {
                anchor: byId(top.api.getTriggerProps().id),
                menuWidth: box.width,
                rowTop: at.top - box.top,
                rowBottom: at.bottom - box.top,
                size: shown.getBoundingClientRect(),
            });
        };
        const watching = () => {
            const watch = () => {
                if (!submenu.isConnected || !menu.isConnected) return;
                const now = menuSubmenuRoom(
                    menu,
                    row,
                    submenu,
                    byId(top.api.getTriggerProps().id),
                    auto.container,
                );
                if (menuSubmenuAdapt("cascade", now) === "cascade") return;
                stop();
                remember(submenu);
                submenu.style.visibility = "hidden";
                auto.drill(props.value, true);
                menu.focus();
            };
            const observer = new ResizeObserver(watch);
            for (
                let element: Element | null = byId(
                    top.api.getTriggerProps().id,
                );
                element;
                element = element.parentElement
            )
                // The page itself changes size with the window, which `resize` hears; observing it too
                // makes the browser report a ResizeObserver loop.
                if (
                    element !== document.documentElement &&
                    element !== document.body
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
        };
        const room = menuSubmenuRoom(
            menu,
            row,
            submenu,
            byId(top.api.getTriggerProps().id),
            auto.container,
        );
        if (menuSubmenuMode("auto", room) === "cascade") return watching();
        // Hidden from now, so its way out isn't seen.
        remember(submenu);
        submenu.style.visibility = "hidden";
        // Its item drills from now on (so the submenu goes), at once when it was pressed.
        const pressed = menuSubmenuPressed(row, menu);
        auto.drill(props.value, pressed);
        if (pressed) menu.focus();
        return undefined;
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- measured once each time the submenu opens
    }, [api.open]);
    return null;
}

/** A drilled-in level's first row, highlighted as the level comes in, so the keys go on from
 *  there. */
function HighlightOnDrill(props: {
    readonly level: string;
    readonly first: string | undefined;
}): null {
    const { api } = context.use("Content");
    const { level, first } = props;
    useEffect(() => {
        if (level !== "" && first !== undefined) api.setHighlightedValue(first);
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- only a new level moves the highlight
    }, [level]);
    return null;
}

/** A drilled menu's motion between levels: it notes the content's id for the step's start, and
 *  runs the step once the new level is drawn (`menuDrillTo`). */
function DrillMotion(props: {
    readonly level: string;
    readonly contentId: RefObject<string | undefined>;
    readonly from: RefObject<MenuDrillSnapshot | undefined>;
}): null {
    const { api } = context.use("Content");
    const { level, contentId, from } = props;
    const spring = springRoleVar(
        useComponentState().registry,
        "spatialDefault",
    );
    contentId.current = api.getContentProps().id;
    useLayoutEffect(() => {
        const snapshot = from.current;
        from.current = undefined;
        if (!snapshot || !contentId.current) return;
        const content = document.getElementById(contentId.current);
        menuDrillTo(content, snapshot, menuDrillTiming(content, spring));
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- the step runs once per new level; the refs and spring are read as it runs
    }, [level]);
    return null;
}

/** The ready-made menu's props: Root's, with `className`, `style`, `slotProps` and `unstyled`
 *  keyed by part (an item's parts also by row, `MenuItemInstance`, at every submenu's level), the
 *  trigger's label, and the items as data. */
export interface MenuProps
    extends
        Omit<MenuRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy, never, MenuInstances<ReactNode>>,
        MenuContentProps<ReactNode> {}

/** The ready-made menu: the trigger, drawn as a button, when given a label, and the menu with an
 *  item per entry of `items`, then a group per entry of `groups`. */
function ReadyMade(props: MenuProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        trigger,
        contextTrigger,
        items: allItems = [],
        groups: allGroups = [],
        submenu: submenuProp,
        container,
        ...rootProps
    } = props;
    const slot = useSlotProps<Anatomy, never, MenuInstances<ReactNode>>(props);
    const auto = submenuProp === undefined || submenuProp === "auto";
    // The submenu items drilled into, outermost first. Once drilled into (`auto` drills into a
    // submenu that doesn't fit as it opens), the menu stays a drill until it's back out.
    const [path, setPath] = useState<readonly string[]>([]);
    const drill = submenuProp === "drill" || (auto && path.length > 0);
    // Under `auto`, the submenu items found not to fit as they opened.
    const [drills, setDrills] = useState<ReadonlySet<string>>(new Set());
    const fits = useRef(new Map<string, SubmenuFit>());
    // The submenu item to open as a cascade once, when room returns to a drilled one.
    const [reopen, setReopen] = useState<string>();
    const level = menuDrillLevel(allItems, allGroups, drill ? path : []);
    const { items, groups, submenu } = level;
    const depth = drill ? level.depth : 0;
    const back =
        submenu && eachRow(slot)
            ? { item: submenu, index: -1, depth }
            : undefined;
    // Out of any submenu once it closes.
    useEffect(() => {
        if (props.open === false) {
            // oxlint-disable-next-line react/set-state-in-effect -- a closed menu forgets its drill path once the app closes it
            setPath([]);
            setDrills(new Set());
        }
    }, [props.open]);
    const contentId = useRef<string | undefined>(undefined);
    const drillFrom = useRef<MenuDrillSnapshot | undefined>(undefined);
    const drillTo = (next: readonly string[], value: string) => {
        const content = contentId.current
            ? document.getElementById(contentId.current)
            : null;
        // In: the pressed item's label goes into the header. Out: the header's goes back into
        // the submenu's item.
        drillFrom.current =
            next.length > path.length
                ? menuDrillFrom(content, value, MENU_BACK_VALUE)
                : menuDrillFrom(content, MENU_BACK_VALUE, path.at(-1)!);
        setPath(next);
    };
    const onSelect = (details: MenuSelectDetails) => {
        const next = drill
            ? menuDrillPick(allItems, allGroups, path, details.value)
            : drills.has(details.value)
              ? menuDrillPathTo(allItems, allGroups, details.value)
              : undefined;
        if (next) return drillTo(next, details.value);
        rootProps.onSelect?.(details);
    };
    const autoSubmenu: AutoSubmenuValue | undefined =
        auto && !drill
            ? {
                  container,
                  drills,
                  reopen,
                  remember: (value, fit) => fits.current.set(value, fit),
                  drill: (value, now) => {
                      setDrills((before) => new Set(before).add(value));
                      const next = now
                          ? menuDrillPathTo(allItems, allGroups, value)
                          : undefined;
                      if (next) drillTo(next, value);
                  },
              }
            : undefined;
    // Drilled for want of room: watched, so the item cascades again once the room is back with
    // some to spare (a drill into it opens it beside the menu once more).
    useEffect(() => {
        if (!auto || drills.size === 0) return;
        const content = () =>
            contentId.current
                ? document.getElementById(contentId.current)
                : null;
        const check = () => {
            const shown = content();
            if (!shown) return;
            const box = shown.getBoundingClientRect();
            for (const value of drills) {
                const fit = fits.current.get(value);
                if (!fit) continue;
                const room = menuSubmenuRoomOf(
                    { left: box.left, right: box.left + fit.menuWidth },
                    menuSubmenuBoundary(fit.anchor, container),
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
                if (path.length > 1 || (path.length === 1 && path[0] !== value))
                    continue;
                setDrills((before) => {
                    const next = new Set(before);
                    next.delete(value);
                    return next;
                });
                if (path.length === 1) {
                    setReopen(value);
                    setPath([]);
                }
                return;
            }
        };
        const observer = new ResizeObserver(check);
        const shown = content();
        if (shown) observer.observe(shown);
        for (const fit of fits.current.values())
            for (
                let element = fit.anchor;
                element;
                element = element.parentElement
            )
                // The page itself changes size with the window, which `resize` hears; observing it too
                // makes the browser report a ResizeObserver loop.
                if (
                    element !== document.documentElement &&
                    element !== document.body
                )
                    observer.observe(element);
        window.addEventListener("resize", check);
        const unscroll = watchScroll(check);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", check);
            unscroll();
        };
    }, [auto, drills, path, container]);
    useEffect(() => {
        // oxlint-disable-next-line react/set-state-in-effect -- clears the one-shot reopen once the submenu has mounted open
        if (reopen !== undefined) setReopen(undefined);
    }, [reopen]);
    const onOpenChange: MenuRootProps["onOpenChange"] = (details) => {
        if (!details.open) {
            setPath([]);
            setDrills(new Set());
        }
        rootProps.onOpenChange?.(details);
    };
    return (
        <AutoSubmenuContext.Provider value={autoSubmenu}>
            <Root
                {...rootProps}
                onSelect={onSelect}
                onOpenChange={onOpenChange}
                grouped={(!submenu && menuGrouped(props)) || undefined}
                {...(slot("root") as object)}
            >
                {isPresent(trigger) ? (
                    <Trigger
                        as={Button}
                        label={trigger}
                        {...asRoot(slot("trigger"))}
                    />
                ) : null}
                {isPresent(contextTrigger) ? (
                    <ContextTrigger {...slot("contextTrigger")}>
                        {contextTrigger}
                    </ContextTrigger>
                ) : null}
                <Positioner {...slot("positioner")}>
                    <Content {...slot("content")}>
                        {drill ? (
                            <DrillMotion
                                level={path.join("\u0000")}
                                contentId={contentId}
                                from={drillFrom}
                            />
                        ) : null}
                        {drill ? (
                            <HighlightOnDrill
                                level={path.join("\u0000")}
                                first={
                                    submenu ? MENU_BACK_VALUE : items[0]?.value
                                }
                            />
                        ) : null}
                        {submenu ? (
                            // The row that goes back out, headed by the submenu's item.
                            <Item
                                value={MENU_BACK_VALUE}
                                valueText={submenu.valueText}
                                closeOnSelect={false}
                                {...slot("item", back)}
                            >
                                <ItemLeading
                                    mirror
                                    {...slot("itemLeading", back)}
                                >
                                    <ChevronStartIcon />
                                </ItemLeading>
                                <ItemContent {...slot("itemContent", back)}>
                                    <ItemLabel {...slot("itemLabel", back)}>
                                        {submenu.label}
                                    </ItemLabel>
                                </ItemContent>
                            </Item>
                        ) : null}
                        {items.map((item, index) => (
                            <ItemEntry
                                key={item.value}
                                item={item}
                                slot={slot}
                                drill={drill}
                                index={index}
                                depth={depth}
                            />
                        ))}
                        {groups.map((group) => (
                            <ItemGroup
                                key={group.id}
                                {...slot("itemGroup")}
                                id={group.id}
                            >
                                {isPresent(group.label) ? (
                                    <ItemGroupLabel
                                        group={group.id}
                                        {...slot("itemGroupLabel")}
                                    >
                                        {group.label}
                                    </ItemGroupLabel>
                                ) : null}
                                {group.items.map((item, index) => (
                                    <ItemEntry
                                        key={item.value}
                                        item={item}
                                        slot={slot}
                                        drill={drill}
                                        index={index}
                                        depth={depth}
                                    />
                                ))}
                            </ItemGroup>
                        ))}
                    </Content>
                </Positioner>
            </Root>
        </AutoSubmenuContext.Provider>
    );
}

/** Material's menu. Use it ready-made, `<Menu trigger="Edit" items={[{ value: "cut", label:
 *  "Cut" }, …]} onSelect={…} />`, or compose its parts under `Menu.Root`: `Trigger` (`as={Button}`
 *  draws it as a button) and, to open it at a right-click or long press, a `ContextTrigger` around
 *  the area, then `Positioner` holding `Content`, with an `Item` per entry holding
 *  `ItemLeading`, `ItemContent` (around `ItemLabel` and `ItemSupportingText`), `ItemTrailing`, and
 *  `ItemTrailingText`; an `ItemGroup` holds an `ItemGroupLabel` and its items. A `Submenu` in the
 *  content holds its `TriggerItem` (the parent's item that opens it, an arrow in its
 *  `ItemTrailing`), then its own `Positioner` and `Content`; a ready-made item opens one when given
 *  `items`. */
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
    ItemEntry,
    ItemLeading,
    ItemContent,
    ItemLabel,
    ItemSupportingText,
    ItemTrailing,
    ItemTrailingText,
});
