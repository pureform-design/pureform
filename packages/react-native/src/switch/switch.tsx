// The switch: a pressable root with its touch target and its track, which holds the state layer
// (where it ripples) and the handle; the handle shows a check while it's on.

import { switchControlAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { switchSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    InteractiveProps,
    SwitchPart,
    SwitchVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

const [INDICATION] = switchControlAnatomy.indication!;

export interface SwitchProps extends SwitchVariantProps, InteractiveProps {
    /** Whether it's on. Controlled when defined. */
    readonly checked?: boolean | undefined;
    readonly defaultChecked?: boolean | undefined;
    readonly onCheckedChange?:
        | ((details: ChangeDetails<"checked", boolean>) => void)
        | undefined;
    readonly disabled?: boolean | undefined;
    readonly invalid?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    /** What the handle shows while on. Default a check mark. */
    readonly checkedIcon?: ReactNode;
    /** What the switch is for, for assistive technology. */
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<SwitchPart> | undefined;
}

function SwitchImpl(props: SwitchProps): ReactNode {
    const engine = useEngine();
    const [checked, setChecked] = useControllable(
        "Switch",
        "checked",
        props.checked,
        props.defaultChecked,
        props.onCheckedChange,
        false,
    );
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled: props.disabled,
    });
    const { styles: s, selected } = useComponentSlots(
        "switchControl",
        indication.select(switchSelection(props)),
        indication.states({
            checked,
            ...(props.disabled ? { disabled: true } : {}),
            ...(props.invalid ? { invalid: true } : {}),
            ...(props.readOnly ? { readOnly: true } : {}),
        }),
    );
    const id = (part: SwitchPart) =>
        testIdOf(switchControlAnatomy, part, props.testId);
    return (
        <engine.Pressable
            {...indication.handlers}
            role="switch"
            aria-checked={checked}
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            disabled={props.disabled}
            onPress={() => {
                if (!props.readOnly) setChecked(!checked);
            }}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            <engine.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            <engine.View style={s.track} testID={id("track")}>
                <engine.View style={s.stateLayer} testID={id("stateLayer")}>
                    {indication.layer(selected)}
                </engine.View>
                <engine.View style={s.handle} testID={id("handle")}>
                    <engine.Text
                        selectable={false}
                        style={s.icon}
                        testID={id("icon")}
                    >
                        {checked ? (props.checkedIcon ?? "✓") : ""}
                    </engine.Text>
                </engine.View>
            </engine.View>
        </engine.Pressable>
    );
}

/** Material's switch: `<Switch aria-label="Wi-Fi" defaultChecked />`. */
export const Switch = withEngine(SwitchImpl, "Switch");
