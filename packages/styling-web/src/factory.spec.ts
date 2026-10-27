import { describe, expect, it } from "vitest";

import { button as webButton } from "./__fixtures__/web-button";
import { createWebRegistry } from "./registry";

describe("a generated web factory", () => {
    it("gives each slot's classes for a selection, defaults filled in", () => {
        expect(webButton({ variant: "text", toggle: true })).toEqual({
            root: {
                class: "pf-button__root pf-button__root--variant_text pf-button__root--size_medium pf-button__root--toggle_true",
            },
            label: { class: "pf-button__label" },
        });
    });

    it("returns the cached, frozen slots when the instance sets no tokens", () => {
        const slots = webButton({ size: "small" });
        expect(webButton({ size: "small", variant: "filled" })).toBe(slots);
        expect(Object.isFrozen(slots.root)).toBe(true);
    });

    it("adds instance tokens as the root's CSS vars", () => {
        const slots = webButton({ tokens: { accent: "red" } });
        expect(slots.root.style).toEqual({
            "--pf-components-button-accent": "red",
        });
        expect(slots.root.class).toBe(webButton({}).root.class);
        expect(slots.label).toBe(webButton({}).label);
    });
});

describe("a web registry of generated factories", () => {
    it("serves a static and a lazy one", async () => {
        const registry = createWebRegistry(
            {
                button: webButton,
                lazyButton: {
                    lazy: () =>
                        import("./__fixtures__/web-button").then(
                            (m) => m.button,
                        ),
                },
            },
            { themeAttribute: "data-theme" },
        );
        expect(registry.entry("button").factory({}).label.class).toBe(
            "pf-button__label",
        );
        await registry.preload("lazyButton");
        expect(await registry.entry("lazyButton").load()).toBe(webButton);
    });
});
