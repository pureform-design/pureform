import { button, card, iconButton, scrim } from "$recipes";
import type { JSX } from "@solidjs/web";
import { createFileRoute } from "@tanstack/solid-router";
import { For, createStore } from "solid-js";

import { Ripple } from "../lib/ripple";

export const Route = createFileRoute("/tokens")({
    head: () => ({ meta: [{ title: "Component tokens" }] }),
    component: TokensRoute,
});

// Each control writes one component token var on the preview's wrapper, so every component
// inside picks it up. Unset vars fall back to the foundation defaults baked into the recipes.
type Control =
    | {
          kind: "range";
          token: string;
          label: string;
          min: number;
          max: number;
          initial: number;
          unit: string;
      }
    | { kind: "color"; token: string; label: string; initial: string };

const GROUPS: { title: string; controls: Control[] }[] = [
    {
        title: "Button",
        controls: [
            {
                kind: "range",
                token: "button-radius",
                label: "Radius",
                min: 0,
                max: 24,
                initial: 20,
                unit: "px",
            },
            {
                kind: "range",
                token: "button-heightMedium",
                label: "Height",
                min: 24,
                max: 64,
                initial: 40,
                unit: "px",
            },
            {
                kind: "range",
                token: "button-paddingMedium",
                label: "Padding",
                min: 4,
                max: 48,
                initial: 24,
                unit: "px",
            },
            {
                kind: "range",
                token: "button-gap",
                label: "Icon gap",
                min: 0,
                max: 24,
                initial: 8,
                unit: "px",
            },
            {
                kind: "range",
                token: "button-iconSize",
                label: "Icon size",
                min: 12,
                max: 32,
                initial: 18,
                unit: "px",
            },
            {
                kind: "range",
                token: "button-outlineWidth",
                label: "Outline width",
                min: 0,
                max: 6,
                initial: 1,
                unit: "px",
            },
            {
                kind: "color",
                token: "button-outlineColor",
                label: "Outline color",
                initial: "#757780",
            },
        ],
    },
    {
        title: "Icon button",
        controls: [
            {
                kind: "range",
                token: "iconButton-radius",
                label: "Radius",
                min: 0,
                max: 24,
                initial: 20,
                unit: "px",
            },
            {
                kind: "range",
                token: "iconButton-sizeMedium",
                label: "Size",
                min: 24,
                max: 64,
                initial: 40,
                unit: "px",
            },
            {
                kind: "range",
                token: "iconButton-iconSize",
                label: "Icon size",
                min: 12,
                max: 40,
                initial: 24,
                unit: "px",
            },
            {
                kind: "range",
                token: "iconButton-outlineWidth",
                label: "Outline width",
                min: 0,
                max: 6,
                initial: 1,
                unit: "px",
            },
        ],
    },
    {
        title: "Card",
        controls: [
            {
                kind: "range",
                token: "card-radius",
                label: "Radius",
                min: 0,
                max: 40,
                initial: 12,
                unit: "px",
            },
            {
                kind: "range",
                token: "card-padding",
                label: "Padding",
                min: 0,
                max: 48,
                initial: 16,
                unit: "px",
            },
            {
                kind: "range",
                token: "card-outlineWidth",
                label: "Outline width",
                min: 0,
                max: 6,
                initial: 1,
                unit: "px",
            },
            {
                kind: "color",
                token: "card-elevatedContainer",
                label: "Elevated container",
                initial: "#f5f3f7",
            },
            {
                kind: "color",
                token: "card-outlineColor",
                label: "Outline color",
                initial: "#c5c6d0",
            },
        ],
    },
    {
        title: "Scrim",
        controls: [
            {
                kind: "range",
                token: "scrim-opacity",
                label: "Opacity",
                min: 0,
                max: 100,
                initial: 32,
                unit: "%",
            },
        ],
    },
];

const varFor = (token: string) => `--pf-components-${token}`;

const STAR =
    "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

const panel = {
    display: "grid",
    gap: "8px",
    "grid-template-columns": "max-content 160px 4ch",
    "align-items": "center",
} as const;

const row = {
    display: "flex",
    gap: "16px",
    "flex-wrap": "wrap",
    "align-items": "center",
} as const;

function TokensRoute() {
    // Only tokens the user touched are set, so untouched ones keep following the palette
    // (colors in particular switch with the light or dark scheme).
    const [overrides, setOverrides] = createStore<Record<string, string>>({});
    const set = (token: string, value: string) =>
        setOverrides((draft) => {
            draft[varFor(token)] = value;
        });
    const reset = () =>
        setOverrides((draft) => {
            for (const key of Object.keys(draft)) delete draft[key];
        });

    const toggleScheme = () => {
        const root = document.documentElement;
        const dark =
            root.classList.contains("dark") ||
            (!root.classList.contains("light") &&
                matchMedia("(prefers-color-scheme: dark)").matches);
        root.classList.toggle("dark", !dark);
        root.classList.toggle("light", dark);
    };

    return (
        <main
            style={{
                display: "grid",
                gap: "32px",
                padding: "32px",
                "grid-template-columns": "max-content 1fr",
                "align-items": "start",
            }}
        >
            <aside style={{ display: "grid", gap: "24px" }}>
                <button
                    class={button({ variant: "tonal" }).root}
                    type="button"
                    onClick={toggleScheme}
                >
                    <span class={button().touchTarget} />
                    <Ripple />
                    <span class={button().label}>Toggle light / dark</span>
                </button>
                <button
                    class={button({ variant: "text" }).root}
                    type="button"
                    onClick={reset}
                >
                    <Ripple />
                    <span class={button().label}>Reset tokens</span>
                </button>
                <For each={GROUPS}>
                    {(group) => (
                        <fieldset style={panel}>
                            <legend>{group.title}</legend>
                            <For each={group.controls}>
                                {(c) => {
                                    const current = () =>
                                        overrides[varFor(c.token)];
                                    return (
                                        <>
                                            <label for={c.token}>
                                                {c.label}
                                            </label>
                                            {c.kind === "range" ? (
                                                <input
                                                    id={c.token}
                                                    type="range"
                                                    min={c.min}
                                                    max={c.max}
                                                    value={
                                                        parseFloat(
                                                            current() ?? "",
                                                        ) || c.initial
                                                    }
                                                    onInput={(e) =>
                                                        set(
                                                            c.token,
                                                            `${e.currentTarget.value}${c.unit}`,
                                                        )
                                                    }
                                                />
                                            ) : (
                                                <input
                                                    id={c.token}
                                                    type="color"
                                                    value={
                                                        current() ?? c.initial
                                                    }
                                                    onInput={(e) =>
                                                        set(
                                                            c.token,
                                                            e.currentTarget
                                                                .value,
                                                        )
                                                    }
                                                />
                                            )}
                                            <output>
                                                {current() ?? "default"}
                                            </output>
                                        </>
                                    );
                                }}
                            </For>
                        </fieldset>
                    )}
                </For>
            </aside>

            <div
                style={{
                    ...(overrides as JSX.CSSProperties),
                    display: "grid",
                    gap: "32px",
                }}
            >
                <section style={row}>
                    <For
                        each={
                            [
                                "filled",
                                "tonal",
                                "outlined",
                                "text",
                                "elevated",
                            ] as const
                        }
                    >
                        {(variant) => {
                            const b = button({ variant });
                            return (
                                <button class={b.root} type="button">
                                    <span class={b.touchTarget} />
                                    <Ripple />
                                    <svg class={b.icon} viewBox="0 0 24 24">
                                        <path fill="currentColor" d={STAR} />
                                    </svg>
                                    <span class={b.label}>{variant}</span>
                                </button>
                            );
                        }}
                    </For>
                </section>

                <section style={row}>
                    <For
                        each={
                            [
                                "filled",
                                "tonal",
                                "outlined",
                                "standard",
                                "elevated",
                            ] as const
                        }
                    >
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
                                                d={STAR}
                                            />
                                        </svg>
                                    </span>
                                    <span class={b.outline} />
                                </button>
                            );
                        }}
                    </For>
                </section>

                <section style={row}>
                    <For each={["elevated", "filled", "outlined"] as const}>
                        {(variant) => {
                            const c = card({ variant, interactive: true });
                            return (
                                <div class={c.root} role="button" tabindex={0}>
                                    <span class={c.touchTarget} />
                                    <Ripple />
                                    {variant} card
                                </div>
                            );
                        }}
                    </For>
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
            </div>
        </main>
    );
}
