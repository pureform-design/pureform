import { css } from "$css";
import { button, card, iconButton } from "$recipes";
import { cubicBezier, pct } from "@pureform/core/ast";
import {
    MATERIAL_DURATIONS,
    materialColor,
    materialElevation,
    materialLayout,
    materialMotion,
    materialShape,
    materialState,
    materialTypescale,
} from "@pureform/material";
import { themeVars } from "@pureform/panda-adapter";
import { pureform } from "@pureform/preset";
import {
    extend,
    flatElevation,
    gridLayout,
    modularScale,
    oklchPalette,
    roundedShape,
    tonalElevation,
} from "@pureform/theme";
import type { BaseColorGroup, ColorProvider } from "@pureform/theme";
import type { JSX } from "@solidjs/web";
import { createFileRoute } from "@tanstack/solid-router";
import {
    For,
    createMemo,
    createSignal,
    createStore,
    onSettled,
} from "solid-js";

import { Ripple } from "../lib/ripple";

export const Route = createFileRoute("/providers")({
    head: () => ({ meta: [{ title: "Theme providers" }] }),
    component: ProvidersRoute,
});

// Each domain offers a few providers. Picking one rebuilds the pureform config in the browser
// and applies its tokens to the preview as CSS vars, so the static Panda CSS restyles live.
// Text styles and elevation levels read tokens too, so every domain switches without a
// rebuild.
type Choice<P> = { label: string; provider: () => P };

const COLOR: Choice<ColorProvider<BaseColorGroup>>[] = [
    { label: "Material purple", provider: () => materialColor() },
    {
        label: "Cobalt",
        provider: () => materialColor({ seed: "#0047AB" }),
    },
    {
        label: "Teal",
        provider: () => materialColor({ seed: "#006A60" }),
    },
    {
        label: "OKLCH hues (no Material)",
        provider: () =>
            oklchPalette({
                groups: {
                    primary: { hue: 265 },
                    secondary: { hue: 220, chroma: 0.06 },
                    tertiary: { hue: 330 },
                    positive: { hue: 150 },
                    notice: { hue: 80 },
                    negative: { hue: 25, chroma: 0.18 },
                    info: { hue: 240 },
                },
            }),
    },
    {
        label: "Coral, exact tertiary",
        provider: () =>
            materialColor({
                seed: "#FF7F50",
                customSeeds: {
                    tertiary: { hex: "#00A86B", harmonize: false },
                },
            }),
    },
];

const TYPOGRAPHY: Choice<ReturnType<typeof materialTypescale>>[] = [
    { label: "Material (Roboto)", provider: () => materialTypescale() },
    {
        label: "Modular scale 1.25, system UI",
        provider: () => modularScale({ ratio: 1.25 }),
    },
    {
        label: "Compact modular scale",
        provider: () => modularScale({ base: 0.875, ratio: 1.15 }),
    },
    {
        label: "Serif headings, mono labels",
        provider: () =>
            materialTypescale({
                fonts: {
                    brand: { families: ["Georgia"], generic: "serif" },
                    plain: {
                        families: ["ui-monospace", "Menlo"],
                        generic: "monospace",
                    },
                },
            }),
    },
];

const SHAPE: Choice<ReturnType<typeof materialShape>>[] = [
    { label: "Material", provider: () => materialShape() },
    { label: "Sharp", provider: () => roundedShape({ base: 0 }) },
    { label: "Subtle (2px base)", provider: () => roundedShape({ base: 2 }) },
    {
        label: "Squarer buttons",
        provider: () =>
            extend(materialShape(), (out) => ({
                ...out,
                radii: { ...out.radii, full: out.radii.small },
            })),
    },
];

const LAYOUT: Choice<ReturnType<typeof materialLayout>>[] = [
    { label: "Material (4px grid)", provider: () => materialLayout() },
    {
        label: "Compact",
        provider: () =>
            materialLayout({
                grid: 3,
                sizes: {
                    iconSmall: 16,
                    iconMedium: 20,
                    controlSmall: 28,
                    controlMedium: 32,
                    controlLarge: 40,
                    touchTarget: 40,
                },
            }),
    },
    {
        label: "Comfortable",
        provider: () =>
            gridLayout({
                grid: 5,
                sizes: {
                    iconSmall: 20,
                    iconMedium: 28,
                    controlSmall: 36,
                    controlMedium: 48,
                    controlLarge: 56,
                    touchTarget: 56,
                },
            }),
    },
];

const STATE: Choice<ReturnType<typeof materialState>>[] = [
    { label: "Material", provider: () => materialState() },
    {
        label: "Subtle",
        provider: () =>
            materialState({ stateHover: 4, stateFocus: 6, statePressed: 6 }),
    },
    {
        label: "Strong",
        provider: () =>
            materialState({ stateHover: 16, stateFocus: 20, statePressed: 24 }),
    },
];

// Every Material duration, multiplied.
const scaled = (factor: number) =>
    Object.fromEntries(
        Object.entries(MATERIAL_DURATIONS).map(([name, ms]) => [
            name,
            Math.round(ms * factor),
        ]),
    );

const MOTION: Choice<ReturnType<typeof materialMotion>>[] = [
    { label: "Material", provider: () => materialMotion() },
    {
        label: "Slow",
        provider: () => materialMotion({ durations: scaled(2.5) }),
    },
    {
        label: "Snappy",
        provider: () =>
            materialMotion({
                durations: scaled(0.45),
                easings: { standard: cubicBezier([0.3, 0, 0, 1]) },
            }),
    },
];

const ELEVATION: Choice<ReturnType<typeof materialElevation>>[] = [
    { label: "Material", provider: () => materialElevation() },
    {
        label: "Soft shadows",
        provider: () =>
            extend(materialElevation(), (out) => ({
                ...out,
                extra: {
                    ...out.extra,
                    tokens: {
                        opacity: {
                            elevationUmbra: pct(8),
                            elevationPenumbra: pct(6),
                            elevationAmbient: pct(4),
                        },
                    },
                },
            })),
    },
    { label: "Tonal (tint, no shadow)", provider: () => tonalElevation() },
    { label: "Flat", provider: () => flatElevation() },
    {
        label: "Heavy shadows",
        provider: () =>
            extend(materialElevation(), (out) => ({
                ...out,
                extra: {
                    ...out.extra,
                    tokens: {
                        opacity: {
                            elevationUmbra: pct(40),
                            elevationPenumbra: pct(28),
                            elevationAmbient: pct(24),
                        },
                    },
                },
            })),
    },
];

const DOMAINS = [
    { key: "color", title: "Color", choices: COLOR },
    { key: "typography", title: "Typography", choices: TYPOGRAPHY },
    { key: "shape", title: "Shape", choices: SHAPE },
    { key: "layout", title: "Layout", choices: LAYOUT },
    { key: "state", title: "State", choices: STATE },
    { key: "motion", title: "Motion (press and hold)", choices: MOTION },
    { key: "elevation", title: "Elevation", choices: ELEVATION },
] as const;

type Domain = (typeof DOMAINS)[number]["key"];

const FILLS = ["filled", "tonal", "outlined", "text", "elevated"] as const;
const CARD_FILLS = ["elevated", "filled", "outlined"] as const;

const row = { display: "flex", gap: "16px", "flex-wrap": "wrap" } as const;

const HEADLINE = css({ textStyle: "headlineMedium", margin: 0 });
const TITLE = css({ textStyle: "titleLarge", margin: 0 });
const BODY = css({ textStyle: "bodyMedium", marginTop: "2", marginBottom: 0 });

type Scheme = "light" | "dark";

// The scheme the page shows: a `.light` or `.dark` class on <html> wins, else the system.
function useScheme() {
    const query = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
    const read = (): Scheme => {
        const html = document.documentElement.classList;
        if (html.contains("dark")) return "dark";
        if (html.contains("light")) return "light";
        return query?.matches ? "dark" : "light";
    };
    const [scheme, setScheme] = createSignal<Scheme>("light");
    onSettled(() => {
        const update = () => setScheme(read());
        update();
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, {
            attributeFilter: ["class"],
        });
        query?.addEventListener("change", update);
        return () => {
            observer.disconnect();
            query?.removeEventListener("change", update);
        };
    });
    return scheme;
}

function ProvidersRoute() {
    const scheme = useScheme();
    const [picked, setPicked] = createStore<Record<Domain, number>>({
        color: 0,
        typography: 0,
        shape: 0,
        layout: 0,
        state: 0,
        motion: 0,
        elevation: 0,
    });

    const result = createMemo(() => {
        try {
            const config = pureform({
                color: COLOR[picked.color]!.provider(),
                typography: TYPOGRAPHY[picked.typography]!.provider(),
                shape: SHAPE[picked.shape]!.provider(),
                layout: LAYOUT[picked.layout]!.provider(),
                state: STATE[picked.state]!.provider(),
                motion: MOTION[picked.motion]!.provider(),
                elevation: ELEVATION[picked.elevation]!.provider(),
            });
            return {
                vars: themeVars(config, { scheme: scheme() }),
                error: undefined,
            };
        } catch (error) {
            return { vars: {}, error: String(error) };
        }
    });

    const previewStyle = (): JSX.CSSProperties => ({
        ...result().vars,
        display: "grid",
        gap: "24px",
        padding: "24px",
        "border-radius": "16px",
        "background-color": "var(--colors-surface)",
        color: "var(--colors-on-surface)",
    });

    return (
        <main
            style={{
                display: "grid",
                "grid-template-columns": "280px 1fr",
                gap: "32px",
                padding: "32px",
                "align-items": "start",
            }}
        >
            <aside style={{ display: "grid", gap: "20px" }}>
                <For each={DOMAINS}>
                    {(domain) => (
                        <fieldset
                            style={{
                                display: "grid",
                                gap: "6px",
                                border: "none",
                                padding: 0,
                            }}
                        >
                            <legend style={{ "font-weight": 600 }}>
                                {domain.title}
                            </legend>
                            <For each={domain.choices}>
                                {(choice, i) => (
                                    <label
                                        style={{
                                            display: "flex",
                                            gap: "8px",
                                            "align-items": "center",
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name={domain.key}
                                            checked={picked[domain.key] === i()}
                                            onChange={() =>
                                                setPicked((s) => {
                                                    s[domain.key] = i();
                                                })
                                            }
                                        />
                                        {choice.label}
                                    </label>
                                )}
                            </For>
                        </fieldset>
                    )}
                </For>
            </aside>

            <section style={previewStyle()}>
                {result().error && (
                    <p style={{ color: "var(--colors-negative)" }}>
                        {result().error}
                    </p>
                )}

                <h2 class={HEADLINE}>Theme preview</h2>

                <div style={row}>
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
                </div>

                <div style={row}>
                    <For
                        each={
                            [
                                "primary",
                                "secondary",
                                "tertiary",
                                "negative",
                            ] as const
                        }
                    >
                        {(color) => {
                            const b = button({ variant: "tonal", color });
                            return (
                                <button class={b.root} type="button">
                                    <span class={b.touchTarget} />
                                    <Ripple variant="ink-sparkle" />
                                    <span class={b.label}>
                                        {color.toUpperCase()}
                                    </span>
                                </button>
                            );
                        }}
                    </For>
                    <For each={["filled", "tonal", "outlined"] as const}>
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
                                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                                        />
                                    </svg>
                                </button>
                            );
                        }}
                    </For>
                </div>

                <div style={row}>
                    <For each={CARD_FILLS}>
                        {(variant) => {
                            const c = card({ variant, interactive: true });
                            return (
                                <div
                                    class={c.root}
                                    tabindex="0"
                                    style={{ width: "200px", padding: "16px" }}
                                >
                                    <Ripple />
                                    <h3 class={TITLE}>{variant} card</h3>
                                    <p class={BODY}>
                                        Headings use the brand font; body text
                                        uses the plain one.
                                    </p>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </section>
        </main>
    );
}
