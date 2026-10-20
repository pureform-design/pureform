// The dialog: its surface (its icon, headline, body, and actions), and, given a trigger or
// `onOpenChange`, the whole modal dialog. Without either, showing it is the app's, and given
// `open`, it comes down and fades in, and goes back up as it fades out. With one, it opens in a
// `Modal` over a scrim: a `Modal` is a window of its own on a device, which takes the back button,
// keeps assistive technology and touches inside, and on the web traps focus and gives it back.
// The `Modal` holds a portal host of its own, so menus, tooltips, and selects opened inside draw
// over the dialog.

import { dialogAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { dialogSelection, isPresent } from "@pureform/binding-core";
import type { ChangeDetails, DialogVariantProps } from "@pureform/binding-core";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { Button } from "../button/button";
import { IconSlot, iconSlot } from "../icon-style";
import { ModalScrimLayer, ModalWindow, useModalOverlay } from "../modal";
import { testIdOf, withEngine } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

/** The dialog's parts this binding renders. */
type Part = PartName<typeof dialogAnatomy>;

/** What a function given as a modal dialog's `actions` is given. */
export interface DialogActions {
    /** Closes the dialog. */
    readonly close: () => void;
}

/** What a modal dialog gives the trigger it renders. */
export interface DialogTriggerProps {
    /** Opens the dialog. */
    readonly onPress: () => void;
    readonly "aria-haspopup": "dialog";
}

const NO_ACTIONS: DialogActions = { close: () => {} };

export interface DialogProps extends Omit<DialogVariantProps, "icon"> {
    /** An icon over the headline, which centers it. */
    readonly icon?: ReactNode;
    readonly mirrorIcon?: boolean | undefined;
    readonly headline?: ReactNode;
    /** The dialog's text. */
    readonly children?: ReactNode;
    /** Its buttons, such as text `Button`s; given a function, they're rendered with what
     *  closes the dialog: `({ close }) => <Button label="Cancel" onPress={close} />`. */
    readonly actions?: ReactNode | ((dialog: DialogActions) => ReactNode);
    /** What opens it, rendered in place: a label, for a `Button`, or a function rendering your
     *  own trigger with the `onPress` it's given. Given it (or `onOpenChange`, or
     *  `defaultOpen`), the dialog is modal, over the page; without, it's the surface alone. */
    readonly trigger?: ReactNode | ((trigger: DialogTriggerProps) => ReactNode);
    /** Whether it shows. As a modal dialog, the open state, controlled when defined. As a
     *  surface: it comes in when this turns true and leaves when it turns false, rendering
     *  nothing once it's gone; without it, the surface is always shown, still. */
    readonly open?: boolean | undefined;
    /** As a modal dialog, whether it starts open. */
    readonly defaultOpen?: boolean | undefined;
    /** As a modal dialog, called when it asks to open or close: its trigger, a press on the
     *  scrim, Escape, or the back button. */
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** `alertdialog` for one that interrupts with an urgent question; a press on the scrim
     *  doesn't close it. Default `dialog`. */
    readonly role?: "dialog" | "alertdialog" | undefined;
    /** Whether a press on the scrim closes it. Default true for a `dialog`. */
    readonly closeOnInteractOutside?: boolean | undefined;
    /** Whether Escape and the back button close it. Default true. */
    readonly closeOnEscape?: boolean | undefined;
    /** Its name, when it has no headline. */
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<Part> | undefined;
}

function DialogImpl(props: DialogProps): ReactNode {
    const engine = useEngine();
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<Part>(
        "dialog",
        dialogSelection({ ...props, icon: isPresent(props.icon) }),
        props.mirrorIcon ? { mirrored: true } : {},
    );
    const presence = useOverlayPresence(props.open, "dialog");
    const id = (part: Part) => testIdOf(dialogAnatomy, part, props.testId);
    if (!presence.present) return null;
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = props.open === undefined ? v.root : engine;
    const label =
        props["aria-label"] ??
        (typeof props.headline === "string" ? props.headline : undefined);
    const actions =
        typeof props.actions === "function"
            ? props.actions(NO_ACTIONS)
            : props.actions;
    return (
        <Root.View
            {...presence.props}
            role={props.role ?? "dialog"}
            {...(label === undefined ? {} : { "aria-label": label })}
            style={{ ...s.root, ...presence.style }}
            testID={id("root")}
        >
            {isPresent(props.icon) ? (
                <v.icon.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {props.icon}
                    </IconSlot>
                </v.icon.View>
            ) : null}
            {isPresent(props.headline) ? (
                <v.headline.Text style={s.headline} testID={id("headline")}>
                    {props.headline}
                </v.headline.Text>
            ) : null}
            <v.body.Text style={s.body} testID={id("body")}>
                {props.children}
            </v.body.Text>
            {isPresent(actions) ? (
                <v.actions.View style={s.actions} testID={id("actions")}>
                    {actions}
                </v.actions.View>
            ) : null}
        </Root.View>
    );
}

const Surface = withEngine(DialogImpl, "Dialog");

function ModalDialog(props: DialogProps): ReactNode {
    const {
        trigger,
        open: _open,
        defaultOpen: _defaultOpen,
        onOpenChange: _onOpenChange,
        closeOnInteractOutside,
        closeOnEscape: _closeOnEscape,
        actions,
        ...surface
    } = props;
    const { open, presence, close, show } = useModalOverlay("Dialog", props);
    const outside = closeOnInteractOutside ?? props.role !== "alertdialog";
    const given: DialogTriggerProps = {
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
                    onPressOutside={outside ? close : undefined}
                    positionerStyle={styles.positioner}
                >
                    <Surface
                        {...surface}
                        actions={
                            typeof actions === "function"
                                ? actions({ close })
                                : actions
                        }
                    />
                </ModalScrimLayer>
            </ModalWindow>
        </>
    );
}

// Centers the dialog, as the web's positioner does (`dialogPositionerLayout`).
const styles = StyleSheet.create({
    positioner: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
});

/** Material's dialog. Given a trigger or `onOpenChange`, the modal dialog:
 *  `<Dialog trigger="Discard" headline="Discard draft?" actions={({ close }) => …}>…</Dialog>`;
 *  without, its surface: `<Dialog headline="Discard draft?" actions={…}>…</Dialog>`. */
export function Dialog(props: DialogProps): ReactNode {
    return props.trigger === undefined &&
        props.onOpenChange === undefined &&
        props.defaultOpen === undefined ? (
        <Surface {...props} />
    ) : (
        <ModalDialog {...props} />
    );
}
