// The plain Field on React Native: a column connecting the Label, Input or Textarea, Description and
// ErrorText inside it. The control is labelled by the label (`aria-labelledby`, the label's
// `nativeID`), and takes the disabled, invalid and required states; a mounted ErrorText marks it
// invalid unless `invalid` says otherwise. React Native has no `aria-describedby`, so the
// description and the error are read as the text after the control. It has no date or time input
// either: for a date or a time, use Material's `DatePicker` and `TimePicker`.

import { fieldAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    fieldIds,
    fieldSelection,
    fieldState,
    isPresent,
} from "@pureform/binding-core";
import type {
    FieldContentProps,
    FieldPart,
    FieldRootOwnProps,
} from "@pureform/binding-core";
import { useCallback, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Description } from "../description/description";
import { ErrorText } from "../error-text/error-text";
import { Input } from "../input/input";
import { Label } from "../label/label";
import { testIdOf, withEngine } from "../parts";
import { nativeSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import { FieldContext } from "./context";
import type { FieldContextValue } from "./context";

/** Field's props: its states, the control's id, the ready-made content, its tokens and
 *  `testId`. */
/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface FieldHosts {
    readonly root: "View";
}

export interface FieldProps
    extends
        Omit<FieldRootOwnProps, "unstyled" | "testId">,
        FieldContentProps<ReactNode>,
        NativeSlotProps<FieldHosts> {
    /** The pieces: a Label, an Input or a Textarea, a Description and an ErrorText. Left out,
     *  Field renders them from `label`, `description` and `error`. */
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<FieldPart> | undefined;
}

function FieldImpl(props: FieldProps): ReactNode {
    const slot = nativeSlots(props);
    const generated = useId();
    const ids = useMemo(
        () => fieldIds(props.controlId ?? `${generated}-control`),
        [props.controlId, generated],
    );
    const [counts, setCounts] = useState({ description: 0, error: 0 });
    const register = useCallback((piece: "description" | "error") => {
        setCounts((c) => ({ ...c, [piece]: c[piece] + 1 }));
        return () => setCounts((c) => ({ ...c, [piece]: c[piece] - 1 }));
    }, []);
    const state = fieldState(props, ids, {
        description: counts.description > 0,
        error: counts.error > 0,
    });
    const value = useMemo<FieldContextValue>(
        () => ({ state, register }),
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- `state` is rebuilt every render; its fields are what matter
        [
            ids,
            register,
            state.disabled,
            state.invalid,
            state.required,
            state.described.description,
            state.described.error,
        ],
    );
    const { styles: s, views: v } = useComponentSlots<FieldPart>(
        "field",
        fieldSelection(props),
    );
    return (
        <FieldContext value={value}>
            <v.root.View
                {...slot.props("root")}
                style={slot.style("root", s.root)}
                testID={testIdOf(fieldAnatomy, "root", props.testId)}
            >
                {props.children ?? (
                    <>
                        {isPresent(props.label) && <Label>{props.label}</Label>}
                        <Input />
                        {isPresent(props.description) && (
                            <Description>{props.description}</Description>
                        )}
                        {isPresent(props.error) && (
                            <ErrorText>{props.error}</ErrorText>
                        )}
                    </>
                )}
            </v.root.View>
        </FieldContext>
    );
}

/** A column connecting the pieces inside it. */
export const Field = withEngine(FieldImpl, "Field");
