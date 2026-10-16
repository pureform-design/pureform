import { describe, expect, it } from "vitest";

import { button as nativeButton } from "./__fixtures__/native-button";
import { button as webButton } from "./__fixtures__/web-button";
import { createRegistry } from "./registry";

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

describe("a generated native factory", () => {
    it("resolves styles per selection, states included", () => {
        expect(nativeButton({ disabled: true }).root.style).toEqual({
            backgroundColor: "#6750a4",
            height: 40,
            opacity: 0.38,
            transform: [{ scale: 1 }],
        });
    });

    it("gives the same frozen object for the same variants and states", () => {
        const pressed = nativeButton({ variant: "text", pressed: true });
        expect(nativeButton({ variant: "text", pressed: true })).toBe(pressed);
        expect(nativeButton({ variant: "text" })).not.toBe(pressed);
        expect(Object.isFrozen(pressed.root.style)).toBe(true);
    });
});

describe("a registry of generated factories", () => {
    it("serves a static and a lazy one", async () => {
        const registry = createRegistry({
            button: webButton,
            nativeButton: {
                lazy: () =>
                    import("./__fixtures__/native-button").then(
                        (m) => m.button,
                    ),
            },
        });
        const web = registry.entry("button");
        expect(web.factory({}).label.class).toBe("pf-button__label");
        await registry.preload("nativeButton");
        const native = await registry.entry("nativeButton").load();
        expect(native).toBe(nativeButton);
    });
});
