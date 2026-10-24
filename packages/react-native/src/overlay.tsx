// What the overlays that open over the page share: where one goes against its trigger (the side
// and alignment, flipped where there's no room and shifted to stay on screen), the trigger's box
// from its interactions, and dismissing the topmost with Android's back button or Escape on the
// web.

import type {
    ChangeDetails,
    OverlayPlacement,
    OverlayPositioning,
} from "@pureform/binding-core";
import type {
    InteractionSource,
    MutableInteractionSource,
} from "@pureform/binding-core/interaction";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
    BackHandler,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import type { LayoutChangeEvent } from "react-native";

import {
    locatedView,
    subscribeLocated,
    useInteractionSource,
} from "./interaction";
import { useControllable, useStableCallback } from "./parts";
import { useHostBounds, usePortalHost } from "./portal-host";
import type { EdgeInsets, WindowRect } from "./portal-host";
import { usePresence } from "./presence";
import type { OverlayDelay, OverlayMotionName, Presence } from "./presence";
import { useDirection } from "./provider";

/** Where an overlay went: its top left corner in the host's layer, the side of the trigger it
 *  opened on, and the point it grows from, in its own box. */
export interface Placed {
    readonly left: number;
    readonly top: number;
    readonly side: "top" | "bottom" | "left" | "right";
    readonly transformOrigin: string;
}

/** What `placeOverlay` takes. Boxes are in the window. */
export interface PlaceOptions {
    /** The trigger's box. */
    readonly anchor: WindowRect;
    /** The overlay's size. */
    readonly size: { readonly width: number; readonly height: number };
    /** The host's layer, which the overlay stays inside. */
    readonly bounds: WindowRect;
    /** What it keeps clear of at each edge, inside `bounds`. */
    readonly insets?: EdgeInsets | undefined;
    readonly placement: OverlayPlacement;
    /** The gap between the trigger and the overlay. */
    readonly gutter: number;
    /** Open on the other side when there's no room. */
    readonly flip: boolean;
    /** Right to left: `start` and `end` swap sides. */
    readonly rtl: boolean;
    /** How close it comes to an edge. */
    readonly padding: number;
}

const OPPOSITE = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
} as const;

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(value, Math.max(min, max)));

/** Where an overlay goes against its trigger, as Zag's positioner places it on the web: on the
 *  placement's side, `gutter` away, aligned to the trigger's start, center, or end; on the
 *  other side when it doesn't fit and the other has more room; and shifted to stay inside the
 *  bounds. */
export function placeOverlay(options: PlaceOptions): Placed {
    const { anchor, size, gutter, padding } = options;
    const insets = options.insets ?? { top: 0, right: 0, bottom: 0, left: 0 };
    const area = {
        left: options.bounds.x + insets.left + padding,
        top: options.bounds.y + insets.top + padding,
        right: options.bounds.x + options.bounds.width - insets.right - padding,
        bottom:
            options.bounds.y + options.bounds.height - insets.bottom - padding,
    };
    const [given, alignment = "center"] = options.placement.split("-") as [
        Placed["side"],
        ("start" | "end")?,
    ];
    const room = {
        top: anchor.y - gutter - area.top,
        bottom: area.bottom - (anchor.y + anchor.height + gutter),
        left: anchor.x - gutter - area.left,
        right: area.right - (anchor.x + anchor.width + gutter),
    };
    const needs =
        given === "top" || given === "bottom" ? size.height : size.width;
    const side =
        options.flip &&
        room[given] < needs &&
        room[OPPOSITE[given]] > room[given]
            ? OPPOSITE[given]
            : given;
    const vertical = side === "top" || side === "bottom";
    // `start` is the reading direction's start along a top or bottom side.
    const align =
        vertical && options.rtl && alignment !== "center"
            ? alignment === "start"
                ? "end"
                : "start"
            : alignment;
    const along = (start: number, length: number, own: number) =>
        align === "start"
            ? start
            : align === "end"
              ? start + length - own
              : start + (length - own) / 2;
    let x: number;
    let y: number;
    if (vertical) {
        x = along(anchor.x, anchor.width, size.width);
        y =
            side === "bottom"
                ? anchor.y + anchor.height + gutter
                : anchor.y - gutter - size.height;
        x = clamp(x, area.left, area.right - size.width);
    } else {
        y = along(anchor.y, anchor.height, size.height);
        x =
            side === "right"
                ? anchor.x + anchor.width + gutter
                : anchor.x - gutter - size.width;
        y = clamp(y, area.top, area.bottom - size.height);
    }
    // It grows from the trigger: the middle of the side that faces it, as near the trigger's
    // center as its box allows.
    const originX = vertical
        ? clamp(anchor.x + anchor.width / 2 - x, 0, size.width)
        : side === "right"
          ? 0
          : size.width;
    const originY = vertical
        ? side === "bottom"
            ? 0
            : size.height
        : clamp(anchor.y + anchor.height / 2 - y, 0, size.height);
    return {
        left: x - options.bounds.x,
        top: y - options.bounds.y,
        side,
        transformOrigin: `${Math.round(originX)}px ${Math.round(originY)}px`,
    };
}

// A view a trigger's interaction happened on: React Native's (and React Native Web's, which adds
// the method to its elements) measures itself in the window.
interface Measurable {
    measureInWindow(
        done: (x: number, y: number, width: number, height: number) => void,
    ): void;
}

const isMeasurable = (value: unknown): value is Measurable =>
    typeof (value as Partial<Measurable> | null)?.measureInWindow ===
    "function";

/** A trigger, from its interactions. */
export interface TriggerAnchor {
    /** Calls back with the trigger's box in the window: the view it was last pressed, hovered,
     *  or focused on, else the point it was last pressed at, else the view it was laid out on
     *  (an overlay open from the start), else `undefined`. */
    measure(done: (anchor: WindowRect | undefined) => void): void;
    /** Focuses the trigger's view, where it can take focus (the web). */
    focus(): void;
}

/** The trigger whose interactions `source` carries. */
export function useAnchor(source: InteractionSource): TriggerAnchor {
    const last = useRef<{
        view?: Measurable;
        point?: { readonly x: number; readonly y: number };
    }>({});
    useEffect(
        () =>
            source.subscribe((interaction, _state, origin) => {
                if (isMeasurable(origin)) last.current.view = origin;
                if (
                    interaction.type === "press" &&
                    interaction.origin !== "center"
                ) {
                    last.current.point = interaction.origin;
                }
            }),
        [source],
    );
    return useMemo(
        () => ({
            measure(done) {
                const { view, point } = last.current;
                const laid = locatedView(source);
                const measurable =
                    view ??
                    (point === undefined && isMeasurable(laid)
                        ? laid
                        : undefined);
                if (measurable) {
                    measurable.measureInWindow((x, y, width, height) =>
                        done({ x, y, width, height }),
                    );
                } else {
                    done(point ? { ...point, width: 0, height: 0 } : undefined);
                }
            },
            focus() {
                const view = last.current.view as
                    | Partial<{ focus(): void }>
                    | undefined;
                view?.focus?.();
            },
        }),
        [source],
    );
}

/** The trigger's box while an overlay is `open` (pending while it's measured; `undefined` once
 *  closed and gone, by `present`): measured as it opens, and again once the trigger is laid out
 *  if it wasn't found then (an overlay open from the start, before its trigger's first layout). */
export function useMeasuredAnchor(
    open: boolean,
    present: boolean,
    source: InteractionSource,
    anchor: TriggerAnchor,
): { readonly rect: WindowRect | undefined } | undefined {
    const [measured, setMeasured] = useState<
        { readonly rect: WindowRect | undefined } | undefined
    >();
    useLayoutEffect(() => {
        if (!open) return;
        let current = true;
        anchor.measure((rect) => current && setMeasured({ rect }));
        return () => {
            current = false;
        };
    }, [open, anchor]);
    const lost = open && measured !== undefined && measured.rect === undefined;
    useEffect(() => {
        if (!lost) return undefined;
        let current = true;
        const remeasure = () =>
            anchor.measure((rect) => current && rect && setMeasured({ rect }));
        const stop = subscribeLocated(source, remeasure);
        // It may have been laid out since it was measured.
        remeasure();
        return () => {
            current = false;
            stop();
        };
    }, [lost, source, anchor]);
    if (!present && measured) setMeasured(undefined);
    return measured;
}

// The overlays Android's back button or Escape would close, the topmost last.
const dismissers: (() => void)[] = [];
let detach: (() => void) | undefined;

const onKey = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || dismissers.length === 0) return;
    // Before a `Modal`'s own Escape (React Native Web's, on the document as the key comes up).
    event.stopPropagation();
    dismissTopOverlay();
};

const attach = (): (() => void) => {
    if (Platform.OS === "web") {
        const target = globalThis.window;
        if (!target) return () => {};
        target.addEventListener("keyup", onKey, true);
        return () => target.removeEventListener("keyup", onKey, true);
    }
    const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        dismissTopOverlay,
    );
    return () => subscription.remove();
};

/** Closes the topmost overlay that Android's back button or Escape closes, if one is open.
 *  Returns whether one was. A `Modal`'s `onRequestClose` calls it, since the `Modal` takes the
 *  back button while it shows. */
export function dismissTopOverlay(): boolean {
    const top = dismissers.at(-1);
    if (!top) return false;
    top();
    return true;
}

/** While `active`, Android's back button and Escape (on the web) call `dismiss`, if it's the
 *  topmost overlay so registered. */
export function useDismiss(active: boolean, dismiss: () => void): void {
    const latest = useStableCallback(dismiss);
    useEffect(() => {
        if (!active) return undefined;
        const entry = () => latest();
        dismissers.push(entry);
        detach ??= attach();
        return () => {
            dismissers.splice(dismissers.indexOf(entry), 1);
            if (dismissers.length === 0) {
                detach?.();
                detach = undefined;
            }
        };
    }, [active, latest]);
}

/** What `Anchored` takes. */
export interface AnchoredProps {
    /** The trigger's box in the window; `undefined` places it at the layer's center. */
    readonly anchor: WindowRect | undefined;
    readonly positioning: OverlayPositioning | undefined;
    readonly placement: OverlayPlacement;
    readonly gutter: number;
    /** A press outside closes it: a layer under it takes the press. */
    readonly onPressOutside?: (() => void) | undefined;
    /** It takes presses itself. Default true. */
    readonly interactive?: boolean | undefined;
    /** Renders it with its placement: its position, and the point it grows from. */
    readonly children: (placed: Placed | undefined) => ReactNode;
}

const OUTSIDE = StyleSheet.absoluteFill;

/** An overlay in the host's layer, against its trigger: hidden until it knows its size and the
 *  layer's box, then placed. */
export function Anchored(props: AnchoredProps): ReactNode {
    const host = usePortalHost();
    const bounds = useHostBounds(host);
    const rtl = useDirection() === "rtl";
    const [size, setSize] = useState<{ width: number; height: number }>();
    const positioning = props.positioning;
    const anchor =
        props.anchor ??
        (bounds && {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
            width: 0,
            height: 0,
        });
    const placed =
        bounds && size && anchor
            ? placeOverlay({
                  anchor,
                  size,
                  bounds,
                  insets: host?.insets,
                  placement: positioning?.placement ?? props.placement,
                  gutter: positioning?.gutter ?? props.gutter,
                  flip: positioning?.flip ?? true,
                  rtl,
                  padding: 8,
              })
            : undefined;
    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        if (size?.width !== width || size.height !== height) {
            setSize({ width, height });
        }
    };
    const interactive = props.interactive ?? true;
    return (
        <>
            {props.onPressOutside ? (
                <Pressable
                    accessible={false}
                    focusable={false}
                    style={OUTSIDE}
                    onPress={props.onPressOutside}
                />
            ) : null}
            <View
                pointerEvents={interactive ? "box-none" : "none"}
                onLayout={onLayout}
                style={{
                    position: "absolute",
                    left: placed?.left ?? 0,
                    top: placed?.top ?? 0,
                    ...(positioning?.sameWidth && props.anchor
                        ? { width: props.anchor.width }
                        : {}),
                    // Unseen until it's placed.
                    ...(placed ? {} : { opacity: 0 }),
                }}
            >
                {props.children(placed)}
            </View>
        </>
    );
}

/** The open state a trigger's overlay takes: controlled when `open` is defined. */
export interface AnchoredOverlayProps {
    readonly open?: boolean | undefined;
    readonly defaultOpen?: boolean | undefined;
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
}

/** A trigger's overlay (a menu, the FAB menu's items): whether it's open, the trigger's
 *  interaction source, its box when the overlay last opened (pending while it's measured), the
 *  overlay's presence, and `close` (which returns focus to the trigger on the web) and `toggle`
 *  for the trigger. The back button or Escape closes it. Render the overlay while
 *  `presence.present && measured`. */
export function useAnchoredOverlay(
    component: string,
    props: AnchoredOverlayProps,
    motion: OverlayMotionName = "popup",
    delay?: OverlayDelay,
): {
    readonly open: boolean;
    readonly source: MutableInteractionSource;
    readonly measured: { readonly rect: WindowRect | undefined } | undefined;
    readonly presence: Presence;
    readonly close: () => void;
    readonly toggle: () => void;
} {
    const [open, setOpen] = useControllable(
        component,
        "open",
        props.open,
        props.defaultOpen,
        props.onOpenChange,
        false,
    );
    const source = useInteractionSource();
    const anchor = useAnchor(source);
    const presence = usePresence(open, motion, delay);
    const measured = useMeasuredAnchor(open, presence.present, source, anchor);
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
    return { open, source, measured, presence, close, toggle };
}

/** A text field's popup opened by a button over its trailing icon (the autocomplete's
 *  suggestions, the docked date picker's calendar): the popup's presence, the `container` ref
 *  for the field (`Field`'s `container`), the field's box when the popup last opened, `show`
 *  (which measures it, then opens) and `close`, and the button's `onLayout` and `style`, which
 *  cover the trailing icon at the field's height. The back button or Escape closes it. Render
 *  the popup while `presence.present && anchor`. */
export function useFieldPopup(open: boolean, setOpen: (open: boolean) => void) {
    const presence = usePresence(open, "popup");
    const container = useRef<Measurable>(null);
    const [anchor, setAnchor] = useState<WindowRect>();
    const [height, setHeight] = useState(0);
    const show = () =>
        container.current?.measureInWindow((x, y, width, h) => {
            setAnchor({ x, y, width, height: h });
            if (!open) setOpen(true);
        });
    const close = useStableCallback(() => {
        if (open) setOpen(false);
    });
    useDismiss(open, close);
    // Open without `show` (from the start, or by its owner): placed once it's measured.
    useEffect(() => {
        if (!open || anchor) return;
        container.current?.measureInWindow((x, y, width, h) =>
            setAnchor({ x, y, width, height: h }),
        );
    }, [open, anchor]);
    return {
        presence,
        container,
        anchor,
        show,
        close,
        trigger: {
            onLayout: () =>
                container.current?.measureInWindow((_x, _y, _w, h) =>
                    setHeight(h),
                ),
            style: {
                position: "absolute",
                top: 0,
                end: 0,
                width: 48,
                height: height || 56,
            },
        },
    } as const;
}

/** A notification's timer (the snackbar's, a toast's): while `open`, `onTimeout` runs once
 *  `duration` ms pass, unless the pointer hovers it or a press holds it, which starts the time
 *  over. An infinite or `null` duration never runs out. Spread `holdProps` on a `Pressable` around
 *  the notification. */
export function useHeldTimeout(
    open: boolean,
    duration: number | null,
    onTimeout: () => void,
    alsoHeld = false,
) {
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);
    const held = hovered || pressed || alsoHeld;
    const timeout = useStableCallback(onTimeout);
    useEffect(() => {
        if (!open || held || duration === null || !Number.isFinite(duration)) {
            return undefined;
        }
        const timer = setTimeout(timeout, duration);
        return () => clearTimeout(timer);
    }, [open, held, duration, timeout]);
    return {
        holdProps: {
            accessible: false,
            focusable: false,
            onHoverIn: () => setHovered(true),
            onHoverOut: () => setHovered(false),
            onPressIn: () => setPressed(true),
            onPressOut: () => setPressed(false),
        },
    } as const;
}
