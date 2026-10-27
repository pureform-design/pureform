import { createRegistry } from "@pureform/styling";
import { describe, expect, it, vi } from "vitest";

import { rippleClasses } from "./indication";
import type { RippleClasses } from "./indication";

describe("rippleClasses cache", () => {
    it("runs a static factory once with an empty selection and preserves its result", () => {
        const classes: RippleClasses = {
            root: { class: "layer" },
            ripple: { class: "ink", style: { "--pf-opacity": "0.1" } },
        };
        const factory = vi.fn<(selection: object) => RippleClasses>(
            () => classes,
        );
        const registry = createRegistry({ ripple: factory });
        expect(rippleClasses(registry)).toBe(classes);
        expect(rippleClasses(registry)).toBe(classes);
        expect(factory).toHaveBeenCalledExactlyOnceWith({});
    });

    it("caches a missing entry without looking it up again", () => {
        const base = createRegistry({});
        const has = vi.fn<typeof base.has>(base.has.bind(base));
        const entry = vi.fn<typeof base.entry>(base.entry.bind(base));
        const registry: typeof base = {
            ...base,
            has: (name): name is never => has(name),
            entry: entry as typeof base.entry,
        };
        expect(rippleClasses(registry)).toBeUndefined();
        expect(rippleClasses(registry)).toBeUndefined();
        expect(has).toHaveBeenCalledExactlyOnceWith("ripple");
        expect(entry).not.toHaveBeenCalled();
        expect(rippleClasses(undefined)).toBeUndefined();
    });

    it("caches a lazy miss without loading, even after the entry is preloaded", async () => {
        const factory = vi.fn<() => RippleClasses>(() => ({
            ripple: { class: "lazy-ink" },
        }));
        const lazy = vi.fn<() => Promise<typeof factory>>(async () => factory);
        const base = createRegistry({ ripple: { lazy } });
        const entry = vi.fn<typeof base.entry>(base.entry.bind(base));
        const registry: typeof base = {
            ...base,
            entry: entry as typeof base.entry,
        };
        expect(rippleClasses(registry)).toBeUndefined();
        expect(rippleClasses(registry)).toBeUndefined();
        expect(lazy).not.toHaveBeenCalled();
        await registry.preload("ripple");
        expect(rippleClasses(registry)).toBeUndefined();
        expect(entry).toHaveBeenCalledExactlyOnceWith("ripple");
        expect(factory).not.toHaveBeenCalled();
    });

    it("does not share results across registries", () => {
        const factory = vi.fn<() => RippleClasses>(() => ({
            ripple: { class: "ink" },
        }));
        const first = createRegistry({ ripple: factory });
        const second = createRegistry({ ripple: factory });
        expect(rippleClasses(first)).not.toBe(rippleClasses(second));
        expect(factory).toHaveBeenCalledTimes(2);
    });
});
