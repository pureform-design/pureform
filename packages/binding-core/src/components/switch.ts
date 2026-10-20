// The switch's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and Zag's switch machine, and how the machine's part props are adjusted for
// the preset's markup (a native checkbox with `role="switch"` laid over the track).

import type {
    PartName,
    switchControlAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { InteractiveProps } from "./indication";
import type { VariantProp } from "./variants";

/** The switch's parts: `"root" | "touchTarget" | "input" | "track" | "stateLayer" | "handle" |
 *  "icon"`. */
export type SwitchPart = PartName<typeof switchControlAnatomy>;

/** The switch's variant groups and instance tokens. */
export interface SwitchVariantProps {
    readonly color?: VariantProp<"switchControl", "color">;
    /** When the handle's icon shows: when on (`selected`), in both states, or never. */
    readonly icons?: VariantProp<"switchControl", "icons">;
    readonly tokens?: InstanceTokens<"switchControl"> | undefined;
}

/** The ids of the switch's elements, for composition: `input` for a `<label for>`. */
export interface SwitchElementIds {
    readonly root?: string | undefined;
    readonly input?: string | undefined;
}

/** What the switch machine takes from Root's props. */
export interface SwitchBehaviorProps extends Controllable<"checked", boolean> {
    /** A disabled fieldset around the switch disables it too. */
    readonly disabled?: boolean | undefined;
    /** Sets `aria-invalid` on the input. */
    readonly invalid?: boolean | undefined;
    readonly required?: boolean | undefined;
    /** Ignores the user's changes and sets `aria-readonly`. */
    readonly readOnly?: boolean | undefined;
    /** The name the input submits under. */
    readonly name?: string | undefined;
    /** The id of the form the input belongs to, for a switch outside it. */
    readonly form?: string | undefined;
    /** The value the input submits when on. @default "on" */
    readonly value?: string | undefined;
    /** The root element's id; the machine finds the element by it. */
    readonly id?: string | undefined;
    readonly ids?: SwitchElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SwitchRootOwnProps
    extends SwitchVariantProps, SwitchBehaviorProps, InteractiveProps {
    /** A prefix for every part's test id (`wifi` → `wifi-input`), or ids by part. */
    readonly testId?: TestIdOverride<SwitchPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<SwitchPart> | undefined;
}

/** The keys of `SwitchRootOwnProps`, which Root keeps off its element. */
export const SWITCH_ROOT_PROPS = [
    "color",
    "icons",
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
] as const satisfies readonly (keyof SwitchRootOwnProps)[];

/** The props of the ready-made switch that name the input, so they go on it rather than on Root:
 *  the input is what assistive technology reads. */
export const SWITCH_INPUT_LABEL_PROPS = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
] as const;

/** What the ready-made switch renders inside Root, in the framework's node type. */
export interface SwitchContentProps<Node> {
    /** The handle's icon, shown while the switch is on; the icon part renders only when given. */
    readonly icon?: Node;
}

/** The keys of `SwitchContentProps`. */
export const SWITCH_CONTENT_PROPS = [
    "icon",
] as const satisfies readonly (keyof SwitchContentProps<unknown>)[];

/** The registry selection from Root's props. */
export const switchSelection = (
    props: SwitchVariantProps,
): Selection<"switchControl"> => ({
    color: props.color,
    icons: props.icons,
    tokens: props.tokens,
});

/** Zag's switch props from Root's, besides `id`, `dir`, and the controllable `checked` (the
 *  binding's `useControllable`). `fieldsetDisabled` is the binding's `useFieldsetDisabled`. */
export const switchMachineProps = (
    props: SwitchBehaviorProps,
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

/** The native input's default: what a form reset shows (`ControllableState.resetsTo`). */
export const switchNativeDefault = (resetsTo: boolean | undefined): boolean =>
    resetsTo === true;

/** Zag's hidden-input props for the `input` part: `role="switch"`, without Zag's visually hidden
 *  `style` (the slot's own replaces it) and without `aria-labelledby` (the preset has no label
 *  part). `aria-readonly` marks a read-only switch. */
export const switchInputProps = <P extends object>(
    props: P,
    readOnly: boolean | undefined,
): Omit<P, "style" | "aria-labelledby"> & {
    readonly role: "switch";
    readonly "aria-readonly": "true" | undefined;
} => {
    const {
        style: _style,
        "aria-labelledby": _labelledBy,
        ...rest
    } = props as P & { style?: unknown; "aria-labelledby"?: unknown };
    return {
        ...rest,
        role: "switch",
        "aria-readonly": readOnly ? "true" : undefined,
    };
};
