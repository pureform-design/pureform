// The tooltip's surface: a plain one's text, or a rich one's subhead, text, and actions. When it
// shows, and where, is the app's; given `open`, it grows in and fades out.

import { tooltipAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    isRichTooltip,
    tooltipSelection,
} from "@pureform/binding-core";
import type { TooltipVariantProps } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot } from "../icon-style";
import { testIdOf, withEngine } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

/** The tooltip's parts this binding renders. */
type Part = PartName<typeof tooltipAnatomy>;

export interface TooltipProps extends TooltipVariantProps {
    /** The tooltip's text. */
    readonly supportingText?: ReactNode;
    /** A rich tooltip's title. */
    readonly subhead?: ReactNode;
    /** A rich tooltip's buttons. */
    readonly actions?: ReactNode;
    /** Whether it shows: it grows in when this turns true and fades out when it turns false,
     *  rendering nothing once it's gone. Without it, the surface is always shown, still. */
    readonly open?: boolean | undefined;
    readonly testId?: TestIdOverride<Part> | undefined;
}

function TooltipImpl(props: TooltipProps): ReactNode {
    const engine = useEngine();
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<Part>("tooltip", tooltipSelection(props));
    const presence = useOverlayPresence(props.open, "popup");
    const id = (part: Part) => testIdOf(tooltipAnatomy, part, props.testId);
    if (!presence.present) return null;
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = props.open === undefined ? v.root : engine;
    const root = {
        ...presence.props,
        role: "tooltip",
        style: { ...s.root, ...presence.style },
        testID: id("root"),
    };
    if (!isRichTooltip(props)) {
        return (
            <Root.View {...root}>
                <IconSlot
                    style={selected.styles.root}
                    iconFill={undefined}
                    motion={s.root}
                >
                    {props.supportingText}
                </IconSlot>
            </Root.View>
        );
    }
    return (
        <Root.View {...root}>
            {isPresent(props.subhead) ? (
                <v.subhead.Text style={s.subhead} testID={id("subhead")}>
                    {props.subhead}
                </v.subhead.Text>
            ) : null}
            <v.supportingText.Text
                style={s.supportingText}
                testID={id("supportingText")}
            >
                {props.supportingText}
            </v.supportingText.Text>
            {isPresent(props.actions) ? (
                <v.actions.View style={s.actions} testID={id("actions")}>
                    {props.actions}
                </v.actions.View>
            ) : null}
        </Root.View>
    );
}

/** Material's tooltip surface: `<Tooltip supportingText="Save" />`, or
 *  `<Tooltip variant="rich" subhead="Drafts" supportingText="…" />`. */
export const Tooltip = withEngine(TooltipImpl, "Tooltip");
