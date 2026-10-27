import { describe, expect, it } from "vitest";

import { button as nativeButton } from "./__fixtures__/native-button";
import { createRegistry } from "./registry";

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
            button: nativeButton,
            lazyButton: {
                lazy: () =>
                    import("./__fixtures__/native-button").then(
                        (m) => m.button,
                    ),
            },
        });
        const entry = registry.entry("button");
        expect(entry.factory({}).label.style).toEqual({ fontWeight: "500" });
        await registry.preload("lazyButton");
        const loaded = await registry.entry("lazyButton").load();
        expect(loaded).toBe(nativeButton);
    });
});
