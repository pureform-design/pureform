// The FAB menu: Root on Zag's menu machine, the preset's root around the menu and the FAB; the
// list (the menu's content), which the preset places above the FAB, and its items, each with an icon and a label; and the FAB (`CloseTrigger`), the menu's trigger, which
// turns into the close button while the menu is open. Everything renders in place, inside Root.

import { fabMenuAnatomy } from "@pureform/anatomy";
import {
    FAB_MENU_ROOT_PROPS,
    fabMenuItemProps,
    fabMenuMachineProps,
    fabMenuSelection,
    isPresent,
    presentProps,
} from "@pureform/binding-core";
import type {
    FabMenuContentProps,
    FabMenuRootOwnProps,
    InteractionSourceProps,
} from "@pureform/binding-core";
import * as menu from "@pureform/machines/menu";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    Children,
    type ElementType,
    type ReactNode,
    useId,
    useLayoutEffect,
    useState,
} from "react";

import { useControllable } from "../controllable";
import { CloseIcon } from "../glyphs";
import { useItemInteractionSources, useMachineButton } from "../interaction";
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

type Anatomy = typeof fabMenuAnatomy;

/** What Root shares with its parts. */
interface FabMenuContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: menu.Api<PropTypes>;
    readonly sources: ItemInteractionSources;
    readonly presence: Presence;
    /** The list tells Root how many items it holds. */
    readonly setItemCount: (count: number) => void;
}

const context = createPartContext<FabMenuContextValue>("FabMenu");

/** Root's props: the variants and tokens, the menu machine's props (`open`, `onSelect`,
 *  `positioning`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface FabMenuRootProps
    extends Omit<PartProps, keyof FabMenuRootOwnProps>, FabMenuRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface FabMenuPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The FAB's props: a part's, and the interaction source its presses are emitted to. */
export interface FabMenuCloseTriggerProps
    extends FabMenuPartProps, InteractionSourceProps {}

/** An item's props: its `value`, `valueText`, `disabled`, and source, and a part's. */
export interface FabMenuItemProps
    extends FabMenuPartProps, InteractionSourceProps {
    readonly value: string;
    readonly valueText?: string | undefined;
    readonly disabled?: boolean | undefined;
}

/** An icon's props: a part's, and `mirror` to flip it under `rtl`. */
export interface FabMenuIconProps extends FabMenuPartProps {
    readonly mirror?: boolean | undefined;
}

/** The FAB menu's root, a `<div>` around the menu and the FAB, which runs the menu machine. */
function Root(props: FabMenuRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("FabMenu", "open", props);
    const sources = useItemInteractionSources();
    const service = useMachine(menu.machine, {
        id,
        ...sources.machineProps,
        dir,
        ...fabMenuMachineProps(props),
        ...open.machineProps,
    });
    const api = menu.connect(service, normalizeProps);
    const presence = usePresence(api.open);
    const [itemCount, setItemCount] = useState<number>();
    const scope = useComponent(fabMenuAnatomy, {
        selection: fabMenuSelection(props, itemCount),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const { as, ...rest } = omitProps(props, FAB_MENU_ROOT_PROPS);
    return (
        <context.Provider
            value={{ scope, api, sources, presence, setItemCount }}
        >
            {scope.render("root", { element: "div", as, props: rest })}
        </context.Provider>
    );
}

/** The list of items, the menu's content, which holds focus while it's open and moves through
 *  the items with the arrow keys. It stays while its exit animation runs, which ends with its
 *  last item's: it tells Root how many it holds. */
function List({ unstyled, ...props }: FabMenuPartProps): ReactNode {
    const { scope, api, presence, setItemCount } = context.use("List");
    const count = Children.toArray(props.children).length;
    useLayoutEffect(() => setItemCount(count), [count, setItemCount]);
    return scope.render("list", {
        element: "div",
        ref: presence.ref,
        machine: presentProps(api.getContentProps(), presence.present),
        unstyled,
        props,
    });
}

/** An item; the highlighted one shows the hover state. */
function Item({
    unstyled,
    value,
    valueText,
    disabled,
    interactionSource,
    ...props
}: FabMenuItemProps): ReactNode {
    const { scope, api, sources } = context.use("Item");
    const source = sources.item(value, interactionSource);
    const item = { value, valueText, disabled };
    return scope.render("item", {
        element: "div",
        interactionSource: source,
        machine: api.getItemProps(item),
        states: { hover: api.getItemState(item).highlighted },
        unstyled,
        props,
    });
}

/** An item's icon, hidden from assistive technology. */
function ItemIcon({ unstyled, mirror, ...props }: FabMenuIconProps): ReactNode {
    const { scope } = context.use("ItemIcon");
    return scope.render("itemIcon", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** An item's label. */
function ItemLabel({ unstyled, ...props }: FabMenuPartProps): ReactNode {
    const { scope } = context.use("ItemLabel");
    return scope.render("itemLabel", { element: "span", unstyled, props });
}

/** The FAB, which opens the menu and, while it's open, closes it: name it with `aria-label`. */
function CloseTrigger(props: FabMenuCloseTriggerProps): ReactNode {
    const { scope, api } = context.use("CloseTrigger");
    return scope.render(
        "closeTrigger",
        useMachineButton(props, [
            api.getTriggerProps() as Readonly<Record<string, unknown>>,
        ]),
    );
}

/** The FAB's icon: `icon` while the menu is closed, `closeIcon` (or a cross) while it's open. */
function FabIcon(props: {
    readonly icon: ReactNode;
    readonly closeIcon: ReactNode;
}): ReactNode {
    const { api } = context.use("CloseTrigger");
    if (!api.open) return props.icon;
    return isPresent(props.closeIcon) ? props.closeIcon : <CloseIcon />;
}

/** The ready-made FAB menu's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, the FAB's icons and name, and the items as data. */
export interface FabMenuProps
    extends
        Omit<FabMenuRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        FabMenuContentProps<ReactNode> {}

/** The ready-made FAB menu: the list with an item per entry of `items`, and the FAB showing
 *  `icon`, or `closeIcon` while the menu is open. */
function ReadyMade(props: FabMenuProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        icon,
        closeIcon,
        fabLabel,
        items = [],
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <List {...slot("list")}>
                {items.map((item) => (
                    <Item
                        key={item.value}
                        {...fabMenuItemProps(item)}
                        {...slot("item")}
                    >
                        {isPresent(item.icon) ? (
                            <ItemIcon
                                mirror={item.mirrorIcon}
                                {...slot("itemIcon")}
                            >
                                {item.icon}
                            </ItemIcon>
                        ) : null}
                        <ItemLabel {...slot("itemLabel")}>
                            {item.label}
                        </ItemLabel>
                    </Item>
                ))}
            </List>
            <CloseTrigger aria-label={fabLabel} {...slot("closeTrigger")}>
                <FabIcon icon={icon} closeIcon={closeIcon} />
            </CloseTrigger>
        </Root>
    );
}

/** M3 Expressive's FAB menu. Use it ready-made, `<FabMenu icon={<AddIcon />} fabLabel="Create"
 *  items={[{ value: "message", label: "Message", icon: <MessageIcon /> }, …]} onSelect={…} />`,
 *  or compose its parts under `FabMenu.Root`: `List`, with an `Item` per
 *  action holding `ItemIcon` and `ItemLabel`, then `CloseTrigger`, the FAB. */
export const FabMenu = Object.assign(ReadyMade, {
    Root,
    List,
    Item,
    ItemIcon,
    ItemLabel,
    CloseTrigger,
});
