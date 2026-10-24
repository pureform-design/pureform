// The plain tooltip: its surface, a short text, and, given a trigger, the whole overlay. Without a
// trigger, when and where it shows is the app's, and given `open`, it grows in and fades out.
// With one, it renders the trigger in place and shows the surface against it over the page (see
// `tooltip-overlay.tsx`). The caret is the web's: Zag places it, and there's nothing to place it
// with here, so this binding draws none. The rich tooltip is `RichTooltip`.

import { tooltipAnatomy, tooltipOverlayAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { tooltipSelection } from "@pureform/binding-core";
import type { TooltipVariantProps } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { testIdOf, withEngine } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { nativeSlots, overlayKeys } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import { TooltipHost } from "../tooltip-overlay";
import type { TooltipBehaviorProps } from "../tooltip-overlay";

/** The tooltip's parts this binding renders. */
type Part = PartName<typeof tooltipAnatomy>;
/** The parts as the web names them, which `style`, `slotProps` and `testId` take. */
type Key = PartName<typeof tooltipOverlayAnatomy>;
const KEYS = overlayKeys(tooltipOverlayAnatomy);

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface TooltipHosts {
    readonly content: "View";
    readonly supportingText: "Text";
}

export interface TooltipProps
    extends
        TooltipBehaviorProps,
        TooltipVariantProps,
        NativeSlotProps<TooltipHosts> {
    /** The tooltip's text. */
    readonly supportingText?: ReactNode;
    readonly testId?: TestIdOverride<Key> | undefined;
}

function TooltipSurface(props: TooltipProps): ReactNode {
    const engine = useEngine();
    const { styles: s, views: v } = useComponentSlots<Part>(
        "tooltip",
        tooltipSelection(props),
    );
    const presence = useOverlayPresence(props.open, "popup");
    const id = (part: Part) =>
        testIdOf(tooltipOverlayAnatomy, KEYS(part) as Key, props.testId);
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
            <v.supportingText.Text
                {...slot.props("supportingText")}
                style={slot.style("supportingText", s.supportingText)}
                testID={id("supportingText")}
            >
                {props.supportingText}
            </v.supportingText.Text>
        </Root.View>
    );
}

const Surface = withEngine(TooltipSurface, "Tooltip");

/** Material's plain tooltip. With a trigger, the whole overlay:
 *  `<Tooltip supportingText="Save" trigger={(t) => <IconButton {...t} aria-label="Save" icon="💾" />} />`;
 *  without, its surface: `<Tooltip supportingText="Save" />`. For a subhead and actions, use
 *  `RichTooltip`. */
export function Tooltip(props: TooltipProps): ReactNode {
    return (
        <TooltipHost<TooltipProps>
            {...props}
            surface={Surface}
            interactiveByDefault={false}
        />
    );
}
