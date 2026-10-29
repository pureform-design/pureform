// The bottom sheet: its surface (the drag handle over the scrolling content), and, given a
// trigger, `onOpenChange`, or `defaultOpen`, the whole modal sheet. Without them, or with
// `modal={false}`, showing it is the app's, and given `open`, it enters and leaves in place; a
// standard sheet (`modal={false}`) given a trigger or `defaultOpen` keeps its own open state. A
// modal sheet opens in a `Modal` over a scrim, against the bottom edge: a press on the scrim, the
// drag handle, Escape, or the back button closes it, and so does a drag down on the handle past
// Compose's thresholds (`sheetRelease`: 56px past where it rested, or a flick). The sheet follows the drag down; a shorter
// drag lets it settle back on the theme's default spatial spring, carrying the release's velocity
// (at once under reduced motion), as Compose's sheets do. Unless `partiallyExpandable={false}`, a
// sheet taller than half the window opens with its top at half the window (or fully, as
// `expanded`/`defaultExpanded` say), and a drag (or a press on the handle) moves it between partly
// and fully open; a drag down from partly open closes it. A partly open sheet whose content or
// window changes size is placed again. The content scrolls in its own `ScrollView` either way.
// Given `onClose`, every way it closes by itself asks it first (Escape, the back button, the scrim, a press on the handle, a drag); a dismissing drag
// holds where it was let go until the answer, then leaves or settles back. Its `Modal` holds a
// portal host of its own, so menus, tooltips, and selects opened inside draw over it.

import {
    bottomSheetAnatomy,
    bottomSheetOverlayAnatomy,
} from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    bottomSheetSelection,
    closeAsker,
    sheetDragHandleLabel,
    sheetModal,
    sheetOpeningRest,
    sheetPartialOffset,
    sheetPartiallyExpandable,
    sheetRelease,
    partAsRoot,
} from "@pureform/binding-core";
import type {
    BottomSheetRestProps,
    SheetRest,
    OverlayCloseProps,
    CloseAsker,
    BottomSheetVariantProps,
    ChangeDetails,
} from "@pureform/binding-core";
import { settle } from "@pureform/rn-adapter/animated";
import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
    Animated,
    PanResponder,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import type { LayoutChangeEvent } from "react-native";

import { Button } from "../button/button";
import { DragHandle } from "../drag-handle/drag-handle";
import { ownText } from "../icon-style";
import { ModalScrimLayer, ModalWindow, useModalOverlay } from "../modal";
import {
    testIdOf,
    useControllable,
    useStableCallback,
    withEngine,
} from "../parts";
import { themeSpring, useOverlayPresence } from "../presence";
import { useEngine, usePureform } from "../provider";
import { resolveText } from "../resolve-text";
import { backdropKeys, useNativeSlotReader, overlayKeys } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import { triggerButtonProps } from "../trigger-button";

/** The sheet's parts this binding renders. */
type Part = PartName<typeof bottomSheetAnatomy>;
/** The parts as the web names them, which `style`, `slotProps` and `testId` take. */
type Key = PartName<typeof bottomSheetOverlayAnatomy>;
const KEYS = overlayKeys(bottomSheetOverlayAnatomy);

/** What a modal sheet gives the trigger it renders. */
export interface BottomSheetTriggerProps {
    /** Opens the sheet. */
    readonly onPress: () => void;
    readonly "aria-haspopup": "dialog";
    /** Whether it's open. */
    readonly "aria-expanded": boolean;
}

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface BottomSheetHosts {
    readonly trigger: "Pressable";
    readonly content: "View";
    readonly dragHandle: "View";
    readonly body: "View";
    readonly backdrop: "View";
}

export interface BottomSheetProps
    extends
        BottomSheetVariantProps,
        OverlayCloseProps,
        BottomSheetRestProps,
        NativeSlotProps<BottomSheetHosts> {
    /** The content, scrolling under the drag handle. */
    readonly children?: ReactNode;
    /** The content, as the web's ready-made sheet takes it; `children` wins when both are
     *  given. */
    readonly body?: ReactNode;
    /** Whether it shows the drag handle at its top edge. @default true */
    readonly dragHandle?: boolean | undefined;
    /** The drag handle's name. @default for what a press does: "Close sheet", or on a sheet
     *  moving between partly and fully open, "Expand sheet" or "Collapse sheet" */
    readonly dragHandleLabel?: string | undefined;
    /** What opens it, rendered in place: a label, for a `Button`, or a function rendering your
     *  own trigger with the `onPress` it's given. Given it (or `onOpenChange`, or
     *  `defaultOpen`), a modal sheet opens over the page; without, it's the surface alone. A
     *  standard sheet (`modal={false}`) given it, or `defaultOpen`, opens in place after it. */
    readonly trigger?:
        | ReactNode
        | ((trigger: BottomSheetTriggerProps) => ReactNode);
    /** Whether it shows. As a modal sheet, the open state, controlled when defined. As a
     *  surface: it comes in when this turns true and leaves when it turns false; without it,
     *  the surface is always shown, still. */
    readonly open?: boolean | undefined;
    /** As a modal sheet, whether it starts open. */
    readonly defaultOpen?: boolean | undefined;
    /** Called when it asks to open or close: its trigger, the scrim, the drag handle, Escape, or
     *  the back button. */
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** Whether Escape and the back button close it. Default true. */
    readonly closeOnEscape?: boolean | undefined;
    /** Its name, for assistive technology. */
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<Key | "backdrop"> | undefined;
}

const NEEDS_CLOSE: () => void = () => {};

function BottomSheetImpl(
    props: BottomSheetProps & {
        /** Closes the modal sheet holding it, without asking. */
        readonly close?: (() => void) | undefined;
        /** The modal sheet's asker, shared with its Escape and scrim. */
        readonly asker?: CloseAsker | undefined;
        /** Whether the modal sheet holding it is open. */
        readonly shown?: boolean | undefined;
    },
): ReactNode {
    const nativeSlots = useNativeSlotReader("bottomSheet");
    const engine = useEngine();
    const { styles: s, views: v } = useComponentSlots<Part>(
        "bottomSheet",
        bottomSheetSelection(props),
    );
    const presence = useOverlayPresence(props.open, "bottomSheet");
    const height = useRef(0);
    // A standard sheet asks to close through `onOpenChange`; showing it is the app's.
    const close =
        props.close ??
        (props.onOpenChange === undefined
            ? NEEDS_CLOSE
            : () => props.onOpenChange?.({ open: false }));
    const latestClose = useStableCallback(() => close());
    const [ownAsker] = useState(closeAsker);
    const asker = props.asker ?? ownAsker;
    // A press on the handle asks `onClose` first.
    const requestClose = useStableCallback(() =>
        asker.ask(props.onClose, latestClose, () => {}),
    );
    // How far down the drag has moved the sheet, apart from its enter and exit.
    const drag = useMemo(() => new Animated.Value(0), []);
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const { timeScale } = usePureform();
    const screen = useWindowDimensions();
    // How far down it rests partly open, or `undefined` when it can't (or is too short).
    const latestPartial = useStableCallback(() => {
        if (!sheetPartiallyExpandable(props)) return undefined;
        const offset = sheetPartialOffset(height.current, screen.height);
        return offset > 0 ? offset : undefined;
    });
    // Where it rests, and whether it can move between partly and fully open.
    const [rest, setRestState] = useState<{
        readonly rest: SheetRest;
        readonly movable: boolean;
    }>({ rest: "expanded", movable: false });
    const restAt = useRef<SheetRest>("expanded");
    // `report` is for moves of the user's (a drag, a press), not those the props cause.
    const latestSetRest = useStableCallback(
        (next: SheetRest, report = true) => {
            if (report && next !== restAt.current)
                props.onExpandedChange?.({ expanded: next === "expanded" });
            restAt.current = next;
            setRestState({
                rest: next,
                movable: latestPartial() !== undefined,
            });
        },
    );
    const latestRestOffset = useStableCallback(() =>
        restAt.current === "partial" ? (latestPartial() ?? 0) : 0,
    );
    const stopSettle = useRef<() => void>(() => {});
    const latestSettle = useStableCallback((velocity: number) => {
        stopSettle.current = settle(
            drag,
            velocity,
            reducedMotion
                ? undefined
                : themeSpring("spatialDefault", tokens, timeScale),
            latestRestOffset(),
        );
    });
    // Whether it's still open: the modal's state, or as a surface, its `open`.
    const shown = useRef(true);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks and gestures that run after render
    shown.current = (props.shown ?? props.open) !== false;
    // Each time it opens, it starts where it rests: partly open when it can, once it's laid out.
    const placing = useRef(false);
    const dragging = useRef(false);
    const latestPlace = useStableCallback(() => {
        placing.current = false;
        latestSetRest(
            latestPartial() === undefined
                ? "expanded"
                : sheetOpeningRest(props),
            false,
        );
        drag.setValue(latestRestOffset());
    });
    // Once open and placed, it rests where a controlled `expanded` says: when the prop changes,
    // and after a move the app didn't follow.
    useEffect(() => {
        if (
            props.expanded === undefined ||
            !shown.current ||
            placing.current ||
            dragging.current ||
            height.current <= 0 ||
            latestPartial() === undefined
        )
            return;
        const wanted: SheetRest = props.expanded ? "expanded" : "partial";
        if (wanted === restAt.current) return;
        stopSettle.current();
        latestSetRest(wanted, false);
        latestSettle(0);
    });
    // A sheet resting partly open whose content or window changes size is placed again: at the
    // new partial offset, or fully open if it's now too short to rest partly.
    const latestReplace = useStableCallback(() => {
        if (!shown.current || placing.current || dragging.current) return;
        stopSettle.current();
        if (restAt.current === "partial" && latestPartial() === undefined)
            latestSetRest("expanded", false);
        else latestSetRest(restAt.current, false);
        drag.setValue(latestRestOffset());
    });
    useEffect(() => {
        if (height.current > 0) latestReplace();
    }, [screen.height, latestReplace]);
    useEffect(() => {
        if (!shown.current) return;
        drag.setValue(0);
        if (height.current > 0) latestPlace();
        else placing.current = true;
    }, [props.shown, props.open, drag, latestPlace]);
    // After a drag asked it to close: once that render has committed, a sheet that stays (one
    // the app keeps open, or one that can't close) settles back.
    const [left, setLeft] = useState<{ readonly velocity: number }>();
    useEffect(() => {
        if (left && shown.current) latestSettle(left.velocity);
    }, [left, latestSettle]);
    const latestLeave = useStableCallback((velocity: number) => {
        latestClose();
        setLeft({ velocity });
    });
    // A dismissing drag asks `onClose` first; it holds where it was let go until the answer,
    // and an answer that comes later leaves or settles from rest speed.
    const latestDismiss = useStableCallback((velocity: number) => {
        let now = true;
        asker.ask(
            props.onClose,
            () => latestLeave(now ? velocity : 0),
            () => latestSettle(now ? velocity : 0),
        );
        now = false;
    });
    useEffect(
        () => () => {
            stopSettle.current();
            ownAsker.cancel();
        },
        [ownAsker],
    );
    // Let go, the handle's drag goes where `sheetRelease` says: on to the next place its way
    // once 56px past where it rested or on a flick, else back. Closing leaves from where the
    // drag left it.
    const from = useRef(0);
    const pan = useMemo(
        () =>
            // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gesture) =>
                    Math.abs(gesture.dy) > 4 &&
                    Math.abs(gesture.dy) > Math.abs(gesture.dx),
                onPanResponderGrant: () => {
                    asker.cancel();
                    stopSettle.current();
                    dragging.current = true;
                    from.current = latestRestOffset();
                },
                onPanResponderMove: (_, gesture) =>
                    drag.setValue(Math.max(0, from.current + gesture.dy)),
                onPanResponderRelease: (_, gesture) => {
                    dragging.current = false;
                    const to = sheetRelease({
                        offset: Math.max(0, from.current + gesture.dy),
                        velocity: gesture.vy,
                        height: height.current,
                        partial: latestPartial(),
                    });
                    if (to === "closed") latestDismiss(gesture.vy);
                    else {
                        latestSetRest(to);
                        latestSettle(gesture.vy);
                    }
                },
                onPanResponderTerminate: (_, gesture) => {
                    dragging.current = false;
                    latestSettle(gesture.vy);
                },
            }),
        [
            latestDismiss,
            latestSettle,
            latestSetRest,
            latestRestOffset,
            latestPartial,
            drag,
            asker,
        ],
    );
    // A press on the handle of a sheet that can rest partly open moves it between partly and
    // fully open; otherwise it asks to close.
    const pressHandle = useStableCallback(() => {
        if (latestPartial() === undefined) {
            requestClose();
            return;
        }
        stopSettle.current();
        latestSetRest(restAt.current === "partial" ? "expanded" : "partial");
        latestSettle(0);
    });
    const id = (part: Part) =>
        testIdOf(bottomSheetOverlayAnatomy, KEYS(part) as Key, props.testId);
    const slot = nativeSlots(props, KEYS);
    if (!presence.present) return null;
    const Root = props.open === undefined ? v.root : engine;
    // The drag moves a plain Animated view around the surface, apart from the engine's enter
    // and exit on the surface itself. The view takes the surface's place in its parent's layout
    // (its size, margins, position and layer), and the surface fills it.
    const [placed, own] = placement(s.root ?? {});
    const content = props.children ?? props.body;
    return (
        <Animated.View style={[placed, { transform: [{ translateY: drag }] }]}>
            <Root.View
                {...slot.props("root")}
                {...slot.with("root", presence.props)}
                role="dialog"
                {...(props["aria-label"] === undefined
                    ? {}
                    : { "aria-label": props["aria-label"] })}
                onLayout={(event: LayoutChangeEvent) => {
                    const was = height.current;
                    height.current = event.nativeEvent.layout.height;
                    if (placing.current) latestPlace();
                    else if (was > 0 && was !== height.current) latestReplace();
                    (
                        presence.props.onLayout as
                            | ((event: LayoutChangeEvent) => void)
                            | undefined
                    )?.(event);
                }}
                style={slot.style("root", { ...own, ...presence.style })}
                testID={id("root")}
            >
                {props.dragHandle === false ? null : (
                    <v.dragHandle.View
                        {...slot.props("dragHandle")}
                        {...slot.with("dragHandle", pan.panHandlers)}
                        style={slot.style("dragHandle", s.dragHandle)}
                        testID={id("dragHandle")}
                    >
                        <DragHandle
                            aria-label={
                                props.dragHandleLabel ??
                                sheetDragHandleLabel(rest.rest, rest.movable)
                            }
                            onPress={pressHandle}
                        />
                    </v.dragHandle.View>
                )}
                {typeof content === "string" ? (
                    <v.content.Text
                        {...slot.props("content")}
                        style={slot.style("content", s.content)}
                        testID={id("content")}
                    >
                        {content}
                    </v.content.Text>
                ) : (
                    <v.content.View
                        {...slot.props("content")}
                        style={slot.style("content", s.content)}
                        testID={id("content")}
                    >
                        <ScrollView>
                            {resolveText(
                                content,
                                v.content,
                                ownText(s.content),
                            )}
                        </ScrollView>
                    </v.content.View>
                )}
            </Root.View>
        </Animated.View>
    );
}

const Surface = withEngine(BottomSheetImpl, "BottomSheet");

function ModalBottomSheet(props: BottomSheetProps): ReactNode {
    const nativeSlots = useNativeSlotReader("bottomSheet");
    const scrimSlots = useNativeSlotReader("scrim");
    const {
        trigger,
        open: _open,
        defaultOpen: _defaultOpen,
        onOpenChange: _onOpenChange,
        closeOnEscape: _closeOnEscape,
        ...surface
    } = props;
    const { open, presence, close, closeNow, asker, show } = useModalOverlay(
        "BottomSheet",
        props,
        "bottomSheet",
    );
    const given: BottomSheetTriggerProps = {
        onPress: show,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
    };
    return (
        <>
            {trigger === undefined ? null : typeof trigger === "function" ? (
                trigger(given)
            ) : (
                <Button
                    {...triggerButtonProps(
                        nativeSlots(props, KEYS),
                        props.testId,
                    )}
                    label={trigger}
                    {...given}
                />
            )}
            <ModalWindow visible={presence.present} label={props["aria-label"]}>
                <ModalScrimLayer
                    scrimTestId={partAsRoot<string>(props.testId, "backdrop")}
                    scrimSlot={scrimSlots(props, backdropKeys)}
                    open={open}
                    presence={presence}
                    onPressOutside={close}
                    positionerStyle={styles.positioner}
                >
                    <Surface
                        {...surface}
                        close={closeNow}
                        asker={asker}
                        shown={open}
                    />
                </ModalScrimLayer>
            </ModalWindow>
        </>
    );
}

// A standard sheet with its own trigger or open state: the trigger, then the surface in place,
// entering and leaving as it opens and closes. It sits beside the page's content rather than over
// it (Material's standard bottom sheet; Compose's `BottomSheetScaffold`), so where it sits is the
// app's layout.
function StandardBottomSheet(props: BottomSheetProps): ReactNode {
    const nativeSlots = useNativeSlotReader("bottomSheet");
    const {
        trigger,
        open: _open,
        defaultOpen: _defaultOpen,
        onOpenChange: _onOpenChange,
        ...surface
    } = props;
    const [open, setOpen] = useControllable(
        "BottomSheet",
        "open",
        props.open,
        props.defaultOpen,
        props.onOpenChange,
        false,
    );
    const show = () => setOpen(true);
    const given: BottomSheetTriggerProps = {
        onPress: show,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
    };
    return (
        <>
            {trigger === undefined ? null : typeof trigger === "function" ? (
                trigger(given)
            ) : (
                <Button
                    {...triggerButtonProps(
                        nativeSlots(props, KEYS),
                        props.testId,
                    )}
                    label={trigger}
                    {...given}
                />
            )}
            <Surface
                {...surface}
                open={open}
                onOpenChange={({ open: next }) => setOpen(next)}
            />
        </>
    );
}

// The surface's style that places it in its parent, which the drag's view takes.
const PLACEMENT = new Set([
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "start",
    "end",
    "zIndex",
    "alignSelf",
    "flex",
    "flexGrow",
    "flexShrink",
    "flexBasis",
    "width",
    "minWidth",
    "maxWidth",
    "height",
    "minHeight",
    "maxHeight",
]);

const placement = (
    style: Record<string, unknown>,
): [placed: Record<string, unknown>, own: Record<string, unknown>] => {
    const placed: Record<string, unknown> = {};
    // The surface fills the drag's view, and shrinks with it.
    const own: Record<string, unknown> = {
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 0,
    };
    for (const [key, value] of Object.entries(style)) {
        if (
            PLACEMENT.has(key) ||
            key.startsWith("margin") ||
            key.startsWith("inset")
        )
            placed[key] = value;
        else own[key] = value;
    }
    return [placed, own];
};

// Against the bottom edge, leaving room at the top, as the web's positioner does
// (`bottomSheetPositionerLayout`).
const styles = StyleSheet.create({
    positioner: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        flexDirection: "column",
        justifyContent: "flex-end",
        paddingTop: 72,
    },
});

/** Material's bottom sheet. Given a trigger, `onOpenChange`, or `defaultOpen`, the modal sheet:
 *  `<BottomSheet trigger="Share">…</BottomSheet>`; without, its surface: `<BottomSheet
 *  modal={false} open={open}>…</BottomSheet>`. A standard sheet (`modal={false}`) given a
 *  trigger or `defaultOpen` opens in place after its trigger. */
export function BottomSheet(props: BottomSheetProps): ReactNode {
    if (!sheetModal(props))
        return props.trigger === undefined &&
            props.defaultOpen === undefined ? (
            <Surface {...props} />
        ) : (
            <StandardBottomSheet {...props} />
        );
    return props.trigger === undefined &&
        props.onOpenChange === undefined &&
        props.defaultOpen === undefined ? (
        <Surface {...props} />
    ) : (
        <ModalBottomSheet {...props} />
    );
}
