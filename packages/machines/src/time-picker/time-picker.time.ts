// The time picker's and time input's arithmetic, free of any framework, so React Native (which
// runs no Zag machine) shares it: a time of day as hours and minutes, the 12 and 24-hour cycles,
// the period, the dial's geometry, and the locale's defaults.

/** A time of day: `hour` from 0 to 23, `minute` from 0 to 59. */
export interface Time {
    readonly hour: number;
    readonly minute: number;
}

/** Which clock the hours are read on: 12 hours with a period (AM and PM), or 24. */
export type HourCycle = 12 | 24;

/** The half of the day in a 12-hour cycle. */
export type Period = "am" | "pm";

/** What the dial and the keys change: the hour or the minute. */
export type TimeView = "hour" | "minute";

/** Midnight. */
export const MIDNIGHT: Time = { hour: 0, minute: 0 };

const pad = (value: number) => String(value).padStart(2, "0");

const wrap = (value: number, size: number) => ((value % size) + size) % size;

/** The time as the `HH:mm` string a native `<input type="time">` takes and submits. */
export const formatTime = (time: Time): string =>
    `${pad(time.hour)}:${pad(time.minute)}`;

/** Reads an `HH:mm` (or `H:mm`, with optional seconds) string, or `undefined` when it isn't a
 *  time of day. */
export const parseTime = (value: string | undefined): Time | undefined => {
    const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(
        value?.trim() ?? "",
    );
    if (!match) return undefined;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour < 24 && minute < 60 ? { hour, minute } : undefined;
};

/** The period an hour falls in. */
export const periodOf = (hour: number): Period => (hour < 12 ? "am" : "pm");

/** The hour the cycle shows: 12, 1 to 11 in a 12-hour cycle, 0 to 23 in a 24-hour one. */
export const displayHour = (hour: number, cycle: HourCycle): number =>
    cycle === 24 ? hour : wrap(hour, 12) || 12;

/** The hour or minute as the field shows it: two digits, except a 12-hour hour. */
export const displayValue = (
    time: Time,
    view: TimeView,
    cycle: HourCycle,
): string =>
    view === "minute"
        ? pad(time.minute)
        : cycle === 24
          ? pad(time.hour)
          : String(displayHour(time.hour, 12));

/** The 0 to 23 hour of a shown hour in a period. */
export const hourIn = (shown: number, period: Period): number =>
    wrap(shown, 12) + (period === "pm" ? 12 : 0);

/** The time moved into `period`, keeping its shown hour. */
export const withPeriod = (time: Time, period: Period): Time =>
    periodOf(time.hour) === period
        ? time
        : { ...time, hour: wrap(time.hour + 12, 24) };

/** The time with its hour or minute stepped by `by`, wrapping around. A 12-hour cycle keeps the
 *  hour in its period, as the dial does. */
export const stepTime = (
    time: Time,
    view: TimeView,
    by: number,
    cycle: HourCycle,
): Time => {
    if (view === "minute")
        return { ...time, minute: wrap(time.minute + by, 60) };
    if (cycle === 24) return { ...time, hour: wrap(time.hour + by, 24) };
    return {
        ...time,
        hour: hourIn(wrap(time.hour + by, 12), periodOf(time.hour)),
    };
};

/** The time with its hour or minute at the end of its range (`"start"` or `"end"`), as Home
 *  and End move a spin button. */
export const timeAtEdge = (
    time: Time,
    view: TimeView,
    edge: "start" | "end",
    cycle: HourCycle,
): Time => {
    if (view === "minute")
        return { ...time, minute: edge === "start" ? 0 : 59 };
    if (cycle === 24) return { ...time, hour: edge === "start" ? 0 : 23 };
    const period = periodOf(time.hour);
    return { ...time, hour: hourIn(edge === "start" ? 1 : 12, period) };
};

/** The range a view's value is announced in: its `aria-valuemin` and `aria-valuemax`. */
export const viewRange = (
    view: TimeView,
    cycle: HourCycle,
): { readonly min: number; readonly max: number } =>
    view === "minute"
        ? { min: 0, max: 59 }
        : cycle === 24
          ? { min: 0, max: 23 }
          : { min: 1, max: 12 };

/** The value a view announces: the shown hour, or the minute. */
export const viewValue = (time: Time, view: TimeView, cycle: HourCycle) =>
    view === "minute" ? time.minute : displayHour(time.hour, cycle);

/** Reads what the user typed into a field as the view's value, in the cycle and period, or
 *  `undefined` when it's out of range. */
export const parseField = (
    text: string,
    view: TimeView,
    cycle: HourCycle,
    period: Period,
): number | undefined => {
    if (!/^\d{1,2}$/.test(text.trim())) return undefined;
    const value = Number(text);
    const { min, max } = viewRange(view, cycle);
    if (value < min || value > max) return undefined;
    if (view === "minute" || cycle === 24) return value;
    return hourIn(value, period);
};

/** The locale's hour cycle: 12 for `en-US`, 24 for `en-GB` or `de`. */
export const localeHourCycle = (locale?: string): HourCycle => {
    try {
        const { hourCycle, hour12 } = new Intl.DateTimeFormat(locale, {
            hour: "numeric",
        }).resolvedOptions();
        if (hourCycle)
            return hourCycle === "h11" || hourCycle === "h12" ? 12 : 24;
        return hour12 ? 12 : 24;
    } catch {
        return 12;
    }
};

/** The locale's names for the periods, such as `AM` and `PM`, or `vorm.` and `nachm.`. */
export const localePeriods = (locale?: string): Record<Period, string> => {
    const name = (hour: number) => {
        try {
            return (
                new Intl.DateTimeFormat(locale, {
                    hour: "numeric",
                    hour12: true,
                })
                    .formatToParts(new Date(2000, 0, 1, hour))
                    .find((part) => part.type === "dayPeriod")?.value ??
                (hour < 12 ? "AM" : "PM")
            );
        } catch {
            return hour < 12 ? "AM" : "PM";
        }
    };
    return { am: name(9), pm: name(21) };
};

/** The time read aloud by the locale: `9:05 PM`, or `21:05`. */
export const spokenTime = (
    time: Time,
    cycle: HourCycle,
    locale?: string,
): string => {
    try {
        return new Intl.DateTimeFormat(locale, {
            hour: "numeric",
            minute: "2-digit",
            hourCycle: cycle === 12 ? "h12" : "h23",
            timeZone: "UTC",
        }).format(new Date(Date.UTC(2000, 0, 1, time.hour, time.minute)));
    } catch {
        return formatTime(time);
    }
};

// The dial.

/** A label on the dial: its value, its text, where it sits (in percent of the dial's box, from
 *  its top left, the same in both directions: a clock doesn't mirror), and whether it's on the
 *  inner ring of a 24-hour dial. */
export interface DialLabel {
    readonly value: number;
    readonly text: string;
    readonly x: number;
    readonly y: number;
    readonly inner: boolean;
}

/** How far from the centre the outer and inner rings of labels are, in percent of the dial's
 *  width: Material's 256dp dial puts its labels 100dp out, and a 24-hour dial's inner ring
 *  64dp. */
export const DIAL_OUTER_RADIUS = 39;
export const DIAL_INNER_RADIUS = 25;

const round = (value: number) => Math.round(value * 1000) / 1000;

const point = (turn: number, radius: number) => {
    const angle = turn * 2 * Math.PI;
    return {
        x: round(50 + radius * Math.sin(angle)),
        y: round(50 - radius * Math.cos(angle)),
    };
};

/** The dial's labels for a view: twelve hours (twelve more inside on a 24-hour dial, 12 to 23
 *  inside, 0 at the top outside), or the minutes in fives. */
export const dialLabels = (
    view: TimeView,
    cycle: HourCycle,
): readonly DialLabel[] => {
    if (view === "minute")
        return Array.from({ length: 12 }, (_, index) => ({
            value: index * 5,
            text: pad(index * 5),
            inner: false,
            ...point(index / 12, DIAL_OUTER_RADIUS),
        }));
    const outer = Array.from({ length: 12 }, (_, index) => ({
        value: cycle === 24 ? index : index || 12,
        text: cycle === 24 ? pad(index) : String(index || 12),
        inner: false,
        ...point(index / 12, DIAL_OUTER_RADIUS),
    }));
    if (cycle === 12) return outer;
    return [
        ...outer,
        ...Array.from({ length: 12 }, (_, index) => ({
            value: index + 12,
            text: pad(index + 12),
            inner: true,
            ...point(index / 12, DIAL_INNER_RADIUS),
        })),
    ];
};

/** Where the hand points for a view's value: the turn (0 at the top, clockwise, 1 a full
 *  circle) and the ring's radius. */
export const dialHand = (
    time: Time,
    view: TimeView,
    cycle: HourCycle,
): { readonly turn: number; readonly radius: number } => {
    if (view === "minute")
        return { turn: time.minute / 60, radius: DIAL_OUTER_RADIUS };
    const inner = cycle === 24 && time.hour >= 12;
    return {
        turn: wrap(time.hour, 12) / 12,
        radius: inner ? DIAL_INNER_RADIUS : DIAL_OUTER_RADIUS,
    };
};

/** The value under a point on the dial, given in percent of its box from the top left, for a
 *  pointer pressing or dragging it. Hours snap to the nearest hour, keeping a 12-hour period;
 *  minutes to the nearest minute. A 24-hour dial takes the inner ring for a point nearer it. */
export const timeAtPoint = (
    time: Time,
    view: TimeView,
    cycle: HourCycle,
    x: number,
    y: number,
): Time => {
    const dx = x - 50;
    const dy = y - 50;
    const turn = wrap(Math.atan2(dx, -dy) / (2 * Math.PI), 1);
    if (view === "minute")
        return { ...time, minute: wrap(Math.round(turn * 60), 60) };
    const shown = wrap(Math.round(turn * 12), 12);
    if (cycle === 12)
        return { ...time, hour: hourIn(shown, periodOf(time.hour)) };
    const distance = Math.hypot(dx, dy);
    const inner = distance < (DIAL_OUTER_RADIUS + DIAL_INNER_RADIUS) / 2;
    return { ...time, hour: shown + (inner ? 12 : 0) };
};

/** Whether a dial label is the one selected: the hour's, or the minute's when it's on a five. */
export const dialLabelSelected = (
    label: DialLabel,
    time: Time,
    view: TimeView,
    cycle: HourCycle,
): boolean =>
    view === "minute"
        ? label.value === time.minute
        : cycle === 24
          ? label.value === time.hour
          : label.value === displayHour(time.hour, 12);
