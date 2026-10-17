// The button: a pressable root with its touch target, an icon when given, and its label, styled
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
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

const [INDICATION] = buttonAnatomy.indication!;

export interface ButtonProps
    extends
        ButtonVariantProps,
        ButtonContentProps<ReactNode>,
        InteractiveProps {
    readonly disabled?: boolean | undefined;
    readonly onPress?: (() => void) | undefined;
    /** A prefix for every part's test id (`save` → `save-root`), or ids by part. */
    readonly testId?: TestIdOverride<ButtonPart> | undefined;
}

function ButtonImpl(props: ButtonProps): ReactNode {
    const engine = useEngine();
    const disabled = props.disabled ?? false;
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled,
    });
    const { styles: s, selected } = useComponentSlots(
        "button",
        indication.select(buttonSelection(props)),
        indication.states({
            disabled,
            ...(props.mirrorIcon ? { mirrored: true } : {}),
        }),
    );
    const id = (part: ButtonPart) =>
        testIdOf(buttonAnatomy, part, props.testId);
    return (
        <engine.Pressable
            {...indication.handlers}
            role="button"
            disabled={props.disabled}
            onPress={props.onPress}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            <engine.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            {props.icon != null && props.icon !== false ? (
                <engine.View style={s.icon} testID={id("icon")}>
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {props.icon}
                    </IconSlot>
                </engine.View>
            ) : null}
            <engine.Text
                selectable={false}
                style={s.label}
                testID={id("label")}
            >
                {props.label}
            </engine.Text>
            {indication.layer(selected)}
        </engine.Pressable>
    );
}

/** Material's common button: `<Button label="Save" variant="tonal" onPress={save} />`. */
export const Button = withEngine(ButtonImpl, "Button");
