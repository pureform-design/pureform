// The checkbox's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and Zag's checkbox machine, and how the machine's part props are adjusted
// for the preset's markup (a native input laid over the control, two marks drawn by the CSS).

import type {
    checkboxAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { InteractiveProps } from "./indication";
import type { VariantProp } from "./variants";

/** The checkbox's parts: `"root" | "touchTarget" | "input" | "box" | "checkIcon" |
 *  "indeterminateIcon"`. */
export type CheckboxPart = PartName<typeof checkboxAnatomy>;

/** A checkbox's state: checked, unchecked, or indeterminate. */
export type CheckedState = boolean | "indeterminate";

/** The checkbox's variant groups and instance tokens. */
export interface CheckboxVariantProps {
    readonly color?: VariantProp<"checkbox", "color">;
    readonly density?: VariantProp<"checkbox", "density">;
    readonly tokens?: InstanceTokens<"checkbox"> | undefined;
}

/** The ids of the checkbox's elements, for composition: `input` for a `<label for>`. */
export interface CheckboxElementIds {
    readonly root?: string | undefined;
    readonly input?: string | undefined;
}

/** What the checkbox machine takes from Root's props. */
export interface CheckboxBehaviorProps extends Controllable<
    "checked",
    CheckedState
> {
    /** A disabled fieldset around the checkbox disables it too. */
    readonly disabled?: boolean | undefined;
    /** Sets `aria-invalid` on the input, which the error look keys on. */
    readonly invalid?: boolean | undefined;
    readonly required?: boolean | undefined;
    /** Ignores the user's changes and sets `aria-readonly`. */
    readonly readOnly?: boolean | undefined;
    /** The name the input submits under.
     *  @control none */
    readonly name?: string | undefined;
    /** The id of the form the input belongs to, for a checkbox outside it.
     *  @control none */
    readonly form?: string | undefined;
    /** The value the input submits when checked. @default "on"
     *  @control none */
    readonly value?: string | undefined;
    /** The root element's id; the machine finds the element by it.
     *  @control none */
    readonly id?: string | undefined;
    readonly ids?: CheckboxElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface CheckboxRootOwnProps
    extends CheckboxVariantProps, CheckboxBehaviorProps, InteractiveProps {
    /** A prefix for every part's test id (`terms` → `terms-input`), or ids by part. */
    readonly testId?: TestIdOverride<CheckboxPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<CheckboxPart> | undefined;
}

/** The keys of `CheckboxRootOwnProps`, which Root keeps off its element. */
export const CHECKBOX_ROOT_PROPS = [
    "color",
    "density",
    "tokens",
    "disabled",
    "invalid",
    "required",
    "readOnly",
    "name",
    "form",
    "value",
    "id",
    "ids",
    "checked",
    "defaultChecked",
    "onCheckedChange",
    "testId",
    "unstyled",
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof CheckboxRootOwnProps)[];

/** The props of the ready-made checkbox that name the input, so they go on it rather than on
 *  Root: the input is what assistive technology reads. */
export const CHECKBOX_INPUT_LABEL_PROPS = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
] as const;

/** The registry selection from Root's props. */
export const checkboxSelection = (
    props: CheckboxVariantProps,
): Selection<"checkbox"> => ({
    color: props.color,
    density: props.density,
    tokens: props.tokens,
});

/** Zag's checkbox props from Root's, besides `id`, `dir`, and the controllable `checked` (the
 *  binding's `useControllable`). `fieldsetDisabled` is the binding's `useFieldsetDisabled`, which
 *  follows every fieldset around the input rather than only the closest. */
export const checkboxMachineProps = (
    props: CheckboxBehaviorProps,
    fieldsetDisabled: boolean,
) => ({
    disabled: props.disabled || fieldsetDisabled,
    invalid: props.invalid,
    required: props.required,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    value: props.value,
    ids: { root: props.id ?? props.ids?.root, hiddenInput: props.ids?.input },
});

/** The native input's default: what a form reset shows (`ControllableState.resetsTo`). The
 *  indeterminate state isn't native, so it resets unchecked. */
export const checkboxNativeDefault = (
    resetsTo: CheckedState | undefined,
): boolean => resetsTo === true;

/** The state a form reset sends the machine: the `defaultChecked` read at creation. */
export const checkboxResetState = (
    defaultChecked: CheckedState | undefined,
): CheckedState => defaultChecked ?? false;

/** Zag's hidden-input props for the `input` part: without its visually hidden `style`, which the
 *  slot's own style replaces, and without `aria-labelledby`, which names a label part the preset
 *  doesn't have. `aria-readonly` marks a read-only checkbox. */
export const checkboxInputProps = <P extends object>(
    props: P,
    readOnly: boolean | undefined,
): Omit<P, "style" | "aria-labelledby"> & {
    readonly "aria-readonly": "true" | undefined;
} => {
    const {
        style: _style,
        "aria-labelledby": _labelledBy,
        ...rest
    } = props as P & { style?: unknown; "aria-labelledby"?: unknown };
    return { ...rest, "aria-readonly": readOnly ? "true" : undefined };
};

/** Zag's indicator props for the check and indeterminate marks: without `hidden`, since the CSS
 *  shows each mark in its state, with a transition. */
export const checkboxMarkProps = <P extends object>(
    props: P,
): Omit<P, "hidden"> => {
    const { hidden: _hidden, ...rest } = props as P & { hidden?: unknown };
    return rest;
};
