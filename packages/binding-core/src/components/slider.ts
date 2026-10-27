// The slider's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and the slider machine (Zag's), and the tokens that place its parts. A value
// is a number, or two for a range; the preset's tokens are percentages of the range.

import type {
    PartName,
    sliderAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { InteractiveProps } from "./indication";
import type { VariantProp } from "./variants";

/** The slider's parts: `"root" | "startTrack" | "track" | "activeTrack" | "markerGroup" |
 *  "marker" | "stateLayer" | "handle" | "valueIndicator" | "input"`. */
export type SliderPart = PartName<typeof sliderAnatomy>;

/** What a ready-made slider's thumb is, for a function of the copy in its `handle`, `stateLayer`,
 *  `valueIndicator` and `input` keys: `style={{ handle: (thumb) => ... }}`. */
export interface SliderThumbInstance {
    /** The thumb's 0-based index. */
    readonly index: number;
    /** Its value. */
    readonly value: number;
}

/** What a ready-made slider's marker is, for a function of the copy in its `marker` key. */
export interface SliderMarkerInstance {
    /** The stop it marks. */
    readonly value: number;
    /** Its 0-based index among the stops. */
    readonly index: number;
}

/** The ready-made slider's repeated parts, each to its copy. */
export interface SliderInstances {
    readonly handle: SliderThumbInstance;
    readonly stateLayer: SliderThumbInstance;
    readonly valueIndicator: SliderThumbInstance;
    readonly input: SliderThumbInstance;
    readonly marker: SliderMarkerInstance;
}

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
    /** The name each thumb's input submits its value under (`name[]` for a range).
     *  @control none */
    readonly name?: string | undefined;
    /** The id of the form the inputs belong to, for a slider outside it.
     *  @control none */
    readonly form?: string | undefined;
    /** Root's id, also the machine's.
     *  @control none */
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

/** The inset icon's measures, as the preset's default `insetIconSize` and `insetIconPadding`,
 *  and the default `handleClearance` (from a bar handle's centre to the far edge of its gap):
 *  what a binding uses until it has read the theme's. */
export const SLIDER_INSET_ICON = {
    size: 20,
    padding: 10,
    clearance: 8,
} as const;

/** The inset icon's size and padding, and the handle's clearance, as the theme resolves them. */
export interface SliderInsetIconMeasures {
    readonly size: number;
    readonly padding: number;
    readonly clearance: number;
}

/** Whether two reads of the inset icon's measures agree, so a binding keeps the last. */
export const sameSliderInsetIcon = (
    a: SliderInsetIconMeasures | undefined,
    b: SliderInsetIconMeasures | undefined,
): boolean =>
    a?.size === b?.size &&
    a?.padding === b?.padding &&
    a?.clearance === b?.clearance;

/** Whether the inset icon doesn't fit in the active track, `length` pixels long along the axis
 *  (0 when unmeasured: it fits), so it moves to the start of the inactive track: Compose's track
 *  icons sit in the active track while it's at least the icon and its padding either side.
 *  `icon` is the theme's `insetIconSize`, `insetIconPadding` and `handleClearance`, as the
 *  binding read them; the preset's defaults until it has. */
export const sliderInsetIconOverflows = (
    length: number,
    percents: readonly number[],
    centered = false,
    icon?: Partial<SliderInsetIconMeasures>,
): boolean => {
    if (length <= 0) return false;
    const { activeStart, activeEnd, startGap, endGap } = sliderTrackTokens(
        percents,
        centered,
    );
    const size = icon?.size ?? SLIDER_INSET_ICON.size;
    const padding = icon?.padding ?? SLIDER_INSET_ICON.padding;
    const clearance = icon?.clearance ?? SLIDER_INSET_ICON.clearance;
    const active =
        (length * (activeEnd - activeStart)) / 100 -
        clearance * (startGap + endGap);
    return active < size + 2 * padding;
};

/** The handle's clearance from where the inactive track starts, `offset` pixels past the active
 *  track's end: the gap there is the clearance times the end gap, so with no gap (or no offset
 *  read) there's nothing to tell, `undefined`. */
export const sliderClearanceOf = (
    offset: number | undefined,
    endGap: number,
): number | undefined =>
    offset === undefined || !(endGap > 0)
        ? undefined
        : Math.max(0, Math.round((offset / endGap) * 100) / 100);

/** The inset icon's measures from the resolved styles on React Native, where the preset's
 *  `insetIconSize` is the icon's width (its height, vertically) and `insetIconPadding` is the
 *  margin that sits on its inset (selection moves a percentage's pixels there). The inactive
 *  `track`'s margin on its start is the handle's clearance (times the end gap), which an
 *  overflowing icon's margin also holds. `undefined` when the icon's style has none. */
export const sliderInsetIconMeasuresOfStyle = (
    styles: {
        insetIcon: Readonly<Record<string, unknown>> | undefined;
        track?: Readonly<Record<string, unknown>> | undefined;
    },
    {
        vertical,
        overflowing,
        percents,
        centered = false,
    }: {
        vertical: boolean;
        overflowing: boolean;
        percents: readonly number[];
        centered?: boolean | undefined;
    },
): SliderInsetIconMeasures | undefined => {
    const number = (value: unknown) =>
        typeof value === "number" ? value : undefined;
    const startMargin = (style: Readonly<Record<string, unknown>>) =>
        vertical
            ? number(style.marginBottom ?? style.marginTop)
            : number(style.marginStart ?? style.marginLeft ?? style.marginEnd);
    const { insetIcon: style, track } = styles;
    if (!style) return undefined;
    const size = number(vertical ? style.height : style.width);
    const margin = startMargin(style);
    if (size === undefined || size <= 0 || margin === undefined)
        return undefined;
    const { endGap } = sliderTrackTokens(percents, centered);
    const clearance =
        sliderClearanceOf(track && startMargin(track), endGap) ??
        SLIDER_INSET_ICON.clearance;
    const held = overflowing ? clearance * endGap : 0;
    return { size, padding: Math.max(0, margin - held), clearance };
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
