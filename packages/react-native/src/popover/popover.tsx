// The popover: its surface, a title, a body, and actions, and, given a trigger, the whole overlay.
// Without a trigger, when and where it shows is the app's, and given `open`, it grows in and fades
// out. With one, it renders the trigger in place and opens the surface against it over the page,
// through the portal host: placed against the trigger, closed by a press outside, the back button
// or Escape. The caret is the web's: Zag places it, and there's nothing to place it with here, so
// this binding draws none. `modal` has no counterpart: a press outside only closes it, and the
// page behind stays as the app left it.

import { popoverAnatomy, popoverOverlayAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { isPresent, popoverSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    OverlayPositioning,
    PopoverVariantProps,
} from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import type { ReactNode } from "react";

import { Button } from "../button/button";
import { Anchored, useAnchoredOverlay } from "../overlay";
import { testIdOf, withEngine } from "../parts";
import { Portal } from "../portal";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { nativeSlots, overlayKeys } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** The popover's parts this binding renders. */
type Part = PartName<typeof popoverAnatomy>;
/** The parts as the web names them, which `style`, `slotProps` and `testId` take. */
type Key = PartName<typeof popoverOverlayAnatomy>;
const KEYS = overlayKeys(popoverOverlayAnatomy);

/** What a popover gives the trigger it renders. */
export interface PopoverTriggerProps {
    /** Opens the popover, or closes it while it's open. */
    readonly onPress: () => void;
    /** Where the trigger is: the popover measures the view its interactions happen on. Give it
     *  to a pureform component's `interactionSource`, or emit to it from your own `Pressable`
     *  (`useIndication`). */
    readonly interactionSource: MutableInteractionSource;
    readonly "aria-haspopup": "dialog";
    readonly "aria-expanded": boolean;
}

/** What a function given as `actions` is given. */
export interface PopoverActions {
    /** Closes the popover. */
    readonly close: () => void;
}

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface PopoverHosts {
    readonly content: "View";
    readonly caret: "View";
    readonly title: "Text";
    readonly body: "View";
    readonly actions: "View";
}

export interface PopoverProps
    extends PopoverVariantProps, NativeSlotProps<PopoverHosts> {
    /** What opens it, rendered in place: a label, for a `Button`, or a function rendering your
     *  own trigger with the props it's given (`(trigger) => <IconButton {...trigger} … />`).
     *  Given it, the popover opens over the page against the trigger and closes itself; without
     *  it, the popover is its surface alone. */
    readonly trigger?:
        | ReactNode
        | ((
              trigger: PopoverTriggerProps,
              state: { readonly open: boolean },
          ) => ReactNode);
    /** The heading. */
    readonly heading?: ReactNode;
    /** What it holds: text, or controls. */
    readonly body?: ReactNode;
    /** Buttons, at the end; a function is given `close`. */
    readonly actions?: ReactNode | ((actions: PopoverActions) => ReactNode);
    /** Whether it shows. With a trigger, the open state, controlled when defined. Without one:
     *  it grows in when this turns true and fades out when it turns false, rendering nothing
     *  once it's gone; without it either, the surface is always shown, still. */
    readonly open?: boolean | undefined;
    /** With a trigger, whether it starts open. */
    readonly defaultOpen?: boolean | undefined;
    /** With a trigger, called when it asks to open or close. */
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** With a trigger, whether a press outside closes it. Default true. */
    readonly closeOnInteractOutside?: boolean | undefined;
    /** With a trigger, where it opens against it. Default `{ placement: "bottom-start", gutter: 8,
     *  flip: true }`. */
    readonly positioning?: OverlayPositioning | undefined;
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<Key> | undefined;
}

function PopoverSurface(
    props: Omit<PopoverProps, "actions"> & {
        readonly actions?: ReactNode;
    },
): ReactNode {
    const engine = useEngine();
    const { styles: s, views: v } = useComponentSlots<Part>(
        "popover",
        popoverSelection(props),
    );
    const presence = useOverlayPresence(props.open, "popup");
    const id = (part: Part) =>
        testIdOf(popoverOverlayAnatomy, KEYS(part) as Key, props.testId);
    const slot = nativeSlots(props, KEYS);
    // Named by its heading, as the web's is (`aria-labelledby`), unless given a name.
    const label =
        props["aria-label"] ??
        (typeof props.heading === "string" ? props.heading : undefined);
    if (!presence.present) return null;
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = props.open === undefined ? v.root : engine;
    return (
        <Root.View
            {...slot.props("root")}
            {...slot.with("root", presence.props)}
            role="dialog"
            {...(label === undefined ? {} : { "aria-label": label })}
            style={slot.style("root", { ...s.root, ...presence.style })}
            testID={id("root")}
        >
            {isPresent(props.heading) ? (
                <v.title.Text
                    {...slot.props("title")}
                    role="heading"
                    style={slot.style("title", s.title)}
                    testID={id("title")}
                >
                    {props.heading}
                </v.title.Text>
            ) : null}
            {isPresent(props.body) ? (
                <v.body.View
                    {...slot.props("body")}
                    style={slot.style("body", s.body)}
                    testID={id("body")}
                >
                    {props.body}
                </v.body.View>
            ) : null}
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

const Surface = withEngine(PopoverSurface, "Popover");

function PopoverOverlay(props: PopoverProps): ReactNode {
    const {
        trigger,
        open: _open,
        defaultOpen,
        onOpenChange,
        closeOnInteractOutside = true,
        positioning,
        actions,
        ...surface
    } = props;
    const engine = useEngine();
    const { open, source, measured, presence, close, toggle } =
        useAnchoredOverlay("Popover", {
            open: props.open,
            defaultOpen,
            onOpenChange,
        });
    const given: PopoverTriggerProps = {
        onPress: toggle,
        interactionSource: source,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
    };
    return (
        <>
            {trigger === undefined ? null : typeof trigger === "function" ? (
                trigger(given, { open })
            ) : (
                <Button
                    label={trigger}
                    onPress={given.onPress}
                    interactionSource={source}
                    aria-haspopup={given["aria-haspopup"]}
                    aria-expanded={given["aria-expanded"]}
                />
            )}
            {presence.present && measured ? (
                <Portal layer="menu">
                    <Anchored
                        anchor={measured.rect}
                        positioning={positioning}
                        placement="bottom-start"
                        gutter={8}
                        onPressOutside={
                            closeOnInteractOutside ? close : undefined
                        }
                    >
                        {(placed) => (
                            <engine.View
                                {...presence.props}
                                style={{
                                    // A closing popover takes no more presses.
                                    pointerEvents: open ? "auto" : "none",
                                    ...(placed
                                        ? {
                                              transformOrigin:
                                                  placed.transformOrigin,
                                          }
                                        : {}),
                                    ...presence.style,
                                }}
                            >
                                <Surface
                                    {...surface}
                                    actions={
                                        typeof actions === "function"
                                            ? actions({ close })
                                            : actions
                                    }
                                />
                            </engine.View>
                        )}
                    </Anchored>
                </Portal>
            ) : null}
        </>
    );
}

/** An anchored panel for filters and small forms. With a trigger, the whole overlay:
 *  `<Popover trigger="Filters" heading="Filters" body={…} actions={({ close }) => …} />`; without,
 *  its surface: `<Popover heading="Filters" body={…} />`. */
export function Popover(props: PopoverProps): ReactNode {
    return props.trigger === undefined ? (
        <Surface
            {...props}
            actions={
                typeof props.actions === "function"
                    ? props.actions({ close: () => {} })
                    : props.actions
            }
        />
    ) : (
        <PopoverOverlay {...props} />
    );
}
