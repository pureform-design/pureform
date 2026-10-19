// What the navigation bar and the navigation rail share: Root on pureform's navigation machine (a
// `<nav>`), each destination as the preset draws it (a link or a button holding the pill, which
// holds the active indicator and the icon, then the label), and the ready-made component over
// them. Each component builds its own from `createNavigation`.

import type {
    navigationBarAnatomy,
    navigationRailAnatomy,
} from "@pureform/anatomy";
import {
    isPresent,
    NAVIGATION_CONTENT_PROPS,
    NAVIGATION_ITEM_PROPS,
    NAVIGATION_ROOT_PROPS,
    navigationItemElement,
    navigationItemElementProps,
    navigationItemMachineProps,
    navigationMachineProps,
    navigationSelection,
} from "@pureform/binding-core";
import type {
    NavigationComponent,
    NavigationContentProps,
    NavigationItem,
    NavigationItemOwnProps,
    NavigationRootOwnProps,
} from "@pureform/binding-core";
import type { InteractionSource } from "@pureform/binding-core/interaction";
import * as navigation from "@pureform/machines/navigation";
import type { Selection } from "@pureform/styling";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    For,
    omit,
    Show,
} from "solid-js";

import { useControllable } from "./controllable";
import { itemInteractionSources } from "./interaction";
import type { ItemInteractionSources } from "./interaction";
import { normalizeProps, useMachine } from "./internal/zag";
import type { PropTypes } from "./internal/zag";
import { createPartContext } from "./part-context";
import { slotPartProps, useComponent } from "./parts";
import type { ComponentScope, SlotKeyedProps } from "./parts";
import { combinePartProps } from "./props";
import type { PartProps } from "./props";
import { useDirection } from "./provider";

type Anatomy = typeof navigationBarAnatomy | typeof navigationRailAnatomy;

/** What Root shares with its parts. */
interface NavigationContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<navigation.Api<PropTypes>>;
    readonly sources: ItemInteractionSources;
}

/** What a destination shares with its parts. */
interface ItemContextValue {
    readonly value: Accessor<string>;
    readonly source: Accessor<InteractionSource | undefined>;
}

/** Root's props, for the component `C`: the variants and tokens, the machine's props (`value`,
 *  `disabled`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface NavigationRootProps<C extends NavigationComponent>
    extends
        Omit<PartProps, keyof NavigationRootOwnProps<C>>,
        NavigationRootOwnProps<C> {
    /** Another element or component to render instead of `<nav>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface NavigationPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The icon's props: a part's, and `mirror` to flip it under `rtl`. */
export interface NavigationIconProps extends NavigationPartProps {
    readonly mirror?: boolean | undefined;
}

/** A destination's props: its value, `href` (a link; else a button), `disabled`, and a part's. */
export interface NavigationItemProps
    extends Omit<NavigationPartProps, "href">, NavigationItemOwnProps {}

/** The ready-made component's props, for the component `C`: Root's, with `class`, `style`, and
 *  `slotProps` keyed by part, and the destinations as data. */
export type NavigationProps<C extends NavigationComponent> = Omit<
    NavigationRootProps<C>,
    keyof SlotKeyedProps<Anatomy> | "children"
> &
    SlotKeyedProps<Anatomy> &
    NavigationContentProps<JSX.Element>;

/** Builds a navigation component's parts and ready-made component. */
export function createNavigation<C extends NavigationComponent>(config: {
    /** The component's name, for warnings and errors: `"NavigationBar"`. */
    readonly component: string;
    readonly anatomy: Anatomy & { readonly name: C };
}) {
    const context = createPartContext<NavigationContextValue>(config.component);
    const itemContext = createPartContext<ItemContextValue>(
        config.component,
        "Item",
    );

    /** The component's root, a `<nav>` holding its destinations. Name it with `aria-label`. */
    function Root(props: NavigationRootProps<C>): JSX.Element {
        const id = createUniqueId();
        const dir = useDirection();
        const value = useControllable<"value", string | null>(
            config.component,
            "value",
            props,
        );
        const sources = itemInteractionSources();
        const service = useMachine(navigation.machine, () => ({
            id,
            ...sources.machineProps,
            dir: dir(),
            ...navigationMachineProps(props),
            ...value.machineProps(),
        }));
        const api = createMemo(() =>
            navigation.connect(service, normalizeProps),
        );
        const scope = useComponent(config.anatomy as Anatomy, {
            selection: () =>
                navigationSelection(props) as Selection<Anatomy["name"]>,
            testId: () => props.testId,
            unstyled: () => props.unstyled,
            indication: () => props.indication,
        });
        return (
            <context.Provider value={{ scope, api, sources }}>
                {scope.render("root", {
                    element: "nav",
                    as: () => props.as,
                    machine: () => api().getRootProps(),
                    props: omit(props, "as", ...NAVIGATION_ROOT_PROPS),
                })}
            </context.Provider>
        );
    }

    /** A destination: a link with an `href`, else a button. The current one is marked with
     *  `aria-current`. */
    function Item(props: NavigationItemProps): JSX.Element {
        const { scope, api, sources } = context.use("Item");
        const item = () => navigationItemMachineProps(props);
        // A memo, since the render below is read in a tracking scope: reading the props there would
        // make the destination again, dropping its focus, whenever a spread on the component
        // changes.
        const element = createMemo(() => navigationItemElement(props));
        const source = sources.item(
            () => props.value,
            () => props.interactionSource,
        );
        return (
            <itemContext.Provider value={{ value: () => props.value, source }}>
                {scope.render("item", {
                    element: "button",
                    as: element,
                    interactionSource: source,
                    machine: () =>
                        combinePartProps([
                            api().getItemProps(item()) as Readonly<
                                Record<string, unknown>
                            >,
                            navigationItemElementProps(
                                props,
                                api().getItemState(item()).disabled,
                            ),
                        ]),
                    unstyled: () => props.unstyled,
                    props: omit(props, "unstyled", ...NAVIGATION_ITEM_PROPS),
                })}
            </itemContext.Provider>
        );
    }

    /** The pill behind the icon, which takes the state layer. */
    function Indicator(props: NavigationPartProps): JSX.Element {
        const { scope } = context.use("Indicator");
        const { source } = itemContext.use("Indicator");
        return scope.render("indicator", {
            element: "span",
            interactionSource: source,
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    /** The fill that grows inside the pill once the destination is current. Empty. */
    function ActiveIndicator(props: NavigationPartProps): JSX.Element {
        const { scope } = context.use("ActiveIndicator");
        itemContext.use("ActiveIndicator");
        return scope.render("activeIndicator", {
            element: "span",
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    /** The destination's icon, hidden from assistive technology; an icon font draws it filled
     *  while the destination is current. */
    function Icon(props: NavigationIconProps): JSX.Element {
        const { scope, api } = context.use("Icon");
        itemContext.use("Icon");
        return scope.render("icon", {
            element: "span",
            machine: () => api().getIconProps(),
            states: () => ({ mirrored: props.mirror }),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled", "mirror"),
        });
    }

    /** The destination's label, which names it. */
    function Label(props: NavigationPartProps): JSX.Element {
        const { scope, api } = context.use("Label");
        itemContext.use("Label");
        return scope.render("label", {
            element: "span",
            machine: () => api().getLabelProps(),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    const READY_MADE_PROPS = [
        "class",
        "style",
        "slotProps",
        ...NAVIGATION_CONTENT_PROPS,
    ] as const;

    /** The ready-made component: a destination per item, each with every part in the preset's
     *  structure, the icon only when given. */
    function ReadyMade(props: NavigationProps<C>): JSX.Element {
        const slot = (part: Parameters<typeof slotPartProps<Anatomy>>[1]) =>
            slotPartProps(props, part) as object;
        return (
            <Root
                {...(omit(
                    props,
                    ...READY_MADE_PROPS,
                ) as NavigationRootProps<C>)}
                {...slot("root")}
            >
                <For
                    each={props.items ?? []}
                    keyed={(item: NavigationItem<JSX.Element>) => item.value}
                >
                    {(item) => (
                        <Item
                            value={item().value}
                            href={item().href}
                            disabled={item().disabled}
                            interactionSource={item().interactionSource}
                            {...slot("item")}
                        >
                            <Indicator {...slot("indicator")}>
                                <ActiveIndicator {...slot("activeIndicator")} />
                                <Show when={isPresent(item().icon)}>
                                    <Icon
                                        mirror={item().mirrorIcon}
                                        {...slot("icon")}
                                    >
                                        {item().icon}
                                    </Icon>
                                </Show>
                            </Indicator>
                            <Label {...slot("label")}>{item().label}</Label>
                        </Item>
                    )}
                </For>
            </Root>
        );
    }

    return {
        ReadyMade,
        parts: { Root, Item, Indicator, ActiveIndicator, Icon, Label },
    };
}
