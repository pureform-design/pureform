// The FAB menu: the FAB, which opens the menu and turns into the close button while it's open, and
// the items, pills stacked over the page above the FAB through the portal host, each rippling when
// pressed. A press outside, the back button or Escape, or picking an item closes it.

import { fabMenuAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    fabMenuMachineProps,
    fabMenuSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    FabMenuContentProps,
    FabMenuItem,
    FabMenuPart,
    FabMenuVariantProps,
    IndicationProps,
    MenuSelectDetails,
    OverlayPositioning,
} from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import { useReducedMotion } from "@pureform/rn-adapter/react";
import type { Selection } from "@pureform/styling";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { useInteractionSource } from "../interaction";
import { Anchored, useAnchoredOverlay } from "../overlay";
import {
    testIdOf,
    unselectable,
    useStableCallback,
    withEngine,
} from "../parts";
import { Portal } from "../portal";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

// The FAB's and each item's.
const INDICATIONS = Object.fromEntries(
    fabMenuAnatomy.indication!.map((entry) => [entry.trigger, entry]),
);

export interface FabMenuProps
    extends
        FabMenuVariantProps,
        FabMenuContentProps<ReactNode>,
        IndicationProps {
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

// The items that stagger, as the preset's `FAB_MENU_STAGGERED`: the rest share the last one's
// wait. Each waits the preset's `FAB_MENU_STAGGER` (25ms) more than the one before it: Compose's
// spring-driven stagger, evenly spaced.
const STAGGERED = 8;

/** How long each item waits after the one before it, in ms. */
const STAGGER = 25;

function FabMenuItemImpl(props: {
    readonly item: FabMenuItem<ReactNode>;
    readonly index: number;
    readonly count: number;
    readonly open: boolean;
    readonly selection: Selection<"fabMenu">;
    readonly indication: Indication | undefined;
    readonly testId: TestIdOverride<FabMenuPart> | undefined;
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
        testIdOf(fabMenuAnatomy, part, props.testId);
    const engine = useEngine();
    const wait = (steps: number) => Math.min(steps, STAGGERED - 1) * STAGGER;
    // The item nearest the FAB (the last) enters first, the farthest leaves first.
    const presence = useOverlayPresence(props.open, "fabMenuItem", {
        enter: wait(props.count - 1 - props.index),
        exit: wait(props.index),
    });
    return (
        <engine.View {...presence.props} style={presence.style}>
            <v.item.Pressable
                {...indication.handlers}
                role="menuitem"
                disabled={item.disabled}
                onPress={() => props.onSelect(item.value)}
                style={{ ...s.item, ...unselectable }}
                testID={id("item")}
            >
                {isPresent(item.icon) ? (
                    <v.itemIcon.View style={s.itemIcon} testID={id("itemIcon")}>
                        <IconSlot
                            {...iconSlot(selected, "itemIcon")}
                            motion={s.itemIcon}
                        >
                            {item.icon}
                        </IconSlot>
                    </v.itemIcon.View>
                ) : null}
                <v.itemLabel.Text
                    selectable={false}
                    style={s.itemLabel}
                    testID={id("itemLabel")}
                >
                    {item.label}
                </v.itemLabel.Text>
                {indication.layer(selected)}
            </v.item.Pressable>
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
            {...indication.handlers}
            role="button"
            {...(props.menu.fabLabel === undefined
                ? {}
                : { "aria-label": props.menu.fabLabel })}
            aria-haspopup="menu"
            aria-expanded={props.open}
            onPress={props.onPress}
            style={{ ...s.closeTrigger, ...unselectable }}
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
    const engine = useEngine();
    const selection = fabMenuSelection(props);
    const { styles: s, views: v } = useComponentSlots<FabMenuPart>(
        "fabMenu",
        selection,
    );
    const reducedMotion = useReducedMotion();
    const items = props.items ?? [];
    // The list holds until the last staggered item has left.
    const { open, source, measured, presence, close, toggle } =
        useAnchoredOverlay("FabMenu", props, "fabMenuList", {
            exit: reducedMotion
                ? 0
                : Math.min(items.length - 1, STAGGERED - 1) * STAGGER,
        });
    const select = useStableCallback((value: string) => {
        props.onSelect?.({ value });
        if (props.closeOnSelect ?? true) close();
    });
    const id = (part: FabMenuPart) =>
        testIdOf(fabMenuAnatomy, part, props.testId);
    return (
        <v.root.View style={s.root} testID={id("root")}>
            {presence.present && measured ? (
                <Portal layer="menu">
                    <Anchored
                        anchor={measured.rect}
                        positioning={fabMenuMachineProps(props).positioning}
                        placement="top-end"
                        gutter={8}
                        onPressOutside={close}
                    >
                        {(placed) => (
                            <engine.View
                                {...presence.props}
                                role="menu"
                                {...(props["aria-label"] === undefined
                                    ? {}
                                    : { "aria-label": props["aria-label"] })}
                                style={{
                                    ...inFlow(s.list),
                                    pointerEvents: open ? "auto" : "none",
                                    ...(placed
                                        ? {
                                              transformOrigin:
                                                  placed.transformOrigin,
                                          }
                                        : {}),
                                    ...presence.style,
                                }}
                                testID={id("list")}
                            >
                                {items.map((item, index) => (
                                    <Item
                                        key={item.value}
                                        item={item}
                                        index={index}
                                        count={items.length}
                                        open={open}
                                        selection={selection}
                                        indication={props.indication}
                                        testId={props.testId}
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
