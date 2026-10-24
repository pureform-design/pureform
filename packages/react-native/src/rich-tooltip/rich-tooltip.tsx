// The rich tooltip: its surface, a subhead, text, and actions, and, given a trigger, the whole
// overlay, interactive unless told otherwise. As the plain tooltip otherwise (see `tooltip/`),
// with no caret.

import {
    richTooltipAnatomy,
    richTooltipOverlayAnatomy,
} from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { isPresent, richTooltipSelection } from "@pureform/binding-core";
import type { RichTooltipVariantProps } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { testIdOf, withEngine } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { nativeSlots, overlayKeys } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import { TooltipHost } from "../tooltip-overlay";
import type { TooltipBehaviorProps } from "../tooltip-overlay";

/** The rich tooltip's parts this binding renders. */
type Part = PartName<typeof richTooltipAnatomy>;
/** The parts as the web names them, which `style`, `slotProps` and `testId` take. */
type Key = PartName<typeof richTooltipOverlayAnatomy>;
const KEYS = overlayKeys(richTooltipOverlayAnatomy);

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface RichTooltipHosts {
    readonly content: "View";
    readonly subhead: "Text";
    readonly supportingText: "Text";
    readonly actions: "View";
}

export interface RichTooltipProps
    extends
        TooltipBehaviorProps,
        RichTooltipVariantProps,
        NativeSlotProps<RichTooltipHosts> {
    /** The title. */
    readonly subhead?: ReactNode;
    /** The tooltip's text. */
    readonly supportingText?: ReactNode;
    /** Buttons. */
    readonly actions?: ReactNode;
    readonly testId?: TestIdOverride<Key> | undefined;
}

function RichTooltipSurface(props: RichTooltipProps): ReactNode {
    const engine = useEngine();
    const { styles: s, views: v } = useComponentSlots<Part>(
        "richTooltip",
        richTooltipSelection(props),
    );
    const presence = useOverlayPresence(props.open, "popup");
    const id = (part: Part) =>
        testIdOf(richTooltipOverlayAnatomy, KEYS(part) as Key, props.testId);
    const slot = nativeSlots(props, KEYS);
    if (!presence.present) return null;
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = props.open === undefined ? v.root : engine;
    return (
        <Root.View
            {...slot.props("root")}
            {...slot.with("root", presence.props)}
            role="tooltip"
            style={slot.style("root", { ...s.root, ...presence.style })}
            testID={id("root")}
        >
            {isPresent(props.subhead) ? (
                <v.subhead.Text
                    {...slot.props("subhead")}
                    style={slot.style("subhead", s.subhead)}
                    testID={id("subhead")}
                >
                    {props.subhead}
                </v.subhead.Text>
            ) : null}
            <v.supportingText.Text
                {...slot.props("supportingText")}
                style={slot.style("supportingText", s.supportingText)}
                testID={id("supportingText")}
            >
                {props.supportingText}
            </v.supportingText.Text>
            {isPresent(props.actions) ? (
                <v.actions.View
                    {...slot.props("actions")}
                    style={slot.style("actions", s.actions)}
                    testID={id("actions")}
                >
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
