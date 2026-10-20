// The button: a pressable root with its touch target, its icons when given, and its label, styled
// by the registry's button factory, rippling when pressed.

import { buttonAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { buttonSelection } from "@pureform/binding-core";
import type {
    ButtonContentProps,
    ButtonPart,
    ButtonVariantProps,
    InteractiveProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

const [INDICATION] = buttonAnatomy.indication!;

export interface ButtonProps
    extends
        ButtonVariantProps,
        ButtonContentProps<ReactNode>,
        InteractiveProps {
    readonly disabled?: boolean | undefined;
    /** Whether a toggle is on, as a selectable button group sets it. Giving it makes the button
     *  a toggle; its owner flips it from `onPress`. */
    readonly selected?: boolean | undefined;
    readonly onPress?: (() => void) | undefined;
    /** A long press: given it, a long press calls it rather than pressing (a tooltip's trigger
     *  shows its tooltip so). */
    readonly onLongPress?: (() => void) | undefined;
    /** A prefix for every part's test id (`save` → `save-root`), or ids by part. */
    readonly testId?: TestIdOverride<ButtonPart> | undefined;
}

function ButtonImpl(props: ButtonProps): ReactNode {
    const disabled = props.disabled ?? false;
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<ButtonPart>(
        "button",
        indication.select(buttonSelection(props)),
        indication.states({
            disabled,
            ...(props.selected === undefined
                ? {}
                : { selected: props.selected }),
            ...(props.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const id = (part: ButtonPart) =>
        testIdOf(buttonAnatomy, part, props.testId);
    const secondary =
        props.secondaryIcon != null && props.secondaryIcon !== false ? (
            <v.secondaryIcon.View
                style={s.secondaryIcon}
                testID={id("secondaryIcon")}
            >
                <IconSlot
                    {...iconSlot(selected, "secondaryIcon")}
                    motion={s.secondaryIcon}
                >
                    {props.secondaryIcon}
                </IconSlot>
            </v.secondaryIcon.View>
        ) : null;
    const start = props.secondaryIconPosition === "start";
    return (
        <v.root.Pressable
            {...indication.handlers}
            role="button"
            {...(props.selected === undefined
                ? {}
                : { "aria-checked": props.selected })}
            disabled={props.disabled}
            onLongPress={props.onLongPress}
            onPress={props.onPress}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            <v.touchTarget.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            {start ? secondary : null}
            {props.icon != null && props.icon !== false ? (
                <v.icon.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {props.icon}
                    </IconSlot>
                </v.icon.View>
            ) : null}
            <v.label.Text
                selectable={false}
                style={s.label}
                testID={id("label")}
            >
                {props.label}
            </v.label.Text>
            {start ? null : secondary}
            {indication.layer(selected)}
        </v.root.Pressable>
    );
}

/** Material's common button: `<Button label="Save" variant="tonal" onPress={save} />`. */
export const Button = withEngine(ButtonImpl, "Button");
