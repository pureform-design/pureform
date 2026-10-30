// The FAB menu: the FAB, which opens the menu and turns into the close button while it's open, and
// the items, pills stacked over the page above the FAB through the portal host, each rippling when
// pressed. A press outside, the back button or Escape, or picking an item closes it.

import { fabMenuAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { stagger } from "@pureform/animate-react-native";
import {
    fabMenuItemTestId,
    fabMenuPositioning,
    fabMenuSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    FabMenuContentProps,
    FabMenuInstances,
    FabMenuItem,
    FabMenuPart,
    FabMenuVariantProps,
    IndicationProps,
    MenuSelectDetails,
    OverlayPositioning,
} from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import type { Selection } from "@pureform/styling";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { useInteractionSource } from "../interaction";
import { Anchored, useAnchoredOverlay } from "../overlay";
import { testIdOf, useStableCallback, withEngine } from "../parts";
import { Portal } from "../portal";
import { themeSpring, themeSpringRatio, useOverlayPresence } from "../presence";
import { useEngine, usePureform } from "../provider";
import { useNativeSlotReader, withUnselectable } from "../slot-props";
import type { PartSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

// The FAB's and each item's.
const INDICATIONS = Object.fromEntries(
    fabMenuAnatomy.indication!.map((entry) => [entry.trigger, entry]),
);

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface FabMenuHosts {
    readonly item: "Pressable";
    readonly itemIcon: "View";
    readonly itemLabel: "Text";
    readonly closeTrigger: "Pressable";
    readonly root: "View";
    readonly list: "View";
}

export interface FabMenuProps
    extends
        FabMenuVariantProps,
        FabMenuContentProps<ReactNode>,
        IndicationProps,
        NativeSlotProps<FabMenuHosts, FabMenuInstances<ReactNode>> {
    /** Whether the menu is open, controlled when defined. */
    readonly open?: boolean | undefined;
    readonly defaultOpen?: boolean | undefined;
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** Whether picking an item closes the menu. Default true. */
    readonly closeOnSelect?: boolean | undefined;
    /** Where the items open. Default above the FAB, at its end. */
    readonly positioning?: OverlayPositioning | undefined;
    /** An item was picked. */
    readonly onSelect?: ((details: MenuSelectDetails) => void) | undefined;
    /** The menu's name. */
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<FabMenuPart> | undefined;
}

interface Size {
    readonly width: number;
    readonly height: number;
}

// An item is revealed from the menu's aligned edge, as Compose's is: its content is laid out at
// the width it measured, anchored to the end edge, and a wrapper clips it while its width springs
// from nothing to that width (and back). Width is a layout property, so unlike the fade it can't
// run on the native driver. A new target carries on from the width it's at, so toggling mid-reveal
// doesn't jump. Reduced motion, or no spring in the theme, leaves it fully shown for the fade.
function useReveal(
    open: boolean,
    delay: number,
    size: Size | undefined,
): Animated.Value {
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const { timeScale } = usePureform();
    const spring = reducedMotion
        ? undefined
        : themeSpring("spatialFast", tokens, timeScale);
    const progress = useRef(new Animated.Value(spring ? 0 : 1)).current;
    useEffect(() => {
        if (!size) return undefined;
        if (!spring) {
            progress.setValue(1);
            return undefined;
        }
        const run = Animated.sequence([
            Animated.delay(delay * timeScale),
            Animated.spring(progress, {
                toValue: open ? 1 : 0,
                stiffness: spring.stiffness,
                damping: spring.damping,
                mass: spring.mass,
                overshootClamping: true,
                useNativeDriver: false,
            }),
        ]);
        run.start();
        return () => run.stop();
        // The spring's numbers, not the object, which is new each render and would restart it.
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed by the spring's values
    }, [
        open,
        delay,
        size,
        spring?.stiffness,
        spring?.damping,
        spring?.mass,
        timeScale,
        progress,
    ]);
    return progress;
}

function FabMenuItemImpl(props: {
    readonly item: FabMenuItem<ReactNode>;
    readonly index: number;
    /** How long it waits to enter and to leave, in ms: its place in the menu's stagger. */
    readonly enterDelay: number;
    readonly exitDelay: number;
    readonly open: boolean;
    readonly selection: Selection<"fabMenu">;
    readonly indication: Indication | undefined;
    readonly testId: TestIdOverride<FabMenuPart> | undefined;
    readonly slot: PartSlots;
    readonly onSelect: (value: string) => void;
}): ReactNode {
    const { item } = props;
    const indication = useSurfaceIndication(INDICATIONS.item!, {
        indication: props.indication,
        interactionSource: item.interactionSource,
        disabled: item.disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<FabMenuPart>(
        "fabMenu",
        indication.select(props.selection),
        indication.states({
            disabled: item.disabled ?? false,
            ...(item.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const id = (part: FabMenuPart) =>
        fabMenuItemTestId(item, part, props.testId);
    const slot = props.slot;
    const copy =
        slot.each("item") || slot.each("itemIcon") || slot.each("itemLabel")
            ? { index: props.index, item }
            : undefined;
    const engine = useEngine();
    // The fade; the reveal is the wrapper's width.
    const presence = useOverlayPresence(props.open, "fabMenuItem", {
        enter: props.enterDelay,
        exit: props.exitDelay,
    });
    const [size, setSize] = useState<Size>();
    const measure = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((last) =>
            last?.width === width && last.height === height
                ? last
                : { width, height },
        );
    };
    const reveal = useReveal(
        props.open,
        props.open ? props.enterDelay : props.exitDelay,
        size,
    );
    return (
        <engine.View {...presence.props} style={presence.style}>
            <Animated.View
                style={
                    size
                        ? {
                              width: reveal.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, size.width],
                              }),
                              height: size.height,
                              overflow: "hidden",
                          }
                        : undefined
                }
            >
                <View
                    onLayout={measure}
                    style={
                        size
                            ? {
                                  position: "absolute",
                                  top: 0,
                                  end: 0,
                                  width: size.width,
                              }
                            : undefined
                    }
                >
                    <v.item.Pressable
                        {...slot.props("item", copy)}
                        {...slot.with("item", indication.handlers, copy)}
                        role="menuitem"
                        disabled={item.disabled}
                        onPress={slot.on(
                            "item",
                            "onPress",
                            () => props.onSelect(item.value),
                            copy,
                        )}
                        style={slot.style(
                            "item",
                            withUnselectable(s.item),
                            copy,
                        )}
                        testID={id("item")}
                    >
                        {isPresent(item.icon) ? (
                            <v.itemIcon.View
                                {...slot.props("itemIcon", copy)}
                                style={slot.style("itemIcon", s.itemIcon, copy)}
                                testID={id("itemIcon")}
                            >
                                <IconSlot
                                    {...iconSlot(selected, "itemIcon")}
                                    motion={s.itemIcon}
                                >
                                    {item.icon}
                                </IconSlot>
                            </v.itemIcon.View>
                        ) : null}
                        <v.itemLabel.Text
                            {...slot.props("itemLabel", copy)}
                            selectable={false}
                            style={slot.style("itemLabel", s.itemLabel, copy)}
                            testID={id("itemLabel")}
                        >
                            {item.label}
                        </v.itemLabel.Text>
                        {indication.layer(selected)}
                    </v.item.Pressable>
                </View>
            </Animated.View>
        </engine.View>
    );
}

const Item = withEngine(FabMenuItemImpl, "FabMenuItem");

function CloseTriggerImpl(props: {
    readonly menu: FabMenuProps;
    readonly open: boolean;
    readonly source: ReturnType<typeof useInteractionSource>;
    readonly onPress: () => void;
}): ReactNode {
    const nativeSlots = useNativeSlotReader("fabMenu");
    const slot = nativeSlots(props.menu);
    const indication = useSurfaceIndication(INDICATIONS.closeTrigger!, {
        indication: props.menu.indication,
        interactionSource: props.source,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<FabMenuPart>(
        "fabMenu",
        indication.select(fabMenuSelection(props.menu)),
        indication.states(props.open ? { expanded: true } : {}),
    );
    const icon = props.open
        ? isPresent(props.menu.closeIcon)
            ? props.menu.closeIcon
            : "×"
        : props.menu.icon;
    return (
        <v.closeTrigger.Pressable
            {...slot.props("closeTrigger")}
            {...slot.with("closeTrigger", indication.handlers)}
            role="button"
            {...(props.menu.fabLabel === undefined
                ? {}
                : { "aria-label": props.menu.fabLabel })}
            aria-haspopup="menu"
            aria-expanded={props.open}
            onPress={slot.on("closeTrigger", "onPress", props.onPress)}
            style={slot.style("closeTrigger", withUnselectable(s.closeTrigger))}
            testID={testIdOf(fabMenuAnatomy, "closeTrigger", props.menu.testId)}
        >
            <IconSlot
                {...iconSlot(selected, "closeTrigger")}
                motion={s.closeTrigger}
            >
                {icon}
            </IconSlot>
            {indication.layer(selected)}
        </v.closeTrigger.Pressable>
    );
}

const CloseTrigger = withEngine(CloseTriggerImpl, "FabMenuCloseTrigger");

// The list's place above the FAB, which the web's styles give it, is the portal's here.
const PLACING =
    /^(position|top|bottom|left|right|start|end|inset\w*|marginBottom|marginBlockEnd)$/;

const inFlow = (style: Readonly<Record<string, unknown>> | undefined) =>
    Object.fromEntries(
        Object.entries(style ?? {}).filter(([key]) => !PLACING.test(key)),
    );

function FabMenuImpl(props: FabMenuProps): ReactNode {
    const nativeSlots = useNativeSlotReader("fabMenu");
    const engine = useEngine();
    const selection = fabMenuSelection(props);
    const { styles: s, views: v } = useComponentSlots<FabMenuPart>(
        "fabMenu",
        selection,
    );
    const reducedMotion = useReducedMotion();
    const tokens = useTokens();
    const items = props.items ?? [];
    // Each item's wait on the theme's slow effects spring (Compose's menu staggers on it), the
    // one nearest the FAB first when the menu opens and last when it closes. Unscaled: presence
    // and the reveal apply the time scale. The theme without the spring staggers nothing.
    const spring = useMemo(
        () => themeSpringRatio("effectsSlow", tokens),
        [tokens],
    );
    const waits = useMemo(() => {
        const options = {
            count: items.length,
            reducedMotion: reducedMotion || spring === undefined,
            spring: spring ?? {
                type: "spring",
                stiffness: 1,
                damping: 1,
                mass: 1,
            },
        } as const;
        return {
            enter: stagger({ ...options, phase: "enter" }).delays,
            exit: stagger({ ...options, phase: "exit" }).delays,
        };
    }, [items.length, reducedMotion, spring]);
    // The list holds until the last item has left.
    const { open, source, measured, presence, close, toggle } =
        useAnchoredOverlay("FabMenu", props, "fabMenuList", {
            exit: Math.max(0, ...waits.exit),
        });
    const select = useStableCallback((value: string) => {
        props.onSelect?.({ value });
        if (props.closeOnSelect ?? true) close();
    });
    const id = (part: FabMenuPart) =>
        testIdOf(fabMenuAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    return (
        <v.root.View
            {...slot.props("root")}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            {presence.present && measured ? (
                <Portal layer="menu">
                    <Anchored
                        anchor={measured.rect}
                        positioning={fabMenuPositioning(props)}
                        placement="top-end"
                        gutter={8}
                        onPressOutside={close}
                    >
                        {(placed) => (
                            <engine.View
                                {...slot.props("list")}
                                {...slot.with("list", presence.props)}
                                role="menu"
                                {...(props["aria-label"] === undefined
                                    ? {}
                                    : { "aria-label": props["aria-label"] })}
                                style={slot.style("list", {
                                    ...inFlow(s.list),
                                    pointerEvents: open ? "auto" : "none",
                                    ...(placed
                                        ? {
                                              transformOrigin:
                                                  placed.transformOrigin,
                                          }
                                        : {}),
                                    ...presence.style,
                                })}
                                testID={id("list")}
                            >
                                {items.map((item, index) => (
                                    <Item
                                        key={item.value}
                                        item={item}
                                        index={index}
                                        enterDelay={waits.enter[index] ?? 0}
                                        exitDelay={waits.exit[index] ?? 0}
                                        open={open}
                                        selection={selection}
                                        indication={props.indication}
                                        testId={props.testId}
                                        slot={slot}
                                        onSelect={select}
                                    />
                                ))}
                            </engine.View>
                        )}
                    </Anchored>
                </Portal>
            ) : null}
            <CloseTrigger
                menu={props}
                open={open}
                source={source}
                onPress={toggle}
            />
        </v.root.View>
    );
}

/** M3 Expressive's FAB menu: `<FabMenu icon="+" fabLabel="Create" items={[{ value: "message",
 *  label: "Message", icon: "✉" }]} onSelect={…} />`. */
export const FabMenu = withEngine(FabMenuImpl, "FabMenu");
