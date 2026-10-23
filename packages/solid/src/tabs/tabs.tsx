// The tabs: Root on Zag's tabs machine, an unstyled element around the tab list and the panels; the
// tab list and its tabs (each a button around its content: an icon, a label, and the active
// indicator), as the preset draws them; a panel per tab; and the ready-made Tabs over them. When
// the selected tab changes, its indicator slides in from the one selected before, and a scrollable
// list scrolls it into view.

import { tabsCompositeAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    TABS_CONTENT_PROPS,
    TABS_LIST_LABEL_PROPS,
    TABS_ROOT_PROPS,
    tabsDefaultValue,
    tabsHaveIcons,
    tabsHavePanels,
    tabsItemProps,
    tabsMachineProps,
    tabsSelection,
    tabsTriggerProps,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    PageKey,
    PageTransitionProps,
    TabsContentProps,
    TabsItem,
    TabsRootOwnProps,
} from "@pureform/binding-core";
import { revealInRow, slideIndicator } from "@pureform/binding-core/dom";
import * as tabs from "@pureform/machines/tabs";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createEffect,
    createMemo,
    createUniqueId,
    For,
    merge,
    omit,
    onCleanup,
    Show,
    untrack,
} from "solid-js";

import { useControllable } from "../controllable";
import { FadeThrough } from "../fade-through/fade-through";
import { HorizontalSharedAxis } from "../horizontal-shared-axis/horizontal-shared-axis";
import { useTransitionPage } from "../page-transition";
import { itemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof tabsCompositeAnatomy;

/** What Root shares with its parts. */
interface TabsContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<tabs.Api<PropTypes>>;
    readonly disabled: Accessor<boolean | undefined>;
    readonly sources: ItemInteractionSources;
    /** Each tab's indicator element, with its tab's value. */
    readonly indicators: Map<Element, Accessor<string>>;
}

/** What a tab shares with its parts. */
interface TabContextValue {
    readonly value: Accessor<string>;
}

const context = createPartContext<TabsContextValue>("Tabs");
const tabContext = createPartContext<TabContextValue>("Tabs", "Tab");

/** Root's props: the variants and tokens, the machine's props (`value`, `activationMode`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface TabsRootProps
    extends Omit<PartProps, keyof TabsRootOwnProps>, TabsRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
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
function Root(props: TabsRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", string | null>(
        "Tabs",
        "value",
        props,
    );
    const sources = itemInteractionSources();
    const service = useMachine(tabs.machine, () => ({
        id,
        ...sources.machineProps,
        dir: dir(),
        ...tabsMachineProps(props),
        ...value.machineProps(),
    }));
    const api = createMemo(() => tabs.connect(service, normalizeProps));
    const scope = useComponent(tabsCompositeAnatomy, {
        selection: () => tabsSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    const indicators = new Map<Element, Accessor<string>>();
    const indicatorOf = (value: string) => {
        for (const [element, of] of indicators) {
            if (of() === value) return element;
        }
        return undefined;
    };
    // The value whose indicator shows: none until mounted, so the first selection doesn't slide.
    let shown: string | null | undefined;
    createEffect(
        () => api().value,
        (value) => {
            const previous = shown;
            shown = value;
            if (previous == null || value == null || previous === value) return;
            untrack(() => {
                slideIndicator(indicatorOf(previous), indicatorOf(value));
                // A scrollable list scrolls the newly selected tab into view.
                if (props.scrollable) {
                    revealInRow(indicatorOf(value)?.closest('[role="tab"]'));
                }
            });
        },
    );
    return (
        <context.Provider
            value={{
                scope,
                api,
                disabled: () => props.disabled,
                sources,
                indicators,
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...TABS_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The tab list: the arrow keys move between its tabs, by direction. Name it with `aria-label`. */
function List(props: TabsPartProps): JSX.Element {
    const { scope, api } = context.use("List");
    return scope.render("list", {
        element: "div",
        machine: () => api().getListProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A tab's content, around its icon, label, and indicator: a primary tab's indicator spans it. */
function TabContent(props: TabsPartProps): JSX.Element {
    const { scope } = context.use("Tab");
    return scope.render("tabContent", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A tab: a button, selected with a click or the arrow keys. Only the selected tab takes focus
 *  from Tab. Its children go in its content, which it renders. */
function Tab(props: TabsTabProps): JSX.Element {
    const { scope, api, disabled, sources } = context.use("Tab");
    const item = () => tabsItemProps(props, disabled());
    const source = sources.item(
        () => props.value,
        () => props.interactionSource,
    );
    return (
        <tabContext.Provider value={{ value: () => props.value }}>
            {scope.render("tab", {
                element: "button",
                interactionSource: source,
                machine: () =>
                    tabsTriggerProps(api().getTriggerProps(item()), {
                        controls: props.controls ?? true,
                    }),
                unstyled: () => props.unstyled,
                props: merge(
                    omit(
                        props,
                        "unstyled",
                        "value",
                        "disabled",
                        "controls",
                        "interactionSource",
                        "tabContentProps",
                        "children",
                    ),
                    {
                        get children() {
                            return (
                                <TabContent {...props.tabContentProps}>
                                    {props.children}
                                </TabContent>
                            );
                        },
                    },
                ),
            })}
        </tabContext.Provider>
    );
}

/** A tab's icon, hidden from assistive technology. Turn on Root's `icon` with it. */
function Icon(props: TabsIconProps): JSX.Element {
    const { scope } = context.use("Icon");
    tabContext.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

/** A tab's label. */
function Label(props: TabsPartProps): JSX.Element {
    const { scope } = context.use("Label");
    tabContext.use("Label");
    return scope.render("label", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The line under a tab, which the CSS shows while it's selected, sliding in from the tab
 *  selected before. Empty. */
function Indicator(props: TabsPartProps): JSX.Element {
    const { scope, indicators } = context.use("Indicator");
    const { value } = tabContext.use("Indicator");
    let element: Element | undefined;
    onCleanup(() => {
        if (element) indicators.delete(element);
    });
    return scope.render("indicator", {
        element: "span",
        ref: (el) => {
            element = el;
            indicators.set(el, value);
        },
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A tab's panel, hidden while its tab isn't selected. The registry doesn't style it. */
function Content(props: TabsContentPartProps): JSX.Element {
    const { scope, api } = context.use("Content");
    // A panel leaving in a page transition stays drawn while it goes.
    const page = useTransitionPage();
    return scope.render("content", {
        element: "div",
        machine: () =>
            page() === "leaving"
                ? {
                      ...api().getContentProps({ value: props.value }),
                      hidden: false,
                  }
                : api().getContentProps({ value: props.value }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "value"),
    });
}

/** The ready-made tabs' props: Root's, with `class`, `style`, and `slotProps` keyed by part, the
 *  tabs as data, and the tab list's name (`aria-label`, `aria-labelledby`). */
export interface TabsProps
    extends
        Omit<TabsRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        TabsContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...TABS_CONTENT_PROPS,
    ...TABS_LIST_LABEL_PROPS,
] as const;

/** The ready-made tabs: the tab list with a tab per item, and a panel per item with `content`.
 *  Without a value, the first enabled tab starts selected. */
function ReadyMade(props: TabsProps): JSX.Element {
    // Read once per change: items written in place make their content (`content`, `icon`) each
    // time they're read.
    const items = createMemo(() => props.items ?? []);
    const panels = createMemo(() => tabsHavePanels(items()));
    const defaultValue = untrack(() => tabsDefaultValue(props, items()));
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as TabsRootProps;
    const root = slots("root") as object;
    const list = slots("list");
    // Views, so every tab reads the same ones.
    const tab = slots("tab") as object;
    const tabContent = slots("tabContent");
    const icon = slots("icon");
    const label = slots("label");
    const indicator = slots("indicator");
    const content = slots("content") as object;
    return (
        <Root
            {...own}
            defaultValue={defaultValue}
            icon={props.icon ?? tabsHaveIcons(items())}
            {...root}
        >
            <List
                aria-label={props["aria-label"]}
                aria-labelledby={props["aria-labelledby"]}
                {...list}
            >
                <For
                    each={items()}
                    keyed={(item: TabsItem<JSX.Element>) => item.value}
                >
                    {(item) => (
                        <Tab
                            value={item().value}
                            disabled={item().disabled}
                            interactionSource={item().interactionSource}
                            aria-label={item()["aria-label"]}
                            controls={panels()}
                            tabContentProps={tabContent}
                            {...tab}
                        >
                            <Show when={isPresent(item().icon)}>
                                <Icon mirror={item().mirrorIcon} {...icon}>
                                    {item().icon}
                                </Icon>
                            </Show>
                            <Show when={isPresent(item().label)}>
                                <Label {...label}>{item().label}</Label>
                            </Show>
                            <Indicator {...indicator} />
                        </Tab>
                    )}
                </For>
            </List>
            <Show
                when={
                    props.transition === "sharedAxis" ||
                    props.transition === "fadeThrough"
                }
                fallback={
                    <For
                        each={items().filter((item) => isPresent(item.content))}
                        keyed={(item: TabsItem<JSX.Element>) => item.value}
                    >
                        {(item) => (
                            <Content value={item().value} {...content}>
                                {item().content}
                            </Content>
                        )}
                    </For>
                }
            >
                <TransitionPanels
                    items={items}
                    transition={() => props.transition}
                    scrim={() => props.transitionScrim}
                    slot={content}
                />
            </Show>
        </Root>
    );
}

// The selected tab's panel in a horizontal shared axis, which slides between the panels in the
// tabs' order, or a fade through.
function TransitionPanels(props: {
    readonly items: Accessor<readonly TabsItem<JSX.Element>[]>;
    readonly transition: Accessor<PageTransitionProps["transition"]>;
    readonly scrim: Accessor<boolean | undefined>;
    readonly slot: object;
}): JSX.Element {
    const { api } = context.use("Content");
    const index = createMemo(() =>
        props.items().findIndex((item) => item.value === api().value),
    );
    const panel = (at: PageKey) => {
        const item = untrack(() => props.items()[Number(at)]);
        return item && isPresent(item.content) ? (
            <Content value={item.value} {...props.slot}>
                {item.content}
            </Content>
        ) : null;
    };
    return (
        <Show
            when={props.transition() === "fadeThrough"}
            fallback={
                <HorizontalSharedAxis index={index()} scrim={props.scrim()}>
                    {(at: number) => panel(at)}
                </HorizontalSharedAxis>
            }
        >
            <FadeThrough value={index()}>
                {(at: PageKey) => panel(at)}
            </FadeThrough>
        </Show>
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
