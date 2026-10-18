// The tooltip: its surface (a plain one's text, or a rich one's subhead, text, and actions), and,
// given a trigger, the whole overlay. Without a trigger, when and where it shows is the app's, and
// given `open`, it grows in and fades out. With one, it renders the trigger in place and shows the
// surface against it over the page, through the portal host: after the pointer rests on the
// trigger, at once when the keyboard focuses it, or on a long press; it hides when the pointer
// leaves, focus goes, the trigger is pressed, Escape or the back button, or a while after a long
// press ends.

import { tooltipAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    isRichTooltip,
    tooltipSelection,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    OverlayPositioning,
    TooltipVariantProps,
} from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pressable } from "react-native";

import { Button } from "../button/button";
import { IconSlot } from "../icon-style";
import { useInteractionSource } from "../interaction";
import { Anchored, useAnchor, useDismiss } from "../overlay";
import type { Placed } from "../overlay";
import {
    testIdOf,
    useControllable,
    useStableCallback,
    withEngine,
} from "../parts";
import { Portal } from "../portal";
import type { WindowRect } from "../portal-host";
import { useOverlayPresence, usePresence } from "../presence";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

/** The tooltip's parts this binding renders. */
type Part = PartName<typeof tooltipAnatomy>;

/** What a tooltip gives the trigger it renders. */
export interface TooltipTriggerProps {
    /** The trigger's hover, focus, and presses, which show and hide the tooltip and say where
     *  the trigger is: give it to a pureform component's `interactionSource`, or emit to it from
     *  your own `Pressable` (`useIndication`). */
    readonly interactionSource: MutableInteractionSource;
    /** Shows the tooltip: give it to the trigger's `onLongPress`, so that a long press shows it
     *  rather than pressing the trigger. */
    readonly onLongPress: () => void;
}

/** How long a tooltip shown by a long press stays after the press ends, in milliseconds. */
export const LONG_PRESS_TOOLTIP_MS = 1500;

export interface TooltipProps extends TooltipVariantProps {
    /** What it describes, rendered in place: a label, for a `Button`, or a function rendering
     *  your own trigger with the props it's given (`(trigger) => <IconButton {...trigger} … />`).
     *  Given it, the tooltip shows over the page against the trigger and hides itself; without
     *  it, the tooltip is its surface alone. */
    readonly trigger?:
        | ReactNode
        | ((trigger: TooltipTriggerProps) => ReactNode);
    /** With a trigger, whether it starts shown. */
    readonly defaultOpen?: boolean | undefined;
    /** With a trigger, called when it asks to show or hide. */
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** With a trigger, how long the pointer rests on it before the tooltip shows, in
     *  milliseconds. Default 400. */
    readonly openDelay?: number | undefined;
    /** With a trigger, how long the tooltip stays after the pointer leaves, in milliseconds.
     *  Default 150. */
    readonly closeDelay?: number | undefined;
    /** With a trigger, never shows. */
    readonly disabled?: boolean | undefined;
    /** Whether the tooltip takes presses and the pointer, as a rich tooltip's actions need: the
     *  pointer can move onto it, and one shown by a long press stays until a press outside it.
     *  Default true for a rich tooltip, else false. */
    readonly interactive?: boolean | undefined;
    /** Whether Escape and the back button hide it. Default true. */
    readonly closeOnEscape?: boolean | undefined;
    /** Whether pressing the trigger hides it. Default true. */
    readonly closeOnClick?: boolean | undefined;
    /** With a trigger, where it shows against it. Default `{ placement: "bottom", gutter: 8,
     *  flip: true }`. */
    readonly positioning?: OverlayPositioning | undefined;
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

const Surface = withEngine(TooltipImpl, "Tooltip");

// What showed it: the pointer resting, keyboard focus, or a long press.
type Cause = "pointer" | "focus" | "longPress";

function TooltipOverlay(props: TooltipProps): ReactNode {
    const {
        trigger,
        open: _open,
        defaultOpen,
        onOpenChange,
        openDelay = 400,
        closeDelay = 150,
        disabled = false,
        interactive: _interactive,
        closeOnEscape = true,
        closeOnClick = true,
        positioning,
        ...surface
    } = props;
    const interactive = props.interactive ?? isRichTooltip(props);
    const engine = useEngine();
    const [open, setOpen] = useControllable(
        "Tooltip",
        "open",
        props.open,
        defaultOpen,
        onOpenChange,
        false,
    );
    const source = useInteractionSource();
    const anchor = useAnchor(source);
    const [measured, setMeasured] = useState<{
        rect: WindowRect | undefined;
    }>();
    const [cause, setCause] = useState<Cause>();
    const presence = usePresence(open, "popup");
    useLayoutEffect(() => {
        if (!open) return;
        let current = true;
        anchor.measure((rect) => current && setMeasured({ rect }));
        return () => {
            current = false;
        };
    }, [open, anchor]);
    if (!presence.present && measured) setMeasured(undefined);

    // One pending change at a time: showing after the open delay, or hiding after the close
    // delay.
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const latestOpen = useRef(open);
    latestOpen.current = open;
    const cancel = () => clearTimeout(timer.current);
    const show = useStableCallback((by: Cause, delay: number = 0) => {
        cancel();
        if (disabled) return;
        const go = () => {
            setCause(by);
            if (!latestOpen.current) setOpen(true);
        };
        if (delay > 0) timer.current = setTimeout(go, delay);
        else go();
    });
    const hide = useStableCallback((delay: number = 0) => {
        cancel();
        const go = () => {
            if (latestOpen.current) setOpen(false);
        };
        if (delay > 0) timer.current = setTimeout(go, delay);
        else go();
    });
    useEffect(() => cancel, []);
    const longPressed = useRef(false);
    useEffect(
        () =>
            source.subscribe((interaction) => {
                switch (interaction.type) {
                    case "hoverEnter":
                        return show("pointer", openDelay);
                    case "hoverExit":
                        return hide(closeDelay);
                    case "focus":
                        return interaction.visible ? show("focus") : undefined;
                    case "blur":
                        return hide();
                    case "press":
                        longPressed.current = false;
                        return closeOnClick ? hide() : cancel();
                    case "release":
                    case "cancel":
                        // A long press ends: a plain tooltip goes a while after; an interactive
                        // one stays for its actions.
                        if (longPressed.current && !interactive) {
                            hide(LONG_PRESS_TOOLTIP_MS);
                        }
                        return undefined;
                }
                return undefined;
            }),
        [source, openDelay, closeDelay, closeOnClick, interactive],
    );
    const onLongPress = useStableCallback(() => {
        longPressed.current = true;
        show("longPress");
    });
    useDismiss(open && closeOnEscape, () => hide());
    const given: TooltipTriggerProps = {
        interactionSource: source,
        onLongPress,
    };
    const content = (placed: Placed | undefined) => (
        <engine.View
            {...presence.props}
            style={{
                pointerEvents: open && interactive ? "auto" : "none",
                ...(placed ? { transformOrigin: placed.transformOrigin } : {}),
                ...presence.style,
            }}
        >
            <Surface {...surface} />
        </engine.View>
    );
    return (
        <>
            {typeof trigger === "function" ? (
                trigger(given)
            ) : (
                <Button
                    label={trigger}
                    interactionSource={source}
                    onLongPress={onLongPress}
                />
            )}
            {presence.present && measured ? (
                <Portal layer="tooltip">
                    <Anchored
                        anchor={measured.rect}
                        positioning={positioning}
                        placement="bottom"
                        gutter={8}
                        interactive={interactive}
                        onPressOutside={
                            interactive && cause === "longPress"
                                ? () => hide()
                                : undefined
                        }
                    >
                        {(placed) =>
                            interactive ? (
                                // The pointer can move onto it and stay.
                                <Pressable
                                    accessible={false}
                                    focusable={false}
                                    onHoverIn={cancel}
                                    onHoverOut={() => hide(closeDelay)}
                                >
                                    {content(placed)}
                                </Pressable>
                            ) : (
                                content(placed)
                            )
                        }
                    </Anchored>
                </Portal>
            ) : null}
        </>
    );
}

/** Material's tooltip. With a trigger, the whole overlay:
 *  `<Tooltip supportingText="Save" trigger={(t) => <IconButton {...t} aria-label="Save" icon="💾" />} />`;
 *  without, its surface: `<Tooltip supportingText="Save" />`, or
 *  `<Tooltip variant="rich" subhead="Drafts" supportingText="…" />`. */
export function Tooltip(props: TooltipProps): ReactNode {
    return props.trigger === undefined ? (
        <Surface {...props} />
    ) : (
        <TooltipOverlay {...props} />
    );
}
