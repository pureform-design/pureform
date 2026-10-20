// The menu: its surface and its items, and, given a trigger, the whole overlay. Each item is a
// pressable row with its leading icon, label, and trailing icon or text, rippling when pressed.
// Without a trigger it's the surface, placed by the app (as the select does in a `Modal`), and
// given `open` it grows in and fades out. With one, it renders the trigger in place and opens the
// surface under it, over the page through the portal host: placed against the trigger, closed by
// a press outside, the back button or Escape, or picking an item.

import { menuAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { isPresent, menuGrouped, menuSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    IndicationProps,
    MenuGroup,
    MenuItem,
    MenuSelectDetails,
    MenuVariantProps,
    OverlayPositioning,
} from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import type { Selection } from "@pureform/styling";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentRef, ReactNode } from "react";
import { Platform, View } from "react-native";

import { Button } from "../button/button";
import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { useInteractionSource } from "../interaction";
import { Anchored, useAnchor, useDismiss } from "../overlay";
import {
    testIdOf,
    unselectable,
    useControllable,
    useStableCallback,
    useStableSelection,
    withEngine,
} from "../parts";
import { Portal } from "../portal";
import type { WindowRect } from "../portal-host";
import { useOverlayPresence, usePresence } from "../presence";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

/** The menu's parts this binding renders. */
type Part = PartName<typeof menuAnatomy>;

const [INDICATION] = menuAnatomy.indication!;

/** What a menu gives the trigger it renders. */
export interface MenuTriggerProps {
    /** Opens the menu, or closes it while it's open. */
    readonly onPress: () => void;
    /** Where the trigger is: the menu measures the view its interactions happen on. Give it to a
     *  pureform component's `interactionSource`, or emit to it from your own `Pressable`
     *  (`useIndication`); without it, the menu opens where the trigger was pressed. */
    readonly interactionSource: MutableInteractionSource;
    readonly "aria-haspopup": "menu";
    readonly "aria-expanded": boolean;
}

export interface MenuProps extends MenuVariantProps, IndicationProps {
    readonly items?: readonly MenuItem<ReactNode>[] | undefined;
    /** Groups of items, after `items`, each with an optional label. The menu is `grouped` unless
     *  told otherwise. */
    readonly groups?: readonly MenuGroup<ReactNode>[] | undefined;
    /** What opens it, rendered in place: a label, for a `Button`, or a function rendering your
     *  own trigger with the props it's given (`(trigger) => <IconButton {...trigger} … />`).
     *  Given it, the menu opens over the page against the trigger and closes itself; without
     *  it, the menu is its surface alone. */
    readonly trigger?:
        | ReactNode
        | ((
              trigger: MenuTriggerProps,
              state: { readonly open: boolean },
          ) => ReactNode);
    /** Whether it shows. With a trigger, the open state, controlled when defined. Without one:
     *  it grows in when this turns true and fades out when it turns false, rendering nothing
     *  once it's gone; without it either, the surface is always shown, still. */
    readonly open?: boolean | undefined;
    /** With a trigger, whether it starts open. */
    readonly defaultOpen?: boolean | undefined;
    /** With a trigger, called when it asks to open or close. */
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** With a trigger, whether picking an item closes it; an item's own `closeOnSelect` wins.
     *  Default true. */
    readonly closeOnSelect?: boolean | undefined;
    /** With a trigger, where it opens against it. Default `{ placement: "bottom-start",
     *  gutter: 8, flip: true }`. */
    readonly positioning?: OverlayPositioning | undefined;
    /** The item shown selected, such as a select's value. */
    readonly value?: string | null | undefined;
    /** An item was picked. */
    readonly onSelect?: ((details: MenuSelectDetails) => void) | undefined;
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<Part> | undefined;
}

// An item gets only what it reads, each stable while the menu renders with the same props, so an
// item renders again when it or its selection changes, not with every render of the menu.
interface ItemProps {
    readonly item: MenuItem<ReactNode>;
    readonly selection: Selection<"menu">;
    readonly indication: Indication | undefined;
    readonly testId: TestIdOverride<Part> | undefined;
    readonly selected: boolean;
    readonly onSelect: (value: string) => void;
}

function MenuItemImpl(props: ItemProps): ReactNode {
    const { item } = props;
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: item.interactionSource,
        disabled: item.disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<Part>(
        "menu",
        indication.select(props.selection),
        indication.states({
            selected: props.selected,
            ...(item.type === undefined
                ? {}
                : { checked: item.checked ?? false }),
            disabled: item.disabled ?? false,
            ...(item.mirrorLeadingIcon || item.mirrorTrailingIcon
                ? { mirrored: true }
                : {}),
        }),
    );
    const id = (part: Part) => testIdOf(menuAnatomy, part, props.testId);
    const icon = (part: "itemLeading" | "itemTrailing", node: ReactNode) => {
        const Slot = v[part];
        return isPresent(node) ? (
            <Slot.View style={s[part]} testID={id(part)}>
                <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                    {node}
                </IconSlot>
            </Slot.View>
        ) : null;
    };
    return (
        <v.item.Pressable
            {...indication.handlers}
            role={item.type === undefined ? "menuitem" : `menuitem${item.type}`}
            {...(item.type === undefined
                ? {}
                : { "aria-checked": item.checked ?? false })}
            disabled={item.disabled}
            onPress={() => {
                if (item.type !== undefined)
                    item.onCheckedChange?.(
                        item.type === "radio" || !item.checked,
                    );
                props.onSelect(item.value);
            }}
            style={{ ...s.item, ...unselectable }}
            testID={id("item")}
        >
            {icon("itemLeading", item.leadingIcon)}
            <v.itemContent.View
                style={s.itemContent}
                testID={id("itemContent")}
            >
                <v.itemLabel.Text
                    selectable={false}
                    style={s.itemLabel}
                    testID={id("itemLabel")}
                >
                    {item.label}
                </v.itemLabel.Text>
                {isPresent(item.supportingText) ? (
                    <v.itemSupportingText.Text
                        selectable={false}
                        style={s.itemSupportingText}
                        testID={id("itemSupportingText")}
                    >
                        {item.supportingText}
                    </v.itemSupportingText.Text>
                ) : null}
            </v.itemContent.View>
            {icon("itemTrailing", item.trailingIcon)}
            {isPresent(item.trailingText) ? (
                <v.itemTrailingText.Text
                    selectable={false}
                    style={s.itemTrailingText}
                    testID={id("itemTrailingText")}
                >
                    {item.trailingText}
                </v.itemTrailingText.Text>
            ) : null}
            {indication.layer(selected)}
        </v.item.Pressable>
    );
}

const Item = memo(withEngine(MenuItemImpl, "MenuItem"));

function MenuImpl(props: MenuProps): ReactNode {
    const engine = useEngine();
    const selection = useStableSelection(
        menuSelection({ ...props, grouped: menuGrouped(props) }),
    );
    const select = useStableCallback((value: string) =>
        props.onSelect?.({ value }),
    );
    const { styles: s, views: v } = useComponentSlots<Part>("menu", selection);
    const presence = useOverlayPresence(props.open, "popup");
    if (!presence.present) return null;
    const id = (part: Part) => testIdOf(menuAnatomy, part, props.testId);
    const item = (entry: MenuItem<ReactNode>) => (
        <Item
            key={entry.value}
            item={entry}
            selection={selection}
            indication={props.indication}
            testId={props.testId}
            selected={props.value === entry.value}
            onSelect={select}
        />
    );
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = props.open === undefined ? v.root : engine;
    return (
        <Root.View
            {...presence.props}
            role="menu"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={{ ...s.root, ...presence.style }}
            testID={id("root")}
        >
            {(props.items ?? []).map(item)}
            {(props.groups ?? []).map((group) => (
                <v.itemGroup.View
                    key={group.id}
                    role="group"
                    {...(typeof group.label === "string"
                        ? { "aria-label": group.label }
                        : {})}
                    style={s.itemGroup}
                    testID={id("itemGroup")}
                >
                    {isPresent(group.label) ? (
                        <v.itemGroupLabel.Text
                            selectable={false}
                            style={s.itemGroupLabel}
                            testID={id("itemGroupLabel")}
                        >
                            {group.label}
                        </v.itemGroupLabel.Text>
                    ) : null}
                    {group.items.map(item)}
                </v.itemGroup.View>
            ))}
        </Root.View>
    );
}

const Surface = withEngine(MenuImpl, "Menu");

// The items' elements on the web, where the keyboard moves between them.
interface WebElement {
    focus(): void;
    querySelectorAll(selector: string): ArrayLike<WebElement>;
    getAttribute(name: string): string | null;
}

const ITEM = ["menuitem", "menuitemcheckbox", "menuitemradio"]
    .map((role) => `[role="${role}"]:not([aria-disabled="true"])`)
    .join(", ");

// The open menu, placed: on the web it takes focus on its first item, and the arrow keys, Home,
// and End move it; Tab closes it.
function Popup(props: {
    readonly onClose: () => void;
    readonly children: ReactNode;
}): ReactNode {
    const root = useRef<ComponentRef<typeof View>>(null);
    const items = () =>
        Array.from(
            (root.current as unknown as WebElement | null)?.querySelectorAll(
                ITEM,
            ) ?? [],
        );
    useEffect(() => {
        if (Platform.OS === "web") items()[0]?.focus();
    }, []);
    const onKeyDown = (event: {
        nativeEvent: { key: string };
        preventDefault(): void;
    }) => {
        const all = items();
        const at = all.indexOf(
            globalThis.document?.activeElement as unknown as WebElement,
        );
        const go = (index: number) => {
            event.preventDefault();
            all[(index + all.length) % all.length]?.focus();
        };
        switch (event.nativeEvent.key) {
            case "ArrowDown":
                return go(at + 1);
            case "ArrowUp":
                return go(at < 0 ? -1 : at - 1);
            case "Home":
                return go(0);
            case "End":
                return go(-1);
            case "Tab":
                return props.onClose();
        }
    };
    return (
        <View ref={root} {...(Platform.OS === "web" ? { onKeyDown } : {})}>
            {props.children}
        </View>
    );
}

// The trigger's box when the menu last opened: pending while it's measured, then the box, or
// `undefined` when nothing says where the trigger is.
type Anchor = { readonly rect: WindowRect | undefined } | undefined;

function MenuOverlay(props: MenuProps): ReactNode {
    const {
        trigger,
        open: _open,
        defaultOpen,
        onOpenChange,
        closeOnSelect,
        positioning,
        onSelect,
        ...surface
    } = props;
    const engine = useEngine();
    const [open, setOpen] = useControllable(
        "Menu",
        "open",
        props.open,
        defaultOpen,
        onOpenChange,
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
        // Focus goes back to the trigger, as the web's menu returns it.
        if (Platform.OS === "web") anchor.focus();
    });
    const toggle = useStableCallback(() => {
        if (open) close();
        else setOpen(true);
    });
    useDismiss(open, close);
    const select = (details: MenuSelectDetails) => {
        onSelect?.(details);
        const item = [
            ...(props.items ?? []),
            ...(props.groups ?? []).flatMap((group) => group.items),
        ].find((entry) => entry.value === details.value);
        if (item?.closeOnSelect ?? closeOnSelect ?? true) close();
    };
    const given: MenuTriggerProps = {
        onPress: toggle,
        interactionSource: source,
        "aria-haspopup": "menu",
        "aria-expanded": open,
    };
    return (
        <>
            {typeof trigger === "function" ? (
                trigger(given, { open })
            ) : (
                <Button
                    label={trigger}
                    onPress={toggle}
                    interactionSource={source}
                />
            )}
            {presence.present && measured ? (
                <Portal layer="menu">
                    <Anchored
                        anchor={measured.rect}
                        positioning={positioning}
                        placement="bottom-start"
                        gutter={8}
                        onPressOutside={close}
                    >
                        {(placed) => (
                            <engine.View
                                {...presence.props}
                                style={{
                                    // A closing menu takes no more presses.
                                    pointerEvents: open ? "auto" : "none",
                                    ...(placed
                                        ? {
                                              transformOrigin:
                                                  placed.transformOrigin,
                                          }
                                        : {}),
                                    ...presence.style,
                                }}
                            >
                                <Popup onClose={close}>
                                    <Surface {...surface} onSelect={select} />
                                </Popup>
                            </engine.View>
                        )}
                    </Anchored>
                </Portal>
            ) : null}
        </>
    );
}

/** Material's menu. With a trigger, the whole overlay:
 *  `<Menu trigger={(t) => <IconButton {...t} aria-label="More" icon="⋮" />} items={…} onSelect={…} />`;
 *  without, its surface: `<Menu items={[{ value: "cut", label: "Cut" }]} onSelect={…} />`. */
export function Menu(props: MenuProps): ReactNode {
    return props.trigger === undefined ? (
        <Surface {...props} />
    ) : (
        <MenuOverlay {...props} />
    );
}
