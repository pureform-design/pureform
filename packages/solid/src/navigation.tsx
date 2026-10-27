// What the navigation bar and the navigation rail share: Root on pureform's navigation machine (a
// `<nav>`), each destination as the preset draws it (a link or a button holding the pill, which
// holds the active indicator and the icon, then the label), and the ready-made component over
// them. Each component builds its own from `createNavigation`. The rail adds its header, and as a
// modal rail renders in a dialog (Zag's) over the scrim: fixed along the viewport's start edge,
// focus kept inside while it's open.

import type {
    navigationBarAnatomy,
    navigationRailAnatomy,
    PartName,
    scrimAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import {
    isPresent,
    NAVIGATION_CONTENT_PROPS,
    NAVIGATION_ITEM_PROPS,
    NAVIGATION_ROOT_PROPS,
    navigationSections,
    navigationSelection,
} from "@pureform/binding-core";
import type {
    NavigationComponent,
    NavigationContentProps,
    NavigationInstances,
    NavigationItem,
    NavigationItemOwnProps,
    NavigationRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import type { InteractionSource } from "@pureform/binding-core/interaction";
import {
    dialogBackdropLayout,
    navigationItemElement,
    navigationItemElementProps,
    navigationItemMachineProps,
    navigationMachineProps,
    navigationModalContentLayout,
    navigationModalMachineProps,
    navigationModalPositionerLayout,
} from "@pureform/binding-web";
import * as dialog from "@pureform/machines/dialog";
import * as navigation from "@pureform/machines/navigation";
import type { Selection } from "@pureform/styling";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createMemo,
    createUniqueId,
    For,
    omit,
    Show,
    untrack,
    useContext,
} from "solid-js";

import { useControllable } from "./controllable";
import { itemInteractionSources } from "./interaction";
import type { ItemInteractionSources } from "./interaction";
import { mergeProps, normalizeProps, useMachine } from "./internal/zag";
import type { PropTypes } from "./internal/zag";
import { createPartContext } from "./part-context";
import { createSlotProps, useComponent } from "./parts";
import type { ComponentScope, SlotKeyedProps, SlotPropsOf } from "./parts";
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

/** A modal rail's own pieces besides its anatomy's: the scrim and the dialog around the rail. */
export type NavigationModalPart = "scrim" | "dialog";

/** The extra keys the ready-made component `C` takes: a rail's modal pieces. */
type ExtraOf<C extends NavigationComponent> = C extends "navigationRail"
    ? NavigationModalPart
    : never;

/** The ready-made component's props, for the component `C`: Root's, with `class`, `style`,
 *  `slotProps` and `unstyled` keyed by part (a destination's parts also by destination,
 *  `NavigationItemInstance`; a modal rail's `scrim` and `dialog` too), and the destinations as
 *  data. */
export type NavigationProps<C extends NavigationComponent> = Omit<
    NavigationRootProps<C>,
    keyof SlotKeyedProps<Anatomy> | "children"
> &
    Omit<
        SlotKeyedProps<Anatomy, ExtraOf<C>, NavigationInstances<JSX.Element>>,
        "testId" | "unstyled"
    > &
    NavigationContentProps<JSX.Element> & {
        /** A prefix for every part's test id, or ids by part (a modal rail's `scrim` and
         *  `dialog` too). */
        readonly testId?:
            | TestIdOverride<PartName<Anatomy> | ExtraOf<C>>
            | undefined;
        /** Opts parts out of the registry's styles: every part, or by part (a destination's also
         *  by destination; a modal rail's `scrim` too). */
        readonly unstyled?:
            | Unstyled<
                  PartName<Anatomy> | ExtraOf<C>,
                  NavigationInstances<JSX.Element>
              >
            | undefined;
    };

/** What the ready-made rail gives its modal pieces: the keyed props of `scrim` and `dialog`. */
const ModalSlots = createContext<
    | {
          readonly scrim: PartProps;
          readonly dialog: PartProps;
      }
    | undefined
>(undefined);

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
        readonly children: JSX.Element;
    }): JSX.Element {
        const id = createUniqueId();
        const dir = useDirection();
        const open = useControllable<"open", boolean>(
            config.component,
            "open",
            // oxlint-disable-next-line solid/reactivity -- the parent's own props, passed once and never replaced
            props.own,
        );
        const service = useMachine(dialog.machine, () => ({
            id,
            dir: dir(),
            ...navigationModalMachineProps(
                props.own as Parameters<typeof navigationModalMachineProps>[0],
            ),
            ...open.machineProps(),
        }));
        const api = createMemo(() => dialog.connect(service, normalizeProps));
        const slots = useContext(ModalSlots);
        const modalId = (part: NavigationModalPart) => {
            const testId = props.own.testId as
                | TestIdOverride<NavigationModalPart>
                | undefined;
            return typeof testId === "string"
                ? `${testId}-${part}`
                : testId?.[part];
        };
        const scrim = useComponent(config.scrim!, {
            selection: () => ({}),
            testId: () => {
                const id = modalId("scrim");
                return id === undefined ? undefined : { root: id };
            },
            unstyled: () => {
                const unstyled = props.own.unstyled;
                return (
                    unstyled === true ||
                    (typeof unstyled === "object" &&
                        (unstyled as { scrim?: unknown }).scrim === true)
                );
            },
        });
        const scrimProps = slots?.scrim as
            | (PartProps & { readonly unstyled?: boolean })
            | undefined;
        const positioner = createMemo(() =>
            mergeProps(
                api().getPositionerProps(),
                normalizeProps.element(
                    navigationModalPositionerLayout(api().open),
                ),
            ),
        );
        const content = createMemo(() =>
            combinePartProps([
                mergeProps(
                    api().getContentProps(),
                    normalizeProps.element(
                        navigationModalContentLayout(api().open),
                    ),
                ) as Record<string, unknown>,
                slots?.dialog as Record<string, unknown> | undefined,
                { "data-testid": modalId("dialog") },
            ]),
        );
        return (
            <>
                {scrim.render("root", {
                    element: "div",
                    machine: () =>
                        mergeProps(
                            api().getBackdropProps(),
                            normalizeProps.element(
                                dialogBackdropLayout(api().open),
                            ),
                        ),
                    unstyled: () => scrimProps?.unstyled,
                    props: scrimProps
                        ? // oxlint-disable-next-line solid/reactivity -- an optional slot's props, passed straight to render
                          omit(scrimProps, "unstyled")
                        : {},
                })}
                <div {...positioner()}>
                    <div {...content()}>{props.children}</div>
                </div>
            </>
        );
    }

    /** The component's root, a `<nav>` holding its destinations. Name it with `aria-label`. A
     *  modal rail (`modal`, read once) renders it in a dialog over the scrim. */
    function Root(props: NavigationRootProps<C>): JSX.Element {
        const modal = untrack(
            () => (props as { readonly modal?: boolean | undefined }).modal,
        );
        if (modal) {
            // oxlint-disable-next-line solid/components-return-once -- `modal` is read once at setup (untracked), as documented
            return (
                <Modal own={props}>
                    <Nav {...props} />
                </Modal>
            );
        }
        return <Nav {...props} />;
    }

    function Nav(props: NavigationRootProps<C>): JSX.Element {
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
        const rest = omit(props, "as", ...NAVIGATION_ROOT_PROPS);
        return (
            <context.Provider value={{ scope, api, sources }}>
                {scope.render("root", {
                    element: "nav",
                    as: () => props.as,
                    machine: () => api().getRootProps(),
                    props: rest,
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
        const rest = omit(props, "unstyled", ...NAVIGATION_ITEM_PROPS);
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
                    props: rest,
                })}
            </itemContext.Provider>
        );
    }

    /** The rail's header, above the destinations: its menu button and FAB. */
    function Header(props: NavigationPartProps): JSX.Element {
        const { scope, api } = context.use("Header");
        const rest = omit(props, "unstyled");
        return (
            scope as unknown as ComponentScope<typeof navigationRailAnatomy>
        ).render("header", {
            element: "div",
            machine: () => api().getHeaderProps(),
            unstyled: () => props.unstyled,
            props: rest,
        });
    }

    /** The rail's section label, over a run of destinations: shown while the rail is expanded. */
    function SectionLabel(props: NavigationPartProps): JSX.Element {
        const { scope, api } = context.use("SectionLabel");
        const rest = omit(props, "unstyled");
        return (
            scope as unknown as ComponentScope<typeof navigationRailAnatomy>
        ).render("sectionLabel", {
            element: "div",
            machine: () => api().getSectionLabelProps(),
            unstyled: () => props.unstyled,
            props: rest,
        });
    }

    /** The pill behind the icon, which takes the state layer. */
    function Indicator(props: NavigationPartProps): JSX.Element {
        const { scope } = context.use("Indicator");
        const { source } = itemContext.use("Indicator");
        const rest = omit(props, "unstyled");
        return scope.render("indicator", {
            element: "span",
            interactionSource: source,
            unstyled: () => props.unstyled,
            props: rest,
        });
    }

    /** The fill that grows inside the pill once the destination is current. Empty. */
    function ActiveIndicator(props: NavigationPartProps): JSX.Element {
        const { scope } = context.use("ActiveIndicator");
        itemContext.use("ActiveIndicator");
        const rest = omit(props, "unstyled");
        return scope.render("activeIndicator", {
            element: "span",
            unstyled: () => props.unstyled,
            props: rest,
        });
    }

    /** The destination's icon, hidden from assistive technology; an icon font draws it filled
     *  while the destination is current. */
    function Icon(props: NavigationIconProps): JSX.Element {
        const { scope, api } = context.use("Icon");
        itemContext.use("Icon");
        const rest = omit(props, "unstyled", "mirror");
        return scope.render("icon", {
            element: "span",
            machine: () => api().getIconProps(),
            states: () => ({ mirrored: props.mirror }),
            unstyled: () => props.unstyled,
            props: rest,
        });
    }

    /** The destination's label, which names it. */
    function Label(props: NavigationPartProps): JSX.Element {
        const { scope, api } = context.use("Label");
        itemContext.use("Label");
        const rest = omit(props, "unstyled");
        return scope.render("label", {
            element: "span",
            machine: () => api().getLabelProps(),
            unstyled: () => props.unstyled,
            props: rest,
        });
    }

    // Only the rail has a header.
    const hasHeader = (config.anatomy.partNames as readonly string[]).includes(
        "header",
    );

    const READY_MADE_PROPS = [
        "class",
        "style",
        "slotProps",
        ...NAVIGATION_CONTENT_PROPS,
    ] as const;

    /** A ready-made destination: every part, the icon only when given. */
    function Destination(props: {
        readonly item: Accessor<NavigationItem<JSX.Element>>;
        readonly index: Accessor<number>;
        readonly slots: SlotPropsOf<
            PartName<Anatomy>,
            NavigationInstances<JSX.Element>
        >;
    }): JSX.Element {
        // oxlint-disable-next-line solid/reactivity -- the row's accessor and the slot props function, both fixed for the row
        const { item, slots } = props;
        const { api } = context.use("Item");
        const copy = () => ({
            index: props.index(),
            item: item(),
            selected: api().value === item().value,
        });
        return (
            <Item
                value={item().value}
                href={item().href}
                disabled={item().disabled}
                interactionSource={item().interactionSource}
                {...(slots("item", copy) as object)}
            >
                <Indicator {...slots("indicator", copy)}>
                    <ActiveIndicator {...slots("activeIndicator", copy)} />
                    <Show when={isPresent(item().icon)}>
                        <Icon
                            mirror={item().mirrorIcon}
                            {...slots("icon", copy)}
                        >
                            {item().icon}
                        </Icon>
                    </Show>
                </Indicator>
                <Label {...slots("label", copy)}>{item().label}</Label>
            </Item>
        );
    }

    /** A ready-made destination's section label, when it has one: the rail's only. */
    /** The ready-made component: a destination per item, each with every part in the preset's
     *  structure, the icon only when given. */
    function ReadyMade(props: NavigationProps<C>): JSX.Element {
        const slots = createSlotProps<
            Anatomy,
            NavigationModalPart,
            NavigationInstances<JSX.Element>
        >(props as never);
        const own = omit(props, ...READY_MADE_PROPS) as NavigationRootProps<C>;
        const root = slots("root") as object;
        const header = (slots as (part: string) => object)("header");
        const sectionLabel = (slots as (part: string) => object)(
            "sectionLabel",
        );
        const modal = { scrim: slots("scrim"), dialog: slots("dialog") };
        // The bar ignores `section`: its destinations stay in one run, in order.
        const sections = createMemo(() =>
            hasHeader
                ? navigationSections(props.items ?? [])
                : [{ group: undefined, items: props.items ?? [] }],
        );
        const indexes = createMemo(
            () => new Map((props.items ?? []).map((item, at) => [item, at])),
        );
        return (
            <ModalSlots value={modal}>
                <Root {...own} {...root}>
                    <Show when={hasHeader && isPresent(props.header)}>
                        <Header {...header}>{props.header}</Header>
                    </Show>
                    <For each={sections()} keyed={false}>
                        {(section) => (
                            <>
                                <Show when={section().group}>
                                    {(name) => (
                                        <SectionLabel {...sectionLabel}>
                                            {name()}
                                        </SectionLabel>
                                    )}
                                </Show>
                                <For
                                    each={section().items}
                                    keyed={(
                                        item: NavigationItem<JSX.Element>,
                                    ) => item.value}
                                >
                                    {(item) => (
                                        <Destination
                                            item={item}
                                            index={() =>
                                                indexes().get(item()) ?? 0
                                            }
                                            slots={slots}
                                        />
                                    )}
                                </For>
                            </>
                        )}
                    </For>
                </Root>
            </ModalSlots>
        );
    }

    return {
        ReadyMade,
        parts: {
            Root,
            Header,
            SectionLabel,
            Item,
            Indicator,
            ActiveIndicator,
            Icon,
            Label,
        },
    };
}
