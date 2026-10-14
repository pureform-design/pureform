import { button, card, iconButton, scrim } from "$recipes";
import { createFileRoute } from "@tanstack/solid-router";
import { For } from "solid-js";

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

function IndexRoute() {
    return (
        <main style={{ display: "grid", gap: "32px", padding: "32px" }}>
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
