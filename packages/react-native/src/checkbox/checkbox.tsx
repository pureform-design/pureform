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
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useComponentSlots, withUserStyle } from "../styles";
import type { RootStyleProps } from "../styles";

const [INDICATION] = checkboxAnatomy.indication!;

export interface CheckboxProps
    extends CheckboxVariantProps, InteractiveProps, RootStyleProps {
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
    const keys = useCheckKeys(
        () => {
            if (!props.readOnly) setChecked(checked !== true);
        },
        props.disabled,
        indication.handlers.onPressIn,
    );
    return (
        <v.root.Pressable
            {...indication.handlers}
            {...keys}
            role="checkbox"
            aria-checked={indeterminate ? "mixed" : checked}
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
            <v.box.View style={s.box} testID={id("box")}>
                <v.checkIcon.View
                    style={s.checkIcon}
                    testID={id("checkIcon")}
                />
                <v.indeterminateIcon.View
                    style={s.indeterminateIcon}
                    testID={id("indeterminateIcon")}
                />
            </v.box.View>
            {indication.layer(selected)}
        </v.root.Pressable>
    );
}

/** Material's checkbox: `<Checkbox aria-label="Agree" defaultChecked />`. */
export const Checkbox = withEngine(CheckboxImpl, "Checkbox");
