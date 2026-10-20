// The snackbar's surface: its message, an action, and a close button, each rippling when pressed.
// `useSnackbar` (queue.tsx) shows them over the page one at a time; placed by the app instead, when
// it shows and for how long is the app's, and given `open`, it grows in and fades out.

import { snackbarAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { isPresent, snackbarSelection } from "@pureform/binding-core";
import type {
    IndicationProps,
    SnackbarPart,
    SnackbarVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, withEngine } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

// The action's and the close button's.
const INDICATIONS = Object.fromEntries(
    snackbarAnatomy.indication!.map((entry) => [entry.trigger, entry]),
);

export interface SnackbarProps extends SnackbarVariantProps, IndicationProps {
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
     *  rendering nothing once it's gone. Without it, the surface is always shown, still. */
    readonly open?: boolean | undefined;
    readonly testId?: TestIdOverride<SnackbarPart> | undefined;
}

function SnackbarButtonImpl(props: {
    readonly snackbar: SnackbarProps;
    readonly part: "action" | "close";
    readonly label: string | undefined;
    readonly onPress: (() => void) | undefined;
    readonly children: ReactNode;
}): ReactNode {
    const indication = useSurfaceIndication(INDICATIONS[props.part]!, {
        indication: props.snackbar.indication,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<SnackbarPart>(
        "snackbar",
        indication.select(snackbarSelection(props.snackbar)),
        indication.states(),
    );
    const Surface = v[props.part];
    return (
        <Surface.Pressable
            {...indication.handlers}
            role="button"
            {...(props.label === undefined
                ? {}
                : { "aria-label": props.label })}
            onPress={props.onPress}
            style={{ ...s[props.part], ...unselectable }}
            testID={testIdOf(
                snackbarAnatomy,
                props.part,
                props.snackbar.testId,
            )}
        >
            <IconSlot
                {...iconSlot(selected, props.part)}
                motion={s[props.part]}
            >
                {props.children}
            </IconSlot>
            {indication.layer(selected)}
        </Surface.Pressable>
    );
}

const SnackbarButton = withEngine(SnackbarButtonImpl, "SnackbarButton");

function SnackbarImpl(props: SnackbarProps): ReactNode {
    const engine = useEngine();
    const { styles: s, views: v } = useComponentSlots<SnackbarPart>(
        "snackbar",
        snackbarSelection(props),
    );
    const presence = useOverlayPresence(props.open, "popup");
    const id = (part: SnackbarPart) =>
        testIdOf(snackbarAnatomy, part, props.testId);
    if (!presence.present) return null;
    // The engine's view where it enters and leaves, the slot's own while it's still.
    const Root = props.open === undefined ? v.root : engine;
    return (
        <Root.View
            {...presence.props}
            role="status"
            aria-live="polite"
            style={{ ...s.root, ...presence.style }}
            testID={id("root")}
        >
            <v.supportingText.Text
                style={s.supportingText}
                testID={id("supportingText")}
            >
                {props.supportingText}
            </v.supportingText.Text>
            <v.actions.View style={s.actions} testID={id("actions")}>
                {isPresent(props.action) ? (
                    <SnackbarButton
                        snackbar={props}
                        part="action"
                        label={
                            typeof props.action === "string"
                                ? props.action
                                : undefined
                        }
                        onPress={props.onAction}
                    >
                        {props.action}
                    </SnackbarButton>
                ) : null}
                <SnackbarButton
                    snackbar={props}
                    part="close"
                    label={props.closeLabel ?? "Dismiss"}
                    onPress={props.onClose}
                >
                    {props.closeIcon ?? "×"}
                </SnackbarButton>
            </v.actions.View>
        </Root.View>
    );
}

/** Material's snackbar surface: `<Snackbar supportingText="Archived" action="Undo" />`. */
export const Snackbar = withEngine(SnackbarImpl, "Snackbar");
