// The tabs: Root on Zag's tabs machine, an unstyled element around the tab list and the panels; the
// tab list and its tabs (each a button with an icon, a label, and the active indicator), as the
// preset draws them; a panel per tab; and the ready-made Tabs over them.

import { tabsCompositeAnatomy } from "@pureform/anatomy";
import {
    isPresent,
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
    TabsContentProps,
    TabsRootOwnProps,
} from "@pureform/binding-core";
import * as tabs from "@pureform/machines/tabs";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId, useState } from "react";

import { useControllable } from "../controllable";
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
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
    const { as, ...rest } = omitProps(props, TABS_ROOT_PROPS);
    return (
        <context.Provider
            value={{ scope, api, disabled: props.disabled, sources }}
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

/** A tab: a button, selected with a click or the arrow keys. Only the selected tab takes focus
 *  from Tab. */
function Tab({
    unstyled,
    value,
    disabled,
    controls = true,
    interactionSource,
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
                props,
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

/** The line under a tab, which the CSS shows while it's selected. Empty. */
function Indicator({ unstyled, ...props }: TabsPartProps): ReactNode {
    const { scope } = context.use("Indicator");
    tabContext.use("Indicator");
    return scope.render("indicator", { element: "span", unstyled, props });
}

/** A tab's panel, hidden while its tab isn't selected. The registry doesn't style it. */
function Content({
    unstyled,
    value,
    ...props
}: TabsContentPartProps): ReactNode {
    const { scope, api } = context.use("Content");
    return scope.render("content", {
        element: "div",
        machine: api.getContentProps({ value }),
        unstyled,
        props,
    });
}

/** The ready-made tabs' props: Root's, with `className`, `style`, and `slotProps` keyed by part,
 *  the tabs as data, and the tab list's name (`aria-label`, `aria-labelledby`). */
export interface TabsProps
    extends
        Omit<TabsRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        TabsContentProps<ReactNode> {}

/** The ready-made tabs: the tab list with a tab per item, and a panel per item with `content`.
 *  Without a value, the first enabled tab starts selected. */
function ReadyMade(props: TabsProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        items = [],
        "aria-label": label,
        "aria-labelledby": labelledBy,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    // Read once, as the default is.
    const [defaultValue] = useState(() => tabsDefaultValue(props, items));
    const panels = tabsHavePanels(items);
    return (
        <Root
            {...rootProps}
            defaultValue={defaultValue}
            icon={props.icon ?? tabsHaveIcons(items)}
            {...(slot("root") as object)}
        >
            <List
                aria-label={label}
                aria-labelledby={labelledBy}
                {...slot("list")}
            >
                {items.map((item) => (
                    <Tab
                        key={item.value}
                        value={item.value}
                        disabled={item.disabled}
                        interactionSource={item.interactionSource}
                        controls={panels}
                        {...slot("tab")}
                    >
                        {isPresent(item.icon) ? (
                            <Icon mirror={item.mirrorIcon} {...slot("icon")}>
                                {item.icon}
                            </Icon>
                        ) : null}
                        <Label {...slot("label")}>{item.label}</Label>
                        <Indicator {...slot("indicator")} />
                    </Tab>
                ))}
            </List>
            {items
                .filter((item) => isPresent(item.content))
                .map((item) => (
                    <Content
                        key={item.value}
                        value={item.value}
                        {...slot("content")}
                    >
                        {item.content}
                    </Content>
                ))}
        </Root>
    );
}

/** Material's tabs. Use them ready-made, `<Tabs aria-label="Trips" items={[{ value: "flights",
 *  label: "Flights", content: … }, …]} />`, or compose their parts under `Tabs.Root`: `List`
 *  holding a `Tab` per tab, each with `Icon`, `Label`, and `Indicator`, then a `Content` per
 *  panel. */
export const Tabs = Object.assign(ReadyMade, {
    Root,
    List,
    Tab,
    Icon,
    Label,
    Indicator,
    Content,
});
