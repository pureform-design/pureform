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
    NavigationItemOwnProps,
    NavigationRootOwnProps,
} from "@pureform/binding-core";
import * as navigation from "@pureform/machines/navigation";
import type { Selection } from "@pureform/styling";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { useControllable } from "./controllable";
import { useItemInteractionSources } from "./interaction";
import { useMachine } from "./machine";
import { createPartContext } from "./part-context";
import { slotPartProps, useComponent } from "./parts";
import type { ComponentScope, SlotKeyedProps } from "./parts";
import { combinePartProps, omitProps } from "./props";
import type { PartProps } from "./props";
import { useDirection } from "./provider";

type Anatomy = typeof navigationBarAnatomy | typeof navigationRailAnatomy;

/** What Root shares with its parts. */
interface NavigationContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: navigation.Api<PropTypes>;
}

/** What a destination shares with its parts. */
interface ItemContextValue {
    readonly value: string;
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
}) {
    const context = createPartContext<NavigationContextValue>(config.component);
    const itemContext = createPartContext<ItemContextValue>(
        config.component,
        "Item",
    );

    /** The component's root, a `<nav>` holding its destinations. Name it with `aria-label`. */
    function Root(props: NavigationRootProps<C>): ReactNode {
        const id = useId();
        const dir = useDirection();
        const value = useControllable<"value", string | null>(
            config.component,
            "value",
            props,
        );
        const interaction = useItemInteractionSources();
        const service = useMachine(navigation.machine, {
            id,
            ...interaction,
            dir,
            ...navigationMachineProps(props),
            ...value.machineProps,
        });
        const api = navigation.connect(service, normalizeProps);
        const scope = useComponent(config.anatomy as Anatomy, {
            selection: navigationSelection(props) as Selection<Anatomy["name"]>,
            testId: props.testId,
            unstyled: props.unstyled,
        });
        const { as, ...rest } = omitProps(props, NAVIGATION_ROOT_PROPS);
        return (
            <context.Provider value={{ scope, api }}>
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
        ...props
    }: NavigationItemProps): ReactNode {
        const { scope, api } = context.use("Item");
        const own = { value, disabled, href: props.href };
        const item = navigationItemMachineProps(own);
        return (
            <itemContext.Provider value={{ value }}>
                {scope.render("item", {
                    element: navigationItemElement(own),
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
        itemContext.use("Indicator");
        return scope.render("indicator", { element: "span", unstyled, props });
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
            ...rootProps
        } = props;
        const slot = (part: Parameters<typeof slotPartProps<Anatomy>>[1]) =>
            slotPartProps(props, part);
        return (
            <Root
                {...(rootProps as NavigationRootProps<C>)}
                {...(slot("root") as object)}
            >
                {items.map((item) => (
                    <Item
                        key={item.value}
                        value={item.value}
                        href={item.href}
                        disabled={item.disabled}
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
        parts: { Root, Item, Indicator, ActiveIndicator, Icon, Label },
    };
}
