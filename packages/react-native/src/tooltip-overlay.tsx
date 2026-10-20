// What the plain and the rich tooltip share on React Native: the overlay behind a trigger. It
// renders the trigger in place and shows the surface (the component's own) against it over the
// page, through the portal host: after the pointer rests on the trigger, at once when the keyboard
// focuses it, or on a long press; it hides when the pointer leaves, focus goes, the trigger is
// pressed, Escape or the back button, or a while after a long press ends.

import type { ChangeDetails, OverlayPositioning } from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Pressable } from "react-native";

import { Button } from "./button/button";
import { useInteractionSource } from "./interaction";
import { Anchored, useAnchor, useDismiss } from "./overlay";
import type { Placed } from "./overlay";
import { useControllable, useStableCallback } from "./parts";
import { Portal } from "./portal";
import type { WindowRect } from "./portal-host";
import { usePresence } from "./presence";
import { useEngine } from "./provider";

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

export interface TooltipBehaviorProps {
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
     *  Default false, and true for the rich tooltip. */
    readonly interactive?: boolean | undefined;
    /** Whether Escape and the back button hide it. Default true. */
    readonly closeOnEscape?: boolean | undefined;
    /** Whether pressing the trigger hides it. Default true. */
    readonly closeOnClick?: boolean | undefined;
    /** With a trigger, where it shows against it. Default `{ placement: "bottom", gutter: 8,
     *  flip: true }`. */
    readonly positioning?: OverlayPositioning | undefined;
    /** Whether it shows: it grows in when this turns true and fades out when it turns false,
     *  rendering nothing once it's gone. Without it, the surface is always shown, still. */
    readonly open?: boolean | undefined;
}

// What showed it: the pointer resting, keyboard focus, or a long press.
type Cause = "pointer" | "focus" | "longPress";

function TooltipOverlay<S extends object>({
    surface: Surface,
    interactiveByDefault,
    ...props
}: TooltipHostProps<S>): ReactNode {
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
        ...surfaceProps
    } = props;
    const interactive = props.interactive ?? interactiveByDefault;
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
            <Surface {...(surfaceProps as unknown as S)} />
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

/** What the host takes: the overlay's props, the surface component, and the rest, which it gives
 *  the surface. */
export type TooltipHostProps<S extends object> = TooltipBehaviorProps &
    S & {
        readonly surface: ComponentType<S>;
        readonly interactiveByDefault: boolean;
    };

/** The surface alone without a trigger, else the overlay. */
export function TooltipHost<S extends object>(
    props: TooltipHostProps<S>,
): ReactNode {
    const { surface: Surface, interactiveByDefault: _, ...rest } = props;
    return props.trigger === undefined ? (
        <Surface {...(rest as unknown as S)} />
    ) : (
        <TooltipOverlay {...props} />
    );
}
