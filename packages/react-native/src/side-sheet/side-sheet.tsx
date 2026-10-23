// The side sheet: its surface (a header with an optional back button, the headline, and a close
// button, over the scrolling content and an optional row of actions), and, given a trigger,
// `onOpenChange`, or `defaultOpen`, the whole modal sheet. Without them, or with `modal={false}`,
// showing it is the app's, and given `open`, it enters and leaves in place; a coplanar sheet is
// the surface in the app's own layout. A modal sheet opens in a `Modal` over a scrim, against the
// end edge: a press on the scrim, its close button, Escape, or the back button closes it. Its
// `Modal` holds a portal host of its own, so menus, tooltips, and selects opened inside draw
// over it. A sheet drags sideways toward its edge, as MDC-Android's `SideSheetBehavior`: let go
// past halfway or on a flick, it closes (asking `onClose` first); short of that, it settles back.
// A standard sheet (coplanar too) drags once the app can hide it (`onOpenChange`). A drag mostly
// up or down is its content's native scroll.

import { sideSheetAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    closeAsker,
    isPresent,
    sheetModal,
    sideSheetRelease,
    sideSheetSelection,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    CloseAsker,
    CloseQuestion,
    SideSheetVariantProps,
    OverlayCloseProps,
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
    View,
} from "react-native";

import { Button } from "../button/button";
import { IconButton } from "../icon-button/icon-button";
import { ModalScrimLayer, ModalWindow, useModalOverlay } from "../modal";
import { testIdOf, useStableCallback, withEngine } from "../parts";
import { themeSpring, useOverlayPresence } from "../presence";
import { useDirection, useEngine, usePureform } from "../provider";
import { useComponentSlots } from "../styles";

/** The sheet's parts this binding renders. */
type Part = PartName<typeof sideSheetAnatomy>;

/** What a modal sheet gives the trigger it renders. */
export interface SideSheetTriggerProps {
    /** Opens the sheet. */
    readonly onPress: () => void;
    readonly "aria-haspopup": "dialog";
}

export interface SideSheetProps
    extends SideSheetVariantProps, OverlayCloseProps {
    /** The title, which names the sheet. */
    readonly headline?: ReactNode;
    /** The content, in the scrolling body. */
    readonly children?: ReactNode;
    /** The buttons under the content, the main one first. The row shows only when given. */
    readonly actions?: ReactNode;
    /** Called by the back button, which shows only when this is given. */
    readonly onBack?: (() => void) | undefined;
    /** The back button's name. @default "Back" */
    readonly backLabel?: string | undefined;
    /** The back button's icon. @default an arrow toward the start */
    readonly backIcon?: ReactNode;
    /** The close button's name. @default "Close" */
    readonly closeLabel?: string | undefined;
    /** The close button's icon. @default a cross */
    readonly closeIcon?: ReactNode;
    /** What opens it, rendered in place: a label, for a `Button`, or a function rendering your
     *  own trigger with the `onPress` it's given. Given it (or `onOpenChange`, or
     *  `defaultOpen`), a modal sheet opens over the page; without, it's the surface alone. */
    readonly trigger?:
        | ReactNode
        | ((trigger: SideSheetTriggerProps) => ReactNode);
    /** Whether it shows. As a modal sheet, the open state, controlled when defined. As a
     *  surface: it comes in when this turns true and leaves when it turns false; without it,
     *  the surface is always shown, still. */
    readonly open?: boolean | undefined;
    /** As a modal sheet, whether it starts open. */
    readonly defaultOpen?: boolean | undefined;
    /** Called when it asks to open or close: its trigger, the scrim, its close button, Escape,
     *  or the back button. */
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** Whether Escape and the back button close it. Default true. */
    readonly closeOnEscape?: boolean | undefined;
    /** Its name, when it has no headline. */
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<Part> | undefined;
}

const NEEDS_CLOSE: () => void = () => {};

function SideSheetImpl(
    props: SideSheetProps & { readonly close?: (() => void) | undefined },
): ReactNode {
    const engine = useEngine();
    const { styles: s, views: v } = useComponentSlots<Part>(
        "sideSheet",
        sideSheetSelection(props),
    );
    const presence = useOverlayPresence(props.open, "sideSheet");
    const id = (part: Part) => testIdOf(sideSheetAnatomy, part, props.testId);
    if (!presence.present) return null;
    const Root = props.open === undefined ? v.root : engine;
    const label =
        props["aria-label"] ??
        (typeof props.headline === "string" ? props.headline : undefined);
    // A standard sheet asks to close through `onOpenChange`; showing it is the app's.
    const close =
        props.close ??
        (props.onOpenChange === undefined
            ? NEEDS_CLOSE
            : () => props.onOpenChange?.({ open: false }));
    return (
        <Root.View
            {...presence.props}
            role="dialog"
            {...(label === undefined ? {} : { "aria-label": label })}
            style={{ ...s.root, ...presence.style }}
            testID={id("root")}
        >
            <v.header.View style={s.header} testID={id("header")}>
                {props.onBack === undefined ? null : (
                    <v.backButton.View
                        style={s.backButton}
                        testID={id("backButton")}
                    >
                        <IconButton
                            aria-label={props.backLabel ?? "Back"}
                            icon={props.backIcon ?? "←"}
                            mirrorIcon
                            onPress={props.onBack}
                        />
                    </v.backButton.View>
                )}
                {isPresent(props.headline) ? (
                    <v.headline.Text style={s.headline} testID={id("headline")}>
                        {props.headline}
                    </v.headline.Text>
                ) : (
                    <View style={{ flexGrow: 1 }} />
                )}
                <v.closeTrigger.View
                    style={s.closeTrigger}
                    testID={id("closeTrigger")}
                >
                    <IconButton
                        aria-label={props.closeLabel ?? "Close"}
                        icon={props.closeIcon ?? "✕"}
                        onPress={close}
                    />
                </v.closeTrigger.View>
            </v.header.View>
            {typeof props.children === "string" ? (
                <v.content.Text style={s.content} testID={id("content")}>
                    {props.children}
                </v.content.Text>
            ) : (
                <v.content.View style={s.content} testID={id("content")}>
                    <ScrollView>{props.children}</ScrollView>
                </v.content.View>
            )}
            {isPresent(props.actions) ? (
                <v.actions.View style={s.actions} testID={id("actions")}>
                    {props.actions}
                </v.actions.View>
            ) : null}
        </Root.View>
    );
}

const Surface = withEngine(SideSheetImpl, "SideSheet");

// Moves shorter than this are a press, not a drag.
const SLOP = 8;

/** A sheet's drag toward its edge (a modal or a standard one): `children` (the surface) moves with it, and let go it
 *  closes or settles back as `sideSheetRelease` says. */
function SideSheetDrag(props: {
    readonly open: boolean;
    readonly asker: CloseAsker;
    readonly onClose: CloseQuestion | undefined;
    readonly closeNow: () => void;
    readonly children: ReactNode;
}): ReactNode {
    const drag = useMemo(() => new Animated.Value(0), []);
    const width = useRef(0);
    const offset = useRef(0);
    // Toward the edge: right, or left under right to left.
    const outward = useDirection() === "rtl" ? -1 : 1;
    const latestOutward = useRef(outward);
    latestOutward.current = outward;
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const { timeScale } = usePureform();
    const stopSettle = useRef<() => void>(() => {});
    const latestSettle = useStableCallback((velocity: number) => {
        stopSettle.current();
        offset.current = 0;
        stopSettle.current = settle(
            drag,
            velocity * latestOutward.current,
            reducedMotion
                ? undefined
                : themeSpring("spatialDefault", tokens, timeScale),
            0,
        );
    });
    // Each time it opens, it starts open, wherever a drag let it go last time.
    const shown = useRef(props.open);
    shown.current = props.open;
    useEffect(() => {
        if (!props.open) return;
        stopSettle.current();
        offset.current = 0;
        drag.setValue(0);
    }, [props.open, drag]);
    // After a drag closed it: once that render has committed, a sheet still open (one the app
    // kept open) settles back.
    const [left, setLeft] = useState<{ readonly velocity: number }>();
    useEffect(() => {
        if (left && shown.current) latestSettle(left.velocity);
    }, [left, latestSettle]);
    const latestDismiss = useStableCallback((velocity: number) => {
        let now = true;
        props.asker.ask(
            props.onClose,
            () => {
                props.closeNow();
                setLeft({ velocity: now ? velocity : 0 });
            },
            () => latestSettle(now ? velocity : 0),
        );
        now = false;
    });
    useEffect(() => () => stopSettle.current(), []);
    const pan = useMemo(
        () =>
            PanResponder.create({
                // Mostly sideways: a drag of the sheet; mostly up or down: its content's scroll.
                onMoveShouldSetPanResponderCapture: (_, gesture) =>
                    Math.abs(gesture.dx) > SLOP &&
                    Math.abs(gesture.dx) > Math.abs(gesture.dy),
                onPanResponderGrant: () => {
                    props.asker.cancel();
                    stopSettle.current();
                },
                onPanResponderMove: (_, gesture) => {
                    offset.current = Math.max(
                        0,
                        gesture.dx * latestOutward.current,
                    );
                    drag.setValue(offset.current * latestOutward.current);
                },
                onPanResponderRelease: (_, gesture) => {
                    // In pixels per millisecond, toward the edge.
                    const velocity = gesture.vx * latestOutward.current;
                    const to = sideSheetRelease({
                        offset: offset.current,
                        velocity,
                        width: width.current,
                    });
                    if (to === "closed") latestDismiss(velocity);
                    else latestSettle(velocity);
                },
                onPanResponderTerminate: () => latestSettle(0),
            }),
        [drag, props.asker, latestDismiss, latestSettle],
    );
    return (
        <Animated.View
            {...pan.panHandlers}
            onLayout={(event) => {
                width.current = event.nativeEvent.layout.width;
            }}
            style={[styles.drag, { transform: [{ translateX: drag }] }]}
        >
            {props.children}
        </Animated.View>
    );
}

function ModalSideSheet(props: SideSheetProps): ReactNode {
    const {
        trigger,
        open: _open,
        defaultOpen: _defaultOpen,
        onOpenChange: _onOpenChange,
        closeOnEscape: _closeOnEscape,
        onClose,
        ...surface
    } = props;
    const { open, presence, close, closeNow, asker, show } = useModalOverlay(
        "SideSheet",
        props,
        "sideSheet",
    );
    const given: SideSheetTriggerProps = {
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
                    surfaceStyle={{ flexDirection: "row" }}
                >
                    <SideSheetDrag
                        open={open}
                        asker={asker}
                        onClose={onClose}
                        closeNow={closeNow}
                    >
                        <Surface {...surface} close={close} />
                    </SideSheetDrag>
                </ModalScrimLayer>
            </ModalWindow>
        </>
    );
}

// Against the end edge, as the web's positioner does (`sideSheetPositionerLayout`).
const styles = StyleSheet.create({
    positioner: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "stretch",
    },
    // The drag's view around the surface: as wide as the surface, at most the screen.
    drag: { flexShrink: 1, maxWidth: "100%" },
});

/** A standard sheet (`modal={false}`, coplanar or not): it drags too once the app can hide it
 *  (`onOpenChange`), asking `onClose` first; the app's `open` keeps showing it. */
function StandardSideSheet(props: SideSheetProps): ReactNode {
    const [asker] = useState(closeAsker);
    useEffect(() => () => asker.cancel(), [asker]);
    const closeNow = useStableCallback(() =>
        props.onOpenChange?.({ open: false }),
    );
    if (props.onOpenChange === undefined) return <Surface {...props} />;
    return (
        <SideSheetDrag
            open={props.open ?? true}
            asker={asker}
            onClose={props.onClose}
            closeNow={closeNow}
        >
            <Surface {...props} />
        </SideSheetDrag>
    );
}

/** Material's side sheet. Given a trigger, `onOpenChange`, or `defaultOpen`, the modal sheet:
 *  `<SideSheet trigger="Filters" headline="Filters">…</SideSheet>`; without, or with
 *  `modal={false}` (and `coplanar`, in the app's layout), its surface. */
export function SideSheet(props: SideSheetProps): ReactNode {
    return !sheetModal(props) ? (
        <StandardSideSheet {...props} />
    ) : props.trigger === undefined &&
      props.onOpenChange === undefined &&
      props.defaultOpen === undefined ? (
        <Surface {...props} />
    ) : (
        <ModalSideSheet {...props} />
    );
}
