// The tabs, and the navigation bar and rail: a row (or column) of destinations, each a pressable
// with its icon and label, one of them selected. Tabs wrap them in the tab's content and draw an
// indicator under the selected tab's (across the tab, for secondary tabs), which slides in from the
// tab selected before; a navigation destination fills its active indicator and its icon.

import {
    navigationBarAnatomy,
    navigationRailAnatomy,
    tabsAnatomy,
} from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    navigationSections,
    navigationSelection,
    tabsHaveIcons,
    tabsSelection,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    IndicationProps,
    NavigationComponent,
    NavigationItem,
    NavigationModalProps,
    NavigationVariantProps,
    TabsItem,
    TabsVariantProps,
} from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import type { SlideMotion } from "@pureform/rn-adapter/animated";
import type { Selection } from "@pureform/styling";
import { Fragment, memo, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import type { LayoutChangeEvent, ScrollViewInstance } from "react-native";

import { IconSlot, iconSlot } from "./icon-style";
import { useSurfaceIndication } from "./indication";
import { useLayer } from "./layer";
import { dismissTopOverlay, useDismiss } from "./overlay";
import {
    testIdOf,
    unselectable,
    useControllable,
    useStableCallback,
    useStableSelection,
    withEngine,
} from "./parts";
import { PortalHost } from "./portal-host";
import { useDirection, useEngine } from "./provider";
import { Scrim } from "./single-part";
import { nativeSlots, withUnselectable } from "./slot-props";
import type { PartSlots } from "./slot-props";
import type { NativeSlotProps } from "./slot-props";
import { useComponentSlots } from "./styles";
import { omitSpring, useIndicatorSlides } from "./tab-indicator";
import type { IndicatorSlides } from "./tab-indicator";

type TabsPart = PartName<typeof tabsAnatomy>;
type NavigationPart =
    | PartName<typeof navigationBarAnatomy>
    | "header"
    | "sectionLabel";
type RailPart = PartName<typeof navigationRailAnatomy>;

const [TAB_INDICATION] = tabsAnatomy.indication!;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface TabsHosts {
    readonly root: "View";
    readonly tab: "Pressable";
    readonly tabContent: "View";
    readonly icon: "View";
    readonly label: "Text";
    readonly indicator: "View";
}

export interface TabsProps
    extends
        Omit<TabsVariantProps, "icon">,
        IndicationProps,
        NativeSlotProps<TabsHosts> {
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
    /** The tabs' per-part props. */
    readonly slot: PartSlots;
    readonly item: TabsItem<ReactNode>;
    readonly selection: Selection<"tabs">;
    readonly indication: Indication | undefined;
    readonly testId: TestIdOverride<TabsPart> | undefined;
    readonly selected: boolean;
    readonly onPick: (value: string) => void;
    /** The slide its indicator is drawn with, while it's the latest. */
    readonly slide: SlideMotion | undefined;
    readonly onLayout: IndicatorSlides["onLayout"];
}

const spanOf = (event: LayoutChangeEvent) => ({
    x: event.nativeEvent.layout.x,
    width: event.nativeEvent.layout.width,
});

function TabImpl(props: TabProps): ReactNode {
    const { item } = props;
    const slid = useEngine().useSlide?.(props.slide);
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
    const slot = props.slot;
    return (
        <v.tab.Pressable
            {...slot.props("tab")}
            {...slot.with("tab", indication.handlers)}
            role="tab"
            aria-selected={props.selected}
            {...(item["aria-label"] === undefined
                ? {}
                : { "aria-label": item["aria-label"] })}
            disabled={item.disabled}
            onPress={slot.on("tab", "onPress", () => props.onPick(item.value))}
            onLayout={(event: LayoutChangeEvent) =>
                props.onLayout(item.value, "tab", spanOf(event))
            }
            // A sliding indicator crosses the tabs after its own: its tab draws over them.
            style={slot.style("tab", {
                ...s.tab,
                ...unselectable,
                ...(props.slide ? { zIndex: 1 } : {}),
            })}
            testID={id("tab")}
        >
            <v.tabContent.View
                {...slot.props("tabContent")}
                onLayout={(event: LayoutChangeEvent) =>
                    props.onLayout(item.value, "tabContent", spanOf(event))
                }
                style={slot.style("tabContent", s.tabContent)}
                testID={id("tabContent")}
            >
                {isPresent(item.icon) ? (
                    <v.icon.View
                        {...slot.props("icon")}
                        style={slot.style("icon", s.icon)}
                        testID={id("icon")}
                    >
                        <IconSlot
                            {...iconSlot(selected, "icon")}
                            motion={s.icon}
                        >
                            {item.icon}
                        </IconSlot>
                    </v.icon.View>
                ) : null}
                {isPresent(item.label) ? (
                    <v.label.Text
                        {...slot.props("label")}
                        selectable={false}
                        style={slot.style("label", s.label)}
                        testID={id("label")}
                    >
                        {item.label}
                    </v.label.Text>
                ) : null}
                <v.indicator.View
                    {...slot.props("indicator")}
                    pointerEvents="none"
                    onLayout={(event: LayoutChangeEvent) =>
                        props.onLayout(item.value, "indicator", spanOf(event))
                    }
                    style={slot.style(
                        "indicator",
                        slid ? { ...s.indicator, ...slid } : s.indicator,
                    )}
                    testID={id("indicator")}
                />
            </v.tabContent.View>
            {indication.layer(selected)}
        </v.tab.Pressable>
    );
}

const Tab = memo(withEngine(TabImpl, "Tab"));

function TabsImpl(props: TabsProps): ReactNode {
    const slot = nativeSlots(props);
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
    const {
        styles: s,
        views: v,
        selected,
    } = useComponentSlots<TabsPart>("tabs", selection);
    const engine = useEngine();
    const transform = selected.transitions.indicator?.find(
        (transition) => transition.property === "transform",
    );
    const slides = useIndicatorSlides(
        value,
        engine.slideSpring || !transform?.spring
            ? transform
            : omitSpring(transform),
    );
    // Scrollable tabs scroll in a horizontal view (the adapter drops `overflow: auto`), which
    // brings the selected tab into view, centered where it can be.
    const scroller = useRef<ScrollViewInstance>(null);
    const viewport = useRef(0);
    const spans = useRef(new Map<string, { x: number; width: number }>());
    const scrollable = props.scrollable === true;
    const reveal = useStableCallback((animated: boolean) => {
        const span = spans.current.get(value);
        if (!scrollable || !span) return;
        scroller.current?.scrollTo({
            x: Math.max(0, span.x - (viewport.current - span.width) / 2),
            animated,
        });
    });
    const onLayout: IndicatorSlides["onLayout"] = useStableCallback(
        (...args: Parameters<IndicatorSlides["onLayout"]>) => {
            const [key, part, span] = args;
            slides.onLayout(key, part, span);
            if (part !== "tab") return;
            spans.current.set(key, span);
            if (key === value) reveal(false);
        },
    );
    useEffect(() => reveal(true), [value, reveal]);
    const rtl = useDirection() === "rtl";
    // On the web, as the web's tabs: the arrow keys across (by direction) select the tab before
    // or after, going round, and Home and End the first and last; focus moves with it.
    const onKeyDown = (event: {
        readonly key: string;
        readonly currentTarget: HTMLElement;
        preventDefault(): void;
    }) => {
        const enabled = props.items.filter((item) => !item.disabled);
        const at = enabled.findIndex((item) => item.value === value);
        const forward = rtl ? "ArrowLeft" : "ArrowRight";
        const backward = rtl ? "ArrowRight" : "ArrowLeft";
        const next =
            event.key === forward
                ? enabled[(at + 1) % enabled.length]
                : event.key === backward
                  ? enabled[(at - 1 + enabled.length) % enabled.length]
                  : event.key === "Home"
                    ? enabled[0]
                    : event.key === "End"
                      ? enabled.at(-1)
                      : undefined;
        if (!next) return;
        event.preventDefault();
        pick(next.value);
        const tabs =
            event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs[props.items.indexOf(next)]?.focus();
    };
    const list = (
        <v.root.View
            {...slot.props("root")}
            {...(Platform.OS === "web" ? ({ onKeyDown } as object) : {})}
            role="tablist"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={slot.style("root", s.root)}
            testID={testIdOf(tabsAnatomy, "root", props.testId)}
        >
            {props.items.map((item) => (
                <Tab
                    slot={slot}
                    key={item.value}
                    item={item}
                    selection={selection}
                    indication={props.indication}
                    testId={props.testId}
                    selected={value === item.value}
                    onPick={pick}
                    slide={slides.motionOf(item.value)}
                    onLayout={scrollable ? onLayout : slides.onLayout}
                />
            ))}
        </v.root.View>
    );
    return scrollable ? (
        <ScrollView
            {...slot.props("root")}
            ref={scroller}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={scrollStyles.content}
            onLayout={(event: LayoutChangeEvent) => {
                viewport.current = event.nativeEvent.layout.width;
                reveal(false);
            }}
            testID={testIdOf(tabsAnatomy, "root", props.testId) + "-scroll"}
        >
            {list}
        </ScrollView>
    ) : (
        list
    );
}

const scrollStyles = StyleSheet.create({
    content: { flexGrow: 1 },
});

/** Material's tabs: `<Tabs items={[{ value: "mail", label: "Mail" }]} defaultValue="mail" />`.
 *  Panels are the app's: render the one for the value. */
export const Tabs = withEngine(TabsImpl, "Tabs");

/** What each part of a navigation bar or rail renders as, for its keyed `style` and
 *  `slotProps`. */
export interface NavigationHosts {
    readonly root: "View";
    readonly header: "View";
    readonly item: "Pressable";
    readonly activeIndicator: "View";
    readonly icon: "View";
    readonly label: "Text";
    readonly sectionLabel: "Text";
}

export interface NavigationProps<C extends NavigationComponent>
    extends
        NavigationVariantProps<C>,
        NavigationModalProps,
        IndicationProps,
        NativeSlotProps<NavigationHosts> {
    readonly items: readonly NavigationItem<ReactNode>[];
    /** The rail's header, above the destinations: a menu button and a FAB, say. */
    readonly header?: ReactNode;
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
    /** The bar's or rail's per-part props. */
    readonly slot: PartSlots;
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
            part as PartName<typeof navigationBarAnatomy>,
            props.testId,
        );
    const slot = props.slot;
    return (
        <v.item.Pressable
            {...slot.props("item")}
            {...slot.with("item", indication.handlers)}
            // A button, as the web's destination without an `href`: React Native's have none.
            role="button"
            aria-current={props.selected ? "page" : undefined}
            disabled={disabled}
            onPress={slot.on("item", "onPress", () => props.onPick(item.value))}
            style={slot.style("item", withUnselectable(s.item))}
            testID={id("item")}
        >
            <v.indicator.View
                {...slot.props("indicator")}
                style={slot.style("indicator", s.indicator)}
                testID={id("indicator")}
            >
                <v.activeIndicator.View
                    {...slot.props("activeIndicator")}
                    pointerEvents="none"
                    style={slot.style("activeIndicator", s.activeIndicator)}
                    testID={id("activeIndicator")}
                />
                <v.icon.View
                    {...slot.props("icon")}
                    style={slot.style("icon", s.icon)}
                    testID={id("icon")}
                >
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {item.icon}
                    </IconSlot>
                </v.icon.View>
                {indication.layer(selected)}
            </v.indicator.View>
            <v.label.Text
                {...slot.props("label")}
                selectable={false}
                style={slot.style("label", s.label)}
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
    const slot = nativeSlots(props);
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
            {...slot.props("root")}
            role="navigation"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={slot.style("root", s.root)}
            testID={testIdOf(
                ANATOMIES[props.name] as typeof navigationBarAnatomy,
                "root",
                props.testId as TestIdOverride<NavigationPart>,
            )}
        >
            {props.name === "navigationRail" && isPresent(props.header) ? (
                <v.header.View
                    {...slot.props("header")}
                    style={slot.style("header", s.header)}
                    testID={testIdOf(
                        navigationRailAnatomy,
                        "header",
                        props.testId as TestIdOverride<RailPart>,
                    )}
                >
                    {props.header}
                </v.header.View>
            ) : null}
            {(props.name === "navigationRail"
                ? navigationSections(props.items)
                : [{ group: undefined, items: props.items }]
            ).map((section, index) => (
                <Fragment key={section.group ?? `#${index}`}>
                    {section.group === undefined ? null : (
                        <v.sectionLabel.Text
                            {...slot.props("sectionLabel")}
                            selectable={false}
                            style={slot.style("sectionLabel", s.sectionLabel)}
                            testID={testIdOf(
                                navigationRailAnatomy,
                                "sectionLabel",
                                props.testId as TestIdOverride<RailPart>,
                            )}
                        >
                            {section.group}
                        </v.sectionLabel.Text>
                    )}
                    {section.items.map((item) => (
                        <Destination
                            slot={slot}
                            key={item.value}
                            name={props.name}
                            item={item}
                            selection={selection}
                            indication={props.indication}
                            testId={
                                props.testId as TestIdOverride<NavigationPart>
                            }
                            disabled={props.disabled === true}
                            selected={value === item.value}
                            onPick={pick}
                        />
                    ))}
                </Fragment>
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

/** A modal rail: the scrim, and the rail over it along the start edge, while `open`. A press on
 *  the scrim, Escape, or the back button closes it. */
function ModalRail(props: NavigationRailProps): ReactNode {
    const {
        open: _open,
        defaultOpen,
        onOpenChange,
        closeOnEscape = true,
        closeOnInteractOutside = true,
        ...rail
    } = props;
    const [open, setOpen] = useControllable(
        "NavigationRail",
        "open",
        props.open,
        defaultOpen,
        onOpenChange,
        false,
    );
    const layer = useLayer("dialog");
    const close = useStableCallback(() => {
        if (open) setOpen(false);
    });
    useDismiss(open, () => {
        if (closeOnEscape) close();
    });
    return (
        <Modal
            transparent
            visible={open}
            animationType="none"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => {
                dismissTopOverlay();
            }}
        >
            <PortalHost>
                <View style={StyleSheet.absoluteFill}>
                    <Scrim open={open} />
                    <Pressable
                        accessible={false}
                        focusable={false}
                        style={StyleSheet.absoluteFill}
                        {...(closeOnInteractOutside ? { onPress: close } : {})}
                    />
                    <View
                        pointerEvents="box-none"
                        aria-modal
                        role="dialog"
                        style={[modalStyles.positioner, { zIndex: layer }]}
                    >
                        <Navigation {...rail} name="navigationRail" />
                    </View>
                </View>
            </PortalHost>
        </Modal>
    );
}

const modalStyles = StyleSheet.create({
    positioner: {
        position: "absolute",
        top: 0,
        bottom: 0,
        start: 0,
        flexDirection: "row",
    },
});

/** Material's navigation rail, the bar's form along a side. `expanded` puts each label beside
 *  its icon; `modal` draws it over the page on a scrim while `open`. */
export function NavigationRail(props: NavigationRailProps): ReactNode {
    if (props.modal) return <ModalRail {...props} />;
    return <Navigation {...props} name="navigationRail" />;
}
