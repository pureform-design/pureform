// The bottom sheet: its surface (the drag handle over the scrolling content), and, given a
// trigger, `onOpenChange`, or `defaultOpen`, the whole modal sheet. Without them, or with
// `modal={false}`, showing it is the app's, and given `open`, it enters and leaves in place. A
// modal sheet opens in a `Modal` over a scrim, against the bottom edge: a press on the scrim, the
// drag handle, Escape, or the back button closes it, and so does a drag down on the handle past a
// quarter of the sheet's height. The sheet follows the drag down; a shorter drag lets it settle
// back on the theme's default spatial spring, carrying the release's velocity (at once under
// reduced motion), as Compose's sheets do. Given `onClose`, every way it closes by itself asks it
// first (Escape, the back button, the scrim, a press on the handle, a drag); a dismissing drag
// holds where it was let go until the answer, then leaves or settles back. Its `Modal` holds a
// portal host of its own, so menus, tooltips, and selects opened inside draw over it.

import { bottomSheetAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    bottomSheetSelection,
    closeAsker,
    sheetModal,
} from "@pureform/binding-core";
import type {
    BottomSheetCloseProps,
    CloseAsker,
    BottomSheetVariantProps,
    ChangeDetails,
} from "@pureform/binding-core";
import { settle } from "@pureform/rn-adapter/animated";
import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated, PanResponder, ScrollView, StyleSheet } from "react-native";
import type { LayoutChangeEvent } from "react-native";

import { Button } from "../button/button";
import { DragHandle } from "../drag-handle/drag-handle";
import { ModalScrimLayer, ModalWindow, useModalOverlay } from "../modal";
import { testIdOf, useStableCallback, withEngine } from "../parts";
import { themeSpring, useOverlayPresence } from "../presence";
import { useEngine, usePureform } from "../provider";
import { useComponentSlots } from "../styles";

/** The sheet's parts this binding renders. */
type Part = PartName<typeof bottomSheetAnatomy>;

/** What a modal sheet gives the trigger it renders. */
export interface BottomSheetTriggerProps {
    /** Opens the sheet. */
    readonly onPress: () => void;
    readonly "aria-haspopup": "dialog";
}

export interface BottomSheetProps
    extends BottomSheetVariantProps, BottomSheetCloseProps {
    /** The content, scrolling under the drag handle. */
    readonly children?: ReactNode;
    /** Whether it shows the drag handle at its top edge. @default true */
    readonly dragHandle?: boolean | undefined;
    /** The drag handle's name: a press on it closes the sheet. @default "Close sheet" */
    readonly dragHandleLabel?: string | undefined;
    /** What opens it, rendered in place: a label, for a `Button`, or a function rendering your
     *  own trigger with the `onPress` it's given. Given it (or `onOpenChange`, or
     *  `defaultOpen`), a modal sheet opens over the page; without, it's the surface alone. */
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
    readonly testId?: TestIdOverride<Part> | undefined;
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
    const stopSettle = useRef<() => void>(() => {});
    const latestSettle = useStableCallback((velocity: number) => {
        stopSettle.current = settle(
            drag,
            velocity,
            reducedMotion
                ? undefined
                : themeSpring("spatialDefault", tokens, timeScale),
        );
    });
    // Whether it's still open: the modal's state, or as a surface, its `open`.
    const shown = useRef(true);
    shown.current = (props.shown ?? props.open) !== false;
    // Each time it opens, it starts where it rests.
    useEffect(() => {
        if (shown.current) drag.setValue(0);
    }, [props.shown, props.open, drag]);
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
    // A drag down on the handle past a quarter of the sheet's height closes it; it leaves from
    // where the drag left it.
    const pan = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gesture) =>
                    gesture.dy > 4 &&
                    Math.abs(gesture.dy) > Math.abs(gesture.dx),
                onPanResponderGrant: () => {
                    asker.cancel();
                    stopSettle.current();
                },
                onPanResponderMove: (_, gesture) =>
                    drag.setValue(Math.max(0, gesture.dy)),
                onPanResponderRelease: (_, gesture) => {
                    if (height.current > 0 && gesture.dy > height.current / 4)
                        latestDismiss(gesture.vy);
                    else latestSettle(gesture.vy);
                },
                onPanResponderTerminate: (_, gesture) =>
                    latestSettle(gesture.vy),
            }),
        [latestDismiss, latestSettle, drag, asker],
    );
    const id = (part: Part) => testIdOf(bottomSheetAnatomy, part, props.testId);
    if (!presence.present) return null;
    const Root = props.open === undefined ? v.root : engine;
    // The drag moves a plain Animated view around the surface, apart from the engine's enter
    // and exit on the surface itself. The view takes the surface's place in its parent's layout
    // (its size, margins, position and layer), and the surface fills it.
    const [placed, own] = placement(s.root ?? {});
    return (
        <Animated.View style={[placed, { transform: [{ translateY: drag }] }]}>
            <Root.View
                {...presence.props}
                role="dialog"
                {...(props["aria-label"] === undefined
                    ? {}
                    : { "aria-label": props["aria-label"] })}
                onLayout={(event: LayoutChangeEvent) => {
                    height.current = event.nativeEvent.layout.height;
                    (
                        presence.props.onLayout as
                            | ((event: LayoutChangeEvent) => void)
                            | undefined
                    )?.(event);
                }}
                style={{ ...own, ...presence.style }}
                testID={id("root")}
            >
                {props.dragHandle === false ? null : (
                    <v.dragHandle.View
                        {...pan.panHandlers}
                        style={s.dragHandle}
                        testID={id("dragHandle")}
                    >
                        <DragHandle
                            aria-label={props.dragHandleLabel ?? "Close sheet"}
                            onPress={requestClose}
                        />
                    </v.dragHandle.View>
                )}
                {typeof props.children === "string" ? (
                    <v.content.Text style={s.content} testID={id("content")}>
                        {props.children}
                    </v.content.Text>
                ) : (
                    <v.content.View style={s.content} testID={id("content")}>
                        <ScrollView>{props.children}</ScrollView>
                    </v.content.View>
                )}
            </Root.View>
        </Animated.View>
    );
}

const Surface = withEngine(BottomSheetImpl, "BottomSheet");

function ModalBottomSheet(props: BottomSheetProps): ReactNode {
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
    };
    return (
        <>
            {trigger === undefined ? null : typeof trigger === "function" ? (
                trigger(given)
            ) : (
                <Button label={trigger} onPress={show} />
            )}
            <ModalWindow visible={presence.present}>
                <ModalScrimLayer
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
 *  `<BottomSheet trigger="Share">…</BottomSheet>`; without, or with `modal={false}`, its
 *  surface: `<BottomSheet modal={false} open={open}>…</BottomSheet>`. */
export function BottomSheet(props: BottomSheetProps): ReactNode {
    return !sheetModal(props) ||
        (props.trigger === undefined &&
            props.onOpenChange === undefined &&
            props.defaultOpen === undefined) ? (
        <Surface {...props} />
    ) : (
        <ModalBottomSheet {...props} />
    );
}
