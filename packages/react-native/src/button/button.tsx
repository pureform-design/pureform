// The button: a pressable root with its touch target, an icon when given, and its label, styled
// by the registry's button factory, rippling when pressed.

import { buttonAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { buttonSelection } from "@pureform/binding-core";
import type {
    ButtonContentProps,
    ButtonPart,
    ButtonVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "../icon-style";
import {
    testIdOf,
    unselectable,
    useInk,
    usePress,
    withEngine,
    withInk,
} from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

export interface ButtonProps
    extends ButtonVariantProps, ButtonContentProps<ReactNode> {
    readonly disabled?: boolean | undefined;
    readonly onPress?: (() => void) | undefined;
    /** A prefix for every part's test id (`save` → `save-root`), or ids by part. */
    readonly testId?: TestIdOverride<ButtonPart> | undefined;
}

function ButtonImpl(props: ButtonProps): ReactNode {
    const engine = useEngine();
    const disabled = props.disabled ?? false;
    const { state, handlers } = usePress({
        disabled,
        ...(props.mirrorIcon ? { mirrored: true } : {}),
    });
    const { styles: s, selected } = useComponentSlots(
        "button",
        buttonSelection(props),
        state,
    );
    const ink = useInk(selected, { disabled });
    const id = (part: ButtonPart) =>
        testIdOf(buttonAnatomy, part, props.testId);
    return (
        <engine.Pressable
            {...withInk(handlers, ink)}
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
            {ink.layer}
        </engine.Pressable>
    );
}

/** Material's common button: `<Button label="Save" variant="tonal" onPress={save} />`. */
export const Button = withEngine(ButtonImpl, "Button");
