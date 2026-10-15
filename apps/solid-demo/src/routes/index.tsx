import {
    button,
    card,
    checkbox,
    chip,
    divider,
    fab,
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
const THEMES = [undefined, "teal", "sharp"] as const;

function IndexRoute() {
    return (
        <main style={{ display: "grid", gap: "32px", padding: "32px" }}>
            <section style={{ ...row, "align-items": "center" }}>
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
                                    <span class={c.checkIcon}>✓</span>
                                    <span class={c.indeterminateIcon}>–</span>
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
            <section style={{ ...row, "align-items": "center" }}>
                <For each={["negative", "positive", "tertiary"] as const}>
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
                                        <span class={c.checkIcon}>✓</span>
                                        <span class={c.indeterminateIcon}>
                                            –
                                        </span>
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
            <hr class={divider()} />
            <section style={{ ...row, "align-items": "flex-start" }}>
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
            <section style={{ ...row, "align-items": "flex-start" }}>
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
            </section>
            <section style={{ ...row, "align-items": "center" }}>
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
                <section style={row}>
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
            <section style={{ display: "grid", gap: "8px" }}>
                <h1 class={text({ style: "headlineMedium" })}>pureform</h1>
                <p class={text({ style: "bodyLarge" })}>
                    Components from theme providers. The theme adds a{" "}
                    <code class={text({ style: "code" })}>code</code> text
                    style, which becomes a typed variant.
                </p>
            </section>

            <section style={row}>
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

            <section style={row}>
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

            <section style={row}>
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

            <section style={row}>
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

            <section style={row}>
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
