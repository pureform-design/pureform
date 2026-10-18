// The dialog's surface: its icon, headline, body, and actions. Showing it over the page is the
// app's, in a `Modal` with a `Scrim` behind it; given `open`, it comes down and fades in, and goes
// back up as it fades out.

import { dialogAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { dialogSelection, isPresent } from "@pureform/binding-core";
import type { DialogVariantProps } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import { testIdOf, withEngine } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

/** The dialog's parts this binding renders. */
type Part = PartName<typeof dialogAnatomy>;

export interface DialogProps extends Omit<DialogVariantProps, "icon"> {
    /** An icon over the headline, which centers it. */
    readonly icon?: ReactNode;
    readonly mirrorIcon?: boolean | undefined;
    readonly headline?: ReactNode;
    /** The dialog's text. */
    readonly children?: ReactNode;
    /** Its buttons, such as text `Button`s. */
    readonly actions?: ReactNode;
    /** Whether it shows: it comes in when this turns true and leaves when it turns false,
     *  rendering nothing once it's gone. Without it, the surface is always shown, still. */
    readonly open?: boolean | undefined;
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
    return (
        <Root.View
            {...presence.props}
            role="dialog"
            {...(typeof props.headline === "string"
                ? { "aria-label": props.headline }
                : {})}
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
            {isPresent(props.actions) ? (
                <v.actions.View style={s.actions} testID={id("actions")}>
                    {props.actions}
                </v.actions.View>
            ) : null}
        </Root.View>
    );
}

/** Material's dialog surface: `<Dialog headline="Discard draft?" actions={…}>…</Dialog>`. */
export const Dialog = withEngine(DialogImpl, "Dialog");
