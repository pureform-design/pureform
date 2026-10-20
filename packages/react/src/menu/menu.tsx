// The menu: Root on Zag's menu machine, an unstyled element around the trigger and the menu; the
// trigger, a `<button>` or any component (`as={Button}`); Zag's positioner, which places the menu
// under the trigger; the menu's surface (`Content`) and its items, as the preset draws them; and
// the ready-made Menu over them. Everything renders in place, inside Root.

import { menuOverlayAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    MENU_ITEM_PROPS,
    MENU_ROOT_PROPS,
    menuGrouped,
    menuItemMachineProps,
    menuItemProps,
    menuMachineProps,
    menuSelection,
    overlayPositionerProps,
    presentProps,
} from "@pureform/binding-core";
import type {
    MenuContentProps,
    MenuItem as MenuItemData,
    MenuItemBehaviorProps,
    MenuRootOwnProps,
} from "@pureform/binding-core";
import * as menu from "@pureform/machines/menu";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof menuOverlayAnatomy;

/** What Root shares with its parts. */
interface MenuContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: menu.Api<PropTypes>;
    readonly sources: ItemInteractionSources;
    readonly presence: Presence;
}

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

/** A group's props: its `id`, which its label points at, and a part's. */
export interface MenuItemGroupProps extends MenuPartProps {
    readonly id: string;
}

/** A group label's props: the `id` of its group, and a part's. */
export interface MenuItemGroupLabelProps extends Omit<MenuPartProps, "id"> {
    readonly group: string;
}

/** The menu's root, a `<div>` around the trigger and the menu. The registry doesn't style it. */
function Root(props: MenuRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("Menu", "open", props);
    const sources = useItemInteractionSources();
    const service = useMachine(menu.machine, {
        id,
        ...sources.machineProps,
        dir,
        ...menuMachineProps(props),
        ...open.machineProps,
    });
    const api = menu.connect(service, normalizeProps);
    const presence = usePresence(api.open);
    const scope = useComponent(menuOverlayAnatomy, {
        selection: menuSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const { as, ...rest } = omitProps(props, MENU_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, sources, presence }}>
            {scope.render("root", { element: "div", as, props: rest })}
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
    return scope.render("content", {
        element: "div",
        ref: presence.ref,
        machine: presentProps(api.getContentProps(), presence.present),
        unstyled,
        props,
    });
}

/** A group of items, labelled by the ItemGroupLabel with its `id` as `group`. */
function ItemGroup({ unstyled, id, ...props }: MenuItemGroupProps): ReactNode {
    const { scope, api } = context.use("ItemGroup");
    return scope.render("itemGroup", {
        element: "div",
        machine: api.getItemGroupProps({ id }),
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

/** The ready-made menu's props: Root's, with `className`, `style`, and `slotProps` keyed by part,
 *  the trigger's label, and the items as data. */
export interface MenuProps
    extends
        Omit<MenuRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        MenuContentProps<ReactNode> {}

/** The ready-made menu: the trigger, drawn as a button, when given a label, and the menu with an
 *  item per entry of `items`, then a group per entry of `groups`. */
function ReadyMade(props: MenuProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        trigger,
        items = [],
        groups = [],
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    const renderItem = (item: MenuItemData<ReactNode>) => (
        <Item key={item.value} {...menuItemProps(item)} {...slot("item")}>
            {isPresent(item.leadingIcon) ? (
                <ItemLeading
                    mirror={item.mirrorLeadingIcon}
                    {...slot("itemLeading")}
                >
                    {item.leadingIcon}
                </ItemLeading>
            ) : null}
            <ItemContent {...slot("itemContent")}>
                <ItemLabel {...slot("itemLabel")}>{item.label}</ItemLabel>
                {isPresent(item.supportingText) ? (
                    <ItemSupportingText {...slot("itemSupportingText")}>
                        {item.supportingText}
                    </ItemSupportingText>
                ) : null}
            </ItemContent>
            {isPresent(item.trailingIcon) ? (
                <ItemTrailing
                    mirror={item.mirrorTrailingIcon}
                    {...slot("itemTrailing")}
                >
                    {item.trailingIcon}
                </ItemTrailing>
            ) : null}
            {isPresent(item.trailingText) ? (
                <ItemTrailingText {...slot("itemTrailingText")}>
                    {item.trailingText}
                </ItemTrailingText>
            ) : null}
        </Item>
    );
    return (
        <Root
            {...rootProps}
            grouped={menuGrouped(props) || undefined}
            {...(slot("root") as object)}
        >
            {isPresent(trigger) ? (
                <Trigger as={Button} label={trigger} {...slot("trigger")} />
            ) : null}
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    {items.map(renderItem)}
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
                            {group.items.map(renderItem)}
                        </ItemGroup>
                    ))}
                </Content>
            </Positioner>
        </Root>
    );
}

/** Material's menu. Use it ready-made, `<Menu trigger="Edit" items={[{ value: "cut", label:
 *  "Cut" }, …]} onSelect={…} />`, or compose its parts under `Menu.Root`: `Trigger` (`as={Button}`
 *  draws it as a button), then `Positioner` holding `Content`, with an `Item` per entry holding
 *  `ItemLeading`, `ItemContent` (around `ItemLabel` and `ItemSupportingText`), `ItemTrailing`, and
 *  `ItemTrailingText`; an `ItemGroup` holds an `ItemGroupLabel` and its items. */
export const Menu = Object.assign(ReadyMade, {
    Root,
    Trigger,
    Positioner,
    Content,
    ItemGroup,
    ItemGroupLabel,
    Item,
    ItemLeading,
    ItemContent,
    ItemLabel,
    ItemSupportingText,
    ItemTrailing,
    ItemTrailingText,
});
