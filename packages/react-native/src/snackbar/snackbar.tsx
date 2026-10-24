// The snackbar's surface: its message, an action, and a close button, each rippling when pressed.
// `useSnackbar` (queue.tsx) shows them over the page one at a time; placed by the app instead, when
// it shows and for how long is the app's, and given `open`, it grows in and fades out.

import { snackbarAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { isPresent, snackbarSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    IndicationProps,
    SnackbarPart,
    SnackbarVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { testIdOf, useControllable, withEngine } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { nativeSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import { SurfaceButton } from "../surface-button";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface SnackbarHosts {
    readonly root: "View";
    readonly supportingText: "Text";
    readonly actions: "View";
    readonly action: "Pressable";
    readonly close: "Pressable";
}

export interface SnackbarProps
    extends
        SnackbarVariantProps,
        IndicationProps,
        NativeSlotProps<SnackbarHosts> {
    /** The message. */
    readonly supportingText?: ReactNode;
    /** The action's label. */
    readonly action?: ReactNode;
    readonly onAction?: (() => void) | undefined;
    /** The close button's name for assistive technology. Default "Dismiss". */
    readonly closeLabel?: string | undefined;
    /** What the close button shows. Default a multiplication sign. */
    readonly closeIcon?: ReactNode;
    readonly onClose?: (() => void) | undefined;
    /** Whether it shows: it grows in when this turns true and fades out when it turns false,
     *  rendering nothing once it's gone. Without it or `defaultOpen`, the surface is always
     *  shown, still. */
    readonly open?: boolean | undefined;
    /** Whether it starts shown, uncontrolled: its close button, its action and Escape inside it
     *  close it, as the web's. */
    readonly defaultOpen?: boolean | undefined;
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    readonly testId?: TestIdOverride<SnackbarPart> | undefined;
}

function SnackbarButtonImpl(props: {
    readonly snackbar: SnackbarProps;
    readonly part: "action" | "close";
    readonly label: string | undefined;
    readonly onPress: (() => void) | undefined;
    readonly children: ReactNode;
}): ReactNode {
    return (
        <SurfaceButton
            anatomy={snackbarAnatomy}
            component="snackbar"
            part={props.part}
            selection={snackbarSelection(props.snackbar)}
            indication={props.snackbar.indication}
            testId={props.snackbar.testId}
            slot={nativeSlots(props.snackbar)}
            label={props.label}
            onPress={props.onPress}
        >
            {props.children}
        </SurfaceButton>
    );
}

const SnackbarButton = withEngine(SnackbarButtonImpl, "SnackbarButton");

function SnackbarImpl(props: SnackbarProps): ReactNode {
    const engine = useEngine();
    const { styles: s, views: v } = useComponentSlots<SnackbarPart>(
        "snackbar",
        snackbarSelection(props),
    );
    const managed = props.open !== undefined || props.defaultOpen !== undefined;
    const [own, setOwn] = useControllable(
        "Snackbar",
        "open",
        props.open,
        props.defaultOpen,
        props.onOpenChange,
        true,
    );
    const open = managed ? own : undefined;
    const presence = useOverlayPresence(open, "popup");
    const close = () => {
        if (managed && own) setOwn(false);
    };
    const id = (part: SnackbarPart) =>
        testIdOf(snackbarAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    if (!presence.present) return null;
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = open === undefined ? v.root : engine;
    // Escape inside it closes it, on the web.
    const onKeyDown = (event: { nativeEvent: { key: string } }) => {
        if (event.nativeEvent.key === "Escape") close();
    };
    return (
        <Root.View
            {...slot.props("root")}
            {...slot.with("root", presence.props)}
            {...({ onKeyDown } as object)}
            role="status"
            aria-live="polite"
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
            <v.actions.View
                {...slot.props("actions")}
                style={slot.style("actions", s.actions)}
                testID={id("actions")}
            >
                {isPresent(props.action) ? (
                    <SnackbarButton
                        snackbar={props}
                        part="action"
                        label={
                            typeof props.action === "string"
                                ? props.action
                                : undefined
                        }
                        onPress={() => {
                            props.onAction?.();
                            close();
                        }}
                    >
                        {props.action}
                    </SnackbarButton>
                ) : null}
                <SnackbarButton
                    snackbar={props}
                    part="close"
                    label={props.closeLabel ?? "Dismiss"}
                    onPress={() => {
                        props.onClose?.();
                        close();
                    }}
                >
                    {props.closeIcon ?? "×"}
                </SnackbarButton>
            </v.actions.View>
        </Root.View>
    );
}

/** Material's snackbar surface: `<Snackbar supportingText="Archived" action="Undo" />`. */
export const Snackbar = withEngine(SnackbarImpl, "Snackbar");
