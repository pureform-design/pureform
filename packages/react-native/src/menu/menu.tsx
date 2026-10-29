// The menu: its surface and its items, and, given a trigger, the whole overlay. Each item is a
// pressable row with its leading icon, label, and trailing icon or text, rippling when pressed.
// Without a trigger it's the surface, placed by the app (as the select does in a `Modal`), and
// given `open` it grows in and fades out. With one, it renders the trigger in place and opens the
// surface under it, over the page through the portal host: placed against the trigger, closed by
// a press outside, the back button or Escape, or picking an item. An item with `items` opens a
// submenu as `submenu` says: beside it (`cascade`, over the page against the item's row, as a
// trigger's menu is against its trigger), or in its place (`drill`: the submenu's items under a
// row that goes back, headed by the item's label); `auto` decides as an item's submenu opens:
// the submenu is laid out unseen at its own size and cascades when it fits beside the open menu
// and down or up from its item, in the window and the nearest `PureformContainer` (or the one
// `container` names), else the menu drills.

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
    MenuInstances,
    MenuItem,
    MenuItemInstance,
    MenuSelectDetails,
    MenuSubmenu,
    MenuVariantProps,
    OverlayPositioning,
} from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import {
    useContainerFrame,
    useMeasureContainer,
    useReducedMotion,
    useTokens,
} from "@pureform/rn-adapter/react";
import type {
    ContainerFrame,
    MeasureContainer,
} from "@pureform/rn-adapter/react";
import type { Selection } from "@pureform/styling";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentRef, ReactNode } from "react";
import {
    Animated,
    Platform,
    Pressable,
    useWindowDimensions,
    View,
} from "react-native";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";

import { Button } from "../button/button";
import { iconParts } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { Anchored, useAnchoredOverlay } from "../overlay";
import {
    testIdOf,
    useStableCallback,
    useStableSelection,
    withEngine,
} from "../parts";
import { Portal } from "../portal";
import type { WindowRect } from "../portal-host";
import { themeSpring, useOverlayPresence } from "../presence";
import { useDirection, useEngine, usePureform } from "../provider";
import {
    useNativeSlotReader,
    withUnselectable,
    overlayKeys,
} from "../slot-props";
import type { NativeSlotProps, PartSlots } from "../slot-props";
import { useComponentSlots } from "../styles";
import { triggerButtonProps } from "../trigger-button";

/** The menu's parts this binding renders. */
type Part = PartName<typeof menuAnatomy>;
/** The parts as the web names them, which `style`, `slotProps` and `testId` take. */
type Key = PartName<typeof menuOverlayAnatomy>;
const KEYS = overlayKeys(menuOverlayAnatomy);

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

export interface MenuProps
    extends
        MenuVariantProps,
        IndicationProps,
        NativeSlotProps<MenuHosts, MenuInstances<ReactNode>> {
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
     *  place under a row that goes back, `auto` cascading when the submenu, measured as it opens,
     *  fits beside the open menu and down or up from its item, within the window and the
     *  container, else drilling. @default "auto" */
    readonly submenu?: MenuSubmenu | undefined;
    /** The `PureformContainer` (by its `name`) `auto` keeps a cascading submenu within. Default:
     *  the nearest. */
    readonly container?: string | undefined;
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<Key> | undefined;
}

/** What each part renders as, for its keyed `style` and `slotProps`: the web's parts. */
export interface MenuHosts {
    readonly trigger: "Pressable";
    readonly contextTrigger: "Pressable";
    readonly itemLeading: "View";
    readonly itemLabel: "Text";
    readonly item: "Pressable";
    readonly itemContent: "View";
    readonly itemSupportingText: "Text";
    readonly itemTrailingText: "Text";
    readonly content: "View";
    readonly itemGroup: "View";
    readonly itemGroupLabel: "Text";
    readonly itemTrailing: "View";
}

// An item gets only what it reads, each stable while the menu renders with the same props, so an
// item renders again when it or its selection changes, not with every render of the menu.
interface ItemProps {
    /** The menu's per-part props: the same while its `style` and `slotProps` are. */
    readonly slot: PartSlots;
    readonly item: MenuItem<ReactNode>;
    /** Its index among its level's (or group's) items, `-1` for the row back out of a drilled
     *  submenu, and how deep its submenu is: for a function of the row. */
    readonly index: number;
    readonly depth: number;
    /** The row back out's submenu, which a function of the row sees as its item. */
    readonly of?: MenuItem<ReactNode> | undefined;
    readonly selection: Selection<"menu">;
    readonly indication: Indication | undefined;
    readonly testId: TestIdOverride<Key> | undefined;
    readonly selected: boolean;
    readonly onSelect: (
        value: string,
        row: Measurable | null,
        how?: SelectHow,
        label?: Measurable | null,
    ) => void;
    /** Where a drill step's moving label was: this row's label moves from there into place. */
    readonly flip?: DrillFlip | undefined;
    /** The key that opens its submenu on the web: the arrow toward the inline end. */
    readonly openKey: string;
    /** An option of a listbox (the select's), saying whether it's chosen, rather than a menu
     *  item. */
    readonly option: boolean;
    /** Laid out unseen to be measured: no role, nothing to press. */
    readonly measuring: boolean;
    /** An option of a listbox whose focus stays in its combobox (`aria-activedescendant`): its
     *  id, and whether it's the highlighted one, which says `aria-selected` and shows hovered. */
    readonly active?: { readonly id: string; readonly highlighted: boolean };
}

// An item's row, measured for where a cascading submenu opens beside it.
interface Measurable {
    measureInWindow(
        done: (x: number, y: number, width: number, height: number) => void,
    ): void;
    /** On the web, where the keys move focus. */
    focus?(): void;
}

// The open menu's box and what bounds a submenu beside it, in the window.
interface SubmenuBounds {
    readonly menu: { readonly left: number; readonly right: number };
    readonly boundary: {
        readonly left: number;
        readonly right: number;
        readonly top: number;
        readonly bottom: number;
    };
}

// How an item asks for its submenu: by a press, or on the web by the key that opens it (which
// moves focus into the submenu).
type SelectHow = "press" | "key";

const ROW_PARTS = [
    "item",
    "itemLeading",
    "itemContent",
    "itemLabel",
    "itemSupportingText",
    "itemTrailing",
    "itemTrailingText",
];

/** The menu's per-part props with a row's own as the copy each part's function of the row sees:
 *  the menu's own unless one was passed. */
const forRow = (
    slot: PartSlots,
    row: () => MenuItemInstance<ReactNode>,
): PartSlots => {
    if (!ROW_PARTS.some((part) => slot.each(part))) return slot;
    const at = row();
    return {
        props: (part, instance) => slot.props(part, instance ?? at),
        style: (part, own, instance) => slot.style(part, own, instance ?? at),
        on: (part, name, own, instance) =>
            slot.on(part, name, own, instance ?? at),
        with: (part, own, instance) => slot.with(part, own, instance ?? at),
        each: (part) => slot.each(part),
    };
};

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
        {
            ...indication.states({
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
            ...(props.active?.highlighted ? { hover: true } : {}),
        },
    );
    const { styles: s, selected, views: v } = slots;
    const id = (part: Part) =>
        testIdOf(menuOverlayAnatomy, KEYS(part) as Key, props.testId);
    const slot = forRow(props.slot, () => ({
        item: props.of ?? item,
        index: props.index,
        depth: props.depth,
    }));
    const icon = iconParts(slots, id, slot);
    const row = useRef<Measurable>(null);
    const labelRef = useRef<Measurable>(null);
    const label = (
        <v.itemLabel.Text
            {...slot.props("itemLabel")}
            ref={labelRef as never}
            selectable={false}
            style={slot.style("itemLabel", s.itemLabel)}
            testID={id("itemLabel")}
        >
            {item.label}
        </v.itemLabel.Text>
    );
    return (
        <v.item.Pressable
            {...slot.props("item")}
            ref={row as never}
            {...slot.with("item", indication.handlers)}
            role={
                props.measuring
                    ? undefined
                    : props.option
                      ? "option"
                      : item.type === undefined
                        ? "menuitem"
                        : `menuitem${item.type}`
            }
            {...(props.option
                ? {
                      "aria-selected": props.active
                          ? props.active.highlighted
                          : props.selected,
                  }
                : {})}
            {...(props.active
                ? { nativeID: props.active.id, focusable: false }
                : {})}
            {...(hasSubmenu(item) ? { "aria-haspopup": "menu" as const } : {})}
            {...(item.type === undefined || props.option
                ? {}
                : { "aria-checked": item.checked ?? false })}
            disabled={item.disabled}
            // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
            onPress={slot.on("item", "onPress", () => {
                if (item.type !== undefined)
                    item.onCheckedChange?.(
                        item.type === "radio" || !item.checked,
                    );
                props.onSelect(
                    item.value,
                    row.current,
                    "press",
                    labelRef.current,
                );
            })}
            {...(Platform.OS === "web" && props.option
                ? {
                      // React Native Web presses only a button on Space; an option takes it too.
                      onKeyDown: (event: {
                          nativeEvent: { key: string };
                          preventDefault(): void;
                      }) => {
                          if (event.nativeEvent.key !== " " || item.disabled)
                              return;
                          event.preventDefault();
                          props.onSelect(item.value, row.current);
                      },
                  }
                : {})}
            {...(Platform.OS === "web" && hasSubmenu(item)
                ? {
                      onKeyDown: (event: {
                          nativeEvent: { key: string };
                          preventDefault(): void;
                      }) => {
                          if (event.nativeEvent.key !== props.openKey) return;
                          event.preventDefault();
                          props.onSelect(
                              item.value,
                              row.current,
                              "key",
                              labelRef.current,
                          );
                      },
                  }
                : {})}
            style={slot.style("item", withUnselectable(s.item))}
            testID={id("item")}
        >
            {icon("itemLeading", item.leadingIcon)}
            <v.itemContent.View
                {...slot.props("itemContent")}
                style={slot.style("itemContent", s.itemContent)}
                testID={id("itemContent")}
            >
                {props.flip ? <Flip from={props.flip}>{label}</Flip> : label}
                {isPresent(item.supportingText) ? (
                    <v.itemSupportingText.Text
                        {...slot.props("itemSupportingText")}
                        selectable={false}
                        style={slot.style(
                            "itemSupportingText",
                            s.itemSupportingText,
                        )}
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
                    {...slot.props("itemTrailingText")}
                    selectable={false}
                    style={slot.style("itemTrailingText", s.itemTrailingText)}
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

// The theme's default spatial spring, or none under reduced motion.
function useSpatialSpring() {
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const { timeScale } = usePureform();
    return reducedMotion
        ? undefined
        : themeSpring("spatialDefault", tokens, timeScale);
}

const springing = (
    value: Animated.Value | Animated.ValueXY,
    to: number | { x: number; y: number },
    spring: NonNullable<ReturnType<typeof themeSpring>>,
) =>
    Animated.spring(value, {
        toValue: to as never,
        stiffness: spring.stiffness,
        damping: spring.damping,
        mass: spring.mass,
        overshootClamping: true,
        useNativeDriver: false,
    });

// A drilled menu's rows: a new level springs the menu's width and height from the last level's
// to its own, clipped meanwhile, as the web's does; at rest it has no size of its own. While it
// moves, the rows lay out at their own width (in a view as wide as the window), which it measures.
function DrillSize(props: {
    readonly level: string;
    readonly children: ReactNode;
}): ReactNode {
    const spring = useSpatialSpring();
    const { width: windowWidth } = useWindowDimensions();
    const size = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const natural = useRef({ width: 0, height: 0 });
    const pending = useRef(false);
    const [moving, setMoving] = useState(false);
    const first = useRef(true);
    useLayoutEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        if (!spring || natural.current.height <= 0) return;
        size.stopAnimation();
        size.setValue({ x: natural.current.width, y: natural.current.height });
        pending.current = true;
        setMoving(true);
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs once per level or opening; the spring and Animated values are read as it runs
    }, [props.level]);
    useEffect(() => () => size.stopAnimation(), [size]);
    return (
        <Animated.View
            style={
                moving
                    ? { width: size.x, height: size.y, overflow: "hidden" }
                    : undefined
            }
        >
            <View
                style={
                    moving
                        ? {
                              position: "absolute",
                              top: 0,
                              start: 0,
                              width: windowWidth,
                              alignItems: "flex-start",
                          }
                        : undefined
                }
            >
                <View
                    collapsable={false}
                    onLayout={(event: LayoutChangeEvent) => {
                        const { width, height } = event.nativeEvent.layout;
                        // At rest, the size it moves from next; moving, the new level's own.
                        if (!pending.current) {
                            if (!moving) natural.current = { width, height };
                            return;
                        }
                        if (!spring) return;
                        pending.current = false;
                        natural.current = { width, height };
                        springing(size, { x: width, y: height }, spring).start(
                            ({ finished }) => {
                                if (finished) setMoving(false);
                            },
                        );
                    }}
                >
                    {props.children}
                </View>
            </View>
        </Animated.View>
    );
}

// The rows of a drill step's new level but the one its label moves into: they fade in, on the
// spring the size moves on.
function FadeIn(props: { readonly children: ReactNode }): ReactNode {
    const spring = useSpatialSpring();
    const opacity = useRef(new Animated.Value(spring ? 0 : 1)).current;
    useLayoutEffect(() => {
        if (!spring) return;
        springing(opacity, 1, spring).start();
        return () => opacity.stopAnimation();
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs once per level or opening; the spring and Animated values are read as it runs
    }, []);
    return <Animated.View style={{ opacity }}>{props.children}</Animated.View>;
}

// Where a drill step's moving label was, in the window: the pressed item's going in (it moves
// into the header's), the header's going out (it moves into the submenu's item's).
interface DrillFlip {
    readonly x: number;
    readonly y: number;
    /** The row it moves into, by value. */
    readonly to: string;
}

// The label a drill step moves into: it starts where the moving label was and springs into its
// place (hidden until it's measured, so it doesn't show there first).
function Flip(props: {
    readonly from: DrillFlip;
    readonly children: ReactNode;
}): ReactNode {
    const spring = useSpatialSpring();
    const view = useRef<ComponentRef<typeof View>>(null);
    const offset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const [placed, setPlaced] = useState(!spring);
    useLayoutEffect(() => {
        if (!spring) return;
        view.current?.measureInWindow((x, y) => {
            offset.setValue({ x: props.from.x - x, y: props.from.y - y });
            setPlaced(true);
            springing(offset, { x: 0, y: 0 }, spring).start();
        });
        return () => offset.stopAnimation();
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs once per level or opening; the spring and Animated values are read as it runs
    }, [props.from]);
    return (
        <Animated.View
            ref={view}
            style={{
                opacity: placed ? 1 : 0,
                transform: offset.getTranslateTransform(),
            }}
        >
            {props.children}
        </Animated.View>
    );
}

function MenuImpl(
    props: MenuProps & {
        /** Its items alone, without the surface (container, elevation, width), for a view that
         *  draws its own, as the search view's content does. */
        readonly bare?: boolean;
        /** The container's frame, for a menu rendered through the portal host, which doesn't
         *  carry the container's context. */
        readonly containerFrame?: ContainerFrame;
        /** Laid out unseen to be measured (a submenu `auto` is deciding on). */
        readonly measuring?: boolean;
        /** Measures that container when the menu opens, as it may have moved since. */
        readonly measureContainer?: MeasureContainer;
        /** A listbox of options (the select's), with this id, rather than a menu. */
        readonly listbox?: MenuListboxOptions;
        /** How deep a cascaded submenu is: `1` for the menu's own submenus. */
        readonly depth?: number;
        /** The owning overlay's logical visibility, without animating the surface a second time. */
        readonly shown?: boolean;
    },
): ReactNode {
    const nativeSlots = useNativeSlotReader("menu");
    const engine = useEngine();
    const visible = props.shown ?? props.open ?? true;
    const rtl = useDirection() === "rtl";
    const window_ = useWindowDimensions();
    const auto = props.submenu === undefined || props.submenu === "auto";
    const inherited = useContainerFrame(props.container);
    const inheritedMeasure = useMeasureContainer(props.container);
    const measureContainer = props.measureContainer ?? inheritedMeasure;
    const surface = useRef<ComponentRef<typeof View>>(null);
    // The last menu box and container frame seen, which stand in when a measure at the press
    // fails; they're kept in refs, so caching them renders nothing.
    const box = useRef<{ left: number; right: number } | undefined>(undefined);
    const cachedFrame = useRef(props.containerFrame ?? inherited);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks and gestures that run after render
    cachedFrame.current = props.containerFrame ?? inherited;
    const cacheBox = () =>
        surface.current?.measureInWindow((x, _y, width) => {
            if (width > 0) box.current = { left: x, right: x + width };
        });
    // The menu's box and what bounds a submenu as of now (the window and the container):
    // measured when a submenu opens, so the mode is decided once and doesn't change while it's
    // shown.
    const boundsNow = async (): Promise<SubmenuBounds | undefined> => {
        const [menu, frame] = await Promise.all([
            new Promise<{ left: number; right: number } | undefined>((done) =>
                surface.current
                    ? surface.current.measureInWindow((x, _y, width) =>
                          done(
                              width > 0
                                  ? { left: x, right: x + width }
                                  : undefined,
                          ),
                      )
                    : done(undefined),
            ),
            measureContainer
                ? measureContainer().catch(() => undefined)
                : Promise.resolve(undefined),
        ]);
        const within = frame ?? cachedFrame.current;
        const at = menu ?? box.current;
        return (
            at && {
                menu: at,
                boundary: {
                    left: Math.max(0, within?.x ?? 0),
                    right: Math.min(
                        window_.width,
                        within ? within.x + within.width : window_.width,
                    ),
                    top: Math.max(0, within?.y ?? 0),
                    bottom: Math.min(
                        window_.height,
                        within ? within.y + within.height : window_.height,
                    ),
                },
            }
        );
    };
    // A submenu `auto` is deciding on: laid out unseen, at its own size, then cascaded or
    // drilled into.
    const [measuring, setMeasuring] = useState<{
        readonly item: MenuItem<ReactNode>;
        readonly row: WindowRect;
        readonly element: Measurable;
        readonly label: Measurable | null;
        readonly how: SelectHow;
        readonly bounds: SubmenuBounds | undefined;
    }>();
    // The submenu items drilled into, outermost first.
    const [path, setPath] = useState<readonly string[]>([]);
    // The submenu cascading beside its item's row.
    const [beside, setBeside] = useState<{
        readonly item: MenuItem<ReactNode>;
        readonly row: WindowRect;
        // The row's element, which focus goes back to; set when the key opened it.
        readonly from?: Measurable;
    }>();
    // The drill step under way: where its moving label was.
    const [flip, setFlip] = useState<DrillFlip>();
    // Into a level or out of one: the moving label (the pressed item's, or the back row's) is
    // noted where it is, then the level changes.
    const drillTo = (
        next: readonly string[],
        value: string,
        label: Measurable | null,
    ) => {
        const to = next.length > path.length ? MENU_BACK_VALUE : path.at(-1)!;
        if (!label) {
            setFlip(undefined);
            return setPath(next);
        }
        label.measureInWindow((x, y) => {
            setFlip({ x, y, to });
            setPath(next);
        });
    };
    const level = menuDrillLevel(props.items ?? [], props.groups ?? [], path);
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
        (
            value: string,
            row: Measurable | null,
            how: SelectHow = "press",
            label: Measurable | null = row,
        ) => {
            // Once drilled into, it stays a drill; a cascade or `auto` is decided as a submenu
            // opens.
            const pick = () =>
                menuDrillPick(
                    props.items ?? [],
                    props.groups ?? [],
                    path,
                    value,
                );
            if (props.submenu === "drill" || path.length > 0) {
                const next = pick();
                if (next) return drillTo(next, value, label);
            }
            const chosen = shown.find((entry) => entry.value === value);
            if (chosen && hasSubmenu(chosen)) {
                if (beside?.item.value === value)
                    return how === "press" ? setBeside(undefined) : undefined;
                if (!row) return undefined;
                const bounds = auto ? boundsNow() : Promise.resolve(undefined);
                return row.measureInWindow((x, y, width, height) => {
                    const rect = { x, y, width, height };
                    void bounds.then((bounds) => {
                        if (auto)
                            return setMeasuring({
                                item: chosen,
                                row: rect,
                                element: row,
                                label,
                                how,
                                bounds,
                            });
                        setBeside({
                            item: chosen,
                            row: rect,
                            ...(how === "key" ? { from: row } : {}),
                        });
                    });
                });
            }
            setBeside(undefined);
            props.onSelect?.({ value });
        },
    );
    // The submenu laid out unseen: it cascades when it fits, else the menu drills into it.
    const decide = (width: number, height: number) => {
        const shownNow = measuring;
        if (!shownNow) return;
        setMeasuring(undefined);
        const { item: chosen, row, element, label, how, bounds } = shownNow;
        const room =
            bounds &&
            width > 0 &&
            menuSubmenuRoomOf(bounds.menu, bounds.boundary, {
                row: { top: row.y, bottom: row.y + row.height },
                size: { width, height },
            });
        if (menuSubmenuMode(props.submenu, room || undefined) === "drill") {
            const next = menuDrillPick(
                props.items ?? [],
                props.groups ?? [],
                path,
                chosen.value,
            );
            if (next) return drillTo(next, chosen.value, label);
        }
        setBeside({
            item: chosen,
            row,
            ...(how === "key" ? { from: element } : {}),
        });
    };
    // Out of any submenu once it closes.
    useEffect(() => {
        if (!visible) {
            // oxlint-disable-next-line react/set-state-in-effect -- a closed menu forgets its drill path and measures once the app closes it
            setMeasuring(undefined);
            setPath([]);
            setFlip(undefined);
            setBeside(undefined);
        }
    }, [visible]);
    const { styles: s, views: v } = useComponentSlots<Part>("menu", selection);
    const presence = useOverlayPresence(props.open, "popup");
    // The cascaded submenu grows in and fades out as the menu does: the last one shown stays
    // while it goes.
    const lastBeside = useRef(beside);
    // oxlint-disable-next-line react/refs -- the last side the submenu showed beside, kept while it leaves
    if (beside) lastBeside.current = beside;
    const cascade = useOverlayPresence(
        visible && beside !== undefined,
        "popup",
    );
    if (!presence.present) return null;
    const id = (part: Part) =>
        testIdOf(menuOverlayAnatomy, KEYS(part) as Key, props.testId);
    const slot = nativeSlots(props, KEYS);
    // oxlint-disable-next-line react/refs -- the last side the submenu showed beside, kept while it leaves
    const shownBeside = lastBeside.current;
    // During a drill step, the row its label moves into takes it (`flip`), and the others fade
    // in (`FadeIn`, remounted for each step's level).
    const step = flip ? path.join("\u0000") : undefined;
    const fadeIn = (key: string, node: ReactNode) =>
        step === undefined ? (
            node
        ) : (
            <FadeIn key={`${step}\u0000${key}`}>{node}</FadeIn>
        );
    const depth = (props.depth ?? 0) + level.depth;
    const item = (entry: MenuItem<ReactNode>, index: number) =>
        flip?.to === entry.value
            ? row(entry, index)
            : fadeIn(entry.value, row(entry, index));
    const row = (entry: MenuItem<ReactNode>, index: number) => (
        <Item
            key={entry.value}
            slot={slot}
            item={entry}
            index={index}
            depth={depth}
            {...(index < 0 && submenu ? { of: submenu } : {})}
            flip={flip?.to === entry.value ? flip : undefined}
            selection={selection}
            indication={props.indication}
            testId={props.testId}
            selected={props.value === entry.value}
            onSelect={select}
            openKey={rtl ? "ArrowLeft" : "ArrowRight"}
            option={props.listbox !== undefined}
            measuring={props.measuring ?? false}
            {...(props.listbox?.active
                ? {
                      active: {
                          id: props.listbox.active.idOf(entry.value),
                          highlighted:
                              props.listbox.active.value === entry.value,
                      },
                  }
                : {})}
        />
    );
    // A menu that may drill springs its height from level to level.
    const drills = (rows: ReactNode) =>
        props.bare || props.submenu === "cascade" ? (
            rows
        ) : (
            <DrillSize level={path.join("\u0000")}>{rows}</DrillSize>
        );
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = props.open === undefined ? v.root : engine;
    return (
        <Root.View
            {...slot.props("root")}
            {...slot.with("root", presence.props)}
            {...(auto
                ? {
                      ref: surface,
                      onLayout: (event: LayoutChangeEvent) => {
                          (
                              presence.props.onLayout as
                                  | ((event: LayoutChangeEvent) => void)
                                  | undefined
                          )?.(event);
                          cacheBox();
                      },
                  }
                : {})}
            {...(props.measuring
                ? {}
                : { role: props.listbox ? "listbox" : "menu" })}
            {...(props.listbox ? { nativeID: props.listbox.id } : {})}
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={slot.style(
                "root",
                props.bare ? presence.style : { ...s.root, ...presence.style },
            )}
            testID={id("root")}
        >
            {drills(
                <>
                    {submenu ? (
                        <>
                            {item(
                                {
                                    value: MENU_BACK_VALUE,
                                    label: submenu.label,
                                    leadingIcon: "‹",
                                    mirrorLeadingIcon: true,
                                    closeOnSelect: false,
                                },
                                -1,
                            )}
                            {level.items.map(item)}
                        </>
                    ) : null}
                    {submenu ? null : level.items.map(item)}
                    {level.groups.map((group) => (
                        <v.itemGroup.View
                            {...slot.props("itemGroup")}
                            key={group.id}
                            role="group"
                            {...(typeof group.label === "string"
                                ? { "aria-label": group.label }
                                : {})}
                            style={slot.style("itemGroup", s.itemGroup)}
                            testID={id("itemGroup")}
                        >
                            {isPresent(group.label)
                                ? fadeIn(
                                      `${group.id}\u0000label`,
                                      <v.itemGroupLabel.Text
                                          {...slot.props("itemGroupLabel")}
                                          selectable={false}
                                          style={slot.style(
                                              "itemGroupLabel",
                                              s.itemGroupLabel,
                                          )}
                                          testID={id("itemGroupLabel")}
                                      >
                                          {group.label}
                                      </v.itemGroupLabel.Text>,
                                  )
                                : null}
                            {group.items.map(item)}
                        </v.itemGroup.View>
                    ))}
                </>,
            )}
            {measuring ? (
                <Portal layer="menu">
                    <View
                        aria-hidden
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            opacity: 0,
                        }}
                        onLayout={(event: LayoutChangeEvent) =>
                            decide(
                                event.nativeEvent.layout.width,
                                event.nativeEvent.layout.height,
                            )
                        }
                    >
                        <Surface
                            {...props}
                            items={measuring.item.items}
                            groups={undefined}
                            grouped={false}
                            open={undefined}
                            submenu="cascade"
                            measuring
                        />
                    </View>
                </Portal>
            ) : null}
            {cascade.present && shownBeside ? (
                // Beside its item, over the page; the menu's own layer under it takes a press
                // outside both.
                <Portal layer="menu">
                    <Anchored
                        // oxlint-disable-next-line react/refs -- the last side the submenu showed beside, kept while it leaves
                        anchor={shownBeside.row}
                        positioning={submenuPositioning(rtl ? "rtl" : "ltr")}
                        placement="right-start"
                        gutter={0}
                    >
                        {(placed) => (
                            <engine.View
                                {...cascade.props}
                                style={{
                                    // A closing submenu takes no more presses.
                                    pointerEvents:
                                        visible && beside ? "auto" : "none",
                                    ...(placed
                                        ? {
                                              transformOrigin:
                                                  placed.transformOrigin,
                                          }
                                        : {}),
                                    ...cascade.style,
                                }}
                            >
                                <MenuKeys
                                    // oxlint-disable-next-line jsx-a11y/no-autofocus -- an opened menu takes focus, as the menu pattern asks
                                    autoFocus={shownBeside.from !== undefined}
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
                                        const from = shownBeside.from;
                                        setBeside(undefined);
                                        from?.focus?.();
                                        return true;
                                    }}
                                >
                                    <Surface
                                        {...props}
                                        items={shownBeside.item.items}
                                        groups={undefined}
                                        grouped={false}
                                        open={undefined}
                                        shown={visible && beside !== undefined}
                                        depth={depth + 1}
                                        onSelect={(details) => {
                                            setBeside(undefined);
                                            props.onSelect?.(details);
                                        }}
                                        aria-label={
                                            typeof shownBeside.item.label ===
                                            "string"
                                                ? shownBeside.item.label
                                                : undefined
                                        }
                                    />
                                </MenuKeys>
                            </engine.View>
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

/** A listbox's id, and, for one whose focus stays in its combobox (an autocomplete's), the
 *  option highlighted there (`aria-activedescendant`) and each option's id. */
export interface MenuListboxOptions {
    readonly id: string;
    readonly active?: {
        readonly value: string | undefined;
        readonly idOf: (value: string) => string;
    };
}

/** The menu's surface as a listbox of options with this id, each saying whether it's the
 *  `value` (`aria-selected`): the select's list. Given `listbox.active`, an option says
 *  `aria-selected` while it's the highlighted one instead, and takes no focus (the
 *  autocomplete's, as WAI-ARIA APG's list autocomplete). */
export function MenuListbox(
    props: Omit<MenuProps, "trigger" | "contextTrigger"> & {
        readonly listbox: MenuListboxOptions;
    },
): ReactNode {
    return <Surface {...props} />;
}

// The items' elements on the web, where the keyboard moves between them.
interface WebElement {
    focus(): void;
    readonly textContent: string | null;
    querySelectorAll(selector: string): ArrayLike<WebElement>;
    getAttribute(name: string): string | null;
}

const ITEM = ["menuitem", "menuitemcheckbox", "menuitemradio", "option"]
    .map((role) => `[role="${role}"]:not([aria-disabled="true"])`)
    .join(", ");

// A menu's items on the web: it takes focus on its chosen option or else its first item (given
// `autoFocus`; given `search` too, on the first item whose text starts with it), and the arrow
// keys, Home, and End move it, and typing goes to the next item starting with what's typed (a
// moment's pause starts again; one letter again and again goes round those starting with it), as
// WAI-ARIA APG's menus and listboxes do. `onKey` hears the other keys first, and takes those it
// returns true for. A cascaded submenu is another portal entry, so it has its own.
export function MenuKeys(props: {
    readonly autoFocus: boolean;
    readonly search?: string | undefined;
    readonly onKey?: ((key: string) => boolean) | undefined;
    readonly children: ReactNode;
}): ReactNode {
    const root = useRef<ComponentRef<typeof View>>(null);
    const typed = useRef(typeahead());
    const items = () =>
        Array.from(
            (root.current as unknown as WebElement | null)?.querySelectorAll(
                ITEM,
            ) ?? [],
        );
    useEffect(() => {
        if (Platform.OS !== "web" || !props.autoFocus) return;
        const all = items();
        (
            (props.search ? findTyped(all, -1, props.search) : undefined) ??
            all.find((item) => item.getAttribute("aria-selected") === "true") ??
            all[0]
        )?.focus();
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- focuses an item once, as the keys mount; the search is read as it runs
    }, []);
    const onKeyDown = (event: {
        nativeEvent: {
            key: string;
            altKey?: boolean;
            ctrlKey?: boolean;
            metaKey?: boolean;
        };
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
        if (!isTypedKey(event.nativeEvent)) return;
        const search = typed.current(key);
        const found = findTyped(all, search.length > 1 ? at - 1 : at, search);
        if (!found) return;
        event.preventDefault();
        found.focus();
    };
    return (
        <View ref={root} {...(Platform.OS === "web" ? { onKeyDown } : {})}>
            {props.children}
        </View>
    );
}

/** Whether a key types a character (no modifier but Shift), for type-to-find. */
export const isTypedKey = (key: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
}): boolean =>
    key.key.length === 1 &&
    key.key !== " " &&
    !key.altKey &&
    !key.ctrlKey &&
    !key.metaKey;

/** What's been typed for type-to-find: each key added within half a second of the last, else
 *  starting again; one letter typed again and again stays that letter, to go round the items
 *  starting with it. */
export const typeahead = (now: () => number = () => Date.now()) => {
    let text = "";
    let at = -Infinity;
    return (key: string): string => {
        const time = now();
        text = time - at > 500 ? key : text + key;
        at = time;
        const lower = text.toLocaleLowerCase();
        return lower.split("").every((letter) => letter === lower[0])
            ? lower[0]!
            : lower;
    };
};

// An item's text for type-to-find: its words, without the icons before them.
const textOf = (item: WebElement): string =>
    (item.textContent ?? "")
        .replace(/^[^\p{L}\p{N}]+/u, "")
        .toLocaleLowerCase();

/** The first of `all` after index `from` (going round) whose text starts with `search`. */
const findTyped = (
    all: readonly WebElement[],
    from: number,
    search: string,
): WebElement | undefined => {
    const lower = search.toLocaleLowerCase();
    for (let step = 1; step <= all.length; step++) {
        const item = all[(from + step + all.length) % all.length]!;
        if (textOf(item).startsWith(lower)) return item;
    }
    return undefined;
};

// The open menu, placed: on the web it takes focus on its first item, the keys move it, and Tab
// closes it.
function Popup(props: {
    readonly onClose: () => void;
    readonly children: ReactNode;
}): ReactNode {
    return (
        <MenuKeys
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- an opened menu takes focus, as the menu pattern asks
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
    readonly slot: PartSlots;
    readonly children: ReactNode;
}): ReactNode {
    const { slot } = props;
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
            {...slot.props("contextTrigger")}
            accessible={false}
            focusable={false}
            onLongPress={slot.on(
                "contextTrigger",
                "onLongPress",
                (event: GestureResponderEvent) =>
                    props.onOpen(
                        pointAt(
                            event.nativeEvent.pageX,
                            event.nativeEvent.pageY,
                        ),
                    ),
            )}
            style={slot.style("contextTrigger", undefined)}
            testID={props.testID}
            {...(slot.with("contextTrigger", webProps) as object)}
        >
            {props.children}
        </Pressable>
    );
}

function MenuOverlay(props: MenuProps): ReactNode {
    const nativeSlots = useNativeSlotReader("menu");
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
    const slot = nativeSlots(props, KEYS);
    const testId = props.testId as TestIdOverride<Key> | undefined;
    const container = useContainerFrame(props.container);
    const measureContainer = useMeasureContainer(props.container);
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
                    {...triggerButtonProps(slot, testId)}
                    label={trigger}
                    onPress={given.onPress}
                    interactionSource={source}
                    aria-haspopup={given["aria-haspopup"]}
                    aria-expanded={given["aria-expanded"]}
                />
            )}
            {contextTrigger === undefined ? null : (
                <ContextTrigger
                    onOpen={opened}
                    slot={slot}
                    testID={testIdOf(
                        menuOverlayAnatomy,
                        "contextTrigger",
                        testId,
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
                                    <Surface
                                        {...surface}
                                        shown={open}
                                        {...(container
                                            ? { containerFrame: container }
                                            : {})}
                                        {...(measureContainer
                                            ? { measureContainer }
                                            : {})}
                                        onSelect={select}
                                    />
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
