// What the navigation bar and the navigation rail share: Root on pureform's navigation machine (a
// `<nav>`), each destination as the preset draws it (a link or a button holding the pill, which
// holds the active indicator and the icon, then the label), and the ready-made component over
// them. Each component builds its own from `createNavigation`. The rail adds its header, and as a
// modal rail renders in a dialog (Zag's) over the scrim: fixed along the viewport's start edge,
// focus kept inside while it's open.

import type {
    navigationBarAnatomy,
    navigationRailAnatomy,
    scrimAnatomy,
} from "@pureform/anatomy";
import {
    dialogBackdropLayout,
    isPresent,
    NAVIGATION_ROOT_PROPS,
    navigationItemElement,
    navigationItemElementProps,
    navigationItemMachineProps,
    navigationMachineProps,
    navigationModalContentLayout,
    navigationModalMachineProps,
    navigationModalPositionerLayout,
    navigationSelection,
} from "@pureform/binding-core";
import type {
    NavigationComponent,
    NavigationContentProps,
    NavigationItemOwnProps,
    NavigationRootOwnProps,
} from "@pureform/binding-core";
import type { InteractionSource } from "@pureform/binding-core/interaction";
import * as dialog from "@pureform/machines/dialog";
import * as navigation from "@pureform/machines/navigation";
import type { Selection } from "@pureform/styling";
import { mergeProps, normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { useControllable } from "./controllable";
import { useItemInteractionSources } from "./interaction";
import type { ItemInteractionSources } from "./interaction";
import { useMachine } from "./machine";
import { createPartContext } from "./part-context";
import { useComponent, useSlotProps } from "./parts";
import type { ComponentScope, SlotKeyedProps } from "./parts";
import { combinePartProps, omitProps } from "./props";
import type { PartProps } from "./props";
import { useDirection } from "./provider";

type Anatomy = typeof navigationBarAnatomy | typeof navigationRailAnatomy;

/** What Root shares with its parts. */
interface NavigationContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: navigation.Api<PropTypes>;
    readonly sources: ItemInteractionSources;
}

/** What a destination shares with its parts. */
interface ItemContextValue {
    readonly value: string;
    readonly source: InteractionSource | undefined;
}

/** Root's props, for the component `C`: the variants and tokens, the machine's props (`value`,
 *  `disabled`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface NavigationRootProps<C extends NavigationComponent>
    extends
        Omit<PartProps, keyof NavigationRootOwnProps<C>>,
        NavigationRootOwnProps<C> {
    /** Another element or component to render instead of `<nav>`. */
    readonly as?: ElementType | undefined;
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
    extends NavigationPartProps, NavigationItemOwnProps {}

/** The ready-made component's props, for the component `C`: Root's, with `className`, `style`,
 *  and `slotProps` keyed by part, and the destinations as data. */
export type NavigationProps<C extends NavigationComponent> = Omit<
    NavigationRootProps<C>,
    keyof SlotKeyedProps<Anatomy> | "children"
> &
    SlotKeyedProps<Anatomy> &
    NavigationContentProps<ReactNode>;

/** Builds a navigation component's parts and ready-made component. */
export function createNavigation<C extends NavigationComponent>(config: {
    /** The component's name, for warnings and errors: `"NavigationBar"`. */
    readonly component: string;
    readonly anatomy: Anatomy & { readonly name: C };
    /** The scrim a modal component draws under it: the rail's. */
    readonly scrim?: typeof scrimAnatomy;
}) {
    const context = createPartContext<NavigationContextValue>(config.component);
    const itemContext = createPartContext<ItemContextValue>(
        config.component,
        "Item",
    );

    /** A modal rail's dialog: the scrim, and the rail in a dialog along the viewport's start edge,
     *  open while `open` is. A click on the scrim or Escape closes it. */
    function Modal(props: {
        readonly own: NavigationRootProps<C>;
        readonly children: ReactNode;
    }): ReactNode {
        const id = useId();
        const dir = useDirection();
        const open = useControllable<"open", boolean>(
            config.component,
            "open",
            props.own,
        );
        const service = useMachine(dialog.machine, {
            id,
            dir,
            ...navigationModalMachineProps(props.own),
            ...open.machineProps,
        });
        const api = dialog.connect(service, normalizeProps);
        const testId = props.own.testId;
        const scrim = useComponent(config.scrim!, {
            selection: {},
            testId:
                typeof testId === "string"
                    ? { root: `${testId}-scrim` }
                    : undefined,
        });
        return (
            <>
                {scrim.render("root", {
                    element: "div",
                    machine: mergeProps(
                        api.getBackdropProps(),
                        normalizeProps.element(dialogBackdropLayout(api.open)),
                    ),
                })}
                <div
                    {...mergeProps(
                        api.getPositionerProps(),
                        normalizeProps.element(
                            navigationModalPositionerLayout(api.open),
                        ),
                    )}
                >
                    <div
                        {...mergeProps(
                            api.getContentProps(),
                            normalizeProps.element(
                                navigationModalContentLayout(api.open),
                            ),
                        )}
                    >
                        {props.children}
                    </div>
                </div>
            </>
        );
    }

    /** The component's root, a `<nav>` holding its destinations. Name it with `aria-label`. A
     *  modal rail (`modal`) renders it in a dialog over the scrim. */
    function Root(props: NavigationRootProps<C>): ReactNode {
        if ((props as { readonly modal?: boolean | undefined }).modal) {
            return (
                <Modal own={props}>
                    <Nav {...props} />
                </Modal>
            );
        }
        return <Nav {...props} />;
    }

    function Nav(props: NavigationRootProps<C>): ReactNode {
        const id = useId();
        const dir = useDirection();
        const value = useControllable<"value", string | null>(
            config.component,
            "value",
            props,
        );
        const sources = useItemInteractionSources();
        const service = useMachine(navigation.machine, {
            id,
            ...sources.machineProps,
            dir,
            ...navigationMachineProps(props),
            ...value.machineProps,
        });
        const api = navigation.connect(service, normalizeProps);
        const scope = useComponent(config.anatomy as Anatomy, {
            selection: navigationSelection(props) as Selection<Anatomy["name"]>,
            testId: props.testId,
            unstyled: props.unstyled,
            indication: props.indication,
        });
        const { as, ...rest } = omitProps(props, NAVIGATION_ROOT_PROPS);
        return (
            <context.Provider value={{ scope, api, sources }}>
                {scope.render("root", {
                    element: "nav",
                    as,
                    machine: api.getRootProps(),
                    props: rest,
                })}
            </context.Provider>
        );
    }

    /** A destination: a link with an `href`, else a button. The current one is marked with
     *  `aria-current`. */
    function Item({
        unstyled,
        value,
        disabled,
        interactionSource,
        ...props
    }: NavigationItemProps): ReactNode {
        const { scope, api, sources } = context.use("Item");
        const source = sources.item(value, interactionSource);
        const own = { value, disabled, href: props.href };
        const item = navigationItemMachineProps(own);
        return (
            <itemContext.Provider value={{ value, source }}>
                {scope.render("item", {
                    element: navigationItemElement(own),
                    interactionSource: source,
                    machine: combinePartProps([
                        api.getItemProps(item) as Readonly<
                            Record<string, unknown>
                        >,
                        navigationItemElementProps(
                            own,
                            api.getItemState(item).disabled,
                        ),
                    ]),
                    unstyled,
                    props,
                })}
            </itemContext.Provider>
        );
    }

    /** The pill behind the icon, which takes the state layer. */
    function Indicator({ unstyled, ...props }: NavigationPartProps): ReactNode {
        const { scope } = context.use("Indicator");
        const { source } = itemContext.use("Indicator");
        return scope.render("indicator", {
            element: "span",
            interactionSource: source,
            unstyled,
            props,
        });
    }

    /** The fill that grows inside the pill once the destination is current. Empty. */
    function ActiveIndicator({
        unstyled,
        ...props
    }: NavigationPartProps): ReactNode {
        const { scope } = context.use("ActiveIndicator");
        itemContext.use("ActiveIndicator");
        return scope.render("activeIndicator", {
            element: "span",
            unstyled,
            props,
        });
    }

    /** The destination's icon, hidden from assistive technology; an icon font draws it filled
     *  while the destination is current. */
    function Icon({
        unstyled,
        mirror,
        ...props
    }: NavigationIconProps): ReactNode {
        const { scope, api } = context.use("Icon");
        itemContext.use("Icon");
        return scope.render("icon", {
            element: "span",
            machine: api.getIconProps(),
            states: { mirrored: mirror },
            unstyled,
            props,
        });
    }

    /** The rail's header, above the destinations: its menu button and FAB. */
    function Header({ unstyled, ...props }: NavigationPartProps): ReactNode {
        const { scope, api } = context.use("Header");
        return (
            scope as unknown as ComponentScope<typeof navigationRailAnatomy>
        ).render("header", {
            element: "div",
            machine: api.getHeaderProps(),
            unstyled,
            props,
        });
    }

    // Only the rail has a header.
    const hasHeader = (config.anatomy.partNames as readonly string[]).includes(
        "header",
    );

    /** The destination's label, which names it. */
    function Label({ unstyled, ...props }: NavigationPartProps): ReactNode {
        const { scope, api } = context.use("Label");
        itemContext.use("Label");
        return scope.render("label", {
            element: "span",
            machine: api.getLabelProps(),
            unstyled,
            props,
        });
    }

    /** The ready-made component: a destination per item, each with every part in the preset's
     *  structure, the icon only when given. */
    function ReadyMade(props: NavigationProps<C>): ReactNode {
        const {
            className: _className,
            style: _style,
            slotProps: _slotProps,
            items = [],
            header,
            ...rootProps
        } = props;
        const slot = useSlotProps(props);
        return (
            <Root
                {...(rootProps as NavigationRootProps<C>)}
                {...(slot("root") as object)}
            >
                {hasHeader && isPresent(header) ? (
                    <Header {...(slot as (part: string) => object)("header")}>
                        {header}
                    </Header>
                ) : null}
                {items.map((item) => (
                    <Item
                        key={item.value}
                        value={item.value}
                        href={item.href}
                        disabled={item.disabled}
                        interactionSource={item.interactionSource}
                        {...slot("item")}
                    >
                        <Indicator {...slot("indicator")}>
                            <ActiveIndicator {...slot("activeIndicator")} />
                            {isPresent(item.icon) ? (
                                <Icon
                                    mirror={item.mirrorIcon}
                                    {...slot("icon")}
                                >
                                    {item.icon}
                                </Icon>
                            ) : null}
                        </Indicator>
                        <Label {...slot("label")}>{item.label}</Label>
                    </Item>
                ))}
            </Root>
        );
    }

    return {
        ReadyMade,
        parts: { Root, Header, Item, Indicator, ActiveIndicator, Icon, Label },
    };
}
