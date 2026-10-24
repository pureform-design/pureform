// The checkbox: a pressable root with its touch target and its box, which holds the check and
// the indeterminate dash, and ripples from its center. A press checks it, or unchecks it; an
// indeterminate one checks.

import { checkboxAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { checkboxSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    CheckboxPart,
    CheckboxVariantProps,
    CheckedState,
    InteractiveProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { useCheckKeys } from "../check-keys";
import { useSurfaceIndication } from "../indication";
import { testIdOf, useControllable, withEngine } from "../parts";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import { touchTargetSlopOf } from "../touch-slop";

const [INDICATION] = checkboxAnatomy.indication!;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface CheckboxHosts {
    readonly root: "Pressable";
    readonly touchTarget: "View";
    readonly box: "View";
    readonly checkIcon: "View";
    readonly indeterminateIcon: "View";
}

export interface CheckboxProps
    extends
        CheckboxVariantProps,
        InteractiveProps,
        NativeSlotProps<CheckboxHosts> {
    /** Whether it's checked, or `"indeterminate"`. Controlled when defined. */
    readonly checked?: CheckedState | undefined;
    readonly defaultChecked?: CheckedState | undefined;
    readonly onCheckedChange?:
        | ((details: ChangeDetails<"checked", CheckedState>) => void)
        | undefined;
    readonly disabled?: boolean | undefined;
    readonly invalid?: boolean | undefined;
    /** Ignores presses. */
    readonly readOnly?: boolean | undefined;
    /** What the checkbox is for, for assistive technology. */
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<CheckboxPart> | undefined;
}

function CheckboxImpl(props: CheckboxProps): ReactNode {
    const [checked, setChecked] = useControllable<"checked", CheckedState>(
        "Checkbox",
        "checked",
        props.checked,
        props.defaultChecked,
        props.onCheckedChange,
        false,
    );
    const indeterminate = checked === "indeterminate";
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled: props.disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<CheckboxPart>(
        "checkbox",
        indication.select(checkboxSelection(props)),
        indication.states({
            checked: checked === true,
            ...(indeterminate ? { indeterminate: true } : {}),
            ...(props.disabled ? { disabled: true } : {}),
            ...(props.invalid ? { invalid: true } : {}),
            ...(props.readOnly ? { readOnly: true } : {}),
        }),
    );
    const id = (part: CheckboxPart) =>
        testIdOf(checkboxAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const keys = useCheckKeys(
        () => {
            if (!props.readOnly) setChecked(checked !== true);
        },
        props.disabled,
        indication.handlers.onPressIn,
    );
    const slop = touchTargetSlopOf(s.root ?? {}, s.touchTarget);
    return (
        <v.root.Pressable
            {...slot.props("root")}
            hitSlop={slop}
            {...slot.with("root", indication.handlers)}
            {...slot.with("root", keys)}
            role="checkbox"
            aria-checked={indeterminate ? "mixed" : checked}
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            disabled={props.disabled}
            style={slot.style("root", withUnselectable(s.root))}
            testID={id("root")}
        >
            <v.touchTarget.View
                {...slot.props("touchTarget")}
                pointerEvents="none"
                style={slot.style("touchTarget", s.touchTarget)}
                testID={id("touchTarget")}
            />
            <v.box.View
                {...slot.props("box")}
                style={slot.style("box", s.box)}
                testID={id("box")}
            >
                <v.checkIcon.View
                    {...slot.props("checkIcon")}
                    style={slot.style("checkIcon", s.checkIcon)}
                    testID={id("checkIcon")}
                />
                <v.indeterminateIcon.View
                    {...slot.props("indeterminateIcon")}
                    style={slot.style("indeterminateIcon", s.indeterminateIcon)}
                    testID={id("indeterminateIcon")}
                />
            </v.box.View>
            {indication.layer(selected)}
        </v.root.Pressable>
    );
}

/** Material's checkbox: `<Checkbox aria-label="Agree" defaultChecked />`. */
export const Checkbox = withEngine(CheckboxImpl, "Checkbox");
