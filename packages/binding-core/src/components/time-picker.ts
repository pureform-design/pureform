// The time picker's and time input's contract, shared by every binding: the props Root takes for
// itself, the content the ready-made components take, and how they map onto the machine and the
// selection. Both run pureform's time-picker machine (`@pureform/machines/time-picker`): the time
// as `HH:mm`, what the dial sets, the 12 or 24-hour clock, and the locale.

import type {
    PartName,
    TestIdOverride,
    timeInputAnatomy,
    timePickerAnatomy,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { ChangeReason } from "../controllable";
import type { Unstyled } from "../parts";
import type { IndicationProps } from "./indication";
import type { VariantProp } from "./variants";

/** The time picker's parts. */
export type TimePickerPart = PartName<typeof timePickerAnatomy>;

/** The time input's parts. */
export type TimeInputPart = PartName<typeof timeInputAnatomy>;

/** What the dial and the keys change: the hour or the minute. */
export type TimePickerView = "hour" | "minute";

/** The clock: 12 hours with a period, or 24. */
export type TimePickerHourCycle = 12 | 24;

/** A change of the time: `value` as `HH:mm`, and why when a form reset caused it. */
export interface TimeValueChangeDetails {
    readonly value: string;
    readonly reason?: ChangeReason | undefined;
}

/** What both components take for their behavior: the time, the clock and locale, the words, and
 *  the form. */
export interface TimeBehaviorProps extends IndicationProps {
    /** The controlled time, as `HH:mm` (24-hour, as a native time input's value). */
    readonly value?: string | undefined;
    /** The time it starts at when `value` isn't controlled. @default "00:00" */
    readonly defaultValue?: string | undefined;
    readonly onValueChange?:
        | ((details: TimeValueChangeDetails) => void)
        | undefined;
    /** The clock: 12 hours with a period, or 24. Defaults to the locale's. */
    readonly hourCycle?: TimePickerHourCycle | undefined;
    /** The locale the default hour cycle, the period names and the spoken time follow; the
     *  browser's (or the device's) by default. */
    readonly locale?: string | undefined;
    /** The names of the hour, the minute and the period selector. */
    readonly translations?:
        | {
              readonly hour?: string | undefined;
              readonly minute?: string | undefined;
              readonly period?: string | undefined;
          }
        | undefined;
    readonly disabled?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    /** The name the time submits under, as `HH:mm`. */
    readonly name?: string | undefined;
    readonly form?: string | undefined;
    /** The root's id. */
    readonly id?: string | undefined;
}

/** The time picker's variants and tokens. */
export interface TimePickerVariantProps {
    /** `dial` (a clock dial, the default) or `scroll` (two scrolling fields, M3 Expressive). */
    readonly mode?: VariantProp<"timePicker", "mode">;
    /** `vibrant` takes M3 Expressive's vibrant colors. */
    readonly color?: VariantProp<"timePicker", "color">;
    readonly tokens?: InstanceTokens<"timePicker"> | undefined;
}

/** Everything the time picker's Root takes for itself, besides the element's own props and `as`. */
export interface TimePickerRootOwnProps
    extends TimeBehaviorProps, TimePickerVariantProps {
    /** The controlled view: what the dial sets. */
    readonly view?: TimePickerView | undefined;
    /** @default "hour" */
    readonly defaultView?: TimePickerView | undefined;
    readonly onViewChange?:
        | ((details: { readonly view: TimePickerView }) => void)
        | undefined;
    readonly testId?: TestIdOverride<TimePickerPart> | undefined;
    readonly unstyled?: Unstyled<TimePickerPart> | undefined;
}

/** Everything the time input's Root takes for itself. */
export interface TimeInputRootOwnProps extends TimeBehaviorProps {
    readonly tokens?: InstanceTokens<"timeInput"> | undefined;
    readonly testId?: TestIdOverride<TimeInputPart> | undefined;
    readonly unstyled?: Unstyled<TimeInputPart> | undefined;
}

const TIME_BEHAVIOR_PROPS = [
    "value",
    "defaultValue",
    "onValueChange",
    "hourCycle",
    "locale",
    "translations",
    "disabled",
    "readOnly",
    "name",
    "form",
    "id",
    "indication",
] as const satisfies readonly (keyof TimeBehaviorProps)[];

/** The keys of `TimePickerRootOwnProps`, which Root keeps off its element. */
export const TIME_PICKER_ROOT_PROPS = [
    ...TIME_BEHAVIOR_PROPS,
    "mode",
    "color",
    "tokens",
    "view",
    "defaultView",
    "onViewChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof TimePickerRootOwnProps)[];

/** The keys of `TimeInputRootOwnProps`. */
export const TIME_INPUT_ROOT_PROPS = [
    ...TIME_BEHAVIOR_PROPS,
    "tokens",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof TimeInputRootOwnProps)[];

/** What the ready-made components render inside Root, in the framework's node type. */
export interface TimeContentProps<Node> {
    /** The headline. @default "Select time" (picker) or "Enter time" (input) */
    readonly headline?: Node;
    /** The actions, such as Cancel and OK text buttons. */
    readonly actions?: Node;
}

/** The keys of `TimeContentProps`. */
export const TIME_CONTENT_PROPS = [
    "headline",
    "actions",
] as const satisfies readonly (keyof TimeContentProps<unknown>)[];

/** The ready-made headlines, as Material words them. */
export const TIME_PICKER_HEADLINE = "Select time";
export const TIME_INPUT_HEADLINE = "Enter time";

/** The machine's props from the behavior props (less the controllable value, which the bindings
 *  map themselves). */
export const timeMachineProps = (props: TimeBehaviorProps) => ({
    hourCycle: props.hourCycle,
    locale: props.locale,
    translations: props.translations,
    disabled: props.disabled,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    ids: { root: props.id },
});

/** The time picker's registry selection. */
export const timePickerSelection = (
    props: TimePickerVariantProps,
): Selection<"timePicker"> => ({
    mode: props.mode,
    color: props.color,
    tokens: props.tokens,
});

/** The time input's registry selection. */
export const timeInputSelection = (
    props: Pick<TimeInputRootOwnProps, "tokens">,
): Selection<"timeInput"> => ({ tokens: props.tokens });
