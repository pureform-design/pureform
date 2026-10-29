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
import { useNativeSlotReader } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface LabelHosts {
    readonly root: "Text";
    readonly requiredIndicator: "Text";
}

export interface LabelProps
    extends
        Omit<LabelRootOwnProps, "unstyled" | "testId">,
        NativeSlotProps<LabelHosts> {
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<LabelPart> | undefined;
}

function LabelImpl(props: LabelProps): ReactNode {
    const nativeSlots = useNativeSlotReader("label");
    const slot = nativeSlots(props);
    const field = useField()?.state;
    const state = fieldLabelState(field, props);
    const { styles: s, views: v } = useComponentSlots<LabelPart>(
        "label",
        labelSelection(props),
        state.disabled ? { disabled: true } : {},
    );
    return (
        <v.root.Text
            {...slot.props("root")}
            nativeID={field?.ids.label}
            aria-disabled={state.disabled || undefined}
            style={slot.style("root", s.root)}
            testID={testIdOf(labelAnatomy, "root", props.testId)}
        >
            {props.children}
            {state.required ? (
                <v.requiredIndicator.Text
                    {...slot.props("requiredIndicator")}
                    aria-hidden
                    style={slot.style("requiredIndicator", s.requiredIndicator)}
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
