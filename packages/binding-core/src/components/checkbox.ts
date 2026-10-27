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
