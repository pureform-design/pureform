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
import type { Indication } from "@pureform/binding-core/indication";
import type { Selection } from "@pureform/styling";
import { memo } from "react";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "./icon-style";
import { useSurfaceIndication } from "./indication";
import {
    testIdOf,
    unselectable,
    useControllable,
    useStableCallback,
    useStableSelection,
    withEngine,
} from "./parts";
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

// A row gets only what it reads, each stable while the tabs render with the same props, so a row
// renders again when its item or selection changes, not with every render of the tabs.
interface TabProps {
    readonly item: TabsItem<ReactNode>;
    readonly selection: Selection<"tabs">;
    readonly indication: Indication | undefined;
    readonly testId: TestIdOverride<TabsPart> | undefined;
    readonly selected: boolean;
    readonly onPick: (value: string) => void;
}

function TabImpl(props: TabProps): ReactNode {
    const { item } = props;
    const indication = useSurfaceIndication(TAB_INDICATION!, {
        indication: props.indication,
        interactionSource: item.interactionSource,
        disabled: item.disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<TabsPart>(
        "tabs",
        indication.select(props.selection),
        indication.states({
            selected: props.selected,
            ...(item.disabled ? { disabled: true } : {}),
            ...(item.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const id = (part: TabsPart) => testIdOf(tabsAnatomy, part, props.testId);
    return (
        <v.tab.Pressable
            {...indication.handlers}
            role="tab"
            aria-selected={props.selected}
            disabled={item.disabled}
            onPress={() => props.onPick(item.value)}
            style={{ ...s.tab, ...unselectable }}
            testID={id("tab")}
        >
            {isPresent(item.icon) ? (
                <v.icon.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {item.icon}
                    </IconSlot>
                </v.icon.View>
            ) : null}
            <v.label.Text
                selectable={false}
                style={s.label}
                testID={id("label")}
            >
                {item.label}
            </v.label.Text>
            <v.indicator.View
                pointerEvents="none"
                style={s.indicator}
                testID={id("indicator")}
            />
            {indication.layer(selected)}
        </v.tab.Pressable>
    );
}

const Tab = memo(withEngine(TabImpl, "Tab"));

function TabsImpl(props: TabsProps): ReactNode {
    const icon = tabsHaveIcons(props.items);
    const [value, setValue] = useControllable(
        "Tabs",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        props.items[0]?.value ?? "",
    );
    const selection = useStableSelection(tabsSelection({ ...props, icon }));
    const pick = useStableCallback((next: string) => {
        if (next !== value) setValue(next);
    });
    const { styles: s, views: v } = useComponentSlots<TabsPart>(
        "tabs",
        selection,
    );
    return (
        <v.root.View
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
                    item={item}
                    selection={selection}
                    indication={props.indication}
                    testId={props.testId}
                    selected={value === item.value}
                    onPick={pick}
                />
            ))}
        </v.root.View>
    );
}

/** Material's tabs: `<Tabs items={[{ value: "mail", label: "Mail" }]} defaultValue="mail" />`.
 *  Panels are the app's: render the one for the value. */
export const Tabs = withEngine(TabsImpl, "Tabs");

export interface NavigationProps<C extends NavigationComponent>
    extends NavigationVariantProps<C>, IndicationProps {
    readonly items: readonly NavigationItem<ReactNode>[];
    /** Disables every destination. */
    readonly disabled?: boolean | undefined;
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

// A destination gets only what it reads, as a tab does.
interface DestinationProps {
    readonly name: NavigationComponent;
    readonly item: NavigationItem<ReactNode>;
    readonly selection: Record<string, unknown>;
    readonly indication: Indication | undefined;
    readonly testId: TestIdOverride<NavigationPart> | undefined;
    /** Every destination is disabled. */
    readonly disabled: boolean;
    readonly selected: boolean;
    readonly onPick: (value: string) => void;
}

function DestinationImpl(props: DestinationProps): ReactNode {
    const { name, item } = props;
    const disabled = item.disabled === true || props.disabled;
    const indication = useSurfaceIndication(ANATOMIES[name].indication![0]!, {
        indication: props.indication,
        interactionSource: item.interactionSource,
        disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<NavigationPart>(
        name,
        indication.select(props.selection),
        indication.states({
            selected: props.selected,
            ...(disabled ? { disabled: true } : {}),
            ...(item.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const id = (part: string) =>
        testIdOf(
            ANATOMIES[name] as typeof navigationBarAnatomy,
            part as NavigationPart,
            props.testId,
        );
    return (
        <v.item.Pressable
            {...indication.handlers}
            role="link"
            aria-current={props.selected ? "page" : undefined}
            disabled={disabled}
            onPress={() => props.onPick(item.value)}
            style={{ ...s.item, ...unselectable }}
            testID={id("item")}
        >
            <v.indicator.View style={s.indicator} testID={id("indicator")}>
                <v.activeIndicator.View
                    pointerEvents="none"
                    style={s.activeIndicator}
                    testID={id("activeIndicator")}
                />
                <v.icon.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {item.icon}
                    </IconSlot>
                </v.icon.View>
                {indication.layer(selected)}
            </v.indicator.View>
            <v.label.Text
                selectable={false}
                style={s.label}
                testID={id("label")}
            >
                {item.label}
            </v.label.Text>
        </v.item.Pressable>
    );
}

const Destination = memo(withEngine(DestinationImpl, "NavigationDestination"));

function NavigationImpl<C extends NavigationComponent>(
    props: NavigationProps<C> & { readonly name: C },
): ReactNode {
    const [value, setValue] = useControllable(
        props.name,
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        props.items[0]?.value ?? "",
    );
    const selection = useStableSelection(
        navigationSelection(
            props as unknown as NavigationProps<NavigationComponent>,
        ) as Record<string, unknown>,
    );
    const pick = useStableCallback((next: string) => {
        if (next !== value) setValue(next);
    });
    const { styles: s, views: v } = useComponentSlots<NavigationPart>(
        props.name,
        selection,
    );
    return (
        <v.root.View
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
                    item={item}
                    selection={selection}
                    indication={props.indication}
                    testId={props.testId as TestIdOverride<NavigationPart>}
                    disabled={props.disabled === true}
                    selected={value === item.value}
                    onPick={pick}
                />
            ))}
        </v.root.View>
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
