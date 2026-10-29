// The toolbar: a bar the registry styles, holding an icon button per element with an icon and a
// text button per element without. With `overflow`, the bar sits in a row as wide as its parent,
// which it measures, and the elements that don't fit move into the menu behind an overflow button.

import { toolbarAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    overflowCount,
    TOOLBAR_OVERFLOW_LABEL,
    toolbarMenuItems,
    toolbarMenuPositioning,
    toolbarMenuSelect,
    toolbarOverflowTestId,
    toolbarSelection,
    providedTokensFromPaths,
} from "@pureform/binding-core";
import type {
    ToolbarContentProps,
    ToolbarItem,
    ToolbarPart,
    ToolbarRootOwnProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";
import { Fragment, useRef, useState } from "react";
import type { LayoutChangeEvent, ViewStyle } from "react-native";
import { View } from "react-native";

import { Button } from "../button/button";
import type { ButtonProps } from "../button/button";
import { overDefaults } from "../defaults";
import { IconButton } from "../icon-button/icon-button";
import type { IconButtonProps } from "../icon-button/icon-button";
import { Menu } from "../menu";
import type { MenuProps, MenuTriggerProps } from "../menu";
import { testIdOf, withEngine } from "../parts";
import { ProvidedTokens } from "../provided-tokens";
import { nativeSlots } from "../slot-props";
import type { InnerPropsOf, NativeSlotProps } from "../slot-props";
import { inFlowInline, useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface ToolbarHosts {
    readonly root: "View";
}

export type ToolbarEntry = ToolbarItem<ReactNode> &
    Omit<InnerPropsOf<ButtonProps> & InnerPropsOf<IconButtonProps>, "testId">;

export interface ToolbarProps
    extends
        ToolbarRootOwnProps,
        Omit<ToolbarContentProps<ReactNode>, "items">,
        NativeSlotProps<ToolbarHosts> {
    /** The toolbar's name, for assistive technology. */
    readonly "aria-label"?: string | undefined;
    /** The elements, in order: each its data and its own `style`, `slotProps` and `tokens`, over
     *  the defaults for its kind. */
    readonly items?: readonly ToolbarEntry[] | undefined;
    /** Every text button's `style`, `slotProps`, `tokens` and `testId`; an item's own `testId`
     *  wins. */
    readonly buttonProps?: InnerPropsOf<ButtonProps> | undefined;
    /** The same for every icon button. */
    readonly iconButtonProps?: InnerPropsOf<IconButtonProps> | undefined;
    /** The overflow menu's `style`, `slotProps`, `tokens` and `testId`. */
    readonly menuProps?: InnerPropsOf<MenuProps> | undefined;
}

const HIDDEN: ViewStyle = { display: "none" };
// The row an overflow toolbar sits in: as wide as its parent, so the room it has can be measured
// however few elements it shows, holding the toolbar in its middle.
const ROOM: ViewStyle = {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "center",
};
const VERTICAL_ROOM: ViewStyle = {
    flexGrow: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
};

const length = (value: unknown): number =>
    typeof value === "number" ? value : 0;

// The bar's padding along it and the gap between its elements, from its resolved style.
const spacing = (
    style: Readonly<Record<string, unknown>>,
    vertical: boolean,
) => {
    const start = vertical
        ? (style.paddingTop ?? style.paddingVertical ?? style.padding)
        : (style.paddingStart ??
          style.paddingLeft ??
          style.paddingHorizontal ??
          style.padding);
    const end = vertical
        ? (style.paddingBottom ?? style.paddingVertical ?? style.padding)
        : (style.paddingEnd ??
          style.paddingRight ??
          style.paddingHorizontal ??
          style.padding);
    return {
        padding: length(start) + length(end),
        gap: length((vertical ? style.rowGap : style.columnGap) ?? style.gap),
    };
};

// One element: an icon button named by its label, or a text button.
const element = (item: ToolbarEntry, props: ToolbarProps) => {
    const custom = {
        style: item.style,
        slotProps: item.slotProps,
        tokens: item.tokens,
    };
    const shared = {
        disabled: item.disabled,
        onPress: item.onClick,
        interactionSource: item.interactionSource,
        ...(item.selected === undefined
            ? {}
            : {
                  selected: item.selected,
                  onSelectedChange: item.onSelectedChange,
              }),
    };
    return isPresent(item.icon) ? (
        <IconButton
            {...(overDefaults(
                props.iconButtonProps,
                custom as InnerPropsOf<IconButtonProps>,
            ) as object)}
            {...shared}
            testId={item.testId ?? props.iconButtonProps?.testId}
            aria-label={item.label}
            icon={item.icon}
        />
    ) : (
        <Button
            {...(overDefaults(
                props.buttonProps,
                custom as InnerPropsOf<ButtonProps>,
            ) as object)}
            {...shared}
            testId={item.testId ?? props.buttonProps?.testId}
            variant="text"
            label={item.label}
        />
    );
};

function ToolbarImpl(props: ToolbarProps): ReactNode {
    const {
        styles: s,
        views: v,
        selected,
    } = useComponentSlots<ToolbarPart>("toolbar", toolbarSelection(props));
    const items = props.items ?? [];
    const vertical = props.orientation === "vertical";
    const overflow = !!props.overflow;
    const sizes = useRef(new Map<string, number>());
    const [trigger, setTrigger] = useState(0);
    const [room, setRoom] = useState<number>();
    // A new measure, so the count follows it.
    const [, setMeasured] = useState(0);
    const sizeOf = (event: LayoutChangeEvent) =>
        vertical
            ? event.nativeEvent.layout.height
            : event.nativeEvent.layout.width;
    const own = spacing(s.root as Readonly<Record<string, unknown>>, vertical);
    // How many elements stay in the row; all of them, with the overflow button, until measured.
    const count =
        !overflow || room === undefined
            ? items.length
            : overflowCount({
                  sizes: items.map(
                      // oxlint-disable-next-line react/refs -- sizes measured at layout; a measure that changes them renders again
                      (item) => sizes.current.get(item.value) ?? 0,
                  ),
                  available: room - own.padding,
                  gap: own.gap,
                  trigger,
              });
    const overflowing =
        overflow && (room === undefined || count < items.length);
    const id = (part: ToolbarPart) =>
        testIdOf(toolbarAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const overflowButton = (given: MenuTriggerProps) => (
        <View
            style={overflowing ? undefined : HIDDEN}
            onLayout={(event) => {
                const size = sizeOf(event);
                if (size > 0) setTrigger(size);
            }}
        >
            <IconButton
                aria-label={props.overflowLabel ?? TOOLBAR_OVERFLOW_LABEL}
                icon={isPresent(props.overflowIcon) ? props.overflowIcon : "⋮"}
                aria-haspopup="menu"
                aria-expanded={given["aria-expanded"]}
                onPress={given.onPress}
                interactionSource={given.interactionSource}
                testId={toolbarOverflowTestId(props.testId)}
            />
        </View>
    );
    const bar = (
        <v.root.View
            {...slot.props("root")}
            role="toolbar"
            aria-orientation={vertical ? "vertical" : "horizontal"}
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            // A floating bar hugs its elements as the web's `inline-flex` one does; a docked one
            // fills its edge.
            style={slot.style(
                "root",
                props.placement === "docked"
                    ? s.root
                    : inFlowInline(s.root ?? {}),
            )}
            testID={id("root")}
        >
            {items.map((item, index) =>
                overflow ? (
                    <View
                        key={item.value}
                        style={index < count ? undefined : HIDDEN}
                        onLayout={(event) => {
                            // A hidden element lays out at nothing: keep its last size.
                            const size = sizeOf(event);
                            if (size === 0) return;
                            sizes.current.set(item.value, size);
                            setMeasured((n) => n + 1);
                        }}
                    >
                        {element(item, props)}
                    </View>
                ) : (
                    <Fragment key={item.value}>{element(item, props)}</Fragment>
                ),
            )}
            {overflow ? (
                <Menu
                    {...props.menuProps}
                    items={toolbarMenuItems(items, count)}
                    trigger={overflowButton}
                    positioning={toolbarMenuPositioning(props.orientation)}
                    onSelect={(details) =>
                        toolbarMenuSelect(items, details.value)
                    }
                />
            ) : null}
        </v.root.View>
    );
    // What the toolbar gives its icon buttons (a vibrant one's content color).
    const provided = providedTokensFromPaths(selected.providedTokens.root);
    return (
        <ProvidedTokens tokens={provided}>
            {overflow ? (
                <View
                    style={vertical ? VERTICAL_ROOM : ROOM}
                    onLayout={(event) => setRoom(sizeOf(event))}
                >
                    {bar}
                </View>
            ) : (
                bar
            )}
        </ProvidedTokens>
    );
}

/** M3 Expressive's docked and floating toolbars: `<Toolbar aria-label="Edit" overflow items={[{
 *  value: "bold", label: "Bold", icon: <Glyph glyph="B" /> }, …]} />`. */
export const Toolbar = withEngine(ToolbarImpl, "Toolbar");
