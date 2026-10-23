import type { Machine, Service } from "@zag-js/core";
import type {
    CommonProperties,
    DirectionProperty,
    PropTypes,
    RequiredBy,
} from "@zag-js/types";

import type {
    DialLabel,
    HourCycle,
    Period,
    Time,
    TimeView,
} from "./time-picker.time";

export interface ValueChangeDetails {
    /** The time as `HH:mm`, as a native time input gives it. */
    value: string;
    time: Time;
}

export interface ViewChangeDetails {
    view: TimeView;
}

export interface ElementIds {
    root?: string | undefined;
    headline?: string | undefined;
    dial?: string | undefined;
    hourInput?: string | undefined;
    minuteInput?: string | undefined;
}

/** The words the time picker and time input say, for a locale other than English. */
export interface TimeTranslations {
    /** The hour selector's, field's and dial's name. @default "Hour" */
    hour: string;
    /** @default "Minute" */
    minute: string;
    /** The period selector's name. @default "Period" */
    period: string;
}

export interface TimePickerProps extends DirectionProperty, CommonProperties {
    /** The ids of the elements in the time picker. Useful for composition. */
    ids?: ElementIds | undefined;
    /** The controlled time, as `HH:mm` (24-hour, as a native time input's value). */
    value?: string | undefined;
    /** The time it starts at when `value` isn't controlled. @default "00:00" */
    defaultValue?: string | undefined;
    /** Called when the user changes the time. */
    onValueChange?: ((details: ValueChangeDetails) => void) | undefined;
    /** The controlled view: what the dial sets, the hour or the minute. */
    view?: TimeView | undefined;
    /** @default "hour" */
    defaultView?: TimeView | undefined;
    onViewChange?: ((details: ViewChangeDetails) => void) | undefined;
    /** The clock: 12 hours with a period, or 24. Defaults to the locale's. */
    hourCycle?: HourCycle | undefined;
    /** The locale the hour cycle, the period names and the spoken time follow; the browser's by
     *  default. */
    locale?: string | undefined;
    /** Words for another language. */
    translations?:
        | { [K in keyof TimeTranslations]?: string | undefined }
        | undefined;
    disabled?: boolean | undefined;
    readOnly?: boolean | undefined;
    /** The name the time submits under, as `HH:mm`, in a hidden input. */
    name?: string | undefined;
    /** The id of the form the hidden input belongs to, for a picker outside it. */
    form?: string | undefined;
}

type PropsWithDefault = "defaultValue" | "defaultView";

export interface TimePickerSchema {
    state: "idle" | "dragging";
    props: RequiredBy<TimePickerProps, PropsWithDefault>;
    context: {
        value: Time;
        view: TimeView;
        /** What the user is typing in the time input's fields, until it's a time. */
        hourText: string | null;
        minuteText: string | null;
        /** The turn of the pointer dragging the dial, once it has moved; `null` otherwise. */
        dragTurn: number | null;
        /** Where the hand points, in turns, not wrapped: each move takes the short way round. */
        handTurn: number;
    };
    computed: {
        hourCycle: HourCycle;
        periods: Record<Period, string>;
        translations: TimeTranslations;
        interactive: boolean;
    };
    event: { type: string; [key: string]: unknown };
    action: string;
    effect: string;
    guard: string;
}

export type TimePickerService = Service<TimePickerSchema>;
export type TimePickerMachine = Machine<TimePickerSchema>;

/** One of the dial's labels, with whether it's selected. */
export interface DialLabelState extends DialLabel {
    readonly selected: boolean;
}

/** One of a scroll field's values: the one before the current, the current, or the one after. */
export interface ScrollItemState {
    readonly value: number;
    readonly text: string;
    /** -1 before, 0 the current one, 1 after. */
    readonly offset: -1 | 0 | 1;
}

export interface TimePickerApi<T extends PropTypes = PropTypes> {
    /** The time. */
    time: Time;
    /** The time as `HH:mm`. */
    value: string;
    view: TimeView;
    hourCycle: HourCycle;
    period: Period;
    /** The locale's names for the periods, such as `AM` and `PM`. */
    periodNames: Record<Period, string>;
    /** The names of the hour, the minute and the period selector. */
    translations: TimeTranslations;
    /** The time as the locale says it, such as `9:30 AM`. */
    spokenValue: string;
    disabled: boolean;
    /** The dial's labels for the view, each placed and marked selected. */
    dialLabels: readonly DialLabelState[];
    /** The values a scroll field shows around the current one. */
    scrollItems: (view: TimeView) => readonly ScrollItemState[];
    setTime: (time: Time) => void;
    setValue: (value: string) => void;
    setView: (view: TimeView) => void;
    setPeriod: (period: Period) => void;
    getRootProps: () => T["element"];
    getHeadlineProps: () => T["element"];
    getBodyProps: () => T["element"];
    getSeparatorProps: () => T["element"];
    /** The hour or minute selector: a toggle button choosing what the dial sets. */
    getSelectorProps: (view: TimeView) => T["button"];
    /** The hour or minute selector in scroll mode: a spin button. */
    getScrollFieldProps: (view: TimeView) => T["element"];
    getScrollItemProps: (view: TimeView, item: ScrollItemState) => T["element"];
    getPeriodSelectorProps: () => T["element"];
    getPeriodProps: (period: Period) => T["button"];
    /** The dial: a slider over the view's value, which a pointer presses or drags. */
    getDialProps: () => T["element"];
    getDialTrackProps: () => T["element"];
    getDialHandleProps: () => T["element"];
    getDialCenterProps: () => T["element"];
    getDialLabelProps: (label: DialLabelState) => T["element"];
    getActionsProps: () => T["element"];
    /** The time input's hour or minute field: the wrapper around its input and label. */
    getFieldProps: (view: TimeView) => T["label"];
    getInputProps: (view: TimeView) => T["input"];
    getFieldLabelProps: (view: TimeView) => T["element"];
    /** The hidden input the time submits through, given a `name`. */
    getHiddenInputProps: () => T["input"];
}
