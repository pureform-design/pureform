import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { createRegistry } from "./registry";
import type { LazyEntry, StaticEntry } from "./registry";
import type { ClassFactory } from "./types";

type Chip = { variants: { size: "small" | "large" }; slots: "root" | "label" };

const chip: ClassFactory<Chip> = ({ size = "small" }) => ({
    root: { class: `chip chip--${size}` },
    label: { class: "chip__label" },
});

const card: ClassFactory<{ slots: "root" }> = () => ({
    root: { class: "card" },
});

describe("createRegistry", () => {
    describe("static entries", () => {
        const registry = createRegistry({ chip });

        it("gives the factory itself", () => {
            const entry = registry.entry("chip");
            expect(entry.kind).toBe("static");
            expect(entry.name).toBe("chip");
            expect(entry.factory).toBe(chip);
            expect(entry.factory({ size: "large" }).root.class).toBe(
                "chip chip--large",
            );
        });

        it("gives the same entry on every call", () => {
            expect(registry.entry("chip")).toBe(registry.entry("chip"));
        });

        it("preloads at once", async () => {
            await expect(registry.preload("chip")).resolves.toBeUndefined();
        });

        it("lists and checks its names", () => {
            expect(registry.names).toEqual(["chip"]);
            expect(registry.has("chip")).toBe(true);
            expect(registry.has("card")).toBe(false);
        });

        it("throws for an unknown name, naming the ones it has", () => {
            expect(() =>
                (registry as { entry(name: string): unknown }).entry("card"),
            ).toThrow(/no component "card" in the registry \(it has "chip"\)/);
        });

        it("types the entry as static, with its factory", () => {
            expectTypeOf(registry.entry("chip")).toEqualTypeOf<
                StaticEntry<ClassFactory<Chip>>
            >();
            // @ts-expect-error a name the registry doesn't have
            expect(() => registry.entry("card")).toThrow();
        });
    });

    describe("lazy entries", () => {
        it("loads the factory once, on demand", async () => {
            const lazy = vi.fn(async () => ({ card }));
            const registry = createRegistry({ card: { lazy } });
            const entry = registry.entry("card");
            expect(entry.kind).toBe("lazy");
            expect(lazy).not.toHaveBeenCalled();

            const first = entry.load();
            expect(entry.load()).toBe(first);
            expect(await first).toBe(card);
            expect(await entry.load()).toBe(card);
            expect(lazy).toHaveBeenCalledTimes(1);
        });

        it("finds the factory as the module, its default, or its export by name", async () => {
            const registry = createRegistry({
                bare: { lazy: async () => card },
                byDefault: { lazy: async () => ({ default: card }) },
                card: { lazy: async () => ({ other: 1, card }) },
            });
            expect(await registry.entry("bare").load()).toBe(card);
            expect(await registry.entry("byDefault").load()).toBe(card);
            expect(await registry.entry("card").load()).toBe(card);
        });

        it("rejects when the module has no factory", async () => {
            const registry = createRegistry({
                card: { lazy: async () => ({ chip }) },
            });
            await expect(registry.entry("card").load()).rejects.toThrow(
                /exports no factory as its default or as "card"/,
            );
        });

        it("tries again after a failed load", async () => {
            const lazy = vi
                .fn<() => Promise<{ card: typeof card }>>()
                .mockRejectedValueOnce(new Error("offline"))
                .mockResolvedValue({ card });
            const entry = createRegistry({ card: { lazy } }).entry("card");
            await expect(entry.load()).rejects.toThrow("offline");
            expect(await entry.load()).toBe(card);
            expect(lazy).toHaveBeenCalledTimes(2);
        });

        it("types the entry as lazy, with the module's factory", () => {
            const registry = createRegistry({
                card: { lazy: async () => ({ card }) },
                byDefault: { lazy: async () => ({ default: chip }) },
            });
            expectTypeOf(registry.entry("card")).toEqualTypeOf<
                LazyEntry<typeof card>
            >();
            expectTypeOf(registry.entry("byDefault")).toEqualTypeOf<
                LazyEntry<typeof chip>
            >();
        });
    });

    describe("preload", () => {
        it("starts the load, which a later load shares", async () => {
            const lazy = vi.fn(async () => ({ card }));
            const registry = createRegistry({ card: { lazy } });
            const preloading = registry.preload("card");
            expect(lazy).toHaveBeenCalledTimes(1);
            await expect(preloading).resolves.toBeUndefined();
            expect(await registry.entry("card").load()).toBe(card);
            expect(lazy).toHaveBeenCalledTimes(1);
        });

        it("doesn't reject when the load fails", async () => {
            const registry = createRegistry({
                card: { lazy: () => Promise.reject(new Error("offline")) },
            });
            await expect(registry.preload("card")).resolves.toBeUndefined();
            await expect(registry.entry("card").load()).rejects.toThrow(
                "offline",
            );
        });
    });

    it("mixes static and lazy entries", async () => {
        const registry = createRegistry({
            chip,
            card: { lazy: async () => ({ card }) },
        });
        expect(registry.names).toEqual(["chip", "card"]);
        expect(registry.entry("chip").kind).toBe("static");
        expect(registry.entry("card").kind).toBe("lazy");
    });

    it("records the core version the registry was made with", () => {
        expect(createRegistry({ chip }).version).toBeUndefined();
        expect(createRegistry({ chip }, { version: "0.4.0" }).version).toBe(
            "0.4.0",
        );
    });

    describe("themeAttributes", () => {
        it("gives the target's attribute for a named theme", () => {
            const registry = createRegistry(
                { chip },
                { themeAttribute: "data-theme" },
            );
            expect(registry.themeAttribute).toBe("data-theme");
            expect(registry.themeAttributes("teal")).toEqual({
                "data-theme": "teal",
            });
            expect(Object.isFrozen(registry.themeAttributes("teal"))).toBe(
                true,
            );
        });

        it("gives nothing for the base theme", () => {
            const registry = createRegistry(
                { chip },
                { themeAttribute: "data-theme" },
            );
            expect(registry.themeAttributes(undefined)).toEqual({});
            expect(registry.themeAttributes("")).toEqual({});
        });

        it("gives nothing on a target without one", () => {
            const registry = createRegistry({ chip });
            expect(registry.themeAttribute).toBeUndefined();
            expect(registry.themeAttributes("teal")).toEqual({});
        });
    });

    it("records how the target names its vars", () => {
        expect(createRegistry({ chip }).vars).toEqual({});
        const registry = createRegistry(
            { chip },
            { vars: { prefix: "pf", tokenPrefix: "x" } },
        );
        expect(registry.vars).toEqual({ prefix: "pf", tokenPrefix: "x" });
        expect(Object.isFrozen(registry.vars)).toBe(true);
    });
});
