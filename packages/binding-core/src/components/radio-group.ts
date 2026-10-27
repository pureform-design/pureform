// The radio group's contract, shared by every binding: the props the group's Root and each radio
// take for themselves, how they map onto the selection and Zag's radio group machine, and how the
// machine's part props are adjusted for the preset's markup (each radio a native input laid over
// its ring). The group itself is an unstyled element (`radioGroupAnatomy`); each radio is the
// preset's `radio`, with its own parts.

import type {
    PartName,
    radioAnatomy,
    radioGroupAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import type { VariantProp } from "./variants";

/** A radio's parts: `"root" | "touchTarget" | "input" | "ring" | "dot"`. */
export type RadioPart = PartName<typeof radioAnatomy>;

/** The radio group's own parts: `"root"`. */
export type RadioGroupPart = PartName<typeof radioGroupAnatomy>;

/** The radio's variant groups and instance tokens. */
export interface RadioVariantProps {
    readonly color?: VariantProp<"radio", "color">;
    readonly density?: VariantProp<"radio", "density">;
    readonly tokens?: InstanceTokens<"radio"> | undefined;
}

/** The group's variants: every radio's defaults. The group has no recipe, so no tokens of its
 *  own; the ready-made group gives its radios' tokens in `radioProps`. */
export type RadioGroupVariantProps = Pick<
    RadioVariantProps,
    "color" | "density"
>;

/** The ids of the group's elements, for composition. Zag builds each radio's ids from its value:
 *  `itemHiddenInput("small")` is the input of the radio whose value is `small`, for a
 *  `<label for>`. */
export interface RadioGroupElementIds {
    readonly root?: string | undefined;
    readonly item?: ((value: string) => string) | undefined;
    readonly itemHiddenInput?: ((value: string) => string) | undefined;
}

/** What the radio group machine takes from Root's props. The value is the checked radio's, or
 *  `null` when none is. */
export interface RadioGroupBehaviorProps extends Controllable<
    "value",
    string | null
> {
    /** Disables every radio. A disabled fieldset around the group does too. */
    readonly disabled?: boolean | undefined;
    /** Sets `aria-invalid` on every radio's input. */
    readonly invalid?: boolean | undefined;
    /** Blocks submitting until a radio is checked. */
    readonly required?: boolean | undefined;
    /** Ignores the user's changes. */
    readonly readOnly?: boolean | undefined;
    /** The name every radio submits under. @default the group's id
     *  @control none */
    readonly name?: string | undefined;
    /** The id of the form the radios belong to, for a group outside it.
     *  @control none */
    readonly form?: string | undefined;
    /** How the radios are laid out, for `aria-orientation`. @default "vertical" */
    readonly orientation?: "horizontal" | "vertical" | undefined;
    /** The group element's id; the machine finds the element by it.
     *  @control none */
    readonly id?: string | undefined;
    readonly ids?: RadioGroupElementIds | undefined;
}

/** Everything the group's Root takes for itself, besides the element's own props and `as`. */
export interface RadioGroupRootOwnProps
    extends RadioGroupVariantProps, RadioGroupBehaviorProps, IndicationProps {
    /** The group element's test id: a prefix (`size` → `size-root`), or by part. */
    readonly testId?: TestIdOverride<RadioGroupPart> | undefined;
}

/** The keys of `RadioGroupRootOwnProps`, which Root keeps off its element. */
export const RADIO_GROUP_ROOT_PROPS = [
    "color",
    "density",
    "disabled",
    "invalid",
    "required",
    "readOnly",
    "name",
    "form",
    "orientation",
    "id",
    "ids",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "indication",
] as const satisfies readonly (keyof RadioGroupRootOwnProps)[];

/** What one radio takes for itself, besides the element's own props and `as`. Its variants
 *  default to the group's. */
export interface RadioOwnProps
    extends RadioVariantProps, InteractionSourceProps {
    /** The value the group takes when this radio is checked, and its input submits. */
    readonly value: string;
    /** Disables this radio only. */
    readonly disabled?: boolean | undefined;
    /** Marks this radio's input with `aria-invalid`. */
    readonly invalid?: boolean | undefined;
    /** A prefix for every part's test id (`small` → `small-input`), or ids by part. */
    readonly testId?: TestIdOverride<RadioPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<RadioPart> | undefined;
}

/** The keys of `RadioOwnProps`, which a radio keeps off its element. */
export const RADIO_PROPS = [
    "color",
    "density",
    "tokens",
    "value",
    "disabled",
    "invalid",
    "testId",
    "unstyled",
    "interactionSource",
] as const satisfies readonly (keyof RadioOwnProps)[];

/** The props of a ready-made radio that name its input, so they go on it rather than on the
 *  radio's root: the input is what assistive technology reads. */
export const RADIO_INPUT_LABEL_PROPS = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
] as const;

/** One radio of the ready-made radio group, as data. */
export interface RadioGroupItem extends InteractionSourceProps {
    readonly value: string;
    /** The radio's accessible name, on its input. */
    readonly label: string;
    readonly disabled?: boolean | undefined;
    readonly invalid?: boolean | undefined;
    /** The radio's test ids: a prefix or ids by part. */
    readonly testId?: TestIdOverride<RadioPart> | undefined;
}

/** What the ready-made radio group renders inside Root. */
export interface RadioGroupContentProps {
    /** The radios, in order. */
    readonly items?: readonly RadioGroupItem[] | undefined;
}

/** The keys of `RadioGroupContentProps`. */
export const RADIO_GROUP_CONTENT_PROPS = [
    "items",
] as const satisfies readonly (keyof RadioGroupContentProps)[];

/** A radio's registry selection: its own variants over the group's. */
export const radioSelection = (
    group: RadioGroupVariantProps,
    radio: RadioVariantProps,
): Selection<"radio"> => ({
    color: radio.color ?? group.color,
    density: radio.density ?? group.density,
    tokens: radio.tokens,
});
