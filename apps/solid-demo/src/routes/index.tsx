import {
    button,
    card,
    checkbox,
    chip,
    circularProgress,
    linearProgress,
    navigationBar,
    navigationRail,
    searchBar,
    select,
    slider,
    snackbar,
    tooltip,
    dialog,
    listItem,
    menu,
    tabs,
    separator,
    fab,
    icon,
    iconButton,
    radio,
    scrim,
    supportingText,
    switchControl,
    text,
    textArea,
    textField,
} from "$recipes";
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";

import { Ripple } from "../lib/ripple";

export const Route = createFileRoute("/")({
    component: IndexRoute,
});

const FILLS = ["filled", "tonal", "outlined", "text", "elevated"] as const;
const ICON_FILLS = [
    "filled",
    "tonal",
    "outlined",
    "standard",
    "elevated",
] as const;
const CARD_FILLS = ["elevated", "filled", "outlined"] as const;

const row = { display: "flex", gap: "16px", "flex-wrap": "wrap" } as const;

// Named themes from panda.pureform.ts, each applied to a subtree by `data-panda-theme`.
const THEMES = [undefined, "teal", "sharp", "dense"] as const;

function IndexRoute() {
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
                <For each={["small", "medium", "large"] as const}>
                    {(size) => {
                        const f = fab({ size });
                        return (
                            <button
                                class={f.root}
                                type="button"
                                aria-label={`${size} FAB`}
                            >
                                <span class={f.touchTarget} />
                                <Ripple />
                                <span class={f.icon}>+</span>
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
                                <Ripple />
                                <span class={f.label}>
                                    {`${variant} FAB`.toUpperCase()}
                                </span>
                            </button>
                        );
                    }}
                </For>
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
                                            data-selected={
                                                selected() ? "" : undefined
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
                <button class={button().root} type="button" disabled>
                    <span class={button().touchTarget} />
                    <span class={button().label}>DISABLED</span>
                </button>
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
                                <Ripple centered />
                                <svg class={b.icon} viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                                    />
                                </svg>
                            </button>
                        );
                    }}
                </For>
                <button class={iconButton().root} type="button" disabled>
                    <span class={iconButton().touchTarget} />
                    <svg class={iconButton().icon} viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                        />
                    </svg>
                </button>
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
                        <span class={listItem().leading}>✉</span>
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
                                            {options.icon && (
                                                <span class={t.icon}>★</span>
                                            )}
                                            <span class={t.label}>{label}</span>
                                            <span class={t.indicator} />
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
                                                <span class={x.label}>On</span>
                                                <span class={x.indicator} />
                                            </button>
                                            <button
                                                class={x.tab}
                                                role="tab"
                                                type="button"
                                                aria-selected="false"
                                            >
                                                <span class={x.label}>Off</span>
                                                <span class={x.indicator} />
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
                    Save to drafts
                </div>
                <div class={tooltip({ variant: "rich" }).root} role="tooltip">
                    <span class={tooltip().subhead}>Drafts</span>
                    <span class={tooltip().supportingText}>
                        Drafts stay on this device until you send them.
                    </span>
                    <div class={tooltip().actions}>
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
                                <div class={p.indicator} />
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
                        </>
                    );
                })()}
            </section>
            <section
                data-section="navigation"
                style={{ ...row, "align-items": "flex-start" }}
            >
                {(() => {
                    const [current, setCurrent] = createSignal(0);
                    const destinations = ["Home", "Search", "Inbox", "Profile"];
                    const glyphs = ["⌂", "⌕", "✉", "☺"];
                    const nav = (recipe: typeof navigationBar) => {
                        const n = recipe();
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
                            {nav(navigationRail as typeof navigationBar)}
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
        </main>
    );
}
