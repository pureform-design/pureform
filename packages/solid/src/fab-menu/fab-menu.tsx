// The FAB menu: Root on Zag's menu machine, the preset's root around the menu and the FAB; the
// list (the menu's content), which the preset places above the FAB, and its items, each with an icon and a label; and the FAB (`CloseTrigger`), the menu's trigger, which
// turns into the close button while the menu is open. Everything renders in place, inside Root.

import { fabMenuAnatomy } from "@pureform/anatomy";
import {
    FAB_MENU_CONTENT_PROPS,
    FAB_MENU_ROOT_PROPS,
    fabMenuItemProps,
    fabMenuSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    FabMenuContentProps,
    FabMenuInstances,
    FabMenuItem,
    FabMenuRootOwnProps,
    InteractionSourceProps,
} from "@pureform/binding-core";
import { fabMenuItemFocusProps } from "@pureform/binding-web";
import { fabMenuMachineProps, presentProps } from "@pureform/binding-web";
import { fabMenuListProps } from "@pureform/binding-web";
import * as menu from "@pureform/machines/menu";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    omit,
    onSettled,
    Show,
    useContext,
} from "solid-js";

import { useControllable } from "../controllable";
import { CloseIcon } from "../glyphs";
import { itemInteractionSources, useMachineButton } from "../interaction";
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

type Anatomy = typeof fabMenuAnatomy;

/** What Root shares with its parts. */
interface FabMenuContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<menu.Api<PropTypes>>;
    readonly sources: ItemInteractionSources;
    readonly presence: Presence;
    /** The list tells Root how many items it holds. */
    readonly setItemCount: (count: number) => void;
}

const context = createPartContext<FabMenuContextValue>("FabMenu");

// The ready-made's item count, which Root reads until the list has counted its own, so the
// server renders the list's `itemCount` and hydration changes nothing.
const ReadyMadeItemCount = createContext<Accessor<number | undefined>>(
    () => undefined,
);

/** Root's props: the variants and tokens, the menu machine's props (`open`, `onSelect`,
 *  `positioning`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface FabMenuRootProps
    extends Omit<PartProps, keyof FabMenuRootOwnProps>, FabMenuRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
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
function Root(props: FabMenuRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("FabMenu", "open", props);
    const sources = itemInteractionSources();
    const service = useMachine(menu.machine, () => ({
        id,
        ...sources.machineProps,
        dir: dir(),
        ...fabMenuMachineProps(props),
        ...open.machineProps(),
    }));
    const api = createMemo(() => menu.connect(service, normalizeProps));
    const presence = usePresence(() => api().open);
    const [itemCount, setItemCount] = createSignal<number>();
    const given = useContext(ReadyMadeItemCount);
    const scope = useComponent(fabMenuAnatomy, {
        selection: () => fabMenuSelection(props, itemCount() ?? given()),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    const rest = omit(props, "as", ...FAB_MENU_ROOT_PROPS);
    return (
        <context.Provider
            value={{ scope, api, sources, presence, setItemCount }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                props: rest,
            })}
        </context.Provider>
    );
}

/** The list of items, the menu's content, which holds focus while it's open and moves through
 *  the items with the arrow keys. It stays while its exit animation runs, which ends with its
 *  last item's: it tells Root how many it holds, counting its elements as they change. */
function List(props: FabMenuPartProps): JSX.Element {
    const { scope, api, presence, setItemCount } = context.use("List");
    let list: HTMLElement | undefined;
    onSettled(() => {
        const element = list;
        if (!element) return;
        const count = () => setItemCount(element.childElementCount);
        count();
        if (typeof MutationObserver === "undefined") return;
        const observer = new MutationObserver(count);
        observer.observe(element, { childList: true });
        return () => observer.disconnect();
    });
    const rest = omit(props, "unstyled");
    return scope.render("list", {
        element: "div",
        ref: (element: HTMLElement) => {
            list = element;
            presence.ref(element);
        },
        machine: () =>
            presentProps(
                fabMenuListProps(api().getContentProps(), () => {
                    const { id } = api().getTriggerProps() as { id?: string };
                    return id ? document.getElementById(id) : null;
                }),
                presence.present(),
            ),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** An item; the highlighted one shows the hover state. */
function Item(props: FabMenuItemProps): JSX.Element {
    const { scope, api, sources } = context.use("Item");
    const source = sources.item(
        () => props.value,
        () => props.interactionSource,
    );
    const item = () => ({
        value: props.value,
        valueText: props.valueText,
        disabled: props.disabled,
    });
    const rest = omit(
        props,
        "unstyled",
        "value",
        "valueText",
        "disabled",
        "interactionSource",
    );
    return scope.render("item", {
        element: "div",
        interactionSource: source,
        machine: () => ({
            ...api().getItemProps(item()),
            ...normalizeProps.element(
                // oxlint-disable-next-line solid/reactivity -- the item's onFocus handler
                fabMenuItemFocusProps(props.disabled, () =>
                    api().setHighlightedValue(props.value),
                ),
            ),
        }),
        states: () => ({ hover: api().getItemState(item()).highlighted }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** An item's icon, hidden from assistive technology. */
function ItemIcon(props: FabMenuIconProps): JSX.Element {
    const { scope } = context.use("ItemIcon");
    const rest = omit(props, "unstyled", "mirror");
    return scope.render("itemIcon", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** An item's label. */
function ItemLabel(props: FabMenuPartProps): JSX.Element {
    const { scope } = context.use("ItemLabel");
    const rest = omit(props, "unstyled");
    return scope.render("itemLabel", {
        element: "span",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The FAB, which opens the menu and, while it's open, closes it: name it with `aria-label`. */
function CloseTrigger(props: FabMenuCloseTriggerProps): JSX.Element {
    const { scope, api } = context.use("CloseTrigger");
    return scope.render(
        "closeTrigger",
        useMachineButton(props, () => [
            api().getTriggerProps() as Readonly<Record<string, unknown>>,
        ]),
    );
}

/** The ready-made FAB menu's props: Root's, with `class`, `style`, `slotProps` and `unstyled` keyed
 *  by part (an item's parts also by item, `FabMenuInstances`), the FAB's icons and name, and the
 *  items as data. */
export interface FabMenuProps
    extends
        Omit<FabMenuRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy, never, FabMenuInstances<JSX.Element>>,
        FabMenuContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...FAB_MENU_CONTENT_PROPS,
] as const;

/** The ready-made FAB menu: the list with an item per entry of `items`, and the FAB showing
 *  `icon`, or `closeIcon` while the menu is open. */
function ReadyMade(props: FabMenuProps): JSX.Element {
    const slots = createSlotProps<
        Anatomy,
        never,
        FabMenuInstances<JSX.Element>
    >(props);
    const own = omit(props, ...READY_MADE_PROPS) as FabMenuRootProps;
    const root = slots("root") as object;
    const list = slots("list");
    const closeTrigger = slots("closeTrigger");
    return (
        // oxlint-disable-next-line solid/reactivity -- the context's accessor, which the items read where tracked
        <ReadyMadeItemCount value={() => (props.items ?? []).length}>
            <Root {...own} {...root}>
                <List {...list}>
                    <For
                        each={props.items ?? []}
                        keyed={(item: FabMenuItem<JSX.Element>) => item.value}
                    >
                        {(item, index) => {
                            const copy = () => ({
                                index: index(),
                                item: item(),
                            });
                            return (
                                <Item
                                    {...fabMenuItemProps(item())}
                                    {...slots("item", copy)}
                                >
                                    <Show when={isPresent(item().icon)}>
                                        <ItemIcon
                                            mirror={item().mirrorIcon}
                                            {...slots("itemIcon", copy)}
                                        >
                                            {item().icon}
                                        </ItemIcon>
                                    </Show>
                                    <ItemLabel {...slots("itemLabel", copy)}>
                                        {item().label}
                                    </ItemLabel>
                                </Item>
                            );
                        }}
                    </For>
                </List>
                <CloseTrigger aria-label={props.fabLabel} {...closeTrigger}>
                    <FabIcon icon={props.icon} closeIcon={props.closeIcon} />
                </CloseTrigger>
            </Root>
        </ReadyMadeItemCount>
    );
}

/** The FAB's icon: `icon` while the menu is closed, `closeIcon` (or a cross) while it's open. */
function FabIcon(props: {
    readonly icon: JSX.Element;
    readonly closeIcon: JSX.Element;
}): JSX.Element {
    const { api } = context.use("CloseTrigger");
    return (
        <Show when={api().open} fallback={props.icon}>
            <Show when={isPresent(props.closeIcon)} fallback={<CloseIcon />}>
                {props.closeIcon}
            </Show>
        </Show>
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
