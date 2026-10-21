// A page of every component in its variants, states, and themes, styled by Panda's recipes: the
// visual suite in `tests/browser-e2e-tests` screenshots each section.

import {
    appBar,
    timeInput,
    timePicker,
    avatar,
    badge,
    media,
    button,
    buttonGroup,
    card,
    carousel,
    checkbox,
    chip,
    circularProgress,
    linearProgress,
    loadingIndicator,
    navigationBar,
    navigationRail,
    searchBar,
    searchView,
    select,
    autocomplete,
    slider,
    snackbar,
    toast,
    richTooltip,
    tooltip,
    dialog,
    list,
    listItem,
    menu,
    tabs,
    tagsInput,
    separator,
    fab,
    fullscreenDialog,
    bottomSheet,
    sideSheet,
    dragHandle,
    fabMenu,
    splitButton,
    stepper,
    icon,
    iconButton,
    inputChip,
    radio,
    scrim,
    supportingText,
    switchControl,
    text,
    textArea,
    textField,
    toolbar,
} from "$recipes";
import { MATERIAL_SHAPES } from "@pureform/preset";
import type { MaterialShape } from "@pureform/preset";
import { createSignal, For } from "solid-js";

import { DatePickerSection } from "./date-pickers";
import { Ripple } from "./ripple";

const FILLS = ["filled", "tonal", "outlined", "text", "elevated"] as const;
// A wide picture, so the avatar shows it cropped to fill.
const PORTRAIT = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#7aa6c2"/><circle cx="90" cy="18" r="10" fill="#f4d35e"/><path d="M0 60 40 22l30 30 20-14 30 22z" fill="#386641"/></svg>',
)}`;

const ICON_FILLS = [
    "filled",
    "tonal",
    "outlined",
    "standard",
    "elevated",
] as const;
const CARD_FILLS = ["elevated", "filled", "outlined"] as const;

// An app bar's icon button: the standard icon button around a glyph.
function BarButton(props: { readonly label: string; readonly glyph: string }) {
    const b = iconButton({ variant: "standard" });
    return (
        <button class={b.root} type="button" aria-label={props.label}>
            <span class={b.touchTarget} />
            <span class={b.container}>
                <span class={b.icon}>{props.glyph}</span>
            </span>
        </button>
    );
}

type AppBarExample = {
    readonly label: string;
    readonly size?: "small" | "mediumFlexible" | "largeFlexible";
    readonly centered?: boolean;
    readonly scrolled?: boolean;
    readonly collapsed?: boolean;
    readonly search?: boolean;
    readonly subtitle?: string;
};

const APP_BARS: readonly AppBarExample[] = [
    { label: "Small" },
    { label: "Centered", centered: true },
    { label: "Scrolled", scrolled: true, subtitle: "12 unread" },
    { label: "Medium flexible", size: "mediumFlexible", subtitle: "12 unread" },
    { label: "Large flexible", size: "largeFlexible" },
    {
        label: "Collapsed",
        size: "largeFlexible",
        scrolled: true,
        collapsed: true,
    },
    { label: "Search", search: true, scrolled: true },
];

// An app bar drawn from the recipe: the content after the actions while a flexible bar is
// expanded, as the bindings render it.
function AppBarExampleView(props: { readonly example: AppBarExample }) {
    const e = props.example;
    // A collapsed flexible bar draws as the small one, as the bindings select it.
    const a = appBar({
        size: e.collapsed ? "small" : e.size,
        centered: e.centered,
        scrolled: e.scrolled,
        collapsed: e.collapsed,
        search: e.search,
    });
    const last = e.size !== undefined && e.size !== "small" && !e.collapsed;
    const content = (
        <div class={a.content}>
            {e.search ? (
                <label
                    class={
                        searchBar({ centered: true, scrolled: e.scrolled }).root
                    }
                >
                    <input
                        class={searchBar({ centered: true }).input}
                        type="search"
                        placeholder="Search mail"
                    />
                </label>
            ) : (
                <>
                    <h2 class={a.headline}>{e.label}</h2>
                    {e.subtitle ? <p class={a.subtitle}>{e.subtitle}</p> : null}
                </>
            )}
        </div>
    );
    return (
        <header class={a.root} style={{ width: "360px" }}>
            <div class={a.leading} data-pf-mirror="">
                <BarButton label="Back" glyph="←" />
            </div>
            {last ? null : content}
            <div class={a.trailing}>
                <BarButton label="More" glyph="⋮" />
            </div>
            {last ? content : null}
        </header>
    );
}

// A time picker drawn from the recipe, its dial placed as the bindings place it: twelve hours on
// a ring 39% out (a 24-hour dial has twelve more 25% out), the handle on the selected one.
type TimePickerExample = {
    readonly mode?: "dial" | "scroll";
    readonly color?: "standard" | "vibrant";
    readonly cycle: 12 | 24;
    readonly hour: number;
    readonly theme?: string;
};

const TIME_PICKERS: readonly TimePickerExample[] = [
    { cycle: 12, hour: 9 },
    { cycle: 24, hour: 15 },
    // Vibrant, under the sharp shape theme: its dial stays round.
    { cycle: 12, hour: 21, color: "vibrant", theme: "sharp" },
    { cycle: 24, hour: 10, mode: "scroll" },
];

const ringPoint = (turn: number, radius: number) => ({
    left: `${50 + radius * Math.sin(turn * 2 * Math.PI)}%`,
    top: `${50 - radius * Math.cos(turn * 2 * Math.PI)}%`,
});

const pad = (value: number) => String(value).padStart(2, "0");

function TimePickerExampleView(props: { readonly example: TimePickerExample }) {
    const e = props.example;
    const t = timePicker({ mode: e.mode, color: e.color });
    const shown = e.cycle === 12 ? e.hour % 12 || 12 : e.hour;
    const inner = e.cycle === 24 && e.hour >= 12;
    const radius = inner ? 25 : 39;
    const turn = (e.hour % 12) / 12;
    const labels = Array.from({ length: e.cycle }, (_, index) => {
        const ring = index >= 12;
        const value = e.cycle === 12 ? index || 12 : index;
        return {
            text: e.cycle === 12 ? String(value) : pad(value),
            selected: value === (e.cycle === 12 ? shown : e.hour),
            ...ringPoint((index % 12) / 12, ring ? 25 : 39),
        };
    });
    const scrollItems = (values: readonly string[]) =>
        values.map((value, index) => (
            <span
                class={t.scrollItem}
                aria-hidden="true"
                aria-selected={index === 1 ? "true" : "false"}
            >
                {value}
            </span>
        ));
    return (
        <div
            class={t.root}
            role="group"
            aria-label="Select time"
            data-panda-theme={e.theme}
        >
            <div class={t.headline}>Select time</div>
            <div class={t.body}>
                {e.mode === "scroll" ? (
                    <>
                        <div
                            class={t.hourSelector}
                            role="spinbutton"
                            aria-label="Hour"
                        >
                            {scrollItems([
                                pad(e.hour - 1),
                                pad(e.hour),
                                pad(e.hour + 1),
                            ])}
                        </div>
                        <span class={t.separator}>:</span>
                        <div
                            class={t.minuteSelector}
                            role="spinbutton"
                            aria-label="Minute"
                        >
                            {scrollItems(["29", "30", "31"])}
                        </div>
                    </>
                ) : (
                    <>
                        <button
                            class={t.hourSelector}
                            type="button"
                            aria-pressed="true"
                        >
                            {e.cycle === 12 ? String(shown) : pad(shown)}
                        </button>
                        <span class={t.separator}>:</span>
                        <button
                            class={t.minuteSelector}
                            type="button"
                            aria-pressed="false"
                        >
                            30
                        </button>
                    </>
                )}
                {e.cycle === 12 ? (
                    <div
                        class={t.periodSelector}
                        role="group"
                        aria-label="Period"
                    >
                        <button
                            class={t.period}
                            type="button"
                            aria-pressed={e.hour < 12 ? "true" : "false"}
                        >
                            AM
                        </button>
                        <button
                            class={t.period}
                            type="button"
                            aria-pressed={e.hour >= 12 ? "true" : "false"}
                        >
                            PM
                        </button>
                    </div>
                ) : null}
            </div>
            {e.mode === "scroll" ? null : (
                <div
                    class={t.dial}
                    role="slider"
                    aria-label="Hour"
                    aria-valuenow={shown}
                >
                    <span
                        class={t.dialTrack}
                        style={{
                            left: "50%",
                            bottom: "50%",
                            height: `${radius}%`,
                            "transform-origin": "bottom",
                            transform: `rotate(${turn * 360}deg)`,
                        }}
                    />
                    <span
                        class={t.dialHandle}
                        style={ringPoint(turn, radius)}
                    />
                    <span
                        class={t.dialCenter}
                        style={{ left: "50%", top: "50%" }}
                    />
                    <For each={labels}>
                        {(label) => (
                            <span
                                class={t.dialLabel}
                                aria-hidden="true"
                                aria-selected={
                                    label.selected ? "true" : "false"
                                }
                                style={{ left: label.left, top: label.top }}
                            >
                                {label.text}
                            </span>
                        )}
                    </For>
                </div>
            )}
            <div class={t.actions}>
                <button class={button({ variant: "text" }).root} type="button">
                    Cancel
                </button>
                <button class={button({ variant: "text" }).root} type="button">
                    OK
                </button>
            </div>
        </div>
    );
}

// The time input drawn from the recipe: two fields, the hour focused.
function TimeInputExampleView() {
    const t = timeInput({});
    return (
        <div class={t.root} role="group" aria-label="Enter time">
            <div class={t.headline}>Enter time</div>
            <div class={t.body}>
                <label class={t.hourField}>
                    <input class={t.input} value="9" aria-label="Hour" />
                    <span class={t.fieldLabel}>Hour</span>
                </label>
                <span class={t.separator} style={{ height: "72px" }}>
                    :
                </span>
                <label class={t.minuteField}>
                    <input class={t.input} value="30" aria-label="Minute" />
                    <span class={t.fieldLabel}>Minute</span>
                </label>
                <div class={t.periodSelector} role="group" aria-label="Period">
                    <button class={t.period} type="button" aria-pressed="true">
                        AM
                    </button>
                    <button class={t.period} type="button" aria-pressed="false">
                        PM
                    </button>
                </div>
            </div>
        </div>
    );
}

const row = { display: "flex", gap: "16px", "flex-wrap": "wrap" } as const;

const grouped = menu({ grouped: true, vibrant: true });

// Named themes from pureform.config.ts, each applied to a subtree by `data-panda-theme`.
const THEMES = [undefined, "teal", "sharp", "dense"] as const;

// A toolbar's icons, and whether each is a toggle that's on: bold, italic (on) and underline
// toggles, and a link button.
const TOOLBAR_ICONS: readonly (readonly [
    string,
    string,
    "true" | "false" | undefined,
])[] = [
    [
        "Bold",
        "M8 4h5a4 4 0 0 1 2.5 7.1A4 4 0 0 1 14 19H8zm3 3v3h2a1.5 1.5 0 0 0 0-3zm0 6v3h3a1.5 1.5 0 0 0 0-3z",
        "false",
    ],
    ["Italic", "M10 4h8v3h-2.7l-3 10H15v3H7v-3h2.7l3-10H10z", "true"],
    [
        "Underline",
        "M6 21h12v-2H6zM12 17a6 6 0 0 0 6-6V3h-2.5v8a3.5 3.5 0 0 1-7 0V3H6v8a6 6 0 0 0 6 6",
        "false",
    ],
    [
        "Link",
        "M17 7h-4v2h4a3 3 0 0 1 0 6h-4v2h4a5 5 0 0 0 0-10m-6 8H7a3 3 0 0 1 0-6h4V7H7a5 5 0 0 0 0 10h4zm-3-4h8v2H8z",
        undefined,
    ],
];
// Carousels in a 360px row (328px inside its padding, 8px gaps), sized at rest as the bindings
// size them: each item's slot, its mask, and the mask's offset in the slot.
const CAROUSELS = [
    {
        layout: "multiBrowse",
        masks: [
            [186, 186, 0],
            [186, 70, 0],
            [186, 56, -116],
        ],
    },
    {
        layout: "hero",
        masks: [
            [264, 264, 0],
            [264, 56, 0],
        ],
    },
    {
        layout: "uncontained",
        masks: [
            [186, 186, 0],
            [186, 186, 0],
        ],
    },
] as const;

const TOAST_TYPES = ["info", "success", "warning", "error", "loading"] as const;
// Plain glyphs: the bundled Roboto draws them the same on every machine.
const TOAST_ICONS = {
    info: "i",
    success: "✓",
    warning: "!",
    error: "×",
    loading: "…",
} as const;

/** Every component in its variants and states, a section each (`data-section`). */
export function Page() {
    return (
        <main style={{ display: "grid", gap: "32px", padding: "32px" }}>
            <section
                data-section="controls"
                style={{ ...row, "align-items": "center" }}
            >
                <For
                    each={["off", "on", "mixed", "error", "disabled"] as const}
                >
                    {(state) => {
                        const c = checkbox();
                        return (
                            <label class={c.root} title={`checkbox ${state}`}>
                                <span class={c.touchTarget} />
                                <input
                                    ref={(el) => {
                                        el.indeterminate = state === "mixed";
                                    }}
                                    class={c.input}
                                    type="checkbox"
                                    id={`checkbox-${state}`}
                                    checked={
                                        state === "on" || state === "error"
                                    }
                                    disabled={state === "disabled"}
                                    aria-invalid={
                                        state === "error" ? "true" : undefined
                                    }
                                />
                                <span class={c.box}>
                                    <span class={c.checkIcon} />
                                    <span class={c.indeterminateIcon} />
                                </span>
                            </label>
                        );
                    }}
                </For>
                <For each={["a", "b", "c"] as const}>
                    {(value) => {
                        const r = radio();
                        return (
                            <label class={r.root} title={`radio ${value}`}>
                                <span class={r.touchTarget} />
                                <input
                                    class={r.input}
                                    type="radio"
                                    name="demo-radio"
                                    id={`radio-${value}`}
                                    checked={value === "a"}
                                />
                                <span class={r.ring}>
                                    <span class={r.dot} />
                                </span>
                            </label>
                        );
                    }}
                </For>
                <For each={[false, true]}>
                    {(on) => {
                        const s = switchControl();
                        return (
                            <label
                                class={s.root}
                                title={`switch ${on ? "on" : "off"}`}
                            >
                                <span class={s.touchTarget} />
                                <input
                                    class={s.input}
                                    type="checkbox"
                                    role="switch"
                                    id={`switch-${on ? "on" : "off"}`}
                                    checked={on}
                                />
                                <span class={s.track}>
                                    <span class={s.stateLayer} />
                                    <span class={s.handle}>
                                        <span class={s.icon}>✓</span>
                                    </span>
                                </span>
                            </label>
                        );
                    }}
                </For>
            </section>
            <section
                data-section="color-groups"
                style={{ ...row, "align-items": "center" }}
            >
                <For each={["error", "success", "tertiary"] as const}>
                    {(color) => {
                        const c = checkbox({ color });
                        const s = switchControl({ color });
                        const ch = chip({ color });
                        const t = textField({ color, variant: "outlined" });
                        return (
                            <>
                                <label
                                    class={c.root}
                                    title={`${color} checkbox`}
                                >
                                    <span class={c.touchTarget} />
                                    <input
                                        class={c.input}
                                        type="checkbox"
                                        id={`checkbox-${color}`}
                                        checked
                                    />
                                    <span class={c.box}>
                                        <span class={c.checkIcon} />
                                        <span class={c.indeterminateIcon} />
                                    </span>
                                </label>
                                <label class={s.root} title={`${color} switch`}>
                                    <span class={s.touchTarget} />
                                    <input
                                        class={s.input}
                                        type="checkbox"
                                        role="switch"
                                        id={`switch-${color}`}
                                        checked
                                    />
                                    <span class={s.track}>
                                        <span class={s.stateLayer} />
                                        <span class={s.handle}>
                                            <span class={s.icon}>✓</span>
                                        </span>
                                    </span>
                                </label>
                                <button
                                    class={ch.root}
                                    type="button"
                                    aria-pressed="true"
                                    id={`chip-${color}`}
                                >
                                    <span class={ch.icon}>★</span>
                                    <span class={ch.label}>{color}</span>
                                </button>
                                <div class={t.root} style={{ width: "160px" }}>
                                    <div class={t.container}>
                                        <input
                                            class={t.input}
                                            id={`field-${color}`}
                                            placeholder=" "
                                        />
                                        <label
                                            class={t.label}
                                            for={`field-${color}`}
                                        >
                                            {color}
                                        </label>
                                    </div>
                                    <span
                                        class={supportingText({ tone: color })}
                                    >
                                        {`${color} tone`}
                                    </span>
                                </div>
                            </>
                        );
                    }}
                </For>
            </section>
            <hr class={separator()} />
            <section
                data-section="text-fields"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <For each={["filled", "outlined"] as const}>
                    {(variant) => (
                        <For each={[false, true]}>
                            {(invalid) => {
                                const t = textField({ variant });
                                const id = `${variant}-${invalid ? "error" : "ok"}`;
                                return (
                                    <div
                                        class={t.root}
                                        style={{ width: "240px" }}
                                    >
                                        <div class={t.container}>
                                            <input
                                                class={t.input}
                                                id={id}
                                                placeholder=" "
                                                aria-invalid={
                                                    invalid ? "true" : undefined
                                                }
                                            />
                                            <label class={t.label} for={id}>
                                                {`${variant} field`}
                                            </label>
                                        </div>
                                        <span class={t.supportingText}>
                                            {invalid
                                                ? "Something is wrong"
                                                : "Supporting text"}
                                        </span>
                                    </div>
                                );
                            }}
                        </For>
                    )}
                </For>
            </section>
            <section
                data-section="affixes-and-counter"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <For each={["filled", "outlined"] as const}>
                    {(variant) => {
                        const t = textField({
                            variant,
                            prefixText: true,
                            suffixText: true,
                        });
                        const id = `affix-${variant}`;
                        return (
                            <div class={t.root} style={{ width: "240px" }}>
                                <div class={t.container}>
                                    <span class={t.prefixText}>$</span>
                                    <input
                                        class={t.input}
                                        id={id}
                                        placeholder=" "
                                        value="12"
                                    />
                                    <span class={t.suffixText}>.00</span>
                                    <label class={t.label} for={id}>
                                        Price
                                    </label>
                                </div>
                                <span class={t.supportingText}>Before tax</span>
                                <span class={t.counter}>2 / 8</span>
                            </div>
                        );
                    }}
                </For>
                <For each={["filled", "outlined"] as const}>
                    {(variant) => {
                        const t = textField({
                            variant,
                            trailingIcon: true,
                            secure: true,
                        });
                        const id = `secure-${variant}`;
                        return (
                            <div class={t.root} style={{ width: "240px" }}>
                                <div class={t.container}>
                                    <input
                                        class={t.input}
                                        id={id}
                                        type="password"
                                        placeholder=" "
                                        value="hunter2"
                                        aria-invalid="true"
                                    />
                                    <label class={t.label} for={id}>
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        class={t.trailingIcon}
                                        aria-label="Show password"
                                        aria-pressed="false"
                                    >
                                        ◉
                                    </button>
                                </div>
                                <span class={t.counter}>7 / 6</span>
                            </div>
                        );
                    }}
                </For>
            </section>
            <section
                data-section="icon-fields-and-areas"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <For each={["filled", "outlined"] as const}>
                    {(variant) => {
                        const t = textField({
                            variant,
                            leadingIcon: true,
                            trailingIcon: true,
                        });
                        const id = `icon-${variant}`;
                        return (
                            <div class={t.root} style={{ width: "240px" }}>
                                <div class={t.container}>
                                    <span class={t.leadingIcon}>⌕</span>
                                    <input
                                        class={t.input}
                                        id={id}
                                        placeholder=" "
                                    />
                                    <label class={t.label} for={id}>
                                        Search
                                    </label>
                                    <span class={t.trailingIcon}>×</span>
                                </div>
                            </div>
                        );
                    }}
                </For>
                <For each={["filled", "outlined"] as const}>
                    {(variant) => {
                        const t = textArea({ variant });
                        const id = `area-${variant}`;
                        return (
                            <div class={t.root} style={{ width: "240px" }}>
                                <div class={t.container}>
                                    <textarea
                                        class={t.input}
                                        id={id}
                                        placeholder=" "
                                        rows={3}
                                    />
                                    <label class={t.label} for={id}>
                                        {`${variant} area`}
                                    </label>
                                </div>
                                <span class={t.supportingText}>
                                    Drag the corner to resize
                                </span>
                            </div>
                        );
                    }}
                </For>
                <For each={["filled", "outlined"] as const}>
                    {(variant) => {
                        const t = textArea({
                            variant,
                            leadingIcon: true,
                            trailingIcon: true,
                        });
                        const id = `area-icon-${variant}`;
                        return (
                            <div class={t.root} style={{ width: "240px" }}>
                                <div class={t.container}>
                                    <span class={t.leadingIcon}>✎</span>
                                    <textarea
                                        class={t.input}
                                        id={id}
                                        placeholder=" "
                                        rows={3}
                                    />
                                    <label class={t.label} for={id}>
                                        {`${variant} with icons`}
                                    </label>
                                    <span class={t.trailingIcon}>×</span>
                                </div>
                                <span class={t.supportingText}>
                                    Icons stay centered
                                </span>
                            </div>
                        );
                    }}
                </For>
                {(() => {
                    const t = textArea({ autoGrow: true });
                    return (
                        <div class={t.root} style={{ width: "240px" }}>
                            <div class={t.container}>
                                <textarea
                                    class={t.input}
                                    id="area-grow"
                                    placeholder=" "
                                />
                                <label class={t.label} for="area-grow">
                                    Auto-grow area
                                </label>
                            </div>
                            <span class={t.supportingText}>
                                Grows as you type
                            </span>
                        </div>
                    );
                })()}
            </section>
            <section
                data-section="icons"
                style={{ ...row, "align-items": "center" }}
            >
                <For each={["small", "medium", "large"] as const}>
                    {(size) => (
                        <span class={icon({ size })} title={`${size} icon`}>
                            ★
                        </span>
                    )}
                </For>
                <For each={["primary", "error", "success"] as const}>
                    {(color) => (
                        <span class={icon({ color })} title={`${color} icon`}>
                            ★
                        </span>
                    )}
                </For>
            </section>
            <section
                data-section="fabs"
                style={{ ...row, "align-items": "center" }}
            >
                <For each={["small", "default", "medium", "large"] as const}>
                    {(size) => {
                        const f = fab({ size });
                        return (
                            <button
                                class={f.root}
                                type="button"
                                aria-label={`${size} FAB`}
                            >
                                <span class={f.touchTarget} />
                                <span class={f.container}>
                                    <Ripple />
                                    <span class={f.icon}>+</span>
                                </span>
                            </button>
                        );
                    }}
                </For>
                <For each={["tonal", "filled", "surface"] as const}>
                    {(variant) => {
                        const f = fab({ variant, extended: true });
                        return (
                            <button class={f.root} type="button">
                                <span class={f.touchTarget} />
                                <span class={f.container}>
                                    <Ripple />
                                    <span class={f.label}>
                                        {`${variant} FAB`.toUpperCase()}
                                    </span>
                                </span>
                            </button>
                        );
                    }}
                </For>
            </section>
            <section
                data-section="split-buttons-and-fab-menus"
                style={{ ...row, "align-items": "end" }}
            >
                <For
                    each={
                        [
                            ["filled", "small", false],
                            ["tonal", "small", true],
                            ["outlined", "medium", false],
                            ["elevated", "xsmall", false],
                        ] as const
                    }
                >
                    {([variant, size, open]) => {
                        const s = splitButton({ variant, size });
                        return (
                            <div class={s.root}>
                                <button class={s.leadingButton} type="button">
                                    <Ripple />
                                    {`${variant} split`}
                                </button>
                                <button
                                    class={s.trailingButton}
                                    type="button"
                                    aria-label="More"
                                    aria-haspopup="menu"
                                    aria-expanded={open ? "true" : "false"}
                                >
                                    <Ripple />
                                    <span class={s.trailingIcon}>▾</span>
                                </button>
                            </div>
                        );
                    }}
                </For>
                <For each={["primary", "tertiary"] as const}>
                    {(color) => {
                        const f = fabMenu({ color });
                        return (
                            <div
                                class={f.root}
                                style={{
                                    "margin-top": "136px",
                                    "margin-inline-start": "96px",
                                }}
                            >
                                <div
                                    class={f.list}
                                    role="menu"
                                    data-state="open"
                                >
                                    <For each={["Message", "Call"]}>
                                        {(label) => (
                                            <button
                                                class={f.item}
                                                type="button"
                                                role="menuitem"
                                            >
                                                <Ripple />
                                                <span class={f.itemIcon}>
                                                    @
                                                </span>
                                                <span class={f.itemLabel}>
                                                    {label}
                                                </span>
                                            </button>
                                        )}
                                    </For>
                                </div>
                                <button
                                    class={f.closeTrigger}
                                    type="button"
                                    aria-label="Close"
                                    aria-haspopup="menu"
                                    aria-expanded="true"
                                >
                                    <Ripple />✕
                                </button>
                            </div>
                        );
                    }}
                </For>
                <div class={fabMenu().root}>
                    <button
                        class={fabMenu().closeTrigger}
                        type="button"
                        aria-label="Create"
                        aria-haspopup="menu"
                        aria-expanded="false"
                    >
                        <Ripple />+
                    </button>
                </div>
            </section>
            <div>
                <section data-section="chips" style={row}>
                    <For each={["outlined", "elevated"] as const}>
                        {(variant) => (
                            <For each={["Filter", "Assist"]}>
                                {(label) => {
                                    const [selected, setSelected] =
                                        createSignal(false);
                                    const c = chip({ variant });
                                    return (
                                        <button
                                            class={c.root}
                                            type="button"
                                            aria-pressed={
                                                selected() ? "true" : "false"
                                            }
                                            onClick={() => {
                                                setSelected(!selected());
                                            }}
                                        >
                                            <span class={c.touchTarget} />
                                            <Ripple />
                                            <span class={c.icon}>★</span>
                                            <span
                                                class={c.label}
                                            >{`${variant} ${label}`}</span>
                                        </button>
                                    );
                                }}
                            </For>
                        )}
                    </For>
                    {(() => {
                        const c = chip({ corner: "round", toggle: true });
                        return (
                            <button
                                class={c.root}
                                type="button"
                                aria-pressed="true"
                            >
                                <span class={c.touchTarget} />
                                <Ripple />
                                <span class={c.label}>Round filter</span>
                                <span class={c.trailingIcon}>▾</span>
                            </button>
                        );
                    })()}
                </section>
                <section
                    data-section="input-chips"
                    style={{ ...row, "align-items": "flex-start" }}
                >
                    <For each={["filled", "outlined"] as const}>
                        {(variant) => {
                            const t = tagsInput({ variant });
                            const c = inputChip();
                            const id = `tags-${variant}`;
                            const chips = [
                                { label: "Ada", avatar: "A" },
                                { label: "Starred", icon: "★" },
                                { label: "Plain" },
                                { label: "Selected", selected: true },
                            ];
                            return (
                                <div class={t.root} style={{ width: "300px" }}>
                                    {/* Holding chips, as the bindings mark it. */}
                                    <div class={t.container} data-pf-filled="">
                                        <For each={chips}>
                                            {(item) => (
                                                <div
                                                    class={c.root}
                                                    aria-selected={
                                                        item.selected
                                                            ? "true"
                                                            : undefined
                                                    }
                                                >
                                                    <span
                                                        class={c.touchTarget}
                                                    />
                                                    {item.avatar ? (
                                                        <span class={c.avatar}>
                                                            {item.avatar}
                                                        </span>
                                                    ) : null}
                                                    {item.icon ? (
                                                        <span class={c.icon}>
                                                            {item.icon}
                                                        </span>
                                                    ) : null}
                                                    <span class={c.label}>
                                                        {item.label}
                                                    </span>
                                                    <button
                                                        class={c.remove}
                                                        type="button"
                                                        aria-label={`Remove ${item.label}`}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}
                                        </For>
                                        <input
                                            class={t.input}
                                            id={id}
                                            placeholder=" "
                                        />
                                        <label class={t.label} for={id}>
                                            {`${variant} tags`}
                                        </label>
                                    </div>
                                    <span class={t.supportingText}>
                                        Press Enter to add a tag
                                    </span>
                                </div>
                            );
                        }}
                    </For>
                    {(() => {
                        const t = tagsInput({ variant: "outlined" });
                        return (
                            <div class={t.root} style={{ width: "200px" }}>
                                <div class={t.container}>
                                    <input
                                        class={t.input}
                                        id="tags-empty"
                                        placeholder=" "
                                    />
                                    <label class={t.label} for="tags-empty">
                                        Empty
                                    </label>
                                </div>
                            </div>
                        );
                    })()}
                </section>
                <span class={supportingText()}>
                    Pick any filters; chips use the standalone supporting text.
                </span>
                <span class={supportingText({ tone: "error" })}>
                    An error tone, set directly.
                </span>
            </div>
            <section
                data-section="intro"
                style={{ display: "grid", gap: "8px" }}
            >
                <h1 class={text({ style: "headlineMedium" })}>pureform</h1>
                <p class={text({ style: "bodyLarge" })}>
                    Components from theme providers. The theme adds a{" "}
                    <code class={text({ style: "code" })}>code</code> text
                    style, which becomes a typed variant.
                </p>
            </section>

            <section data-section="themes" style={row}>
                <For each={THEMES}>
                    {(theme) => (
                        <div
                            data-panda-theme={theme}
                            style={{ display: "flex", gap: "8px" }}
                        >
                            <For each={["filled", "tonal"] as const}>
                                {(variant) => {
                                    const b = button({ variant });
                                    return (
                                        <button class={b.root} type="button">
                                            <span class={b.touchTarget} />
                                            <Ripple />
                                            <span class={b.label}>
                                                {`${theme ?? "base"} ${variant}`.toUpperCase()}
                                            </span>
                                        </button>
                                    );
                                }}
                            </For>
                        </div>
                    )}
                </For>
            </section>

            <section
                data-section="density"
                style={{ display: "grid", gap: "12px" }}
            >
                <For
                    each={
                        ["comfortable", "default", "compact", "dense"] as const
                    }
                >
                    {(density) => {
                        const b = button({ density, variant: "tonal" });
                        const c = chip({ density });
                        const x = checkbox({ density });
                        const t = textField({ density, variant: "outlined" });
                        const f = textField({ density });
                        const l = listItem({ density, interactive: true });
                        const a = textArea({ density });
                        return (
                            <div style={{ ...row, "align-items": "center" }}>
                                <button class={b.root} type="button">
                                    <span class={b.touchTarget} />
                                    <span class={b.label}>
                                        {density.toUpperCase()}
                                    </span>
                                </button>
                                <button class={c.root} type="button">
                                    <span class={c.touchTarget} />
                                    <span class={c.label}>Chip</span>
                                </button>
                                <label class={x.root}>
                                    <span class={x.touchTarget} />
                                    <input
                                        class={x.input}
                                        type="checkbox"
                                        checked
                                        aria-label={`density ${density}`}
                                    />
                                    <span class={x.box}>
                                        <span class={x.checkIcon} />
                                        <span class={x.indeterminateIcon} />
                                    </span>
                                </label>
                                <div class={t.root} style={{ width: "180px" }}>
                                    <div class={t.container}>
                                        <input
                                            class={t.input}
                                            id={`dense-${density}`}
                                            placeholder=" "
                                            value="Value"
                                        />
                                        <label
                                            class={t.label}
                                            for={`dense-${density}`}
                                        >
                                            Label
                                        </label>
                                    </div>
                                </div>
                                <div class={a.root} style={{ width: "180px" }}>
                                    <div class={a.container}>
                                        <textarea
                                            class={a.input}
                                            id={`dense-area-${density}`}
                                            placeholder=" "
                                            rows={2}
                                        />
                                        <label
                                            class={a.label}
                                            for={`dense-area-${density}`}
                                        >
                                            Notes
                                        </label>
                                    </div>
                                </div>
                                <div class={f.root} style={{ width: "180px" }}>
                                    <div class={f.container}>
                                        <input
                                            class={f.input}
                                            id={`dense-filled-${density}`}
                                            placeholder=" "
                                            value="Value"
                                        />
                                        <label
                                            class={f.label}
                                            for={`dense-filled-${density}`}
                                        >
                                            Label
                                        </label>
                                    </div>
                                </div>
                                <div
                                    class={l.root}
                                    tabindex="0"
                                    style={{ width: "200px" }}
                                >
                                    <span class={l.leading}>★</span>
                                    <div class={l.content}>
                                        <span class={l.headline}>
                                            List item
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                </For>
            </section>

            <section data-section="buttons" style={row}>
                <For each={FILLS}>
                    {(variant) => {
                        const b = button({ variant });
                        return (
                            <button class={b.root} type="button">
                                <span class={b.touchTarget} />
                                <Ripple />
                                <span class={b.label}>
                                    {variant.toUpperCase()}
                                </span>
                            </button>
                        );
                    }}
                </For>
                {(() => {
                    const b = button({ variant: "tonal" });
                    return (
                        <button class={b.root} type="button">
                            <span class={b.touchTarget} />
                            <Ripple />
                            <span class={b.label}>MENU</span>
                            <span class={b.secondaryIcon}>▾</span>
                        </button>
                    );
                })()}
                <button class={button().root} type="button" disabled>
                    <span class={button().touchTarget} />
                    <span class={button().label}>DISABLED</span>
                </button>
            </section>

            <section
                data-section="toolbars"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <For each={[undefined, "teal", "sharp"] as const}>
                    {(theme) => (
                        <div
                            data-panda-theme={theme}
                            style={{
                                display: "grid",
                                gap: "12px",
                                width: "280px",
                                "justify-items": "center",
                            }}
                        >
                            <For
                                each={
                                    [
                                        { placement: "floating" },
                                        {
                                            placement: "floating",
                                            color: "vibrant",
                                        },
                                        { placement: "docked" },
                                        {
                                            placement: "docked",
                                            color: "vibrant",
                                        },
                                    ] as const
                                }
                            >
                                {(variants) => (
                                    <div
                                        class={toolbar(variants).root}
                                        role="toolbar"
                                        aria-label={`${theme ?? "base"} ${variants.placement}`}
                                    >
                                        <For each={TOOLBAR_ICONS}>
                                            {([label, path, pressed]) => {
                                                const b = iconButton({
                                                    toggle:
                                                        pressed !== undefined,
                                                });
                                                return (
                                                    <button
                                                        class={b.root}
                                                        type="button"
                                                        aria-label={label}
                                                        aria-pressed={pressed}
                                                    >
                                                        <span
                                                            class={
                                                                b.touchTarget
                                                            }
                                                        />
                                                        <span
                                                            class={b.container}
                                                        >
                                                            <svg
                                                                class={b.icon}
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    fill="currentColor"
                                                                    d={path}
                                                                />
                                                            </svg>
                                                        </span>
                                                        <span
                                                            class={b.outline}
                                                        />
                                                    </button>
                                                );
                                            }}
                                        </For>
                                    </div>
                                )}
                            </For>
                            <div
                                class={
                                    toolbar({
                                        orientation: "vertical",
                                        color: "vibrant",
                                    }).root
                                }
                                role="toolbar"
                                aria-orientation="vertical"
                                aria-label={`${theme ?? "base"} vertical`}
                            >
                                <For each={TOOLBAR_ICONS.slice(0, 3)}>
                                    {([label, path]) => {
                                        const b = iconButton();
                                        return (
                                            <button
                                                class={b.root}
                                                type="button"
                                                aria-label={label}
                                            >
                                                <span class={b.touchTarget} />
                                                <span class={b.container}>
                                                    <svg
                                                        class={b.icon}
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            fill="currentColor"
                                                            d={path}
                                                        />
                                                    </svg>
                                                </span>
                                                <span class={b.outline} />
                                            </button>
                                        );
                                    }}
                                </For>
                            </div>
                        </div>
                    )}
                </For>
            </section>

            <section data-section="shapes">
                <div style={{ ...row, "max-width": "760px" }}>
                    <For each={Object.keys(MATERIAL_SHAPES) as MaterialShape[]}>
                        {(shape) => {
                            const b = iconButton({
                                variant: "tonal",
                                size: "compact",
                                shape,
                            });
                            return (
                                <button
                                    class={b.root}
                                    type="button"
                                    aria-label={shape}
                                    title={shape}
                                >
                                    <span class={b.touchTarget} />
                                    <span class={b.container}>
                                        <Ripple centered />
                                        <svg class={b.icon} viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                                            />
                                        </svg>
                                    </span>
                                </button>
                            );
                        }}
                    </For>
                </div>
                <div style={{ ...row, "align-items": "center" }}>
                    <For each={ICON_FILLS}>
                        {(variant) => {
                            const b = iconButton({
                                variant,
                                size: "compact",
                                shape: "cookie9Sided",
                            });
                            return (
                                <button
                                    class={b.root}
                                    type="button"
                                    aria-label={`${variant} cookie`}
                                >
                                    <span class={b.touchTarget} />
                                    <span class={b.container}>
                                        <Ripple centered />
                                        <svg class={b.icon} viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                                            />
                                        </svg>
                                    </span>
                                    <span class={b.outline} />
                                </button>
                            );
                        }}
                    </For>
                    <For each={["cookieToCircle", "squareToSunny"] as const}>
                        {(shape) => {
                            const b = iconButton({
                                variant: "filled",
                                size: "compact",
                                shape,
                            });
                            return (
                                <button
                                    class={b.root}
                                    type="button"
                                    aria-label={`${shape}, morphs on press`}
                                >
                                    <span class={b.touchTarget} />
                                    <span class={b.container}>
                                        <Ripple centered />
                                        <svg class={b.icon} viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                                            />
                                        </svg>
                                    </span>
                                </button>
                            );
                        }}
                    </For>
                    <For each={["default", "large"] as const}>
                        {(size) => {
                            const f = fab({
                                size,
                                shape:
                                    size === "large" ? "sunny" : "cookie4Sided",
                            });
                            return (
                                <button
                                    class={f.root}
                                    type="button"
                                    aria-label={`${size} shaped FAB`}
                                >
                                    <span class={f.touchTarget} />
                                    <span class={f.container}>
                                        <Ripple />
                                        <span class={f.icon}>+</span>
                                    </span>
                                </button>
                            );
                        }}
                    </For>
                </div>

                <div style={{ ...row, "align-items": "center" }}>
                    <For
                        each={
                            [
                                ["small", "none", "primary"],
                                ["medium", "circle", "secondary"],
                                ["medium", "cookie9Sided", "tertiary"],
                                ["large", "clover4Leaf", "success"],
                                ["large", "arch", "warning"],
                            ] as const
                        }
                    >
                        {([size, shape, color]) => (
                            <span
                                class={avatar({ size, shape, color })}
                                role="img"
                                aria-label="Ada Lovelace"
                            >
                                AL
                            </span>
                        )}
                    </For>
                    <img
                        class={avatar({ size: "large", shape: "sunny" })}
                        src={PORTRAIT}
                        alt="A landscape, cropped to fill the avatar"
                    />
                </div>
                <div style={{ ...row, "align-items": "flex-start" }}>
                    <For
                        each={
                            [
                                ["landscape", "none"],
                                ["square", "cookie9Sided"],
                                ["portrait", "arch"],
                            ] as const
                        }
                    >
                        {([aspect, shape]) => (
                            <img
                                class={media({ aspect, shape })}
                                style={{ width: "144px" }}
                                src={PORTRAIT}
                                alt=""
                            />
                        )}
                    </For>
                </div>
            </section>

            <section
                data-section="badges"
                style={{ ...row, "align-items": "center" }}
            >
                <span class={badge({ size: "small" })} />
                <span class={badge()}>3</span>
                <span class={badge()}>999+</span>
                <span style={{ position: "relative", display: "inline-flex" }}>
                    <span class={icon({ size: "medium" })}>M</span>
                    <span
                        class={badge({
                            size: "small",
                            placement: "anchored",
                        })}
                    />
                </span>
                <span style={{ position: "relative", display: "inline-flex" }}>
                    <span class={icon({ size: "medium" })}>M</span>
                    <span class={badge({ placement: "anchored" })}>3</span>
                </span>
            </section>

            <section data-section="icon-buttons" style={row}>
                <For each={ICON_FILLS}>
                    {(variant) => {
                        const b = iconButton({ variant });
                        return (
                            <button
                                class={b.root}
                                type="button"
                                aria-label={variant}
                            >
                                <span class={b.touchTarget} />
                                <span class={b.container}>
                                    <Ripple centered />
                                    <svg class={b.icon} viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                                        />
                                    </svg>
                                </span>
                                <span class={b.outline} />
                            </button>
                        );
                    }}
                </For>
                <button class={iconButton().root} type="button" disabled>
                    <span class={iconButton().touchTarget} />
                    <span class={iconButton().container}>
                        <svg class={iconButton().icon} viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                            />
                        </svg>
                    </span>
                    <span class={iconButton().outline} />
                </button>
            </section>

            <section data-section="button-groups" style={row}>
                <div
                    class={buttonGroup().root}
                    role="group"
                    aria-label="Standard"
                >
                    <For each={["Copy", "Paste", "Cut"]}>
                        {(label) => {
                            const b = button({
                                variant: "tonal",
                                position: "single",
                            });
                            return (
                                <button class={b.root} type="button">
                                    <span class={b.touchTarget} />
                                    <Ripple />
                                    <span class={b.label}>{label}</span>
                                </button>
                            );
                        }}
                    </For>
                </div>
                <div
                    class={buttonGroup({ connected: true }).root}
                    role="group"
                    aria-label="Connected"
                >
                    <For
                        each={
                            [
                                ["Day", "first", "false"],
                                ["Week", "middle", "true"],
                                ["Month", "last", "false"],
                            ] as const
                        }
                    >
                        {([label, position, pressed]) => {
                            const b = button({
                                variant: "outlined",
                                toggle: true,
                                position,
                            });
                            return (
                                <button
                                    class={b.root}
                                    type="button"
                                    aria-pressed={pressed}
                                >
                                    <span class={b.touchTarget} />
                                    <Ripple />
                                    <span class={b.label}>{label}</span>
                                </button>
                            );
                        }}
                    </For>
                </div>
                <div
                    class={
                        buttonGroup({ connected: true, size: "medium" }).root
                    }
                    role="group"
                    aria-label="Connected icons"
                >
                    <For each={["first", "middle", "last"] as const}>
                        {(position) => {
                            const b = iconButton({
                                variant: "filled",
                                size: "medium",
                                position,
                            });
                            return (
                                <button
                                    class={b.root}
                                    type="button"
                                    aria-label={position}
                                >
                                    <span class={b.touchTarget} />
                                    <span class={b.container}>
                                        <Ripple centered />
                                        <svg class={b.icon} viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                                            />
                                        </svg>
                                    </span>
                                    <span class={b.outline} />
                                </button>
                            );
                        }}
                    </For>
                </div>
            </section>

            <section data-section="disabled-buttons" style={row}>
                <For each={FILLS}>
                    {(variant) => {
                        const b = button({ variant });
                        return (
                            <button class={b.root} type="button">
                                <span class={b.touchTarget} />
                                <Ripple variant="ink-sparkle" />
                                <span class={b.label}>
                                    {`${variant} sparkle`.toUpperCase()}
                                </span>
                            </button>
                        );
                    }}
                </For>
            </section>

            <section
                data-section="lists"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <ul style={{ width: "320px", margin: 0, padding: 0 }}>
                    <li class={listItem().root}>
                        <span class={listItem().leading}>★</span>
                        <div class={listItem().content}>
                            <span class={listItem().headline}>One line</span>
                        </div>
                        <span class={listItem().trailingText}>100+</span>
                    </li>
                    <li
                        class={
                            listItem({ lines: "two", interactive: true }).root
                        }
                        tabindex="0"
                        aria-selected="true"
                    >
                        <span class={listItem().leading}>M</span>
                        <div class={listItem().content}>
                            <span class={listItem().headline}>
                                Selected, two lines
                            </span>
                            <span class={listItem().supportingText}>
                                Supporting text
                            </span>
                        </div>
                        <span class={listItem().trailing}>›</span>
                    </li>
                    <li
                        class={
                            listItem({ lines: "three", interactive: true }).root
                        }
                        tabindex="0"
                    >
                        <span class={listItem().leading}>☎</span>
                        <div class={listItem().content}>
                            <span class={listItem().overline}>Overline</span>
                            <span class={listItem().headline}>Three lines</span>
                            <span class={listItem().supportingText}>
                                Supporting text that runs long enough to wrap
                                onto a second line
                            </span>
                        </div>
                    </li>
                </ul>
                <div class={menu().root} role="menu" style={{ width: "220px" }}>
                    <button class={menu().item} role="menuitem" type="button">
                        <span class={menu().itemLeading}>✂</span>
                        <span class={menu().itemLabel}>Cut</span>
                        <span class={menu().itemTrailingText}>⌘X</span>
                    </button>
                    <button
                        class={menu().item}
                        role="menuitem"
                        type="button"
                        aria-selected="true"
                    >
                        <span class={menu().itemLeading}>⎘</span>
                        <span class={menu().itemLabel}>Copy</span>
                        <span class={menu().itemTrailingText}>⌘C</span>
                    </button>
                    <hr class={separator()} />
                    <button
                        class={menu().item}
                        role="menuitem"
                        type="button"
                        disabled
                    >
                        <span class={menu().itemLeading}>⎀</span>
                        <span class={menu().itemLabel}>Paste</span>
                        <span class={menu().itemTrailingText}>⌘V</span>
                    </button>
                </div>
                <ul
                    class={list({ variant: "segmented" }).root}
                    style={{ width: "320px" }}
                >
                    {(["first", "middle", "last"] as const).map(
                        (position, index) => (
                            <li class={list().item}>
                                <div
                                    class={
                                        listItem({
                                            lines: "two",
                                            leadingType: "avatar",
                                            position,
                                        }).root
                                    }
                                >
                                    <span class={listItem().leading}>
                                        {"ABC"[index]}
                                    </span>
                                    <div class={listItem().content}>
                                        <span class={listItem().headline}>
                                            Segmented, {position}
                                        </span>
                                        <span class={listItem().supportingText}>
                                            Avatar leading
                                        </span>
                                    </div>
                                </div>
                            </li>
                        ),
                    )}
                </ul>
                <div
                    class={grouped.root}
                    role="menu"
                    style={{ width: "240px" }}
                >
                    {[
                        { id: "edit", label: "Edit", items: ["Cut", "Copy"] },
                        { id: "view", label: "View", items: ["Grid"] },
                    ].map((group) => (
                        <div
                            class={grouped.itemGroup}
                            role="group"
                            aria-labelledby={`menu-group-${group.id}`}
                        >
                            <span
                                class={grouped.itemGroupLabel}
                                id={`menu-group-${group.id}`}
                            >
                                {group.label}
                            </span>
                            {group.items.map((label) => (
                                <button
                                    class={grouped.item}
                                    role={
                                        label === "Grid"
                                            ? "menuitemcheckbox"
                                            : "menuitem"
                                    }
                                    aria-checked={
                                        label === "Grid" ? "true" : undefined
                                    }
                                    type="button"
                                >
                                    <span class={grouped.itemContent}>
                                        <span class={grouped.itemLabel}>
                                            {label}
                                        </span>
                                        <span
                                            class={grouped.itemSupportingText}
                                        >
                                            Supporting text
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
                {(() => {
                    const d = dialog({ icon: true });
                    return (
                        <div
                            class={d.root}
                            role="dialog"
                            aria-labelledby="dialog-title"
                        >
                            <span class={d.icon}>⚠</span>
                            <h2 class={d.headline} id="dialog-title">
                                Discard draft?
                            </h2>
                            <p class={d.body} style={{ margin: 0 }}>
                                This removes the draft from your device. You
                                can't undo it.
                            </p>
                            <div class={d.actions}>
                                <button
                                    class={button({ variant: "text" }).root}
                                    type="button"
                                >
                                    <span class={button().label}>Cancel</span>
                                </button>
                                <button
                                    class={button({ variant: "text" }).root}
                                    type="button"
                                >
                                    <span class={button().label}>Discard</span>
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </section>
            <section
                data-section="tabs"
                style={{ display: "grid", gap: "16px", width: "480px" }}
            >
                <For
                    each={
                        [
                            { variant: "primary", icon: true },
                            {
                                variant: "primary",
                                icon: true,
                                inlineIcon: true,
                            },
                            { variant: "primary", icon: false },
                            { variant: "secondary", icon: true },
                        ] as const
                    }
                >
                    {(options) => {
                        const [current, setCurrent] = createSignal(0);
                        const t = tabs(options);
                        return (
                            <div class={t.root} role="tablist">
                                <For each={["Flights", "Trips", "Explore"]}>
                                    {(label, i) => (
                                        <button
                                            class={t.tab}
                                            role="tab"
                                            type="button"
                                            aria-selected={
                                                current() === i()
                                                    ? "true"
                                                    : "false"
                                            }
                                            onClick={() => setCurrent(i())}
                                        >
                                            <span class={t.tabContent}>
                                                {options.icon && (
                                                    <span class={t.icon}>
                                                        ★
                                                    </span>
                                                )}
                                                <span class={t.label}>
                                                    {label}
                                                </span>
                                                <span class={t.indicator} />
                                            </span>
                                        </button>
                                    )}
                                </For>
                            </div>
                        );
                    }}
                </For>
            </section>
            <section
                data-section="row-colors"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <For each={["error", "success", "tertiary"] as const}>
                    {(color) => {
                        const l = listItem({ color, interactive: true });
                        const m = menu({ color });
                        const t = tabs({ color });
                        const s = tabs({ color, variant: "secondary" });
                        return (
                            <div
                                style={{
                                    display: "grid",
                                    gap: "8px",
                                    width: "240px",
                                }}
                            >
                                <div
                                    class={l.root}
                                    tabindex="0"
                                    aria-selected="true"
                                    id={`list-${color}`}
                                >
                                    <span class={l.leading}>★</span>
                                    <div class={l.content}>
                                        <span class={l.headline}>{color}</span>
                                        <span class={l.supportingText}>
                                            Selected
                                        </span>
                                    </div>
                                </div>
                                <div class={m.root} role="menu">
                                    <button
                                        class={m.item}
                                        role="menuitem"
                                        type="button"
                                        aria-selected="true"
                                        id={`menu-${color}`}
                                    >
                                        <span class={m.itemLeading}>✓</span>
                                        <span class={m.itemLabel}>{color}</span>
                                    </button>
                                </div>
                                <For each={[t, s]}>
                                    {(x) => (
                                        <div class={x.root} role="tablist">
                                            <button
                                                class={x.tab}
                                                role="tab"
                                                type="button"
                                                aria-selected="true"
                                            >
                                                <span class={x.tabContent}>
                                                    <span class={x.label}>
                                                        On
                                                    </span>
                                                    <span class={x.indicator} />
                                                </span>
                                            </button>
                                            <button
                                                class={x.tab}
                                                role="tab"
                                                type="button"
                                                aria-selected="false"
                                            >
                                                <span class={x.tabContent}>
                                                    <span class={x.label}>
                                                        Off
                                                    </span>
                                                    <span class={x.indicator} />
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </For>
                            </div>
                        );
                    }}
                </For>
            </section>
            <section
                data-section="toasts"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <For each={[undefined, "teal"] as const}>
                    {(theme) => (
                        <div
                            data-panda-theme={theme}
                            style={{
                                display: "grid",
                                gap: "8px",
                                "align-content": "start",
                            }}
                        >
                            <For each={TOAST_TYPES}>
                                {(type) => {
                                    const t = toast({ type });
                                    return (
                                        <div class={t.group}>
                                            <div
                                                class={t.root}
                                                role="status"
                                                data-type={type}
                                            >
                                                <span
                                                    class={t.icon}
                                                    aria-hidden="true"
                                                >
                                                    {TOAST_ICONS[type]}
                                                </span>
                                                <div class={t.title}>
                                                    {`${theme ?? "base"} ${type}`}
                                                </div>
                                                <div class={t.description}>
                                                    Your changes are saved.
                                                </div>
                                                {type === "info" ? (
                                                    <button
                                                        class={t.actionTrigger}
                                                        type="button"
                                                    >
                                                        Undo
                                                    </button>
                                                ) : null}
                                                <button
                                                    class={t.closeTrigger}
                                                    type="button"
                                                    aria-label="Dismiss"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }}
                            </For>
                        </div>
                    )}
                </For>
            </section>
            <section
                data-section="search-and-feedback"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <label class={searchBar().root} style={{ width: "320px" }}>
                    <span class={searchBar().leading}>⌕</span>
                    <input
                        class={searchBar().input}
                        type="search"
                        placeholder="Search messages"
                    />
                    <span class={searchBar().trailing}>⋮</span>
                </label>
                <div
                    class={snackbar().root}
                    role="status"
                    style={{ width: "360px" }}
                >
                    <span class={snackbar().supportingText}>
                        Message archived
                    </span>
                    <button class={snackbar().action} type="button">
                        Undo
                    </button>
                    <button
                        class={snackbar().close}
                        type="button"
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
                <div class={tooltip().root} role="tooltip">
                    <span class={tooltip().supportingText}>Save to drafts</span>
                </div>
                <div class={richTooltip().root} role="tooltip">
                    <span class={richTooltip().subhead}>Drafts</span>
                    <span class={richTooltip().supportingText}>
                        Drafts stay on this device until you send them.
                    </span>
                    <div class={richTooltip().actions}>
                        <button
                            class={button({ variant: "text" }).root}
                            type="button"
                        >
                            <span class={button().label}>Learn more</span>
                        </button>
                    </div>
                </div>
            </section>
            <section
                data-section="select"
                style={{
                    ...row,
                    "align-items": "flex-start",
                    "min-height": "220px",
                }}
            >
                <For each={["filled", "outlined"] as const}>
                    {(variant) => {
                        const [open, setOpen] = createSignal(false);
                        const [choice, setChoice] = createSignal("Medium");
                        const s = select({ variant });
                        const m = menu();
                        const id = `select-${variant}`;
                        return (
                            <div
                                style={{ position: "relative", width: "220px" }}
                            >
                                <div class={s.root}>
                                    <div class={s.container}>
                                        <input
                                            class={s.input}
                                            id={id}
                                            role="combobox"
                                            aria-expanded={
                                                open() ? "true" : "false"
                                            }
                                            aria-controls={`${id}-menu`}
                                            readonly
                                            placeholder=" "
                                            value={choice()}
                                            onClick={() => setOpen(!open())}
                                        />
                                        <label class={s.label} for={id}>
                                            {`${variant} select`}
                                        </label>
                                        <span class={s.trailingIcon}>▾</span>
                                    </div>
                                </div>
                                {open() && (
                                    <div
                                        class={m.root}
                                        role="listbox"
                                        id={`${id}-menu`}
                                        style={{
                                            position: "absolute",
                                            "z-index": "1",
                                            width: "100%",
                                        }}
                                    >
                                        <For
                                            each={["Small", "Medium", "Large"]}
                                        >
                                            {(option) => (
                                                <button
                                                    class={m.item}
                                                    role="option"
                                                    type="button"
                                                    aria-selected={
                                                        choice() === option
                                                            ? "true"
                                                            : "false"
                                                    }
                                                    onClick={() => {
                                                        setChoice(option);
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <span class={m.itemLabel}>
                                                        {option}
                                                    </span>
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                )}
                            </div>
                        );
                    }}
                </For>
            </section>
            <section
                data-section="search-and-autocomplete"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <label
                    class={searchBar({ scrolled: true }).root}
                    style={{ width: "320px" }}
                >
                    <span class={searchBar().leading}>⌕</span>
                    <input
                        class={searchBar().input}
                        type="search"
                        placeholder="Scrolled search bar"
                    />
                </label>
                <For each={["docked", "contained"] as const}>
                    {(variant) => {
                        const v = searchView({ variant });
                        const m = menu();
                        return (
                            <div
                                style={{
                                    position: "relative",
                                    width: "360px",
                                    height: "300px",
                                }}
                            >
                                <div
                                    class={v.root}
                                    role="dialog"
                                    aria-label={`${variant} search view`}
                                >
                                    <div class={v.header}>
                                        <span class={v.leading} data-pf-mirror>
                                            ←
                                        </span>
                                        <input
                                            class={v.input}
                                            role="combobox"
                                            aria-expanded="true"
                                            aria-label={`${variant} search`}
                                            value="In"
                                        />
                                        <span class={v.trailing}>×</span>
                                    </div>
                                    <div
                                        class={v.divider}
                                        role="presentation"
                                    />
                                    <div class={v.content} role="listbox">
                                        <For each={["Inbox", "Invoices"]}>
                                            {(label) => (
                                                <div
                                                    class={m.item}
                                                    role="option"
                                                    aria-selected="false"
                                                >
                                                    <span class={m.itemLeading}>
                                                        ⌕
                                                    </span>
                                                    <span class={m.itemLabel}>
                                                        {label}
                                                    </span>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                </For>
                <For each={["filled", "outlined"] as const}>
                    {(variant) => {
                        const a = autocomplete({ variant });
                        const m = menu();
                        const id = `autocomplete-${variant}`;
                        return (
                            <div
                                style={{
                                    position: "relative",
                                    width: "220px",
                                    "min-height": "200px",
                                }}
                            >
                                <div class={a.root}>
                                    <div class={a.container}>
                                        <input
                                            class={a.input}
                                            id={id}
                                            role="combobox"
                                            aria-expanded="true"
                                            aria-autocomplete="list"
                                            aria-controls={`${id}-list`}
                                            placeholder=" "
                                            value="Pa"
                                        />
                                        <label class={a.label} for={id}>
                                            {`${variant} autocomplete`}
                                        </label>
                                        <span class={a.trailingIcon}>▾</span>
                                    </div>
                                </div>
                                <div
                                    class={m.root}
                                    role="listbox"
                                    id={`${id}-list`}
                                    style={{
                                        position: "absolute",
                                        "z-index": "1",
                                        width: "100%",
                                    }}
                                >
                                    <For each={["Paris", "Panama"]}>
                                        {(option) => (
                                            <div
                                                class={m.item}
                                                role="option"
                                                aria-selected="false"
                                            >
                                                <span class={m.itemLabel}>
                                                    {option}
                                                </span>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                        );
                    }}
                </For>
            </section>
            <section
                data-section="progress"
                style={{ display: "grid", gap: "16px", width: "480px" }}
            >
                {(() => {
                    const [value, setValue] = createSignal(40);
                    const s = slider();
                    const p = linearProgress();
                    return (
                        <>
                            <div
                                class={s.root}
                                style={{
                                    "--pf-components-slider-value": `${value()}`,
                                    "--pf-components-slider-activeEnd": `${value()}`,
                                }}
                            >
                                <span class={s.track} />
                                <span class={s.activeTrack} />
                                <span class={s.stateLayer} />
                                <span class={s.handle} />
                                <input
                                    class={s.input}
                                    type="range"
                                    id="slider"
                                    aria-label="Progress"
                                    value={value()}
                                    onInput={(e) =>
                                        setValue(Number(e.currentTarget.value))
                                    }
                                />
                            </div>
                            <div
                                class={p.root}
                                role="progressbar"
                                aria-valuenow={value()}
                                aria-label="Determinate progress"
                                style={{
                                    "--pf-components-linearProgress-value": `${value()}`,
                                }}
                            >
                                <div class={p.track} />
                                <div class={p.indicator} />
                                <div class={p.stopIndicator} />
                            </div>
                            <div
                                class={
                                    linearProgress({
                                        indeterminate: true,
                                        color: "tertiary",
                                    }).root
                                }
                                role="progressbar"
                                aria-label="Loading"
                            >
                                <div
                                    class={
                                        linearProgress({
                                            indeterminate: true,
                                            color: "tertiary",
                                        }).track
                                    }
                                />
                                <div
                                    class={
                                        linearProgress({
                                            indeterminate: true,
                                            color: "tertiary",
                                        }).indicator
                                    }
                                />
                            </div>
                            <div style={row}>
                                {(() => {
                                    const c = circularProgress();
                                    return (
                                        <div
                                            class={c.root}
                                            role="progressbar"
                                            id="circular"
                                            aria-valuenow={value()}
                                            aria-label="Determinate progress"
                                            style={{
                                                "--pf-components-circularProgress-value": `${value()}`,
                                            }}
                                        >
                                            <span class={c.track}>
                                                <span class={c.trackEndHalf}>
                                                    <span
                                                        class={c.trackEndArc}
                                                    />
                                                </span>
                                                <span class={c.trackStartHalf}>
                                                    <span
                                                        class={c.trackStartArc}
                                                    />
                                                </span>
                                            </span>
                                            <span class={c.endHalf}>
                                                <span class={c.endArc} />
                                            </span>
                                            <span class={c.startHalf}>
                                                <span class={c.startArc} />
                                            </span>
                                        </div>
                                    );
                                })()}
                                <div
                                    class={
                                        circularProgress({
                                            indeterminate: true,
                                        }).root
                                    }
                                    role="progressbar"
                                    aria-label="Loading"
                                />
                                <div
                                    class={
                                        circularProgress({
                                            indeterminate: true,
                                            color: "success",
                                        }).root
                                    }
                                    role="progressbar"
                                    aria-label="Loading"
                                />
                                <div
                                    class={slider({ color: "error" }).root}
                                    style={{
                                        width: "200px",
                                        "--pf-components-slider-value": "70",
                                        "--pf-components-slider-activeEnd":
                                            "70",
                                    }}
                                >
                                    <span
                                        class={slider({ color: "error" }).track}
                                    />
                                    <span
                                        class={
                                            slider({ color: "error" })
                                                .activeTrack
                                        }
                                    />
                                    <span
                                        class={
                                            slider({ color: "error" })
                                                .stateLayer
                                        }
                                    />
                                    <span
                                        class={
                                            slider({ color: "error" }).handle
                                        }
                                    />
                                    <input
                                        class={slider({ color: "error" }).input}
                                        type="range"
                                        value={70}
                                        aria-label="Fixed"
                                        disabled
                                    />
                                </div>
                            </div>
                            {/* M3 Expressive's slider configurations (c1g): a range, a
                                centered slider, stops, the value indicator, and a vertical
                                slider, drawn from their placing tokens. */}
                            <div
                                data-slider-samples
                                style={{
                                    display: "flex",
                                    gap: "16px",
                                    "align-items": "center",
                                    "padding-block": "56px 8px",
                                }}
                            >
                                {(
                                    [
                                        [
                                            {},
                                            {
                                                value: 60,
                                                activeStart: 20,
                                                activeEnd: 60,
                                                startGap: 1,
                                                endGap: 1,
                                            },
                                            [20, 60],
                                            [],
                                        ],
                                        [
                                            {},
                                            {
                                                value: 30,
                                                activeStart: 30,
                                                activeEnd: 50,
                                                startGap: 1,
                                                endGap: 0,
                                            },
                                            [30],
                                            [],
                                        ],
                                        [
                                            {},
                                            {
                                                value: 50,
                                                activeStart: 0,
                                                activeEnd: 50,
                                                startGap: 0,
                                                endGap: 1,
                                            },
                                            [50],
                                            [0, 25, 50, 75, 100],
                                        ],
                                        [
                                            { orientation: "vertical" },
                                            {
                                                value: 40,
                                                activeStart: 0,
                                                activeEnd: 40,
                                                startGap: 0,
                                                endGap: 1,
                                            },
                                            [40],
                                            [],
                                        ],
                                    ] as const
                                ).map(
                                    (
                                        [variants, tokens, thumbs, stops],
                                        sample,
                                    ) => {
                                        const s = slider(variants);
                                        const vars = (
                                            t: Record<string, number>,
                                        ) =>
                                            Object.fromEntries(
                                                Object.entries(t).map(
                                                    ([k, v]) => [
                                                        `--pf-components-slider-${k}`,
                                                        String(v),
                                                    ],
                                                ),
                                            );
                                        const vertical =
                                            "orientation" in variants;
                                        return (
                                            <div
                                                class={s.root}
                                                style={{
                                                    width: vertical
                                                        ? undefined
                                                        : "96px",
                                                    height: vertical
                                                        ? "120px"
                                                        : undefined,
                                                    ...vars(tokens),
                                                }}
                                            >
                                                <span class={s.startTrack} />
                                                <span class={s.track} />
                                                <span class={s.activeTrack} />
                                                <div class={s.markerGroup}>
                                                    {stops.map((stop) => (
                                                        <span
                                                            class={s.marker}
                                                            style={vars({
                                                                value: stop,
                                                                stopActive:
                                                                    stop <= 50
                                                                        ? 1
                                                                        : 0,
                                                            })}
                                                        />
                                                    ))}
                                                </div>
                                                {thumbs.map((thumb) => (
                                                    <>
                                                        <div
                                                            class={s.handle}
                                                            style={vars({
                                                                value: thumb,
                                                            })}
                                                        />
                                                        {sample === 2 && (
                                                            <span
                                                                class={
                                                                    s.valueIndicator
                                                                }
                                                                style={vars({
                                                                    value: thumb,
                                                                })}
                                                            >
                                                                {thumb}
                                                            </span>
                                                        )}
                                                    </>
                                                ))}
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        </>
                    );
                })()}
            </section>
            {/* M3 Expressive's loading indicator (c4a), uncontained and contained, in the base
                and a named theme, and the wavy progress indicators beside the flat track. */}
            <section
                data-section="loading-and-wavy"
                style={{ display: "grid", gap: "16px", width: "480px" }}
            >
                <For each={[undefined, "teal"] as const}>
                    {(theme) => (
                        <div data-panda-theme={theme} style={row}>
                            <For
                                each={
                                    [
                                        {},
                                        { variant: "contained" },
                                        { color: "tertiary" },
                                        {
                                            variant: "contained",
                                            color: "error",
                                        },
                                    ] as const
                                }
                            >
                                {(selection) => {
                                    const l = loadingIndicator(selection);
                                    return (
                                        <div
                                            class={l.root}
                                            role="progressbar"
                                            aria-label="Loading"
                                        >
                                            <span class={l.container}>
                                                <span class={l.indicator} />
                                            </span>
                                        </div>
                                    );
                                }}
                            </For>
                        </div>
                    )}
                </For>
                <For
                    each={
                        [
                            { value: 40 },
                            { value: 70, thickness: "thick" },
                            { value: 100 },
                        ] as const
                    }
                >
                    {({ value, ...selection }) => {
                        const p = linearProgress({
                            shape: "wavy",
                            ...selection,
                        });
                        return (
                            <div
                                class={p.root}
                                role="progressbar"
                                aria-valuenow={value}
                                aria-label="Wavy progress"
                                style={{
                                    "--pf-components-linearProgress-value": `${value}`,
                                }}
                            >
                                <div class={p.track} />
                                <div class={p.indicator} />
                                <div class={p.stopIndicator} />
                            </div>
                        );
                    }}
                </For>
                <div style={row}>
                    <For
                        each={
                            [
                                { value: 30 },
                                { value: 65 },
                                { value: 80, thickness: "thick" },
                                { value: 65, color: "secondary" },
                            ] as const
                        }
                    >
                        {({ value, ...selection }) => {
                            const c = circularProgress({
                                shape: "wavy",
                                ...selection,
                            });
                            return (
                                <div
                                    class={c.root}
                                    role="progressbar"
                                    aria-valuenow={value}
                                    aria-label="Wavy progress"
                                    style={{
                                        "--pf-components-circularProgress-value": `${value}`,
                                    }}
                                >
                                    <span class={c.track}>
                                        <span class={c.trackEndHalf}>
                                            <span class={c.trackEndArc} />
                                        </span>
                                        <span class={c.trackStartHalf}>
                                            <span class={c.trackStartArc} />
                                        </span>
                                    </span>
                                    <span class={c.endHalf}>
                                        <span class={c.endArc} />
                                    </span>
                                    <span class={c.startHalf}>
                                        <span class={c.startArc} />
                                    </span>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </section>
            <section
                data-section="navigation"
                style={{ ...row, "align-items": "flex-start" }}
            >
                {(() => {
                    const [current, setCurrent] = createSignal(0);
                    const destinations = ["Home", "Search", "Inbox", "Profile"];
                    const glyphs = ["⌂", "⌕", "✉", "☺"];
                    const nav = (
                        recipe: typeof navigationBar,
                        selection: Parameters<typeof navigationBar>[0] = {},
                    ) => {
                        const n = recipe(selection);
                        return (
                            <nav class={n.root}>
                                <For each={destinations}>
                                    {(label, i) => (
                                        <button
                                            class={n.item}
                                            type="button"
                                            aria-current={
                                                current() === i()
                                                    ? "page"
                                                    : "false"
                                            }
                                            onClick={() => setCurrent(i())}
                                        >
                                            <span class={n.indicator}>
                                                <span
                                                    class={n.activeIndicator}
                                                />
                                                <span class={n.icon}>
                                                    {glyphs[i()]}
                                                </span>
                                            </span>
                                            <span class={n.label}>{label}</span>
                                        </button>
                                    )}
                                </For>
                            </nav>
                        );
                    };
                    return (
                        <>
                            <div style={{ width: "400px" }}>
                                {nav(navigationBar)}
                            </div>
                            {nav(
                                navigationRail as unknown as typeof navigationBar,
                            )}
                            <div style={{ width: "600px" }}>
                                {nav(navigationBar, {
                                    itemLayout: "horizontal",
                                })}
                            </div>
                            {nav(
                                navigationRail as unknown as typeof navigationBar,
                                {
                                    expanded: "true",
                                } as Parameters<typeof navigationBar>[0],
                            )}
                        </>
                    );
                })()}
            </section>
            <section data-section="cards" style={row}>
                <For each={CARD_FILLS}>
                    {(variant) => (
                        <div class={card({ variant }).root}>{variant} card</div>
                    )}
                </For>
                <div
                    class={
                        card({ variant: "elevated", interactive: true }).root
                    }
                    role="button"
                    tabindex={0}
                >
                    <Ripple />
                    interactive card
                </div>
            </section>

            <section
                data-section="scrim"
                style={{
                    position: "relative",
                    width: "240px",
                    height: "120px",
                }}
            >
                <div class={card({ variant: "filled" }).root}>
                    content under a scrim
                </div>
                <div class={scrim().root} />
            </section>

            <section
                data-section="fullscreen-dialog"
                style={{
                    display: "flex",
                    width: "480px",
                    height: "280px",
                    outline: "1px solid currentColor",
                }}
            >
                {(() => {
                    const d = fullscreenDialog();
                    const b = iconButton({ variant: "standard" });
                    return (
                        <div
                            class={d.root}
                            role="dialog"
                            aria-labelledby="fullscreen-dialog-title"
                        >
                            <div class={d.header}>
                                <button
                                    class={`${d.closeTrigger} ${b.root}`}
                                    type="button"
                                    aria-label="Close"
                                >
                                    <span class={b.touchTarget} />
                                    <span class={b.container}>
                                        <Ripple centered />
                                        <svg class={b.icon} viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                                            />
                                        </svg>
                                    </span>
                                </button>
                                <h2
                                    class={d.headline}
                                    id="fullscreen-dialog-title"
                                    style={{ margin: 0 }}
                                >
                                    New event
                                </h2>
                                <button
                                    class={`${d.confirmAction} ${button({ variant: "text" }).root}`}
                                    type="button"
                                >
                                    <span class={button().label}>Save</span>
                                </button>
                            </div>
                            <div class={d.body}>
                                Fill in the details. The body scrolls when it is
                                taller than the screen, under a header that
                                stays put.
                            </div>
                        </div>
                    );
                })()}
            </section>

            <section
                data-section="sheets"
                style={{
                    display: "flex",
                    "align-items": "stretch",
                    gap: "16px",
                    height: "300px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        "flex-direction": "column",
                        "justify-content": "flex-end",
                        width: "360px",
                        outline: "1px solid currentColor",
                    }}
                >
                    {(() => {
                        const s = bottomSheet();
                        const h = dragHandle();
                        return (
                            <div
                                class={s.root}
                                role="dialog"
                                aria-label="Share"
                            >
                                <button
                                    class={`${s.dragHandle} ${h.root}`}
                                    type="button"
                                    aria-label="Close sheet"
                                >
                                    <span class={h.handle} />
                                </button>
                                <div class={s.content}>
                                    Share this photo with people nearby, or copy
                                    a link to it.
                                </div>
                            </div>
                        );
                    })()}
                </div>
                <div
                    style={{
                        display: "flex",
                        "justify-content": "flex-end",
                        width: "420px",
                        outline: "1px solid currentColor",
                    }}
                >
                    {(() => {
                        const s = sideSheet();
                        const b = iconButton({ variant: "standard" });
                        return (
                            <div
                                class={s.root}
                                role="dialog"
                                aria-labelledby="side-sheet-title"
                                style={{ width: "300px" }}
                            >
                                <div class={s.header}>
                                    <button
                                        class={`${s.backButton} ${b.root}`}
                                        type="button"
                                        aria-label="Back"
                                    >
                                        <span class={b.touchTarget} />
                                        <span class={b.container}>
                                            <svg
                                                class={b.icon}
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    fill="currentColor"
                                                    d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                                                />
                                            </svg>
                                        </span>
                                    </button>
                                    <h2
                                        class={s.headline}
                                        id="side-sheet-title"
                                    >
                                        Filters
                                    </h2>
                                    <button
                                        class={`${s.closeTrigger} ${b.root}`}
                                        type="button"
                                        aria-label="Close"
                                    >
                                        <span class={b.touchTarget} />
                                        <span class={b.container}>
                                            <svg
                                                class={b.icon}
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    fill="currentColor"
                                                    d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                                                />
                                            </svg>
                                        </span>
                                    </button>
                                </div>
                                <div class={s.content}>
                                    Narrow the results by date, size and kind.
                                </div>
                                <div class={s.actions}>
                                    <button
                                        class={
                                            button({ variant: "filled" }).root
                                        }
                                        type="button"
                                    >
                                        <span class={button().label}>Save</span>
                                    </button>
                                    <button
                                        class={
                                            button({ variant: "outlined" }).root
                                        }
                                        type="button"
                                    >
                                        <span class={button().label}>
                                            Cancel
                                        </span>
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
                <div
                    style={{
                        display: "flex",
                        "align-items": "center",
                        outline: "1px solid currentColor",
                    }}
                >
                    {(() => {
                        const h = dragHandle({ orientation: "vertical" });
                        return (
                            <button
                                class={h.root}
                                type="button"
                                aria-label="Resize panes"
                            >
                                <span class={h.handle} />
                            </button>
                        );
                    })()}
                </div>
            </section>

            <section
                data-section="carousels"
                style={{ display: "grid", gap: "16px", width: "360px" }}
            >
                <For each={["teal", "sharp", undefined] as const}>
                    {(theme) => (
                        <For each={CAROUSELS}>
                            {({ layout, masks }) => {
                                const c = carousel({ layout });
                                return (
                                    <div
                                        class={c.root}
                                        data-panda-theme={theme}
                                        role="region"
                                        aria-label={`${theme ?? "base"} ${layout}`}
                                        style={{ height: "96px" }}
                                    >
                                        <div
                                            class={c.itemGroup}
                                            style={{
                                                height: "96px",
                                                overflow: "hidden",
                                            }}
                                        >
                                            <For each={masks}>
                                                {([slot, mask, offset]) => (
                                                    <div
                                                        class={c.item}
                                                        style={{
                                                            width: `${slot}px`,
                                                        }}
                                                    >
                                                        <div
                                                            class={c.mask}
                                                            style={{
                                                                width: `${mask}px`,
                                                                "margin-inline-start": `${offset}px`,
                                                            }}
                                                        >
                                                            <img
                                                                class={
                                                                    c.content
                                                                }
                                                                style={{
                                                                    width: `${slot}px`,
                                                                    "object-fit":
                                                                        "cover",
                                                                }}
                                                                src={PORTRAIT}
                                                                alt=""
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </For>
                                        </div>
                                    </div>
                                );
                            }}
                        </For>
                    )}
                </For>
            </section>
            <section
                data-section="steppers"
                style={{ display: "grid", gap: "24px", width: "640px" }}
            >
                <For
                    each={
                        [
                            { theme: undefined, orientation: "horizontal" },
                            { theme: "teal", orientation: "horizontal" },
                            { theme: "sharp", orientation: "horizontal" },
                            { theme: undefined, orientation: "vertical" },
                        ] as const
                    }
                >
                    {({ theme, orientation }) => {
                        const s = stepper({ orientation });
                        const vertical = orientation === "vertical";
                        // A done step, the current one, one in error, and one still to come.
                        const steps = [
                            { label: "Address", state: "done" },
                            {
                                label: "Payment",
                                caption: "Optional",
                                state: "current",
                            },
                            { label: "Review", state: "error" },
                            { label: "Confirm", state: "todo" },
                        ] as const;
                        return (
                            <div
                                class={s.root}
                                data-panda-theme={theme}
                                style={{ padding: "8px" }}
                            >
                                <div
                                    class={s.list}
                                    role={vertical ? "list" : "tablist"}
                                    aria-label={`${theme ?? "base"} ${orientation}`}
                                >
                                    <For each={steps}>
                                        {(step, i) => (
                                            <div
                                                class={s.item}
                                                role={
                                                    vertical
                                                        ? "listitem"
                                                        : "presentation"
                                                }
                                            >
                                                <button
                                                    class={s.trigger}
                                                    type="button"
                                                    role={
                                                        vertical
                                                            ? undefined
                                                            : "tab"
                                                    }
                                                    aria-selected={
                                                        vertical
                                                            ? undefined
                                                            : step.state ===
                                                                "current"
                                                              ? "true"
                                                              : "false"
                                                    }
                                                    aria-current={
                                                        vertical &&
                                                        step.state === "current"
                                                            ? "step"
                                                            : undefined
                                                    }
                                                    aria-invalid={
                                                        step.state === "error"
                                                            ? "true"
                                                            : undefined
                                                    }
                                                >
                                                    <span
                                                        class={s.indicator}
                                                        aria-checked={
                                                            step.state ===
                                                            "done"
                                                                ? "true"
                                                                : undefined
                                                        }
                                                    >
                                                        {step.state === "done"
                                                            ? "✓"
                                                            : step.state ===
                                                                "error"
                                                              ? "!"
                                                              : i() + 1}
                                                    </span>
                                                    <span class={s.label}>
                                                        {step.label}
                                                    </span>
                                                    {"caption" in step && (
                                                        <span class={s.caption}>
                                                            {step.caption}
                                                        </span>
                                                    )}
                                                </button>
                                                {i() < steps.length - 1 && (
                                                    <div class={s.separator} />
                                                )}
                                                {vertical &&
                                                    step.state ===
                                                        "current" && (
                                                        <div class={s.content}>
                                                            Payment details
                                                        </div>
                                                    )}
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                        );
                    }}
                </For>
            </section>
            <section
                data-section="media"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <article
                    class={card({ variant: "elevated" }).root}
                    style={{ width: "240px", display: "grid", gap: "12px" }}
                >
                    <img
                        class={media({ aspect: "landscape" })}
                        src={PORTRAIT}
                        alt=""
                    />
                    <h3 class={text({ style: "titleMedium" })}>
                        Hills at dusk
                    </h3>
                    <p class={text({ style: "bodyMedium" })}>
                        The card stays rectangular; the media takes its corners.
                    </p>
                </article>
                <article
                    class={card({ variant: "outlined" }).root}
                    style={{
                        width: "320px",
                        display: "flex",
                        gap: "16px",
                        "align-items": "center",
                    }}
                >
                    <img
                        class={media({
                            aspect: "square",
                            shape: "cookie9Sided",
                        })}
                        style={{ width: "96px" }}
                        src={PORTRAIT}
                        alt="Album art"
                    />
                    <div>
                        <h3 class={text({ style: "titleMedium" })}>Album</h3>
                        <p class={text({ style: "bodyMedium" })}>
                            Shaped artwork, unclipped text.
                        </p>
                    </div>
                </article>
            </section>
            <section
                data-section="app-bars"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <For each={APP_BARS}>
                    {(example) => <AppBarExampleView example={example} />}
                </For>
            </section>
            <DatePickerSection />
            <section
                data-section="time-pickers"
                style={{ ...row, "align-items": "flex-start" }}
            >
                <For each={TIME_PICKERS}>
                    {(example) => <TimePickerExampleView example={example} />}
                </For>
                <TimeInputExampleView />
            </section>
        </main>
    );
}
