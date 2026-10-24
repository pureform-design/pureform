// The full-screen dialog: its surface (a header with a close icon button, the headline, and the
// confirm action, over a scrolling body), and, given a trigger or `onOpenChange`, the whole modal
// dialog. Without either, showing it is the app's, and given `open`, it comes down and fades in,
// and goes back up as it fades out. With one, it opens in a `Modal` that fills the screen: a
// `Modal` is a window of its own on a device, which takes the back button, keeps assistive
// technology and touches inside, and on the web traps focus and gives it back. Nothing shows
// behind it, so there's no scrim, and its `Modal` holds a portal host of its own, so menus,
// tooltips, and selects opened inside draw over it.

import {
    fullscreenDialogAnatomy,
    fullscreenDialogOverlayAnatomy,
} from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { fullscreenDialogSelection, isPresent } from "@pureform/binding-core";
import type {
    ChangeDetails,
    FullscreenDialogVariantProps,
    OverlayCloseProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "../button/button";
import { IconButton } from "../icon-button/icon-button";
import { ModalWindow, modalViewProps, useModalOverlay } from "../modal";
import { testIdOf, withEngine } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { nativeSlots, overlayKeys } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** The dialog's parts this binding renders. */
type Part = PartName<typeof fullscreenDialogAnatomy>;
/** The parts as the web names them, which `style`, `slotProps` and `testId` take. */
type Key = PartName<typeof fullscreenDialogOverlayAnatomy>;
const KEYS = overlayKeys(fullscreenDialogOverlayAnatomy);

/** What a function given as a modal dialog's `confirmAction` is given. */
export interface FullscreenDialogActions {
    /** Closes the dialog. */
    readonly close: () => void;
}

/** What a modal dialog gives the trigger it renders. */
export interface FullscreenDialogTriggerProps {
    /** Opens the dialog. */
    readonly onPress: () => void;
    readonly "aria-haspopup": "dialog";
    /** Whether it's open. */
    readonly "aria-expanded": boolean;
}

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface FullscreenDialogHosts {
    readonly content: "View";
    readonly header: "View";
    readonly closeTrigger: "View";
    readonly headline: "Text";
    readonly confirmAction: "View";
    readonly body: "View";
}

export interface FullscreenDialogProps
    extends
        FullscreenDialogVariantProps,
        OverlayCloseProps,
        NativeSlotProps<FullscreenDialogHosts> {
    readonly headline?: ReactNode;
    /** The content, in the scrolling body. */
    readonly children?: ReactNode;
    /** The confirming action at the end of the header: a text `Button`; given a function, it's
     *  rendered with what closes the dialog:
     *  `({ close }) => <Button variant="text" label="Save" onPress={close} />`. */
    readonly confirmAction?:
        | ReactNode
        | ((dialog: FullscreenDialogActions) => ReactNode);
    /** The close icon button's name, for assistive technology. @default "Close" */
    readonly closeLabel?: string | undefined;
    /** The close icon button's icon. @default a cross */
    readonly closeIcon?: ReactNode;
    /** What opens it, rendered in place: a label, for a `Button`, or a function rendering your
     *  own trigger with the `onPress` it's given. Given it (or `onOpenChange`, or
     *  `defaultOpen`), the dialog is modal, over the page; without, it's the surface alone. */
    readonly trigger?:
        | ReactNode
        | ((trigger: FullscreenDialogTriggerProps) => ReactNode);
    /** Whether it shows. As a modal dialog, the open state, controlled when defined. As a
     *  surface: it comes in when this turns true and leaves when it turns false, rendering
     *  nothing once it's gone; without it, the surface is always shown, still. */
    readonly open?: boolean | undefined;
    /** As a modal dialog, whether it starts open. */
    readonly defaultOpen?: boolean | undefined;
    /** As a modal dialog, called when it asks to open or close: its trigger, its close button,
     *  Escape, or the back button. */
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** Whether Escape and the back button close it. Default true. */
    readonly closeOnEscape?: boolean | undefined;
    /** Its name, when it has no headline. */
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<Key> | undefined;
}

const NEEDS_CLOSE: () => void = () => {};

function FullscreenDialogImpl(
    props: FullscreenDialogProps & {
        readonly close?: (() => void) | undefined;
    },
): ReactNode {
    const engine = useEngine();
    const { styles: s, views: v } = useComponentSlots<Part>(
        "fullscreenDialog",
        fullscreenDialogSelection(props),
    );
    const presence = useOverlayPresence(props.open, "dialog");
    const id = (part: Part) =>
        testIdOf(
            fullscreenDialogOverlayAnatomy,
            KEYS(part) as Key,
            props.testId,
        );
    const slot = nativeSlots(props, KEYS);
    if (!presence.present) return null;
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = props.open === undefined ? v.root : engine;
    const label =
        props["aria-label"] ??
        (typeof props.headline === "string" ? props.headline : undefined);
    const close = props.close ?? NEEDS_CLOSE;
    const confirm =
        typeof props.confirmAction === "function"
            ? props.confirmAction({ close })
            : props.confirmAction;
    return (
        <Root.View
            {...slot.props("root")}
            {...slot.with("root", presence.props)}
            role="dialog"
            {...(label === undefined ? {} : { "aria-label": label })}
            style={slot.style("root", { ...s.root, ...presence.style })}
            testID={id("root")}
        >
            <v.header.View
                {...slot.props("header")}
                style={slot.style("header", s.header)}
                testID={id("header")}
            >
                <v.closeTrigger.View
                    {...slot.props("closeTrigger")}
                    style={slot.style("closeTrigger", s.closeTrigger)}
                    testID={id("closeTrigger")}
                >
                    <IconButton
                        aria-label={props.closeLabel ?? "Close"}
                        icon={props.closeIcon ?? "✕"}
                        onPress={close}
                    />
                </v.closeTrigger.View>
                {isPresent(props.headline) ? (
                    <v.headline.Text
                        {...slot.props("headline")}
                        style={slot.style("headline", s.headline)}
                        testID={id("headline")}
                    >
                        {props.headline}
                    </v.headline.Text>
                ) : (
                    <View style={{ flexGrow: 1 }} />
                )}
                {isPresent(confirm) ? (
                    <v.confirmAction.View
                        {...slot.props("confirmAction")}
                        style={slot.style("confirmAction", s.confirmAction)}
                        testID={id("confirmAction")}
                    >
                        {confirm}
                    </v.confirmAction.View>
                ) : null}
            </v.header.View>
            {typeof props.children === "string" ? (
                <v.body.Text
                    {...slot.props("body")}
                    style={slot.style("body", s.body)}
                    testID={id("body")}
                >
                    {props.children}
                </v.body.Text>
            ) : (
                <v.body.View
                    {...slot.props("body")}
                    style={slot.style("body", s.body)}
                    testID={id("body")}
                >
                    <ScrollView>{props.children}</ScrollView>
                </v.body.View>
            )}
        </Root.View>
    );
}

const Surface = withEngine(FullscreenDialogImpl, "FullscreenDialog");

function ModalFullscreenDialog(props: FullscreenDialogProps): ReactNode {
    const {
        trigger,
        open: _open,
        defaultOpen: _defaultOpen,
        onOpenChange: _onOpenChange,
        closeOnEscape: _closeOnEscape,
        onClose: _onClose,
        ...surface
    } = props;
    const engine = useEngine();
    const { open, presence, close, show } = useModalOverlay(
        "FullscreenDialog",
        props,
    );
    const given: FullscreenDialogTriggerProps = {
        onPress: show,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
    };
    return (
        <>
            {trigger === undefined ? null : typeof trigger === "function" ? (
                trigger(given)
            ) : (
                <Button label={trigger} {...given} />
            )}
            <ModalWindow
                visible={presence.present}
                label={
                    props["aria-label"] ??
                    (typeof props.headline === "string"
                        ? props.headline
                        : undefined)
                }
            >
                <View {...modalViewProps()} style={StyleSheet.absoluteFill}>
                    <engine.View
                        {...presence.props}
                        style={{
                            flex: 1,
                            // A closing dialog takes no more presses.
                            pointerEvents: open ? "auto" : "none",
                            ...presence.style,
                        }}
                    >
                        <Surface {...surface} close={close} />
                    </engine.View>
                </View>
            </ModalWindow>
        </>
    );
}

/** Material's full-screen dialog. Given a trigger or `onOpenChange`, the modal dialog:
 *  `<FullscreenDialog trigger="New event" headline="New event" confirmAction={({ close }) => …}>…
 *  </FullscreenDialog>`; without, its surface: `<FullscreenDialog headline="New event">…
 *  </FullscreenDialog>`. */
export function FullscreenDialog(props: FullscreenDialogProps): ReactNode {
    return props.trigger === undefined &&
        props.onOpenChange === undefined &&
        props.defaultOpen === undefined ? (
        <Surface {...props} />
    ) : (
        <ModalFullscreenDialog {...props} />
    );
}
