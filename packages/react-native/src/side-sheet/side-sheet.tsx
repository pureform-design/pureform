// The side sheet: its surface (a header with an optional back button, the headline, and a close
// button, over the scrolling content and an optional row of actions), and, given a trigger,
// `onOpenChange`, or `defaultOpen`, the whole modal sheet. Without them, or with `modal={false}`,
// showing it is the app's, and given `open`, it enters and leaves in place; a coplanar sheet is
// the surface in the app's own layout. A modal sheet opens in a `Modal` over a scrim, against the
// end edge: a press on the scrim, its close button, Escape, or the back button closes it. Its
// `Modal` holds a portal host of its own, so menus, tooltips, and selects opened inside draw
// over it.

import { sideSheetAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    sheetModal,
    sideSheetSelection,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    SideSheetVariantProps,
    SideSheetCloseProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "../button/button";
import { IconButton } from "../icon-button/icon-button";
import { ModalScrimLayer, ModalWindow, useModalOverlay } from "../modal";
import { testIdOf, withEngine } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
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
    extends SideSheetVariantProps, SideSheetCloseProps {
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

function ModalSideSheet(props: SideSheetProps): ReactNode {
    const {
        trigger,
        open: _open,
        defaultOpen: _defaultOpen,
        onOpenChange: _onOpenChange,
        closeOnEscape: _closeOnEscape,
        onClose: _onClose,
        ...surface
    } = props;
    const { open, presence, close, show } = useModalOverlay(
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
                    <Surface {...surface} close={close} />
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
});

/** Material's side sheet. Given a trigger, `onOpenChange`, or `defaultOpen`, the modal sheet:
 *  `<SideSheet trigger="Filters" headline="Filters">…</SideSheet>`; without, or with
 *  `modal={false}` (and `coplanar`, in the app's layout), its surface. */
export function SideSheet(props: SideSheetProps): ReactNode {
    return !sheetModal(props) ||
        (props.trigger === undefined &&
            props.onOpenChange === undefined &&
            props.defaultOpen === undefined) ? (
        <Surface {...props} />
    ) : (
        <ModalSideSheet {...props} />
    );
}
