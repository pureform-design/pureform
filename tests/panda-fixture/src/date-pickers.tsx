// The date pickers' section of the page: the modal date picker (a day chosen, today outlined),
// the docked date picker with its calendar open on a chosen range, and the date input. The dates
// are fixed, so the screenshot doesn't follow the clock.

import {
    button,
    calendarCell,
    dateInput,
    datePicker,
    dockedDatePicker,
    iconButton,
} from "$recipes";
import { For } from "solid-js";
import type { JSX } from "solid-js";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// August 2026 from Sunday: it starts on a Saturday.
const WEEKS: (number | null)[][] = [
    [null, null, null, null, null, null, 1],
    [2, 3, 4, 5, 6, 7, 8],
    [9, 10, 11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20, 21, 22],
    [23, 24, 25, 26, 27, 28, 29],
    [30, 31, null, null, null, null, null],
];

type Selection =
    | "none"
    | "selected"
    | "rangeStart"
    | "rangeMiddle"
    | "rangeEnd";

const CHEVRON_START = "M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z";
const CHEVRON_END = "M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z";
const CALENDAR =
    "M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 16H5V10h14zm0-12H5V6h14z";
const EDIT =
    "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z";

const Glyph = (props: { readonly path: string }) => (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
        <path fill="currentColor" d={props.path} />
    </svg>
);

// An icon button in one of the picker's icon slots.
const SlotButton = (props: {
    readonly slot: string;
    readonly label: string;
    readonly path: string;
    readonly mirror?: boolean;
}) => {
    const b = iconButton({ variant: "standard" });
    return (
        <span class={props.slot} data-pf-mirror={props.mirror ? "" : undefined}>
            <button class={b.root} type="button" aria-label={props.label}>
                <span class={b.touchTarget} />
                <span class={b.container}>
                    <span class={b.icon}>
                        <Glyph path={props.path} />
                    </span>
                </span>
            </button>
        </span>
    );
};

const TextButton = (props: { readonly children: JSX.Element }) => (
    <button class={button({ variant: "text" }).root} type="button">
        <span class={button().label}>{props.children}</span>
    </button>
);

// The weekday row and the grid of August's days, each a cell.
const Calendar = (props: {
    readonly weekdays: string;
    readonly weekday: string;
    readonly grid: string;
    readonly week: string;
    readonly selection: (day: number) => Selection;
    readonly today?: number;
}) => (
    <>
        <div class={props.weekdays} role="row">
            <For each={WEEKDAYS}>
                {(day) => (
                    <span class={props.weekday} role="columnheader">
                        {day}
                    </span>
                )}
            </For>
        </div>
        <div class={props.grid} role="grid">
            <For each={WEEKS}>
                {(week) => (
                    <div class={props.week} role="row">
                        <For each={week}>
                            {(day) => {
                                const c = calendarCell({
                                    selection:
                                        day === null
                                            ? "none"
                                            : props.selection(day),
                                    today: day !== null && day === props.today,
                                    outside: day === null,
                                });
                                return (
                                    <div class={c.root} role="gridcell">
                                        <div
                                            class={c.trigger}
                                            role="button"
                                            tabIndex={-1}
                                        >
                                            {day ?? ""}
                                        </div>
                                    </div>
                                );
                            }}
                        </For>
                    </div>
                )}
            </For>
        </div>
    </>
);

const range = (day: number): Selection =>
    day === 10
        ? "rangeStart"
        : day === 14
          ? "rangeEnd"
          : day > 10 && day < 14
            ? "rangeMiddle"
            : "none";

export function DatePickerSection(): JSX.Element {
    const d = datePicker();
    const k = dockedDatePicker({ variant: "outlined", trailingIcon: true });
    const i = dateInput({ variant: "outlined" });
    return (
        <section
            data-section="date-pickers"
            style={{
                display: "flex",
                "align-items": "flex-start",
                "flex-wrap": "wrap",
                gap: "24px",
            }}
        >
            <div
                class={d.root}
                role="dialog"
                aria-labelledby="date-picker-headline"
            >
                <div class={d.header}>
                    <span class={d.headline} id="date-picker-headline">
                        Select date
                    </span>
                    <span class={d.selectedDate}>Mon, Aug 17</span>
                    <SlotButton
                        slot={d.modeToggle}
                        label="Switch to text input"
                        path={EDIT}
                    />
                </div>
                <hr class={d.divider} />
                <div class={d.controls}>
                    <button
                        class={`${d.viewTrigger} ${button({ variant: "text" }).root}`}
                        type="button"
                    >
                        <span class={button().label}>August 2026 ▾</span>
                    </button>
                    <SlotButton
                        slot={d.prev}
                        label="Previous month"
                        path={CHEVRON_START}
                        mirror
                    />
                    <SlotButton
                        slot={d.next}
                        label="Next month"
                        path={CHEVRON_END}
                        mirror
                    />
                </div>
                <Calendar
                    weekdays={d.weekdays}
                    weekday={d.weekday}
                    grid={d.grid}
                    week={d.week}
                    selection={(day) => (day === 17 ? "selected" : "none")}
                    today={5}
                />
                <div class={d.actions}>
                    <TextButton>Cancel</TextButton>
                    <TextButton>OK</TextButton>
                </div>
            </div>

            <div class={k.root} style={{ width: "360px" }}>
                <div class={k.container}>
                    <input
                        class={k.input}
                        id="docked-date"
                        placeholder=" "
                        value="08/10/2026 – 08/14/2026"
                    />
                    <label class={k.label} for="docked-date">
                        Dates
                    </label>
                    <SlotButton
                        slot={k.trailingIcon}
                        label="Open calendar"
                        path={CALENDAR}
                    />
                </div>
                <span class={k.supportingText}>mm/dd/yyyy</span>
                <div class={k.content} role="dialog" aria-label="Calendar">
                    <div class={k.controls}>
                        <SlotButton
                            slot={k.prev}
                            label="Previous month"
                            path={CHEVRON_START}
                            mirror
                        />
                        <button
                            class={`${k.monthButton} ${button({ variant: "text" }).root}`}
                            type="button"
                        >
                            <span class={button().label}>Aug ▾</span>
                        </button>
                        <SlotButton
                            slot={k.next}
                            label="Next month"
                            path={CHEVRON_END}
                            mirror
                        />
                        <SlotButton
                            slot={k.prev}
                            label="Previous year"
                            path={CHEVRON_START}
                            mirror
                        />
                        <button
                            class={`${k.yearButton} ${button({ variant: "text" }).root}`}
                            type="button"
                        >
                            <span class={button().label}>2026 ▾</span>
                        </button>
                        <SlotButton
                            slot={k.next}
                            label="Next year"
                            path={CHEVRON_END}
                            mirror
                        />
                    </div>
                    <Calendar
                        weekdays={k.weekdays}
                        weekday={k.weekday}
                        grid={k.grid}
                        week={k.week}
                        selection={range}
                        today={12}
                    />
                </div>
            </div>

            <div
                class={i.root}
                role="group"
                aria-labelledby="date-input-headline"
            >
                <div class={i.header}>
                    <span class={i.headline} id="date-input-headline">
                        Select date
                    </span>
                    <span class={i.selectedDate}>Aug 17, 2026</span>
                    <SlotButton
                        slot={i.modeToggle}
                        label="Switch to calendar"
                        path={CALENDAR}
                    />
                </div>
                <hr class={i.divider} />
                <div class={i.field}>
                    <div class={i.container} data-pf-filled="">
                        <div
                            class={i.input}
                            role="group"
                            aria-labelledby="date-input-label"
                        >
                            <span
                                class={i.segment}
                                role="spinbutton"
                                tabIndex={0}
                            >
                                08
                            </span>
                            /
                            <span
                                class={i.segment}
                                role="spinbutton"
                                tabIndex={0}
                            >
                                17
                            </span>
                            /
                            <span
                                class={i.segment}
                                role="spinbutton"
                                tabIndex={0}
                            >
                                2026
                            </span>
                        </div>
                        <label class={i.label} id="date-input-label">
                            Date
                        </label>
                    </div>
                    <span class={i.supportingText}>mm/dd/yyyy</span>
                </div>
                <div class={i.actions}>
                    <TextButton>Cancel</TextButton>
                    <TextButton>OK</TextButton>
                </div>
            </div>
        </section>
    );
}
