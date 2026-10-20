// The bottom sheet: its surface (the drag handle over the scrolling content), and, given a
// trigger, `onOpenChange`, or `defaultOpen`, the whole modal sheet. Without them, or with
// `modal={false}`, showing it is the app's, and given `open`, it enters and leaves in place. A
// modal sheet opens in a `Modal` over a scrim, against the bottom edge: a press on the scrim, the
// drag handle, Escape, or the back button closes it, and so does a drag down on the handle past a
// quarter of the sheet's height. Its `Modal` holds a portal host of its own, so menus, tooltips,
// and selects opened inside draw over it.

import { bottomSheetAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { bottomSheetSelection, sheetModal } from "@pureform/binding-core";
import type {
    BottomSheetVariantProps,
    ChangeDetails,
} from "@pureform/binding-core";
import { useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
    Modal,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

import { Button } from "../button/button";
import { DragHandle } from "../drag-handle/drag-handle";
import { useLayer } from "../layer";
import { dismissTopOverlay, useDismiss } from "../overlay";
import {
    testIdOf,
    useControllable,
    useStableCallback,
    withEngine,
} from "../parts";
import { PortalHost } from "../portal-host";
import { useOverlayPresence, usePresence } from "../presence";
import { useEngine } from "../provider";
import { Scrim } from "../single-part";
import { useComponentSlots } from "../styles";

/** The sheet's parts this binding renders. */
type Part = PartName<typeof bottomSheetAnatomy>;

/** What a modal sheet gives the trigger it renders. */
export interface BottomSheetTriggerProps {
    /** Opens the sheet. */
    readonly onPress: () => void;
    readonly "aria-haspopup": "dialog";
}

export interface BottomSheetProps extends BottomSheetVariantProps {
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
    props: BottomSheetProps & { readonly close?: (() => void) | undefined },
): ReactNode {
    const engine = useEngine();
    const { styles: s, views: v } = useComponentSlots<Part>(
        "bottomSheet",
        bottomSheetSelection(props),
    );
    const presence = useOverlayPresence(props.open, "dialog");
    const height = useRef(0);
    // A standard sheet asks to close through `onOpenChange`; showing it is the app's.
    const close =
        props.close ??
        (props.onOpenChange === undefined
            ? NEEDS_CLOSE
            : () => props.onOpenChange?.({ open: false }));
    const latestClose = useStableCallback(() => close());
    // A drag down on the handle past a quarter of the sheet's height closes it.
    const pan = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gesture) =>
                    gesture.dy > 4 &&
                    Math.abs(gesture.dy) > Math.abs(gesture.dx),
                onPanResponderRelease: (_, gesture) => {
                    if (height.current > 0 && gesture.dy > height.current / 4)
                        latestClose();
                },
            }),
        [latestClose],
    );
    const id = (part: Part) => testIdOf(bottomSheetAnatomy, part, props.testId);
    if (!presence.present) return null;
    const Root = props.open === undefined ? v.root : engine;
    return (
        <Root.View
            {...presence.props}
            role="dialog"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            onLayout={(event: {
                nativeEvent: { layout: { height: number } };
            }) => {
                height.current = event.nativeEvent.layout.height;
            }}
            style={{ ...s.root, ...presence.style }}
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
                        onPress={close}
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
    );
}

const Surface = withEngine(BottomSheetImpl, "BottomSheet");

function ModalBottomSheet(props: BottomSheetProps): ReactNode {
    const {
        trigger,
        open: _open,
        defaultOpen,
        onOpenChange,
        closeOnEscape = true,
        ...surface
    } = props;
    const engine = useEngine();
    const [open, setOpen] = useControllable(
        "BottomSheet",
        "open",
        props.open,
        defaultOpen,
        onOpenChange,
        false,
    );
    const presence = usePresence(open, "dialog");
    // React Native's `zIndex` only orders siblings, so the sheet's wrapper takes the dialog's
    // layer to draw over the scrim beside it.
    const layer = useLayer("dialog");
    const close = useStableCallback(() => {
        if (open) setOpen(false);
    });
    const show = useStableCallback(() => {
        if (!open) setOpen(true);
    });
    useDismiss(open, () => {
        if (closeOnEscape) close();
    });
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
            <Modal
                transparent
                visible={presence.present}
                animationType="none"
                statusBarTranslucent
                navigationBarTranslucent
                onRequestClose={() => {
                    dismissTopOverlay();
                }}
            >
                <PortalHost>
                    <View style={StyleSheet.absoluteFill}>
                        <Scrim open={open} />
                        <Pressable
                            accessible={false}
                            focusable={false}
                            style={StyleSheet.absoluteFill}
                            onPress={close}
                        />
                        <View
                            pointerEvents="box-none"
                            aria-modal
                            style={[styles.positioner, { zIndex: layer }]}
                        >
                            <engine.View
                                {...presence.props}
                                style={{
                                    // A closing sheet takes no more presses.
                                    pointerEvents: open ? "auto" : "none",
                                    ...presence.style,
                                }}
                            >
                                <Surface {...surface} close={close} />
                            </engine.View>
                        </View>
                    </View>
                </PortalHost>
            </Modal>
        </>
    );
}

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
