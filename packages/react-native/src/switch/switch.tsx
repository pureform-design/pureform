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

import { useCheckKeys } from "../check-keys";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useComponentSlots, withUserStyle } from "../styles";
import type { RootStyleProps } from "../styles";
import { touchTargetSlopOf } from "../touch-target/touch-target";

const [INDICATION] = switchControlAnatomy.indication!;

export interface SwitchProps
    extends SwitchVariantProps, InteractiveProps, RootStyleProps {
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
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<SwitchPart>(
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
    const keys = useCheckKeys(
        () => {
            if (!props.readOnly) setChecked(!checked);
        },
        props.disabled,
        indication.handlers.onPressIn,
    );
    const slop = touchTargetSlopOf(s.root ?? {}, s.touchTarget);
    return (
        <v.root.Pressable
            hitSlop={slop}
            {...indication.handlers}
            {...keys}
            role="switch"
            aria-checked={checked}
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            disabled={props.disabled}
            style={withUserStyle({ ...s.root, ...unselectable }, props.style)}
            testID={id("root")}
        >
            <v.touchTarget.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            <v.track.View style={s.track} testID={id("track")}>
                <v.stateLayer.View
                    style={s.stateLayer}
                    testID={id("stateLayer")}
                >
                    {indication.layer(selected)}
                </v.stateLayer.View>
                <v.handle.View style={s.handle} testID={id("handle")}>
                    <v.icon.Text
                        selectable={false}
                        style={s.icon}
                        testID={id("icon")}
                    >
                        {checked ? (props.checkedIcon ?? "✓") : ""}
                    </v.icon.Text>
                </v.handle.View>
            </v.track.View>
        </v.root.Pressable>
    );
}

/** Material's switch: `<Switch aria-label="Wi-Fi" defaultChecked />`. */
export const Switch = withEngine(SwitchImpl, "Switch");
