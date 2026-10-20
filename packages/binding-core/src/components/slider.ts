// The slider's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and the slider machine (Zag's), and the tokens that place its parts. A value
// is a number, or two for a range; the preset's tokens are percentages of the range.

import type {
    PartName,
    sliderAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { ChangeReason, Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { InteractiveProps } from "./indication";
import type { VariantProp } from "./variants";

/** The slider's parts: `"root" | "startTrack" | "track" | "activeTrack" | "markerGroup" |
 *  "marker" | "stateLayer" | "handle" | "valueIndicator" | "input"`. */
export type SliderPart = PartName<typeof sliderAnatomy>;

/** A slider's value: a number, or a range's two (or more) numbers, in order. */
export type SliderValue = number | readonly number[];

/** The slider's variant groups and instance tokens. The placing tokens (`value`, `activeStart`,
 *  `activeEnd`, `startGap`, `endGap`) are the binding's, from the value. */
export interface SliderVariantProps {
    readonly color?: VariantProp<"slider", "color">;
    /** M3 Expressive's bar handle on a thick track, or the earlier round handle (deprecated,
     *  kept: Expressive has no equivalent). */
    readonly handleShape?: VariantProp<"slider", "handleShape">;
    /** The bar slider's size, `xsmall` to `xlarge`. */
    readonly size?: VariantProp<"slider", "size">;
    /** Horizontal, or vertical with the value growing upward. The root takes the height it's
     *  given when vertical. */
    readonly orientation?: VariantProp<"slider", "orientation">;
    readonly tokens?: InstanceTokens<"slider"> | undefined;
}

/** The ids of the elements the machine finds. */
export interface SliderElementIds {
    readonly root?: string | undefined;
    readonly handle?: ((index: number) => string) | undefined;
    readonly input?: ((index: number) => string) | undefined;
}

/** What Root passes to the machine, besides the variants. */
export interface SliderBehaviorProps<
    V extends SliderValue = SliderValue,
> extends Controllable<"value", V> {
    /** @default 0 */
    readonly min?: number | undefined;
    /** @default 100 */
    readonly max?: number | undefined;
    /** @default 1 */
    readonly step?: number | undefined;
    /** The step of Page Up, Page Down, and a Shift-arrow. @default 10 steps */
    readonly largeStep?: number | undefined;
    /** A range's least distance between its thumbs, in steps. @default 0 */
    readonly minStepsBetweenThumbs?: number | undefined;
    /** The active track runs from the middle of the range to the value (M3's centered slider). */
    readonly centered?: boolean | undefined;
    /** Stop indicators: one at every step (`true`), or at the given values. */
    readonly stops?: boolean | readonly number[] | undefined;
    /** Shows the value above the handle while it's dragged. */
    readonly valueIndicator?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    /** Shows the value but takes no change. */
    readonly readOnly?: boolean | undefined;
    readonly invalid?: boolean | undefined;
    /** The name each thumb's input submits its value under (`name[]` for a range). */
    readonly name?: string | undefined;
    /** The id of the form the inputs belong to, for a slider outside it. */
    readonly form?: string | undefined;
    /** Root's id, also the machine's. */
    readonly id?: string | undefined;
    readonly ids?: SliderElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SliderRootOwnProps<V extends SliderValue = SliderValue>
    extends SliderVariantProps, SliderBehaviorProps<V>, InteractiveProps {
    /** A prefix for every part's test id (`volume` → `volume-handle`), or ids by part. */
    readonly testId?: TestIdOverride<SliderPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<SliderPart> | undefined;
}

/** The keys of `SliderRootOwnProps`, which Root keeps off its element. */
export const SLIDER_ROOT_PROPS = [
    "color",
    "handleShape",
    "size",
    "orientation",
    "tokens",
    "min",
    "max",
    "step",
    "largeStep",
    "minStepsBetweenThumbs",
    "centered",
    "stops",
    "valueIndicator",
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
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof SliderRootOwnProps)[];

/** The props of the ready-made slider that name or describe the handles, so they go on them
 *  rather than on Root: a handle is what assistive technology reads. A range takes an
 *  `aria-label` per handle. */
export const SLIDER_INPUT_LABEL_PROPS = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-valuetext",
] as const;

/** A value as the machine holds it: always a list. */
export const sliderValues = (
    value: SliderValue | undefined,
): number[] | undefined =>
    value === undefined
        ? undefined
        : typeof value === "number"
          ? [value]
          : [...value];

/** A value of the machine's in the shape the owner gave: a number, unless it gave a list. */
export const sliderValueShape = (
    values: readonly number[],
    given: SliderValue | undefined,
): SliderValue => (typeof given === "object" ? values : (values[0] ?? 0));

/** What the placing tokens are from the thumbs' percentages: where the handle sits (the last
 *  thumb; a range's first sets its own with `sliderThumbTokens`), the active track, and whether a
 *  handle cuts each end of it. */
export const sliderTrackTokens = (
    percents: readonly number[],
    centered = false,
) => {
    const last = percents.at(-1) ?? 0;
    if (percents.length > 1) {
        return {
            value: last,
            activeStart: percents[0]!,
            activeEnd: last,
            startGap: 1,
            endGap: 1,
        };
    }
    if (centered) {
        return {
            value: last,
            activeStart: Math.min(50, last),
            activeEnd: Math.max(50, last),
            startGap: last <= 50 ? 1 : 0,
            endGap: last >= 50 ? 1 : 0,
        };
    }
    return {
        value: last,
        activeStart: 0,
        activeEnd: last,
        startGap: 0,
        endGap: 1,
    };
};

/** The tokens one thumb's parts (its handle, state layer, and value indicator) set for
 *  themselves. */
export const sliderThumbTokens = (percent: number) => ({ value: percent });

/** The tokens a stop sets for itself: where it is, and whether it's on the active track. */
export const sliderMarkerTokens = (percent: number, active: boolean) => ({
    value: percent,
    stopActive: active ? 1 : 0,
});

/** The registry selection from Root's props and the thumbs' percentages of the range. */
export const sliderSelection = (
    props: SliderVariantProps & { readonly centered?: boolean | undefined },
    percents: number | readonly number[],
): Selection<"slider"> => ({
    color: props.color,
    handleShape: props.handleShape,
    size: props.size,
    orientation: props.orientation,
    tokens: {
        ...sliderTrackTokens(
            typeof percents === "number" ? [percents] : percents,
            props.centered,
        ),
        ...props.tokens,
    },
});

/** The values a stop sits at: every step from `min` to `max` (`true`), or the ones given. */
export const sliderStops = (
    stops: boolean | readonly number[] | undefined,
    {
        min = 0,
        max = 100,
        step = 1,
    }: Pick<SliderBehaviorProps, "min" | "max" | "step">,
): number[] => {
    if (!stops) return [];
    if (stops !== true) return [...stops];
    if (!(step > 0) || max <= min) return [];
    const count = Math.floor((max - min) / step + 1e-9);
    return Array.from({ length: count + 1 }, (_, i) =>
        Number((min + i * step).toFixed(10)),
    );
};

/** Whether a stop at `value` is on the active track. */
export const sliderStopActive = (
    value: number,
    values: readonly number[],
    {
        centered = false,
        min = 0,
        max = 100,
    }: Pick<SliderBehaviorProps, "centered" | "min" | "max">,
): boolean => {
    const last = values.at(-1) ?? min;
    if (values.length > 1) return value >= values[0]! && value <= last;
    if (centered) {
        const middle = (min + max) / 2;
        return (
            value >= Math.min(middle, last) && value <= Math.max(middle, last)
        );
    }
    return value <= last;
};

/** The slider machine's props from Root's, besides `id` (the machine's, `machineId`), `dir`, and
 *  the controllable value. The root is also Zag's control, so both ids are the root's. */
export const sliderMachineProps = (
    props: SliderBehaviorProps & SliderVariantProps,
    machineId: string,
) => {
    const root = props.id ?? props.ids?.root ?? `slider:${machineId}`;
    return {
        min: props.min,
        max: props.max,
        step: props.step,
        largeStep: props.largeStep,
        minStepsBetweenThumbs: props.minStepsBetweenThumbs,
        origin: props.centered ? ("center" as const) : ("start" as const),
        orientation: (props.orientation === "vertical"
            ? "vertical"
            : "horizontal") as "vertical" | "horizontal",
        disabled: props.disabled,
        readOnly: props.readOnly,
        invalid: props.invalid,
        name: props.name,
        form: props.form,
        ids: {
            root,
            control: root,
            thumb: props.ids?.handle,
            hiddenInput: props.ids?.input,
        },
    };
};

/** The controllable value's machine props (`useControllable`'s) as the machine takes them: lists,
 *  with the change reported in the shape the owner gave. */
export const sliderControllableProps = <
    D extends { readonly value: SliderValue; readonly reason?: ChangeReason },
>(props: {
    readonly value: SliderValue | undefined;
    readonly defaultValue: SliderValue | undefined;
    readonly onValueChange: (details: D) => void;
}) => {
    const given = props.value ?? props.defaultValue;
    return {
        value: sliderValues(props.value),
        defaultValue: sliderValues(props.defaultValue),
        onValueChange: ({ value }: { value: number[] }) =>
            props.onValueChange({ value: sliderValueShape(value, given) } as D),
    };
};

/** The native inputs' default: what a form reset shows (`ControllableState.resetsTo`), else
 *  `min`, the machine's default, one per thumb, joined by commas. */
export const sliderNativeDefault = (
    resetsTo: SliderValue | undefined,
    min: number | undefined,
): string => (sliderValues(resetsTo) ?? [min ?? 0]).join(",");
