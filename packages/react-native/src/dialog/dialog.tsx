// The dialog's surface: its icon, headline, body, and actions. Showing it over the page is the
// app's, in a `Modal` with a `Scrim` behind it.

import { dialogAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { dialogSelection, isPresent } from "@pureform/binding-core";
import type { DialogVariantProps } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import { testIdOf, withEngine } from "../parts";
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
    readonly testId?: TestIdOverride<Part> | undefined;
}

function DialogImpl(props: DialogProps): ReactNode {
    const engine = useEngine();
    const { styles: s, selected } = useComponentSlots(
        "dialog",
        dialogSelection({ ...props, icon: isPresent(props.icon) }),
        props.mirrorIcon ? { mirrored: true } : {},
    );
    const id = (part: Part) => testIdOf(dialogAnatomy, part, props.testId);
    return (
        <engine.View
            role="dialog"
            {...(typeof props.headline === "string"
                ? { "aria-label": props.headline }
                : {})}
            style={s.root}
            testID={id("root")}
        >
            {isPresent(props.icon) ? (
                <engine.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {props.icon}
                    </IconSlot>
                </engine.View>
            ) : null}
            {isPresent(props.headline) ? (
                <engine.Text style={s.headline} testID={id("headline")}>
                    {props.headline}
                </engine.Text>
            ) : null}
            <engine.Text style={s.body} testID={id("body")}>
                {props.children}
            </engine.Text>
            {isPresent(props.actions) ? (
                <engine.View style={s.actions} testID={id("actions")}>
                    {props.actions}
                </engine.View>
            ) : null}
        </engine.View>
    );
}

/** Material's dialog surface: `<Dialog headline="Discard draft?" actions={…}>…</Dialog>`. */
export const Dialog = withEngine(DialogImpl, "Dialog");
