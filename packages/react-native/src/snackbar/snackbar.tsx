// The snackbar's surface: its message, an action, and a close button. When it shows, and for how
// long, is the app's.

import { snackbarAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { isPresent, snackbarSelection } from "@pureform/binding-core";
import type {
    SnackbarPart,
    SnackbarVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { Glyph, IconSlot, iconSlot } from "../icon-style";
import { testIdOf, unselectable, usePress, withEngine } from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

export interface SnackbarProps extends SnackbarVariantProps {
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
    readonly testId?: TestIdOverride<SnackbarPart> | undefined;
}

function SnackbarButtonImpl(props: {
    readonly snackbar: SnackbarProps;
    readonly part: "action" | "close";
    readonly label: string | undefined;
    readonly onPress: (() => void) | undefined;
    readonly children: ReactNode;
}): ReactNode {
    const engine = useEngine();
    const { state, handlers } = usePress({});
    const { styles: s, selected } = useComponentSlots(
        "snackbar",
        snackbarSelection(props.snackbar),
        state,
    );
    return (
        <engine.Pressable
            {...handlers}
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
                {typeof props.children === "string" ? (
                    <Glyph glyph={props.children} />
                ) : (
                    props.children
                )}
            </IconSlot>
        </engine.Pressable>
    );
}

const SnackbarButton = withEngine(SnackbarButtonImpl, "SnackbarButton");

function SnackbarImpl(props: SnackbarProps): ReactNode {
    const engine = useEngine();
    const { styles: s } = useComponentSlots(
        "snackbar",
        snackbarSelection(props),
    );
    const id = (part: SnackbarPart) =>
        testIdOf(snackbarAnatomy, part, props.testId);
    return (
        <engine.View role="status" style={s.root} testID={id("root")}>
            <engine.Text style={s.supportingText} testID={id("supportingText")}>
                {props.supportingText}
            </engine.Text>
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
        </engine.View>
    );
}

/** Material's snackbar surface: `<Snackbar supportingText="Archived" action="Undo" />`. */
export const Snackbar = withEngine(SnackbarImpl, "Snackbar");
