// The tabs, and the navigation bar and rail: a row (or column) of destinations, each a pressable
// with its icon and label, one of them selected. Tabs draw an indicator under the selected tab; a
// navigation destination fills its active indicator and its icon.

import {
    navigationBarAnatomy,
    navigationRailAnatomy,
    tabsAnatomy,
} from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    navigationSelection,
    tabsHaveIcons,
    tabsSelection,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    IndicationProps,
    NavigationComponent,
    NavigationItem,
    NavigationVariantProps,
    TabsItem,
    TabsVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "./icon-style";
import { useSurfaceIndication } from "./indication";
import { testIdOf, unselectable, useControllable, withEngine } from "./parts";
import { useEngine } from "./provider";
import { useComponentSlots } from "./styles";

type TabsPart = PartName<typeof tabsAnatomy>;
type NavigationPart = PartName<typeof navigationBarAnatomy>;

const [TAB_INDICATION] = tabsAnatomy.indication!;

export interface TabsProps
    extends Omit<TabsVariantProps, "icon">, IndicationProps {
    readonly items: readonly TabsItem<ReactNode>[];
    /** The selected tab's value. Controlled when defined. */
    readonly value?: string | undefined;
    readonly defaultValue?: string | undefined;
    readonly onValueChange?:
        | ((details: ChangeDetails<"value", string>) => void)
        | undefined;
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<TabsPart> | undefined;
}

function TabImpl(props: {
    readonly tabs: TabsProps;
    readonly item: TabsItem<ReactNode>;
    readonly icon: boolean;
    readonly selected: boolean;
    readonly onPress: () => void;
}): ReactNode {
    const { tabs, item } = props;
    const engine = useEngine();
    const indication = useSurfaceIndication(TAB_INDICATION!, {
        indication: tabs.indication,
        interactionSource: item.interactionSource,
        disabled: item.disabled,
    });
    const { styles: s, selected } = useComponentSlots(
        "tabs",
        indication.select(tabsSelection({ ...tabs, icon: props.icon })),
        indication.states({
            selected: props.selected,
            ...(item.disabled ? { disabled: true } : {}),
            ...(item.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const id = (part: TabsPart) => testIdOf(tabsAnatomy, part, tabs.testId);
    return (
        <engine.Pressable
            {...indication.handlers}
            role="tab"
            aria-selected={props.selected}
            disabled={item.disabled}
            onPress={props.onPress}
            style={{ ...s.tab, ...unselectable }}
            testID={id("tab")}
        >
            {isPresent(item.icon) ? (
                <engine.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {item.icon}
                    </IconSlot>
                </engine.View>
            ) : null}
            <engine.Text
                selectable={false}
                style={s.label}
                testID={id("label")}
            >
                {item.label}
            </engine.Text>
            <engine.View
                pointerEvents="none"
                style={s.indicator}
                testID={id("indicator")}
            />
            {indication.layer(selected)}
        </engine.Pressable>
    );
}

const Tab = withEngine(TabImpl, "Tab");

function TabsImpl(props: TabsProps): ReactNode {
    const engine = useEngine();
    const icon = tabsHaveIcons(props.items);
    const [value, setValue] = useControllable(
        "Tabs",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        props.items[0]?.value ?? "",
    );
    const { styles: s } = useComponentSlots(
        "tabs",
        tabsSelection({ ...props, icon }),
    );
    return (
        <engine.View
            role="tablist"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={s.root}
            testID={testIdOf(tabsAnatomy, "root", props.testId)}
        >
            {props.items.map((item) => (
                <Tab
                    key={item.value}
                    tabs={props}
                    item={item}
                    icon={icon}
                    selected={value === item.value}
                    onPress={() => {
                        if (item.value !== value) setValue(item.value);
                    }}
                />
            ))}
        </engine.View>
    );
}

/** Material's tabs: `<Tabs items={[{ value: "mail", label: "Mail" }]} defaultValue="mail" />`.
 *  Panels are the app's: render the one for the value. */
export const Tabs = withEngine(TabsImpl, "Tabs");

export interface NavigationProps<C extends NavigationComponent>
    extends NavigationVariantProps<C>, IndicationProps {
    readonly items: readonly NavigationItem<ReactNode>[];
    /** The current destination's value. Controlled when defined. */
    readonly value?: string | undefined;
    readonly defaultValue?: string | undefined;
    readonly onValueChange?:
        | ((details: ChangeDetails<"value", string>) => void)
        | undefined;
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<NavigationPart> | undefined;
}

const ANATOMIES = {
    navigationBar: navigationBarAnatomy,
    navigationRail: navigationRailAnatomy,
};

function DestinationImpl<C extends NavigationComponent>(props: {
    readonly name: C;
    readonly navigation: NavigationProps<C>;
    readonly item: NavigationItem<ReactNode>;
    readonly selected: boolean;
    readonly onPress: () => void;
}): ReactNode {
    const { name, navigation, item } = props;
    const engine = useEngine();
    const indication = useSurfaceIndication(ANATOMIES[name].indication![0]!, {
        indication: navigation.indication,
        interactionSource: item.interactionSource,
        disabled: item.disabled,
    });
    const { styles: s, selected } = useComponentSlots(
        name,
        indication.select(
            navigationSelection(
                navigation as unknown as NavigationProps<NavigationComponent>,
            ) as Record<string, unknown>,
        ),
        indication.states({
            selected: props.selected,
            ...(item.disabled ? { disabled: true } : {}),
            ...(item.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const id = (part: string) =>
        testIdOf(
            ANATOMIES[name] as typeof navigationBarAnatomy,
            part as NavigationPart,
            navigation.testId as TestIdOverride<NavigationPart>,
        );
    return (
        <engine.Pressable
            {...indication.handlers}
            role="link"
            aria-current={props.selected ? "page" : undefined}
            disabled={item.disabled}
            onPress={props.onPress}
            style={{ ...s.item, ...unselectable }}
            testID={id("item")}
        >
            <engine.View style={s.indicator} testID={id("indicator")}>
                <engine.View
                    pointerEvents="none"
                    style={s.activeIndicator}
                    testID={id("activeIndicator")}
                />
                <engine.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {item.icon}
                    </IconSlot>
                </engine.View>
                {indication.layer(selected)}
            </engine.View>
            <engine.Text
                selectable={false}
                style={s.label}
                testID={id("label")}
            >
                {item.label}
            </engine.Text>
        </engine.Pressable>
    );
}

const Destination = withEngine(DestinationImpl, "NavigationDestination");

function NavigationImpl<C extends NavigationComponent>(
    props: NavigationProps<C> & { readonly name: C },
): ReactNode {
    const engine = useEngine();
    const [value, setValue] = useControllable(
        props.name,
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        props.items[0]?.value ?? "",
    );
    const { styles: s } = useComponentSlots(
        props.name,
        navigationSelection(
            props as unknown as NavigationProps<NavigationComponent>,
        ) as Record<string, unknown>,
    );
    return (
        <engine.View
            role="navigation"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={s.root}
            testID={testIdOf(
                ANATOMIES[props.name] as typeof navigationBarAnatomy,
                "root",
                props.testId as TestIdOverride<NavigationPart>,
            )}
        >
            {props.items.map((item) => (
                <Destination
                    key={item.value}
                    name={props.name}
                    navigation={props as NavigationProps<NavigationComponent>}
                    item={item}
                    selected={value === item.value}
                    onPress={() => {
                        if (item.value !== value) setValue(item.value);
                    }}
                />
            ))}
        </engine.View>
    );
}

const Navigation = withEngine(NavigationImpl, "Navigation") as <
    C extends NavigationComponent,
>(
    props: NavigationProps<C> & { readonly name: C },
) => ReactNode;

export type NavigationBarProps = NavigationProps<"navigationBar">;
export type NavigationRailProps = NavigationProps<"navigationRail">;

/** Material's navigation bar: `<NavigationBar items={destinations} defaultValue="mail" />`. */
export function NavigationBar(props: NavigationBarProps): ReactNode {
    return <Navigation {...props} name="navigationBar" />;
}

/** Material's navigation rail, the bar's form along a side. */
export function NavigationRail(props: NavigationRailProps): ReactNode {
    return <Navigation {...props} name="navigationRail" />;
}
