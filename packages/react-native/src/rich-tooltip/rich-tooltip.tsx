// The rich tooltip: its surface, a subhead, text, and actions, and, given a trigger, the whole
// overlay, interactive unless told otherwise. As the plain tooltip otherwise (see `tooltip/`),
// with no caret.

import { richTooltipAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { isPresent, richTooltipSelection } from "@pureform/binding-core";
import type { RichTooltipVariantProps } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { testIdOf, withEngine } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";
import { TooltipHost } from "../tooltip-overlay";
import type { TooltipBehaviorProps } from "../tooltip-overlay";

/** The rich tooltip's parts this binding renders. */
type Part = PartName<typeof richTooltipAnatomy>;

export interface RichTooltipProps
    extends TooltipBehaviorProps, RichTooltipVariantProps {
    /** The title. */
    readonly subhead?: ReactNode;
    /** The tooltip's text. */
    readonly supportingText?: ReactNode;
    /** Buttons. */
    readonly actions?: ReactNode;
    readonly testId?: TestIdOverride<Part> | undefined;
}

function RichTooltipSurface(props: RichTooltipProps): ReactNode {
    const engine = useEngine();
    const { styles: s, views: v } = useComponentSlots<Part>(
        "richTooltip",
        richTooltipSelection(props),
    );
    const presence = useOverlayPresence(props.open, "popup");
    const id = (part: Part) => testIdOf(richTooltipAnatomy, part, props.testId);
    if (!presence.present) return null;
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = props.open === undefined ? v.root : engine;
    return (
        <Root.View
            {...presence.props}
            role="tooltip"
            style={{ ...s.root, ...presence.style }}
            testID={id("root")}
        >
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

const Surface = withEngine(RichTooltipSurface, "RichTooltip");

/** Material's rich tooltip. With a trigger, the whole overlay; without, its surface:
 *  `<RichTooltip subhead="Drafts" supportingText="…" actions={…} />`. */
export function RichTooltip(props: RichTooltipProps): ReactNode {
    return (
        <TooltipHost<RichTooltipProps>
            {...props}
            surface={Surface}
            interactiveByDefault
        />
    );
}
