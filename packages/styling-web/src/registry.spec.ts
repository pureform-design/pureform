import { createRegistry } from "@pureform/styling";
import type { LazyEntry, StaticEntry } from "@pureform/styling";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { createWebRegistry, webRegistry } from "./registry";
import type { WebRegistry } from "./registry";
import type { ClassFactory } from "./types";

type Chip = { variants: { size: "small" | "large" }; slots: "root" | "label" };

const chip: ClassFactory<Chip> = ({ size = "small" }) => ({
    root: { class: `chip chip--${size}` },
    label: { class: "chip__label" },
});

const card: ClassFactory<{ slots: "root" }> = () => ({
    root: { class: "card" },
});

describe("createWebRegistry", () => {
    it("serves entries as the neutral registry does", async () => {
        const lazy = vi.fn(async () => ({ card }));
        const registry = createWebRegistry(
            { chip, card: { lazy } },
            { version: "0.4.0" },
        );
        expect(registry.version).toBe("0.4.0");
        expect(registry.names).toEqual(["chip", "card"]);
        expect(registry.has("chip")).toBe(true);
        expect(registry.has("missing")).toBe(false);
        expect(registry.entry("chip")).toBe(registry.entry("chip"));
        expect(registry.entry("chip").factory).toBe(chip);
        await expect(registry.preload("card")).resolves.toBeUndefined();
        expect(await registry.entry("card").load()).toBe(card);
        expect(lazy).toHaveBeenCalledTimes(1);
        expect(() =>
            (registry as { entry(name: string): unknown }).entry("missing"),
        ).toThrow(/no component "missing" in the registry/);
    });

    it("infers static and lazy entries with their factories", () => {
        const registry = createWebRegistry({
            chip,
            card: { lazy: async () => ({ card }) },
            byDefault: { lazy: async () => ({ default: chip }) },
        });
        expectTypeOf(registry.entry("chip")).toEqualTypeOf<
            StaticEntry<ClassFactory<Chip>>
        >();
        expectTypeOf(registry.entry("card")).toEqualTypeOf<
            LazyEntry<typeof card>
        >();
        expectTypeOf(registry.entry("byDefault")).toEqualTypeOf<
            LazyEntry<typeof chip>
        >();
        // @ts-expect-error a name the registry doesn't have
        expect(() => registry.entry("missing")).toThrow();
    });

    it("is frozen", () => {
        expect(Object.isFrozen(createWebRegistry({ chip }))).toBe(true);
    });

    describe("themeAttributes", () => {
        it("gives the target's attribute for a named theme", () => {
            const registry = createWebRegistry(
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
            const registry = createWebRegistry(
                { chip },
                { themeAttribute: "data-theme" },
            );
            expect(registry.themeAttributes(undefined)).toEqual({});
            expect(registry.themeAttributes("")).toEqual({});
        });

        it("gives nothing without a theme attribute", () => {
            const registry = createWebRegistry({ chip });
            expect(registry.themeAttribute).toBeUndefined();
            expect(registry.themeAttributes("teal")).toEqual({});
        });
    });

    it("records how the target names its vars", () => {
        expect(createWebRegistry({ chip }).vars).toEqual({});
        const registry = createWebRegistry(
            { chip },
            { vars: { prefix: "pf", tokenPrefix: "x" } },
        );
        expect(registry.vars).toEqual({ prefix: "pf", tokenPrefix: "x" });
        expect(Object.isFrozen(registry.vars)).toBe(true);
    });
});

const input = { chip, card: { lazy: async () => ({ card }) } };

describe("webRegistry", () => {
    it("extends a neutral registry with the same entries", async () => {
        const neutral = createRegistry(input, { version: "1.0.0" });
        const web = webRegistry(neutral, {
            themeAttribute: "data-panda-theme",
        });
        expect(web.entry("chip")).toBe(neutral.entry("chip"));
        expect(web.entry("card")).toBe(neutral.entry("card"));
        expect(web.entry("card").load()).toBe(neutral.entry("card").load());
        expect(await web.entry("card").load()).toBe(card);
        expect(web.names).toBe(neutral.names);
        expect(web.version).toBe("1.0.0");
        expect(web.themeAttributes("teal")).toEqual({
            "data-panda-theme": "teal",
        });
        expectTypeOf(web).toEqualTypeOf<WebRegistry<typeof input>>();
        expectTypeOf(web.entry("chip")).toEqualTypeOf<
            StaticEntry<ClassFactory<Chip>>
        >();
        expectTypeOf(web.entry("card")).toEqualTypeOf<LazyEntry<typeof card>>();
    });

    it("leaves the neutral registry as it was", () => {
        const neutral = createRegistry(input);
        webRegistry(neutral, { themeAttribute: "data-theme" });
        expect(Object.isFrozen(neutral)).toBe(true);
        expect("themeAttribute" in neutral).toBe(false);
    });
});
