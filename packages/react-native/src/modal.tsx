// The chrome every modal overlay shares (the dialog, the full-screen dialog, the bottom and side
// sheets, the search view): its open state with presence, Escape and the back button; the `Modal`
// window holding a portal host of its own, so menus, tooltips and selects opened inside draw over
// it; and, for those over a scrim, the scrim, the press outside and the positioned surface.

import type { ChangeDetails } from "@pureform/binding-core";
import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useLayer } from "./layer";
import { dismissTopOverlay, useDismiss } from "./overlay";
import { useControllable, useStableCallback } from "./parts";
import { PortalHost } from "./portal-host";
import { usePresence } from "./presence";
import type { Presence } from "./presence";
import { useEngine } from "./provider";
import { Scrim } from "./single-part";

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
}

/** A modal overlay's state: whether it's open, its presence (at the dialog's motion), and the
 *  means to open and close it. Escape and the back button close the topmost overlay: a menu
 *  opened inside first, then this one, unless `closeOnEscape` is `false`. */
export function useModalOverlay(
    component: string,
    options: ModalOverlayOptions,
) {
    const [open, setOpen] = useControllable(
        component,
        "open",
        options.open,
        options.defaultOpen,
        options.onOpenChange,
        false,
    );
    const presence = usePresence(open, "dialog");
    const close = useStableCallback(() => {
        if (open) setOpen(false);
    });
    const show = useStableCallback(() => {
        if (!open) setOpen(true);
    });
    const closeOnEscape = options.closeOnEscape ?? true;
    useDismiss(open, () => {
        if (closeOnEscape) close();
    });
    return { open, setOpen, presence, close, show };
}

/** The `Modal` window an open overlay draws in: a window of its own on a device, which takes the
 *  back button, keeps assistive technology and touches inside, and on the web traps focus and
 *  gives it back. It holds a portal host of its own. */
export function ModalWindow(props: {
    readonly visible: boolean;
    readonly children: ReactNode;
}): ReactNode {
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
        >
            <PortalHost>{props.children}</PortalHost>
        </Modal>
    );
}

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
            <Scrim open={props.open} />
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
                aria-modal
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
