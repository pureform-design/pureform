// The plain Label: names the Field's control (its `nativeID` is what the control's
// `aria-labelledby` points at), dims while the field is disabled, and marks it required.

import { labelAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    fieldLabelState,
    labelSelection,
    REQUIRED_MARK,
} from "@pureform/binding-core";
import type { LabelPart, LabelRootOwnProps } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { useField } from "../field/context";
import { testIdOf, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

export interface LabelProps extends Omit<
    LabelRootOwnProps,
    "unstyled" | "testId"
> {
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<LabelPart> | undefined;
}

function LabelImpl(props: LabelProps): ReactNode {
    const field = useField()?.state;
    const state = fieldLabelState(field, props);
    const { styles: s, views: v } = useComponentSlots<LabelPart>(
        "label",
        labelSelection(props),
        state.disabled ? { disabled: true } : {},
    );
    return (
        <v.root.Text
            nativeID={field?.ids.label}
            aria-disabled={state.disabled || undefined}
            style={s.root}
            testID={testIdOf(labelAnatomy, "root", props.testId)}
        >
            {props.children}
            {state.required ? (
                <v.requiredIndicator.Text
                    aria-hidden
                    style={s.requiredIndicator}
                    testID={testIdOf(
                        labelAnatomy,
                        "requiredIndicator",
                        props.testId,
                    )}
                >
                    {REQUIRED_MARK}
                </v.requiredIndicator.Text>
            ) : null}
        </v.root.Text>
    );
}

/** The label: names the field's control, dims while it's disabled, and marks it required. */
export const Label = withEngine(LabelImpl, "Label");
