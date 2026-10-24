// The linear and circular progress indicators' contract, shared by every binding: the props Root
// takes for itself, how they map onto the selection, and Root's element props. Progress has no
// machine: it shows a value the app sets, with `role="progressbar"`. Without a value it's
// indeterminate: the linear indicator slides along its track, and the circular one spins.

import type {
    circularProgressAnatomy,
    linearProgressAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The linear progress indicator's parts: `"root" | "track" | "trackBefore" | "trackAfter" | "indicator" |
 *  "stopIndicator"`. */
export type LinearProgressPart = PartName<typeof linearProgressAnatomy>;

/** The circular progress indicator's parts: `"root"`, the track's `"track" | "trackEndHalf" |
 *  "trackEndArc" | "trackStartHalf" | "trackStartArc"`, and the indicator's `"endHalf" | "endArc" |
 *  "startHalf" | "startArc"`. */
export type CircularProgressPart = PartName<typeof circularProgressAnatomy>;

/** Which progress indicator. */
export type ProgressComponent = "linearProgress" | "circularProgress";

/** A progress indicator's variant groups and instance tokens. `indeterminate` follows whether
 *  there's a value unless given. The `value` token is the binding's, from `value`. */
export interface ProgressVariantProps<C extends ProgressComponent> {
    readonly indeterminate?: boolean | undefined;
    readonly color?: VariantProp<C, "color">;
    /** M3 Expressive's thick track. */
    readonly thickness?: VariantProp<C, "thickness">;
    /** M3 Expressive's `wavy` indicator, drawn as a wave; the track stays flat. Flat where a
     *  target can't clip to a shape. @default "flat" */
    readonly shape?: VariantProp<C, "shape">;
    readonly tokens?: InstanceTokens<C> | undefined;
}

/** The ready-made progress indicators' own props. */
export interface ProgressReadyMadeProps {
    /** Whether to draw the track, the rest of the bar or circle beyond the indicator and its
     *  gaps. Hidden with `false`; the indicator and the stop dot stay. @default true */
    readonly track?: boolean | undefined;
}

/** The amount a progress indicator shows. */
export interface ProgressValueProps {
    /** The amount done, from `min` to `max`. Left out (or `null`), the amount is unknown: the
     *  indicator is indeterminate. */
    readonly value?: number | null | undefined;
    /** @default 0 */
    readonly min?: number | undefined;
    /** @default 100 */
    readonly max?: number | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface ProgressRootOwnProps<C extends ProgressComponent>
    extends ProgressVariantProps<C>, ProgressValueProps {
    /** A prefix for every part's test id (`upload` → `upload-indicator`), or ids by part. */
    readonly testId?:
        | TestIdOverride<
              C extends "linearProgress"
                  ? LinearProgressPart
                  : CircularProgressPart
          >
        | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?:
        | Unstyled<
              C extends "linearProgress"
                  ? LinearProgressPart
                  : CircularProgressPart
          >
        | undefined;
}

/** The keys of `ProgressRootOwnProps`, which Root keeps off its element. */
export const PROGRESS_ROOT_PROPS = [
    "indeterminate",
    "color",
    "thickness",
    "shape",
    "tokens",
    "value",
    "min",
    "max",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof ProgressRootOwnProps<ProgressComponent>)[];

/** Whether the indicator is indeterminate: `indeterminate` when given, else whether it has no
 *  value. */
export const isIndeterminate = (
    props: Pick<
        ProgressRootOwnProps<ProgressComponent>,
        "indeterminate" | "value"
    >,
): boolean =>
    props.indeterminate ?? (props.value === undefined || props.value === null);

/** The value as a percentage of the range, 0 to 100 (0 with no value or no range). */
export const progressPercent = (props: ProgressValueProps): number => {
    const min = props.min ?? 0;
    const max = props.max ?? 100;
    const value = props.value;
    if (value === undefined || value === null || !(max > min)) return 0;
    return Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
};

/** The registry selection from Root's props: the `value` token is the value's percentage, unless
 *  the indicator is indeterminate (or `tokens` sets it). */
export const progressSelection = <C extends ProgressComponent>(
    props: ProgressRootOwnProps<C>,
): Selection<C> => {
    const indeterminate = isIndeterminate(props);
    const tokens = props.tokens as
        | Readonly<Record<string, string | number | undefined>>
        | undefined;
    return {
        indeterminate,
        color: props.color,
        thickness: props.thickness,
        shape: props.shape,
        tokens: {
            ...(indeterminate ? {} : { value: progressPercent(props) }),
            ...tokens,
        },
    } as unknown as Selection<C>;
};

/** Root's element props: `role="progressbar"` with the range, and the value unless indeterminate,
 *  which ARIA reads as an unknown amount. */
export const progressRootProps = (
    props: Pick<
        ProgressRootOwnProps<ProgressComponent>,
        "indeterminate" | "value" | "min" | "max"
    >,
) => {
    const min = props.min ?? 0;
    const max = props.max ?? 100;
    const value = props.value;
    const known =
        !isIndeterminate(props) && value !== undefined && value !== null;
    return {
        role: "progressbar" as const,
        "aria-valuemin": min,
        "aria-valuemax": max,
        "aria-valuenow": known
            ? Math.min(Math.max(value, min), max)
            : undefined,
    };
};
