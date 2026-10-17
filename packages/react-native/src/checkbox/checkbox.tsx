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

import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

const [INDICATION] = checkboxAnatomy.indication!;

export interface CheckboxProps extends CheckboxVariantProps, InteractiveProps {
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
    const engine = useEngine();
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
    const { styles: s, selected } = useComponentSlots(
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
    return (
        <engine.Pressable
            {...indication.handlers}
            role="checkbox"
            aria-checked={indeterminate ? "mixed" : checked}
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            disabled={props.disabled}
            onPress={() => {
                if (!props.readOnly) setChecked(checked !== true);
            }}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            <engine.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            <engine.View style={s.box} testID={id("box")}>
                <engine.View style={s.checkIcon} testID={id("checkIcon")} />
                <engine.View
                    style={s.indeterminateIcon}
                    testID={id("indeterminateIcon")}
                />
            </engine.View>
            {indication.layer(selected)}
        </engine.Pressable>
    );
}

/** Material's checkbox: `<Checkbox aria-label="Agree" defaultChecked />`. */
export const Checkbox = withEngine(CheckboxImpl, "Checkbox");
