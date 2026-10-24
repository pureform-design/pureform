// The chrome every modal overlay shares (the dialog, the full-screen dialog, the bottom and side
// sheets, the search view): its open state with presence, Escape and the back button; the `Modal`
// window holding a portal host of its own, so menus, tooltips and selects opened inside draw over
// it; and, for those over a scrim, the scrim, the press outside and the positioned surface.

import type { TestIdOverride } from "@pureform/anatomy";
import { closeAsker } from "@pureform/binding-core";
import type { ChangeDetails, CloseQuestion } from "@pureform/binding-core";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useLayer } from "./layer";
import { dismissTopOverlay, useDismiss } from "./overlay";
import { useControllable, useStableCallback } from "./parts";
import { PortalHost } from "./portal-host";
import { usePresence } from "./presence";
import type { OverlayMotionName, Presence } from "./presence";
import { useEngine } from "./provider";
import { Scrim } from "./single-part";
import type { NativeSlots } from "./slot-props";

/** What `useModalOverlay` takes: the overlay's controllable `open`, and whether Escape and the
 *  back button close it. */
export interface ModalOverlayOptions {
    readonly open?: boolean | undefined;
    readonly defaultOpen?: boolean | undefined;
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** @default true */
    readonly closeOnEscape?: boolean | undefined;
    /** Asked before it closes by itself (Escape, the back button, `close`), if given. */
    readonly onClose?: CloseQuestion | undefined;
}

/** A modal overlay's state: whether it's open, its presence (at `motion`, the dialog's by
 *  default), and the means to open and close it: `close` asks `onClose` first, `closeNow`
 *  doesn't, and `asker` asks for the overlay's other ways of closing. Escape and the back button close the topmost overlay: a menu
 *  opened inside first, then this one, unless `closeOnEscape` is `false`. */
export function useModalOverlay(
    component: string,
    options: ModalOverlayOptions,
    motion: OverlayMotionName = "dialog",
) {
    const [open, setOpen] = useControllable(
        component,
        "open",
        options.open,
        options.defaultOpen,
        options.onOpenChange,
        false,
    );
    const presence = usePresence(open, motion);
    // Every way it closes by itself asks `onClose` through one asker, so a later question
    // makes an earlier answer moot.
    const [asker] = useState(closeAsker);
    useEffect(() => () => asker.cancel(), [asker]);
    /** Closes it without asking. */
    const closeNow = useStableCallback(() => {
        if (open) setOpen(false);
    });
    const close = useStableCallback(() => {
        if (open) asker.ask(options.onClose, closeNow, () => {});
    });
    const show = useStableCallback(() => {
        if (!open) setOpen(true);
    });
    const closeOnEscape = options.closeOnEscape ?? true;
    useDismiss(open, () => {
        if (closeOnEscape) close();
    });
    return { open, setOpen, presence, close, closeNow, asker, show };
}

/** The `Modal` window an open overlay draws in: a window of its own on a device, which takes the
 *  back button, keeps assistive technology and touches inside, and on the web traps focus and
 *  gives it back. It holds a portal host of its own. */
export function ModalWindow(props: {
    readonly visible: boolean;
    /** The window's name. React Native Web draws the `Modal` as a `role="dialog"`, which needs
     *  one (axe's `aria-dialog-name`): the surface's own. */
    readonly label?: string | undefined;
    readonly children: ReactNode;
}): ReactNode {
    const named =
        Platform.OS === "web" && props.label !== undefined
            ? ({ "aria-label": props.label } as object)
            : {};
    return (
        <Modal
            transparent
            visible={props.visible}
            animationType="none"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => {
                dismissTopOverlay();
            }}
            {...named}
        >
            <PortalHost>{props.children}</PortalHost>
        </Modal>
    );
}

/** What marks the view inside `ModalWindow` modal: `aria-modal` on a device. React Native Web's
 *  `Modal` already draws its content as a `role="dialog"` with `aria-modal`, and `aria-modal` on
 *  a view with no dialog role is an ARIA error there (axe's `aria-allowed-attr`). */
export const modalViewProps = (): { readonly "aria-modal"?: true } =>
    Platform.OS === "web" ? {} : { "aria-modal": true };

/** What `ModalScrimLayer` takes. */
export interface ModalScrimLayerProps {
    readonly open: boolean;
    readonly presence: Presence;
    /** What a press outside the surface does: nothing, without. */
    readonly onPressOutside?: (() => void) | undefined;
    /** Where the positioner, which covers the window, puts the surface. */
    readonly positionerStyle: StyleProp<ViewStyle>;
    /** The surface's own layout, under its motion. */
    readonly surfaceStyle?: ViewStyle | undefined;
    /** The scrim's test id, as the scrim's own `testId` takes it. */
    readonly scrimTestId?: TestIdOverride<"root"> | undefined;
    /** The owner's per-part props for the scrim, under `backdrop`. */
    readonly scrimSlot?: NativeSlots | undefined;
    readonly children: ReactNode;
}

/** A modal surface over the scrim: the scrim, a press outside, and the positioner holding the
 *  surface with its presence's motion. React Native's `zIndex` only orders siblings, so the
 *  positioner takes the dialog's layer to draw over the scrim beside it. A closing surface takes
 *  no more presses. */
export function ModalScrimLayer(props: ModalScrimLayerProps): ReactNode {
    const engine = useEngine();
    const layer = useLayer("dialog");
    return (
        <View style={StyleSheet.absoluteFill}>
            <Scrim
                open={props.open}
                testId={props.scrimTestId}
                slot={props.scrimSlot}
            />
            <Pressable
                accessible={false}
                focusable={false}
                style={StyleSheet.absoluteFill}
                {...(props.onPressOutside
                    ? { onPress: props.onPressOutside }
                    : {})}
            />
            <View
                pointerEvents="box-none"
                {...modalViewProps()}
                style={[props.positionerStyle, { zIndex: layer }]}
            >
                <engine.View
                    {...props.presence.props}
                    style={{
                        pointerEvents: props.open ? "auto" : "none",
                        ...props.surfaceStyle,
                        ...props.presence.style,
                    }}
                >
                    {props.children}
                </engine.View>
            </View>
        </View>
    );
}
