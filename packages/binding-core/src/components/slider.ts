// The slider's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and pureform's slider machine, and the native input's default. The slider
// draws over a native range input, which takes the pointer, the keyboard, and the form; the
// preset's `value` token, a percentage of the range, places the handle and the active track.

import type {
    PartName,
    sliderAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The slider's parts: `"root" | "track" | "activeTrack" | "stateLayer" | "handle" | "input"`. */
export type SliderPart = PartName<typeof sliderAnatomy>;

/** The slider's variant groups and instance tokens. The `value` token is the binding's, from the
 *  value. */
export interface SliderVariantProps {
    readonly color?: VariantProp<"slider", "color">;
    readonly tokens?: InstanceTokens<"slider"> | undefined;
}

/** The ids of the elements the machine finds. */
export interface SliderElementIds {
    readonly root?: string | undefined;
    readonly input?: string | undefined;
}

/** What Root passes to the machine, besides the variants. */
export interface SliderBehaviorProps extends Controllable<"value", number> {
    /** @default 0 */
    readonly min?: number | undefined;
    /** @default 100 */
    readonly max?: number | undefined;
    /** @default 1 */
    readonly step?: number | undefined;
    readonly disabled?: boolean | undefined;
    /** Shows the value but takes no change. */
    readonly readOnly?: boolean | undefined;
    readonly invalid?: boolean | undefined;
    /** The name the input submits its value under. */
    readonly name?: string | undefined;
    /** The id of the form the input belongs to, for a slider outside it. */
    readonly form?: string | undefined;
    /** Root's id, also the machine's. */
    readonly id?: string | undefined;
    readonly ids?: SliderElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SliderRootOwnProps
    extends SliderVariantProps, SliderBehaviorProps {
    /** A prefix for every part's test id (`volume` → `volume-input`), or ids by part. */
    readonly testId?: TestIdOverride<SliderPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<SliderPart> | undefined;
}

/** The keys of `SliderRootOwnProps`, which Root keeps off its element. */
export const SLIDER_ROOT_PROPS = [
    "color",
    "tokens",
    "min",
    "max",
    "step",
    "disabled",
    "readOnly",
    "invalid",
    "name",
    "form",
    "id",
    "ids",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof SliderRootOwnProps)[];

/** The props of the ready-made slider that name or describe the input, so they go on it rather
 *  than on Root: the input is what assistive technology reads. */
export const SLIDER_INPUT_LABEL_PROPS = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-valuetext",
] as const;

/** The registry selection from Root's props and the value's percentage of the range, which sets
 *  the `value` token. */
export const sliderSelection = (
    props: SliderVariantProps,
    percent: number,
): Selection<"slider"> => ({
    color: props.color,
    tokens: { value: percent, ...props.tokens },
});

/** The slider machine's props from Root's, besides `id`, `dir`, and the controllable `value`
 *  (the binding's `useControllable`). */
export const sliderMachineProps = (props: SliderBehaviorProps) => ({
    min: props.min,
    max: props.max,
    step: props.step,
    disabled: props.disabled,
    readOnly: props.readOnly,
    invalid: props.invalid,
    name: props.name,
    form: props.form,
    ids: { root: props.id ?? props.ids?.root, input: props.ids?.input },
});

/** The native input's default: what a form reset shows (`ControllableState.resetsTo`), else
 *  `min`, the machine's default. A range input with no default would reset to the middle. */
export const sliderNativeDefault = (
    resetsTo: number | undefined,
    min: number | undefined,
): string => String(resetsTo ?? min ?? 0);
