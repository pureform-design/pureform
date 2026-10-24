// The menu: its surface and its items, and, given a trigger, the whole overlay. Each item is a
// pressable row with its leading icon, label, and trailing icon or text, rippling when pressed.
// Without a trigger it's the surface, placed by the app (as the select does in a `Modal`), and
// given `open` it grows in and fades out. With one, it renders the trigger in place and opens the
// surface under it, over the page through the portal host: placed against the trigger, closed by
// a press outside, the back button or Escape, or picking an item. An item with `items` opens a
// submenu as `submenu` says: beside it (`cascade`, over the page against the item's row, as a
// trigger's menu is against its trigger), or in its place (`drill`: the submenu's items under a
// row that goes back, headed by the item's label); `auto` cascades when a submenu fits beside the
// open menu in the window (measured once it's laid out), else drills.

import { menuAnatomy, menuOverlayAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    hasSubmenu,
    isPresent,
    MENU_BACK_VALUE,
    menuDrillLevel,
    menuDrillPick,
    menuGrouped,
    menuSelection,
    menuSubmenuMode,
    menuSubmenuRoomOf,
    submenuPositioning,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    IndicationProps,
    MenuGroup,
    MenuItem,
    MenuSelectDetails,
    MenuSubmenu,
    MenuSubmenuRoom,
    MenuVariantProps,
    OverlayPositioning,
} from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import type { Selection } from "@pureform/styling";
import { memo, useEffect, useRef, useState } from "react";
import type { ComponentRef, ReactNode } from "react";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";

import { Button } from "../button/button";
import { iconParts } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { Anchored, useAnchoredOverlay } from "../overlay";
import {
    testIdOf,
    unselectable,
    useStableCallback,
    useStableSelection,
    withEngine,
} from "../parts";
import { Portal } from "../portal";
import type { WindowRect } from "../portal-host";
import { useOverlayPresence } from "../presence";
import { useDirection, useEngine } from "../provider";
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
    /** An area that opens the menu where it's held: a long press opens it at the touch point (on
     *  the web also a right-click, and the context menu key or Shift+F10 pressed in it), over the
     *  page like a trigger's menu. It works with or without a `trigger`. A pressable inside it
     *  takes its own touches, so a long press on one doesn't reach the area. */
    readonly contextTrigger?: ReactNode;
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
    /** How an item with `items` opens its submenu: `cascade` beside it, `drill` in the menu's
     *  place under a row that goes back, `auto` cascading when a submenu fits beside the
     *  open menu in the window, else drilling. @default "auto" */
    readonly submenu?: MenuSubmenu | undefined;
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
    readonly onSelect: (
        value: string,
        row: Measurable | null,
        how?: SelectHow,
    ) => void;
    /** The key that opens its submenu on the web: the arrow toward the inline end. */
    readonly openKey: string;
}

// An item's row, measured for where a cascading submenu opens beside it.
interface Measurable {
    measureInWindow(
        done: (x: number, y: number, width: number, height: number) => void,
    ): void;
    /** On the web, where the keys move focus. */
    focus?(): void;
}

// How an item asks for its submenu: by a press, or on the web by the key that opens it (which
// moves focus into the submenu).
type SelectHow = "press" | "key";

function MenuItemImpl(props: ItemProps): ReactNode {
    const { item } = props;
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: item.interactionSource,
        disabled: item.disabled,
    });
    const slots = useComponentSlots<Part>(
        "menu",
        indication.select(props.selection),
        indication.states({
            selected: props.selected,
            ...(item.type === undefined
                ? {}
                : { checked: item.checked ?? false }),
            disabled: item.disabled ?? false,
            ...(item.mirrorLeadingIcon ||
            item.mirrorTrailingIcon ||
            hasSubmenu(item)
                ? { mirrored: true }
                : {}),
        }),
    );
    const { styles: s, selected, views: v } = slots;
    const id = (part: Part) => testIdOf(menuAnatomy, part, props.testId);
    const icon = iconParts(slots, id);
    const row = useRef<Measurable>(null);
    return (
        <v.item.Pressable
            ref={row as never}
            {...indication.handlers}
            role={item.type === undefined ? "menuitem" : `menuitem${item.type}`}
            {...(hasSubmenu(item) ? { "aria-haspopup": "menu" as const } : {})}
            {...(item.type === undefined
                ? {}
                : { "aria-checked": item.checked ?? false })}
            disabled={item.disabled}
            onPress={() => {
                if (item.type !== undefined)
                    item.onCheckedChange?.(
                        item.type === "radio" || !item.checked,
                    );
                props.onSelect(item.value, row.current);
            }}
            {...(Platform.OS === "web" && hasSubmenu(item)
                ? {
                      onKeyDown: (event: {
                          nativeEvent: { key: string };
                          preventDefault(): void;
                      }) => {
                          if (event.nativeEvent.key !== props.openKey) return;
                          event.preventDefault();
                          props.onSelect(item.value, row.current, "key");
                      },
                  }
                : {})}
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
            {icon(
                "itemTrailing",
                hasSubmenu(item) && !isPresent(item.trailingIcon)
                    ? "›"
                    : item.trailingIcon,
            )}
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

function MenuImpl(
    props: MenuProps & {
        /** Its items alone, without the surface (container, elevation, width), for a view that
         *  draws its own, as the search view's content does. */
        readonly bare?: boolean;
    },
): ReactNode {
    const engine = useEngine();
    const rtl = useDirection() === "rtl";
    const windowWidth = useWindowDimensions().width;
    const auto = props.submenu === undefined || props.submenu === "auto";
    const [room, setRoom] = useState<MenuSubmenuRoom>();
    const surface = useRef<ComponentRef<typeof View>>(null);
    const measureRoom = () =>
        surface.current?.measureInWindow((x, _y, width) => {
            if (width > 0)
                setRoom(
                    menuSubmenuRoomOf(
                        { left: x, right: x + width },
                        { left: 0, right: windowWidth },
                    ),
                );
        });
    const drill = menuSubmenuMode(props.submenu, room) === "drill";
    // The submenu items drilled into, outermost first.
    const [path, setPath] = useState<readonly string[]>([]);
    // The submenu cascading beside its item's row.
    const [beside, setBeside] = useState<{
        readonly item: MenuItem<ReactNode>;
        readonly row: WindowRect;
        // The row's element, which focus goes back to; set when the key opened it.
        readonly from?: Measurable;
    }>();
    const level = menuDrillLevel(
        props.items ?? [],
        props.groups ?? [],
        drill ? path : [],
    );
    const { submenu } = level;
    const shown = [
        ...level.items,
        ...level.groups.flatMap((group) => group.items),
    ];
    const selection = useStableSelection(
        menuSelection({
            ...props,
            grouped: submenu ? false : menuGrouped(props),
        }),
    );
    const select = useStableCallback(
        (value: string, row: Measurable | null, how: SelectHow = "press") => {
            const next = drill
                ? menuDrillPick(
                      props.items ?? [],
                      props.groups ?? [],
                      path,
                      value,
                  )
                : undefined;
            if (next) return setPath(next);
            const chosen = shown.find((entry) => entry.value === value);
            if (chosen && hasSubmenu(chosen)) {
                if (beside?.item.value === value)
                    return how === "press" ? setBeside(undefined) : undefined;
                if (!row) return undefined;
                return row.measureInWindow((x, y, width, height) =>
                    setBeside({
                        item: chosen,
                        row: { x, y, width, height },
                        ...(how === "key" ? { from: row } : {}),
                    }),
                );
            }
            setBeside(undefined);
            props.onSelect?.({ value });
        },
    );
    // Out of any submenu once it closes.
    useEffect(() => {
        if (props.open === false) {
            setPath([]);
            setBeside(undefined);
        }
    }, [props.open]);
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
            openKey={rtl ? "ArrowLeft" : "ArrowRight"}
        />
    );
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = props.open === undefined ? v.root : engine;
    return (
        <Root.View
            {...presence.props}
            {...(auto
                ? {
                      ref: surface,
                      onLayout: (event: LayoutChangeEvent) => {
                          (
                              presence.props.onLayout as
                                  | ((event: LayoutChangeEvent) => void)
                                  | undefined
                          )?.(event);
                          measureRoom();
                      },
                  }
                : {})}
            role="menu"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={
                props.bare ? presence.style : { ...s.root, ...presence.style }
            }
            testID={id("root")}
        >
            {submenu ? (
                <>
                    {item({
                        value: MENU_BACK_VALUE,
                        label: submenu.label,
                        leadingIcon: "‹",
                        mirrorLeadingIcon: true,
                        closeOnSelect: false,
                    })}
                    {level.items.map(item)}
                </>
            ) : null}
            {submenu ? null : level.items.map(item)}
            {level.groups.map((group) => (
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
            {beside ? (
                // Beside its item, over the page; the menu's own layer under it takes a press
                // outside both.
                <Portal layer="menu">
                    <Anchored
                        anchor={beside.row}
                        positioning={submenuPositioning(rtl ? "rtl" : "ltr")}
                        placement="right-start"
                        gutter={0}
                    >
                        {() => (
                            <MenuKeys
                                autoFocus={beside.from !== undefined}
                                onKey={(key) => {
                                    // Back out to the item: the arrow toward the inline start,
                                    // or Tab.
                                    if (
                                        key !==
                                            (rtl
                                                ? "ArrowRight"
                                                : "ArrowLeft") &&
                                        key !== "Tab"
                                    )
                                        return false;
                                    const from = beside.from;
                                    setBeside(undefined);
                                    from?.focus?.();
                                    return true;
                                }}
                            >
                                <Surface
                                    {...props}
                                    items={beside.item.items}
                                    groups={undefined}
                                    grouped={false}
                                    open={undefined}
                                    onSelect={(details) => {
                                        setBeside(undefined);
                                        props.onSelect?.(details);
                                    }}
                                    aria-label={
                                        typeof beside.item.label === "string"
                                            ? beside.item.label
                                            : undefined
                                    }
                                />
                            </MenuKeys>
                        )}
                    </Anchored>
                </Portal>
            ) : null}
        </Root.View>
    );
}

const Surface = withEngine(MenuImpl, "Menu");

/** The menu's items without its surface, filling the view they're in (the search view's
 *  suggestions). */
export function MenuItems(
    props: Omit<MenuProps, "trigger" | "contextTrigger">,
): ReactNode {
    return <Surface {...props} bare />;
}

// The items' elements on the web, where the keyboard moves between them.
interface WebElement {
    focus(): void;
    querySelectorAll(selector: string): ArrayLike<WebElement>;
    getAttribute(name: string): string | null;
}

const ITEM = ["menuitem", "menuitemcheckbox", "menuitemradio"]
    .map((role) => `[role="${role}"]:not([aria-disabled="true"])`)
    .join(", ");

// A menu's items on the web: it takes focus on its first item (given `autoFocus`), and the arrow
// keys, Home, and End move it; `onKey` hears the other keys first, and takes those it returns
// true for. A cascaded submenu is another portal entry, so it has its own.
function MenuKeys(props: {
    readonly autoFocus: boolean;
    readonly onKey?: ((key: string) => boolean) | undefined;
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
        if (Platform.OS === "web" && props.autoFocus) items()[0]?.focus();
    }, []);
    const onKeyDown = (event: {
        nativeEvent: { key: string };
        preventDefault(): void;
        stopPropagation(): void;
    }) => {
        const all = items();
        const at = all.indexOf(
            globalThis.document?.activeElement as unknown as WebElement,
        );
        const go = (index: number) => {
            event.preventDefault();
            all[(index + all.length) % all.length]?.focus();
        };
        const { key } = event.nativeEvent;
        if (props.onKey?.(key)) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        switch (key) {
            case "ArrowDown":
                return go(at + 1);
            case "ArrowUp":
                return go(at < 0 ? -1 : at - 1);
            case "Home":
                return go(0);
            case "End":
                return go(-1);
        }
    };
    return (
        <View ref={root} {...(Platform.OS === "web" ? { onKeyDown } : {})}>
            {props.children}
        </View>
    );
}

// The open menu, placed: on the web it takes focus on its first item, the keys move it, and Tab
// closes it.
function Popup(props: {
    readonly onClose: () => void;
    readonly children: ReactNode;
}): ReactNode {
    return (
        <MenuKeys
            autoFocus
            onKey={(key) => {
                if (key === "Tab") props.onClose();
                return false;
            }}
        >
            {props.children}
        </MenuKeys>
    );
}

interface WindowPoint {
    readonly x: number;
    readonly y: number;
    readonly width: 0;
    readonly height: 0;
}

const pointAt = (x: number, y: number): WindowPoint => ({
    x,
    y,
    width: 0,
    height: 0,
});

// The area a long press (and on the web a right-click, the context menu key, or Shift+F10) opens
// the menu from, at the touch point. It reads the press's position; it doesn't take over any
// scrolling, which stays the surrounding `ScrollView`'s.
function ContextTrigger(props: {
    readonly onOpen: (at: WindowPoint) => void;
    readonly testID: string;
    readonly children: ReactNode;
}): ReactNode {
    const web = Platform.OS === "web";
    const webProps = web
        ? {
              onContextMenu: (event: {
                  clientX: number;
                  clientY: number;
                  preventDefault(): void;
              }) => {
                  event.preventDefault();
                  props.onOpen(pointAt(event.clientX, event.clientY));
              },
              onKeyDown: (event: {
                  nativeEvent: { key: string; shiftKey?: boolean };
                  target: unknown;
                  preventDefault(): void;
              }) => {
                  const { key, shiftKey } = event.nativeEvent;
                  if (key !== "ContextMenu" && !(key === "F10" && shiftKey))
                      return;
                  const rect = (
                      event.target as {
                          getBoundingClientRect?: () => {
                              left: number;
                              bottom: number;
                          };
                      } | null
                  )?.getBoundingClientRect?.();
                  event.preventDefault();
                  props.onOpen(pointAt(rect?.left ?? 0, rect?.bottom ?? 0));
              },
          }
        : {};
    return (
        <Pressable
            accessible={false}
            focusable={false}
            onLongPress={(event) =>
                props.onOpen(
                    pointAt(event.nativeEvent.pageX, event.nativeEvent.pageY),
                )
            }
            testID={props.testID}
            {...(webProps as object)}
        >
            {props.children}
        </Pressable>
    );
}

function MenuOverlay(props: MenuProps): ReactNode {
    const {
        trigger,
        contextTrigger,
        open: _open,
        defaultOpen,
        onOpenChange,
        closeOnSelect,
        positioning,
        onSelect,
        ...surface
    } = props;
    const engine = useEngine();
    const { open, source, measured, presence, close, toggle } =
        useAnchoredOverlay("Menu", {
            open: props.open,
            defaultOpen,
            onOpenChange,
        });
    // Where the context trigger was held; a button's own box wins when the menu opens from it.
    const [point, setPoint] = useState<WindowPoint>();
    const opened = (at: WindowPoint) => {
        setPoint(at);
        if (!open) toggle();
    };
    const select = (details: MenuSelectDetails) => {
        onSelect?.(details);
        const item = [
            ...(props.items ?? []),
            ...(props.groups ?? []).flatMap((group) => group.items),
        ].find((entry) => entry.value === details.value);
        if (item?.closeOnSelect ?? closeOnSelect ?? true) close();
    };
    const given: MenuTriggerProps = {
        onPress: () => {
            setPoint(undefined);
            toggle();
        },
        interactionSource: source,
        "aria-haspopup": "menu",
        "aria-expanded": open,
    };
    return (
        <>
            {trigger === undefined ? null : typeof trigger === "function" ? (
                trigger(given, { open })
            ) : (
                <Button
                    label={trigger}
                    onPress={given.onPress}
                    interactionSource={source}
                />
            )}
            {contextTrigger === undefined ? null : (
                <ContextTrigger
                    onOpen={opened}
                    testID={testIdOf(
                        menuOverlayAnatomy,
                        "contextTrigger",
                        props.testId as TestIdOverride<
                            PartName<typeof menuOverlayAnatomy>
                        >,
                    )}
                >
                    {contextTrigger}
                </ContextTrigger>
            )}
            {presence.present && measured ? (
                <Portal layer="menu">
                    <Anchored
                        anchor={point ?? measured.rect}
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
    return props.trigger === undefined && props.contextTrigger === undefined ? (
        <Surface {...props} />
    ) : (
        <MenuOverlay {...props} />
    );
}
