// The tabs: Root on Zag's tabs machine, an unstyled element around the tab list and the panels; the
// tab list and its tabs (each a button around its content: an icon, a label, and the active
// indicator), as the preset draws them; a panel per tab; and the ready-made Tabs over them. When
// the selected tab changes, its indicator slides in from the one selected before, and a scrollable
// list scrolls it into view.

import { tabsCompositeAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    isPresent,
    TABS_ROOT_PROPS,
    tabsDefaultValue,
    tabsHaveIcons,
    tabsHavePanels,
    tabsItemProps,
    tabsSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    TabsContentProps,
    TabsInstances,
    TabsItem,
    TabsRootOwnProps,
    TabsTabInstance,
} from "@pureform/binding-core";
import { tabsMachineProps, tabsTriggerProps } from "@pureform/binding-web";
import { revealInRow, slideIndicator } from "@pureform/binding-web";
import * as tabs from "@pureform/machines/tabs";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    type ReactNode,
    useCallback,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { useControllable } from "../controllable";
import { FadeThrough } from "../fade-through/fade-through";
import type { FadeThroughProps } from "../fade-through/fade-through";
import { HorizontalSharedAxis } from "../horizontal-shared-axis/horizontal-shared-axis";
import type { HorizontalSharedAxisProps } from "../horizontal-shared-axis/horizontal-shared-axis";
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { useTransitionPage } from "../page-transition";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps, SlotPropsOf } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof tabsCompositeAnatomy;

/** What Root shares with its parts. */
interface TabsContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: tabs.Api<PropTypes>;
    readonly disabled: boolean | undefined;
    readonly sources: ItemInteractionSources;
    /** Each tab's indicator element, with its tab's value. */
    readonly indicators: Map<Element, string>;
}

/** What a tab shares with its parts. */
interface TabContextValue {
    readonly value: string;
}

const context = createPartContext<TabsContextValue>("Tabs");
const tabContext = createPartContext<TabContextValue>("Tabs", "Tab");

/** Root's props: the variants and tokens, the machine's props (`value`, `activationMode`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface TabsRootProps
    extends Omit<PartProps, keyof TabsRootOwnProps>, TabsRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface TabsPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The icon's props: a part's, and `mirror` to flip it under `rtl`. */
export interface TabsIconProps extends TabsPartProps {
    readonly mirror?: boolean | undefined;
}

/** A tab's props: its value, `disabled`, and a part's. */
export interface TabsTabProps extends TabsPartProps, InteractionSourceProps {
    readonly value: string;
    readonly disabled?: boolean | undefined;
    /** The props of the tab's content, the element the tab wraps its children in. */
    readonly tabContentProps?: TabsPartProps | undefined;
    /** Whether the tab names its panel (`Tabs.Content` with its value) in `aria-controls`. Turn
     *  it off for tabs that switch something else. @default true */
    readonly controls?: boolean | undefined;
}

/** A panel's props: the value of the tab that shows it, and a part's. */
export interface TabsContentPartProps extends TabsPartProps {
    readonly value: string;
}

/** The tabs' root, a `<div>` around the tab list and the panels. The registry doesn't style it. */
function Root(props: TabsRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", string | null>(
        "Tabs",
        "value",
        props,
    );
    const sources = useItemInteractionSources();
    const service = useMachine(tabs.machine, {
        id,
        ...sources.machineProps,
        dir,
        ...tabsMachineProps(props),
        ...value.machineProps,
    });
    const api = tabs.connect(service, normalizeProps);
    const scope = useComponent(tabsCompositeAnatomy, {
        selection: tabsSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const [indicators] = useState(() => new Map<Element, string>());
    // The value whose indicator shows: none until mounted, so the first selection doesn't slide.
    const shown = useRef<string | null | undefined>(undefined);
    const scrollable = !!props.scrollable;
    useLayoutEffect(() => {
        const previous = shown.current;
        const value = api.value;
        shown.current = value;
        if (previous == null || value == null || previous === value) return;
        const indicatorOf = (of: string) => {
            for (const [element, tab] of indicators) {
                if (tab === of) return element;
            }
            return undefined;
        };
        slideIndicator(indicatorOf(previous), indicatorOf(value));
        // A scrollable list scrolls the newly selected tab into view.
        if (scrollable) {
            revealInRow(indicatorOf(value)?.closest('[role="tab"]'));
        }
    }, [api.value, indicators, scrollable]);
    const { as, ...rest } = omitProps(props, TABS_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                api,
                disabled: props.disabled,
                sources,
                indicators,
            }}
        >
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

/** The tab list: the arrow keys move between its tabs, by direction. Name it with `aria-label`. */
function List({ unstyled, ...props }: TabsPartProps): ReactNode {
    const { scope, api } = context.use("List");
    return scope.render("list", {
        element: "div",
        machine: api.getListProps(),
        unstyled,
        props,
    });
}

/** A tab's content, around its icon, label, and indicator: a primary tab's indicator spans it. */
function TabContent({ unstyled, ...props }: TabsPartProps): ReactNode {
    const { scope } = context.use("Tab");
    return scope.render("tabContent", { element: "span", unstyled, props });
}

/** A tab: a button, selected with a click or the arrow keys. Only the selected tab takes focus
 *  from Tab. Its children go in its content, which it renders. */
function Tab({
    unstyled,
    value,
    disabled,
    controls = true,
    interactionSource,
    tabContentProps,
    children,
    ...props
}: TabsTabProps): ReactNode {
    const { scope, api, disabled: tabsDisabled, sources } = context.use("Tab");
    const source = sources.item(value, interactionSource);
    const item = tabsItemProps({ value, disabled }, tabsDisabled);
    return (
        <tabContext.Provider value={{ value }}>
            {scope.render("tab", {
                element: "button",
                interactionSource: source,
                machine: tabsTriggerProps(api.getTriggerProps(item), {
                    controls,
                }),
                unstyled,
                props: {
                    ...props,
                    children: (
                        <TabContent {...tabContentProps}>{children}</TabContent>
                    ),
                },
            })}
        </tabContext.Provider>
    );
}

/** A tab's icon, hidden from assistive technology. Turn on Root's `icon` with it. */
function Icon({ unstyled, mirror, ...props }: TabsIconProps): ReactNode {
    const { scope } = context.use("Icon");
    tabContext.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** A tab's label. */
function Label({ unstyled, ...props }: TabsPartProps): ReactNode {
    const { scope } = context.use("Label");
    tabContext.use("Label");
    return scope.render("label", { element: "span", unstyled, props });
}

/** The line under a tab, which the CSS shows while it's selected, sliding in from the tab
 *  selected before. Empty. */
function Indicator({ unstyled, ...props }: TabsPartProps): ReactNode {
    const { scope, indicators } = context.use("Indicator");
    const { value } = tabContext.use("Indicator");
    // oxlint-disable-next-line react/preserve-manual-memoization -- the package isn't built with React Compiler; this callback ref is memoized by hand
    const ref = useCallback(
        (element: HTMLElement | null) => {
            if (!element) return;
            indicators.set(element, value);
            return () => {
                indicators.delete(element);
            };
        },
        // oxlint-disable-next-line react/preserve-manual-memoization -- the package isn't built with React Compiler; this callback ref is memoized by hand
        [indicators, value],
    );
    return scope.render("indicator", {
        element: "span",
        ref,
        unstyled,
        props,
    });
}

/** A tab's panel, hidden while its tab isn't selected. The registry doesn't style it. */
function Content({
    unstyled,
    value,
    ...props
}: TabsContentPartProps): ReactNode {
    const { scope, api } = context.use("Content");
    // A panel leaving in a page transition stays drawn while it goes.
    const leaving = useTransitionPage() === "leaving";
    return scope.render("content", {
        element: "div",
        machine: leaving
            ? { ...api.getContentProps({ value }), hidden: false }
            : api.getContentProps({ value }),
        unstyled,
        props,
    });
}

/** The ready-made tabs' props: Root's, with `className`, `style`, `slotProps` and `unstyled`
 *  keyed by part (a tab's parts and its panel also by tab, `TabsTabInstance`), the tabs as data,
 *  and the tab list's name (`aria-label`, `aria-labelledby`). */
export interface TabsProps
    extends
        Omit<TabsRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy, never, TabsInstances<ReactNode>>,
        TabsContentProps<ReactNode> {
    /** The fade through's own props, for `transition="fadeThrough"`. */
    readonly fadeThroughProps?:
        | Omit<FadeThroughProps, "value" | "children">
        | undefined;
    /** The shared axis's own props, for `transition="sharedAxis"`. */
    readonly horizontalSharedAxisProps?:
        | Omit<HorizontalSharedAxisProps, "index" | "scrim" | "children">
        | undefined;
}

type Slot = SlotPropsOf<PartName<Anatomy>, TabsInstances<ReactNode>>;

const TAB_PARTS = [
    "tab",
    "tabContent",
    "icon",
    "label",
    "indicator",
    "content",
] as const;

/** The ready-made tabs: the tab list with a tab per item, and a panel per item with `content`.
 *  Without a value, the first enabled tab starts selected. */
function ReadyMade(props: TabsProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        items = [],
        "aria-label": _label,
        "aria-labelledby": _labelledBy,
        transition: _transition,
        transitionScrim: _transitionScrim,
        fadeThroughProps: _fadeThroughProps,
        horizontalSharedAxisProps: _horizontalSharedAxisProps,
        ...rootProps
    } = props;
    const slot = useSlotProps<Anatomy, never, TabsInstances<ReactNode>>(props);
    // Read once, as the default is.
    const [defaultValue] = useState(() => tabsDefaultValue(props, items));
    return (
        <Root
            {...rootProps}
            defaultValue={defaultValue}
            icon={props.icon ?? tabsHaveIcons(items)}
            {...(slot("root") as object)}
        >
            <ReadyMadeTabs {...props} items={items} slotOf={slot} />
        </Root>
    );
}

// The ready-made's list and panels, under Root, which knows the selected tab.
function ReadyMadeTabs(
    props: TabsProps & {
        readonly items: readonly TabsItem<ReactNode>[];
        readonly slotOf: Slot;
    },
): ReactNode {
    const { api } = context.use("Tabs");
    const { items, slotOf: slot, transition } = props;
    const panels = tabsHavePanels(items);
    const each = TAB_PARTS.some((part) => slot.each(part));
    const tabs = items.map(
        (item, index): TabsTabInstance<ReactNode> | undefined =>
            each
                ? { index, item, selected: item.value === api.value }
                : undefined,
    );
    return (
        <>
            <List
                aria-label={props["aria-label"]}
                aria-labelledby={props["aria-labelledby"]}
                {...slot("list")}
            >
                {items.map((item, index) => {
                    const tab = tabs[index];
                    return (
                        <Tab
                            key={item.value}
                            value={item.value}
                            disabled={item.disabled}
                            interactionSource={item.interactionSource}
                            aria-label={item["aria-label"]}
                            controls={panels}
                            tabContentProps={slot("tabContent", tab)}
                            {...slot("tab", tab)}
                        >
                            {isPresent(item.icon) ? (
                                <Icon
                                    mirror={item.mirrorIcon}
                                    {...slot("icon", tab)}
                                >
                                    {item.icon}
                                </Icon>
                            ) : null}
                            {isPresent(item.label) ? (
                                <Label {...slot("label", tab)}>
                                    {item.label}
                                </Label>
                            ) : null}
                            <Indicator {...slot("indicator", tab)} />
                        </Tab>
                    );
                })}
            </List>
            {transition === "sharedAxis" || transition === "fadeThrough" ? (
                <TransitionPanels
                    items={items}
                    transition={transition}
                    scrim={props.transitionScrim}
                    fadeThroughProps={props.fadeThroughProps}
                    sharedAxisProps={props.horizontalSharedAxisProps}
                    panel={(index) => slot("content", tabs[index])}
                />
            ) : (
                items.map((item, index) =>
                    isPresent(item.content) ? (
                        <Content
                            key={item.value}
                            value={item.value}
                            {...slot("content", tabs[index])}
                        >
                            {item.content}
                        </Content>
                    ) : null,
                )
            )}
        </>
    );
}

// The selected tab's panel in a horizontal shared axis, which slides between the panels in the
// tabs' order, or a fade through.
function TransitionPanels(props: {
    readonly items: readonly TabsItem<ReactNode>[];
    readonly transition: "sharedAxis" | "fadeThrough";
    readonly scrim: boolean | undefined;
    readonly fadeThroughProps: TabsProps["fadeThroughProps"];
    readonly sharedAxisProps: TabsProps["horizontalSharedAxisProps"];
    readonly panel: (index: number) => object;
}): ReactNode {
    const { api } = context.use("Content");
    const index = props.items.findIndex((item) => item.value === api.value);
    const item = props.items[index];
    const panel =
        item && isPresent(item.content) ? (
            <Content value={item.value} {...props.panel(index)}>
                {item.content}
            </Content>
        ) : null;
    return props.transition === "fadeThrough" ? (
        <FadeThrough {...props.fadeThroughProps} value={index}>
            {panel}
        </FadeThrough>
    ) : (
        <HorizontalSharedAxis
            {...props.sharedAxisProps}
            index={index}
            scrim={props.scrim}
        >
            {panel}
        </HorizontalSharedAxis>
    );
}

/** Material's tabs. Use them ready-made, `<Tabs aria-label="Trips" items={[{ value: "flights",
 *  label: "Flights", content: … }, …]} />`, or compose their parts under `Tabs.Root`: `List`
 *  holding a `Tab` per tab, each with `Icon`, `Label`, and `Indicator` (which the tab wraps in its
 *  content), then a `Content` per panel. */
export const Tabs = Object.assign(ReadyMade, {
    Root,
    List,
    Tab,
    Icon,
    Label,
    Indicator,
    Content,
});
