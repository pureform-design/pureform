// The date pickers' contract, shared by every binding: the modal date picker (a calendar in a
// dialog), the docked date picker (a text field with a calendar under it) and the date input
// (the date as text). Dates cross the API as ISO dates (`2026-08-17`): the web bindings turn them
// into Zag's date values with the machines' `parse`, and React Native draws its calendar from the
// helpers here, so every target lays out the same weeks for the same locale.

import type {
    calendarCellAnatomy,
    dateInputAnatomy,
    datePickerOverlayAnatomy,
    dockedDatePickerOverlayAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { DialogBehaviorProps } from "./dialog";
import type { VariantProp } from "./variants";

/* Dates. */

/** A calendar's view: the days of a month, the months of a year, or the years. */
export type CalendarView = "day" | "month" | "year";

/** One date, or a range of two. */
export type DateSelectionMode = "single" | "range";

/** A calendar cell's place in the selection: the `selection` variant of `calendarCell`. */
export type CalendarCellSelection =
    | "none"
    | "selected"
    | "rangeStart"
    | "rangeMiddle"
    | "rangeEnd";

/** An ISO date's year, month (1 to 12) and day. */
export interface DateParts {
    readonly year: number;
    readonly month: number;
    readonly day: number;
}

const pad = (value: number, width: number) =>
    String(value).padStart(width, "0");

/** The ISO date (`YYYY-MM-DD`) of a year, a month (1 to 12) and a day. */
export const isoDate = ({ year, month, day }: DateParts): string =>
    `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;

/** An ISO date's parts, or `null` when it isn't one (a time after it is ignored). */
export const parseIsoDate = (value: string): DateParts | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return null;
    const [year, month, day] = match.slice(1).map(Number) as [
        number,
        number,
        number,
    ];
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month))
        return null;
    return { year, month, day };
};

/** How many days a month (1 to 12) has. */
export const daysInMonth = (year: number, month: number): number =>
    new Date(Date.UTC(year, month, 0)).getUTCDate();

const utc = ({ year, month, day }: DateParts) =>
    new Date(Date.UTC(year, month - 1, day));

const fromUtc = (date: Date): string =>
    isoDate({
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
    });

/** The weekday of an ISO date, 0 for Sunday to 6 for Saturday. */
export const dayOfWeek = (value: string): number =>
    utc(parseIsoDate(value)!).getUTCDay();

/** An ISO date `days` later (or earlier, when negative). */
export const addDays = (value: string, days: number): string => {
    const date = utc(parseIsoDate(value)!);
    date.setUTCDate(date.getUTCDate() + days);
    return fromUtc(date);
};

/** An ISO date `months` later (or earlier), its day kept within the month it lands in. */
export const addMonths = (value: string, months: number): string => {
    const { year, month, day } = parseIsoDate(value)!;
    const index = year * 12 + (month - 1) + months;
    const next = { year: Math.floor(index / 12), month: (index % 12) + 1 };
    return isoDate({
        ...next,
        day: Math.min(day, daysInMonth(next.year, next.month)),
    });
};

/** Today's ISO date in the local time zone. */
export const todayIso = (now: Date = new Date()): string =>
    isoDate({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
    });

// Regions whose week starts on Sunday, Saturday or Friday when the platform can't say (CLDR's
// `firstDay`); the rest start on Monday.
const SUNDAY_FIRST = new Set(
    "AG AS AU BD BR BS BT BW BZ CA CN CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW".split(
        " ",
    ),
);
const SATURDAY_FIRST = new Set(
    "AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY".split(" "),
);

type WeekInfoLocale = Intl.Locale & {
    getWeekInfo?: () => { firstDay: number };
    weekInfo?: { firstDay: number };
};

/** The first day of the week in a locale, 0 for Sunday to 6 for Saturday: the platform's own
 *  week data where it has it, else CLDR's by region (Monday when the locale names none). */
export const weekStartOf = (locale: string): number => {
    let parsed: WeekInfoLocale;
    try {
        parsed = new Intl.Locale(locale) as WeekInfoLocale;
    } catch {
        return 1;
    }
    const info = parsed.getWeekInfo?.() ?? parsed.weekInfo;
    if (info) return info.firstDay % 7;
    const region = parsed.maximize().region ?? "";
    if (SUNDAY_FIRST.has(region)) return 0;
    if (SATURDAY_FIRST.has(region)) return 6;
    if (region === "MV") return 5;
    return 1;
};

/** The weeks a month shows, each seven ISO dates from `firstDay` (0 for Sunday), including the
 *  days of the months around it that fill the first and last weeks. `fixedWeeks` always gives
 *  six weeks, so the grid keeps its height from month to month. */
export const monthWeeks = (
    { year, month }: Pick<DateParts, "year" | "month">,
    firstDay: number,
    fixedWeeks = false,
): string[][] => {
    const first = isoDate({ year, month, day: 1 });
    const lead = (dayOfWeek(first) - firstDay + 7) % 7;
    const days = lead + daysInMonth(year, month);
    const count = fixedWeeks ? 6 : Math.ceil(days / 7);
    const start = addDays(first, -lead);
    return Array.from({ length: count }, (_, week) =>
        Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
    );
};

/** A weekday's labels: the narrow one the calendar shows and the long one it's named by. */
export interface WeekdayLabel {
    readonly narrow: string;
    readonly long: string;
}

/** The seven weekday labels in a locale, from `firstDay` (0 for Sunday). */
export const weekdayLabels = (
    locale: string,
    firstDay: number,
): WeekdayLabel[] => {
    const narrow = new Intl.DateTimeFormat(locale, {
        weekday: "narrow",
        timeZone: "UTC",
    });
    const long = new Intl.DateTimeFormat(locale, {
        weekday: "long",
        timeZone: "UTC",
    });
    // 2023-01-01 was a Sunday.
    return Array.from({ length: 7 }, (_, index) => {
        const date = utc({
            year: 2023,
            month: 1,
            day: 1 + ((firstDay + index) % 7),
        });
        return { narrow: narrow.format(date), long: long.format(date) };
    });
};

/** An ISO date formatted in a locale: by default as the header shows the chosen date
 *  ("Mon, Aug 17"). */
export const formatIsoDate = (
    value: string,
    locale: string,
    options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        month: "short",
        day: "numeric",
    },
): string => {
    const parts = parseIsoDate(value);
    return parts
        ? new Intl.DateTimeFormat(locale, {
              ...options,
              timeZone: "UTC",
          }).format(utc(parts))
        : value;
};

/** Where a date sits in the chosen dates: chosen alone, a range's start, inside it or its end,
 *  or not chosen. A range with only its start chosen draws that day as chosen alone. */
export const calendarCellSelection = (
    value: string,
    selected: readonly string[],
    mode: DateSelectionMode = "single",
): CalendarCellSelection => {
    if (mode === "range" && selected.length === 2) {
        const [start, end] = [...selected].sort() as [string, string];
        if (start === end) return value === start ? "selected" : "none";
        if (value === start) return "rangeStart";
        if (value === end) return "rangeEnd";
        if (value > start && value < end) return "rangeMiddle";
        return "none";
    }
    return selected.includes(value) ? "selected" : "none";
};

/** Whether a date can be chosen: inside `min` and `max`, and not marked unavailable. */
export const isSelectableDate = (
    value: string,
    {
        min,
        max,
        isDateUnavailable,
    }: Pick<DatePickerBehaviorProps, "min" | "max" | "isDateUnavailable">,
): boolean =>
    (min === undefined || value >= min) &&
    (max === undefined || value <= max) &&
    !isDateUnavailable?.(value);

/** The dates a selection holds after a choice: the day alone, or in range mode the range's
 *  start, then its end (in order), then a new start. */
export const chooseDate = (
    value: string,
    selected: readonly string[],
    mode: DateSelectionMode = "single",
): string[] => {
    if (mode === "single") return [value];
    if (selected.length === 1) return [selected[0]!, value].sort();
    return [value];
};

/* The calendar's cells. */

/** The `calendarCell` part's registry selection. */
export interface CalendarCellVariantProps {
    readonly view?: CalendarView | undefined;
    readonly selection?: CalendarCellSelection | undefined;
    readonly today?: boolean | undefined;
    readonly outside?: boolean | undefined;
    readonly tokens?: InstanceTokens<"calendarCell"> | undefined;
}

/** A calendar cell's registry selection. */
export const calendarCellSelectionOf = (
    props: CalendarCellVariantProps,
): Selection<"calendarCell"> => ({
    view: props.view,
    selection: props.selection,
    today: props.today,
    outside: props.outside,
    tokens: props.tokens,
});

/** The parts of a calendar cell: `"root" | "trigger"`. */
export type CalendarCellPart = PartName<typeof calendarCellAnatomy>;

/* Behaviour every picker shares. */

/** What every date picker takes for its dates, besides its own state. Dates are ISO dates. */
export interface DatePickerBehaviorProps extends Controllable<
    "value",
    readonly string[],
    { readonly value: readonly string[] }
> {
    /** One date, or a range of two. @default "single" */
    readonly selectionMode?: DateSelectionMode | undefined;
    /** The locale the dates and weekdays are written in, and whose week the calendar starts
     *  on. @default the document's or the platform's */
    readonly locale?: string | undefined;
    /** The first day of the week, 0 for Sunday to 6 for Saturday. @default the locale's */
    readonly firstDayOfWeek?: number | undefined;
    /** The earliest date that can be chosen. */
    readonly min?: string | undefined;
    /** The latest date that can be chosen. */
    readonly max?: string | undefined;
    /** Whether a date can't be chosen. */
    readonly isDateUnavailable?: ((value: string) => boolean) | undefined;
    readonly disabled?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    readonly required?: boolean | undefined;
    readonly invalid?: boolean | undefined;
    /** The name the chosen date is submitted under.
     *  @control none */
    readonly name?: string | undefined;
}

/** The keys of `DatePickerBehaviorProps`, which Root keeps off its element. */
export const DATE_BEHAVIOR_PROPS = [
    "value",
    "defaultValue",
    "onValueChange",
    "selectionMode",
    "locale",
    "firstDayOfWeek",
    "min",
    "max",
    "isDateUnavailable",
    "disabled",
    "readOnly",
    "required",
    "invalid",
    "name",
] as const satisfies readonly (keyof DatePickerBehaviorProps)[];

/** The locale a picker writes its dates in: its own, else the platform's. */
export const pickerLocale = (props: { readonly locale?: string | undefined }) =>
    props.locale ??
    (typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "en-US");

/** The first day of a picker's week: its own, else its locale's. */
export const pickerWeekStart = (props: {
    readonly locale?: string | undefined;
    readonly firstDayOfWeek?: number | undefined;
}) => props.firstDayOfWeek ?? weekStartOf(pickerLocale(props));

/** Zag's date picker or date input props from a picker's, besides `id`, `dir` and the state:
 *  `parse` turns an ISO date into Zag's date value (the machines' `parse`). */
/** The time zone the user is in. Zag's default is UTC, which makes "today" the wrong day for
 *  part of every day anywhere else. */
export const localTimeZone = (): string =>
    new Intl.DateTimeFormat().resolvedOptions().timeZone;

export const dateMachineProps = <D>(
    props: DatePickerBehaviorProps,
    parse: (value: string) => D | undefined,
) => ({
    locale: pickerLocale(props),
    timeZone: localTimeZone(),
    startOfWeek: pickerWeekStart(props),
    selectionMode: props.selectionMode,
    min: props.min === undefined ? undefined : parse(props.min),
    max: props.max === undefined ? undefined : parse(props.max),
    isDateUnavailable: props.isDateUnavailable
        ? (date: { toString(): string }) =>
              props.isDateUnavailable!(date.toString().slice(0, 10))
        : undefined,
    disabled: props.disabled,
    readOnly: props.readOnly,
    required: props.required,
    invalid: props.invalid,
    name: props.name,
});

/** What the ready-made pickers render besides the calendar or field, in the framework's node
 *  type. The labels default to Material's English ones. */
export interface PickerContentProps<Node> {
    /** The title over the chosen date. @default "Select date" */
    readonly headline?: Node;
    /** What the header shows while no date is chosen. @default "Selected date" */
    readonly placeholder?: Node;
    /** The cancel action's label. @default "Cancel" */
    readonly cancelLabel?: Node;
    /** The confirm action's label. @default "OK" */
    readonly confirmLabel?: Node;
    /** Called when the mode toggle is pressed: switch to the date input (or back to the
     *  calendar). The toggle renders only when given. */
    readonly onModeToggle?: (() => void) | undefined;
    /** The mode toggle's accessible name. @default "Switch to text input" (or "Switch to
     *  calendar" on the date input) */
    readonly modeToggleLabel?: string | undefined;
}

/** The keys of `PickerContentProps`. */
export const PICKER_CONTENT_PROPS = [
    "headline",
    "placeholder",
    "cancelLabel",
    "confirmLabel",
    "onModeToggle",
    "modeToggleLabel",
] as const satisfies readonly (keyof PickerContentProps<unknown>)[];

/** The header's text for the chosen dates: one date ("Mon, Aug 17"), a range ("Aug 17 – Aug
 *  21"), or nothing. */
export const selectedDateText = (
    value: readonly string[],
    locale: string,
): string | undefined => {
    if (value.length === 0) return undefined;
    if (value.length === 1) return formatIsoDate(value[0]!, locale);
    const short = { month: "short", day: "numeric" } as const;
    return `${formatIsoDate(value[0]!, locale, short)} – ${formatIsoDate(value[1]!, locale, short)}`;
};

/* The modal date picker. */

/** The modal date picker's parts: its dialog's (`"root" | "trigger" | "positioner" |
 *  "content"`, the surface), the picker's, and `"backdrop"`. */
export type DatePickerPart =
    | PartName<typeof datePickerOverlayAnatomy>
    | "backdrop";

/** The modal date picker's instance tokens (it has no variants). */
export interface DatePickerVariantProps {
    readonly tokens?: InstanceTokens<"datePicker"> | undefined;
}

/** What the modal date picker's Root takes for itself. `value` is the confirmed date: the
 *  calendar holds a draft until the confirm action, and the cancel action drops it. `open` is
 *  the dialog's. */
export interface DatePickerRootOwnProps
    extends
        DatePickerVariantProps,
        DatePickerBehaviorProps,
        Pick<
            DialogBehaviorProps,
            | "open"
            | "defaultOpen"
            | "onOpenChange"
            | "closeOnEscape"
            | "closeOnInteractOutside"
            | "restoreFocus"
        > {
    readonly testId?: TestIdOverride<DatePickerPart> | undefined;
    readonly unstyled?: Unstyled<DatePickerPart> | undefined;
}

/** The keys of `DatePickerRootOwnProps`, which Root keeps off its element. */
export const DATE_PICKER_ROOT_PROPS = [
    "tokens",
    ...DATE_BEHAVIOR_PROPS,
    "open",
    "defaultOpen",
    "onOpenChange",
    "closeOnEscape",
    "closeOnInteractOutside",
    "restoreFocus",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof DatePickerRootOwnProps)[];

/** The modal date picker's registry selection. */
export const datePickerSelection = (
    props: DatePickerVariantProps,
): Selection<"datePicker"> => ({ tokens: props.tokens });

/** What the ready-made modal date picker renders in its dialog, in the framework's node type. */
export interface DatePickerContentProps<Node> extends PickerContentProps<Node> {
    /** The trigger's label: renders a button that opens the dialog only when given. */
    readonly trigger?: Node;
}

/** The keys of `DatePickerContentProps`. */
export const DATE_PICKER_CONTENT_PROPS = [
    ...PICKER_CONTENT_PROPS,
    "trigger",
] as const satisfies readonly (keyof DatePickerContentProps<unknown>)[];

/* The docked date picker. */

/** The docked date picker's parts: the field's, Zag's positioner, and the popup's. */
export type DockedDatePickerPart = PartName<
    typeof dockedDatePickerOverlayAnatomy
>;

/** The docked date picker's variant groups (its field's) and instance tokens. The trailing icon,
 *  the button that opens the calendar, is always there. */
export interface DockedDatePickerVariantProps {
    readonly variant?: VariantProp<"dockedDatePicker", "variant">;
    readonly color?: VariantProp<"dockedDatePicker", "color">;
    readonly density?: VariantProp<"dockedDatePicker", "density">;
    readonly leadingIcon?: boolean | undefined;
    readonly prefixText?: boolean | undefined;
    readonly suffixText?: boolean | undefined;
    readonly tokens?: InstanceTokens<"dockedDatePicker"> | undefined;
}

/** What the docked date picker's Root takes for itself. Choosing a date sets `value` and closes
 *  the calendar; typing a date sets it once the field loses focus. `open` is the calendar's. */
export interface DockedDatePickerRootOwnProps
    extends
        DockedDatePickerVariantProps,
        DatePickerBehaviorProps,
        Controllable<"open", boolean> {
    /** Whether choosing a date closes the calendar. @default true */
    readonly closeOnSelect?: boolean | undefined;
    /** An error message: marks the field invalid and replaces the supporting text. */
    readonly error?: string | undefined;
    readonly testId?: TestIdOverride<DockedDatePickerPart> | undefined;
    readonly unstyled?: Unstyled<DockedDatePickerPart> | undefined;
}

/** The keys of `DockedDatePickerRootOwnProps`, which Root keeps off its element. */
export const DOCKED_DATE_PICKER_ROOT_PROPS = [
    "variant",
    "color",
    "density",
    "leadingIcon",
    "prefixText",
    "suffixText",
    "tokens",
    ...DATE_BEHAVIOR_PROPS,
    "open",
    "defaultOpen",
    "onOpenChange",
    "closeOnSelect",
    "error",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof DockedDatePickerRootOwnProps)[];

/** The docked date picker's registry selection: the trailing icon is always on. */
export const dockedDatePickerSelection = (
    props: DockedDatePickerVariantProps & {
        readonly error?: string | undefined;
    },
): Selection<"dockedDatePicker"> => ({
    variant: props.variant,
    color: props.color,
    density: props.density,
    leadingIcon: props.leadingIcon,
    trailingIcon: true,
    prefixText: props.prefixText,
    suffixText: props.suffixText,
    tokens: props.tokens,
});

/** What the ready-made docked date picker renders, in the framework's node type. */
export interface DockedDatePickerContentProps<Node> {
    /** The floating label. */
    readonly label?: Node;
    /** Helper text under the field; an `error` replaces it. @default the date's format */
    readonly supportingText?: Node;
    readonly leadingIcon?: Node;
    readonly prefixText?: Node;
    readonly suffixText?: Node;
    /** The calendar button's accessible name. @default "Open calendar" */
    readonly triggerLabel?: string | undefined;
}

/** The keys of `DockedDatePickerContentProps`. */
export const DOCKED_DATE_PICKER_CONTENT_PROPS = [
    "label",
    "supportingText",
    "leadingIcon",
    "prefixText",
    "suffixText",
    "triggerLabel",
] as const satisfies readonly (keyof DockedDatePickerContentProps<unknown>)[];

/* The date input. */

/** The date input's parts. */
export type DateInputPart = PartName<typeof dateInputAnatomy>;

/** The date input's variant groups (its field's) and instance tokens. */
export interface DateInputVariantProps {
    readonly variant?: VariantProp<"dateInput", "variant">;
    readonly color?: VariantProp<"dateInput", "color">;
    readonly density?: VariantProp<"dateInput", "density">;
    readonly leadingIcon?: boolean | undefined;
    readonly trailingIcon?: boolean | undefined;
    readonly prefixText?: boolean | undefined;
    readonly suffixText?: boolean | undefined;
    readonly tokens?: InstanceTokens<"dateInput"> | undefined;
}

/** What the date input's Root takes for itself. `value` follows the segments as they're typed
 *  (a complete date, or none); the confirm action calls `onConfirm` with it. */
export interface DateInputRootOwnProps
    extends DateInputVariantProps, DatePickerBehaviorProps {
    /** An error message: marks the field invalid and replaces the supporting text. */
    readonly error?: string | undefined;
    /** Called with the date when the confirm action is pressed. */
    readonly onConfirm?: ((value: readonly string[]) => void) | undefined;
    /** Called when the cancel action is pressed. */
    readonly onCancel?: (() => void) | undefined;
    readonly testId?: TestIdOverride<DateInputPart> | undefined;
    readonly unstyled?: Unstyled<DateInputPart> | undefined;
}

/** The keys of `DateInputRootOwnProps`, which Root keeps off its element. */
export const DATE_INPUT_ROOT_PROPS = [
    "variant",
    "color",
    "density",
    "leadingIcon",
    "trailingIcon",
    "prefixText",
    "suffixText",
    "tokens",
    ...DATE_BEHAVIOR_PROPS,
    "error",
    "onConfirm",
    "onCancel",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof DateInputRootOwnProps)[];

/** The date input's registry selection. */
export const dateInputSelection = (
    props: DateInputVariantProps,
): Selection<"dateInput"> => ({
    variant: props.variant,
    color: props.color,
    density: props.density,
    leadingIcon: props.leadingIcon,
    trailingIcon: props.trailingIcon,
    prefixText: props.prefixText,
    suffixText: props.suffixText,
    tokens: props.tokens,
});

/** What the ready-made date input renders, in the framework's node type. */
export interface DateInputContentProps<Node> extends PickerContentProps<Node> {
    /** The field's floating label. @default "Date" */
    readonly label?: Node;
    /** Helper text under the field; an `error` replaces it. @default the date's format */
    readonly supportingText?: Node;
    /** An icon at the start of the field; renders only when given. */
    readonly leadingIcon?: Node;
    /** An icon at the end of the field; renders only when given. */
    readonly trailingIcon?: Node;
    /** Text before the segments; renders only when given. */
    readonly prefixText?: Node;
    /** Text after the segments; renders only when given. */
    readonly suffixText?: Node;
}

/** The keys of `DateInputContentProps`. */
export const DATE_INPUT_CONTENT_PROPS = [
    ...PICKER_CONTENT_PROPS,
    "label",
    "supportingText",
    "leadingIcon",
    "trailingIcon",
    "prefixText",
    "suffixText",
] as const satisfies readonly (keyof DateInputContentProps<unknown>)[];

/** The date's format as a locale writes it, for the supporting text: "mm/dd/yyyy" in `en-US`,
 *  "dd/mm/yyyy" in `en-GB`. */
export const dateFormatHint = (locale: string): string =>
    new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "UTC",
    })
        .formatToParts(new Date(Date.UTC(2026, 0, 1)))
        .map((part) =>
            part.type === "year"
                ? "yyyy"
                : part.type === "month"
                  ? "mm"
                  : part.type === "day"
                    ? "dd"
                    : part.value,
        )
        .join("");

/** A date typed in a locale's numeric format ("08/17/2026" in `en-US`) as an ISO date, or `null`
 *  when it isn't a whole, real date. React Native's date input reads its text field with it. */
export const parseDateText = (text: string, locale: string): string | null => {
    const order = dateFormatHint(locale)
        .split(/[^a-z]+/)
        .filter(Boolean);
    const numbers = text.split(/\D+/).filter(Boolean).map(Number);
    if (numbers.length !== 3 || order.length !== 3) return null;
    const parts: Record<string, number> = {};
    order.forEach((name, index) => (parts[name] = numbers[index]!));
    const year = parts["yyyy"]!;
    if (year < 1000) return null;
    const iso = isoDate({ year, month: parts["mm"]!, day: parts["dd"]! });
    return parseIsoDate(iso) ? iso : null;
};

/** An ISO date in a locale's numeric format ("08/17/2026" in `en-US`). */
export const formatDateText = (value: string, locale: string): string =>
    formatIsoDate(value, locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
