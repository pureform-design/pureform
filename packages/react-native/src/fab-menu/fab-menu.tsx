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
import type { Selection } from "@pureform/styling";
import { useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { useInteractionSource } from "../interaction";
import { Anchored, useAnchor, useDismiss } from "../overlay";
import {
    testIdOf,
    unselectable,
    useControllable,
    useStableCallback,
    withEngine,
} from "../parts";
import { Portal } from "../portal";
import type { WindowRect } from "../portal-host";
import { usePresence } from "../presence";
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

function FabMenuItemImpl(props: {
    readonly item: FabMenuItem<ReactNode>;
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
    return (
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

// The FAB's box when the menu last opened: pending while it's measured, then the box.
type Anchor = { readonly rect: WindowRect | undefined } | undefined;

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
    const [open, setOpen] = useControllable(
        "FabMenu",
        "open",
        props.open,
        props.defaultOpen,
        props.onOpenChange,
        false,
    );
    const source = useInteractionSource();
    const anchor = useAnchor(source);
    const [measured, setMeasured] = useState<Anchor>();
    const presence = usePresence(open, "popup");
    useLayoutEffect(() => {
        if (!open) return;
        let current = true;
        anchor.measure((rect) => current && setMeasured({ rect }));
        return () => {
            current = false;
        };
    }, [open, anchor]);
    if (!presence.present && measured) setMeasured(undefined);
    const close = useStableCallback(() => {
        if (!open) return;
        setOpen(false);
        if (Platform.OS === "web") anchor.focus();
    });
    const toggle = useStableCallback(() => {
        if (open) close();
        else setOpen(true);
    });
    useDismiss(open, close);
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
                                {(props.items ?? []).map((item) => (
                                    <Item
                                        key={item.value}
                                        item={item}
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
