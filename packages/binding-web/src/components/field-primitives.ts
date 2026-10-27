import { fieldControlState } from "@pureform/binding-core";
import type { FieldState, FieldStateProps } from "@pureform/binding-core";
import type { NativeSelectBehaviorProps } from "@pureform/binding-core";

/** The `<select>`'s own props from Root's and the Field around it, if any (its own props win):
 *  what it submits, validates and is disabled by, its id, and its descriptions. The root's
 *  `data-disabled` follows the same `disabled`. */
export const nativeSelectProps = (
    props: Pick<
        NativeSelectBehaviorProps,
        | "disabled"
        | "invalid"
        | "required"
        | "name"
        | "form"
        | "id"
        | "multiple"
    > & {
        readonly "aria-describedby"?: string | undefined;
    },
    fieldsetDisabled = false,
    field?: FieldState,
) => {
    const control = fieldControlProps(field, props);
    return {
        ...control,
        name: props.name,
        form: props.form,
        multiple: props.multiple || undefined,
        disabled: control.disabled || fieldsetDisabled || undefined,
    };
};

/** The control's props: its id, the field's states (its own props win), and the
 *  description's and the error's ids in `aria-describedby` after any it was given. Outside a
 *  field, only its own states. */
export const fieldControlProps = (
    field: FieldState | undefined,
    own: FieldStateProps & {
        readonly id?: string | undefined;
        readonly "aria-describedby"?: string | undefined;
    },
) => {
    const state = fieldControlState(field, {
        ...own,
        describedBy: own["aria-describedby"],
    });
    return {
        id: state.id,
        disabled: state.disabled || undefined,
        required: state.required || undefined,
        "aria-invalid": state.invalid ? ("true" as const) : undefined,
        "aria-describedby": state.describedBy,
    };
};

/** The label's element props: its id and the control it names (the binding spells `for` its
 *  own way), and `aria-disabled` while dimmed, which its style reads. */
export const fieldLabelProps = (
    field: FieldState | undefined,
    state: { readonly disabled: boolean },
) => ({
    id: field?.ids.label,
    for: field?.ids.control,
    "aria-disabled": state.disabled ? ("true" as const) : undefined,
});
