import { createRegistry } from "@pureform/styling";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
    providerAttributes,
    requireRegistry,
    resolveProvider,
    ROOT_PROVIDER,
} from "./provider";
import type { ProviderState } from "./provider";

const registry = createRegistry({
    button: () => ({ root: { class: "button" } }),
});

describe("resolveProvider", () => {
    it("starts from the root's values", () => {
        const state = resolveProvider(undefined, {});
        expect(state).toEqual(ROOT_PROVIDER);
        expect(state.dir).toBe("ltr");
        expect(state.motion).toBe("system");
        expect(state.hydrate).toBe("reuse");
    });

    it("inherits what a nested provider leaves out", () => {
        const outer = resolveProvider(undefined, {
            registry,
            dir: "rtl",
            motion: "reduce",
            theme: "teal",
        });
        const inner = resolveProvider(outer, {});
        expect(inner.registry).toBe(registry);
        expect(inner.dir).toBe("rtl");
        expect(inner.motion).toBe("reduce");
        expect(inner.theme).toBe("teal");
    });

    it("takes a nested provider's own values over its parent's", () => {
        const outer = resolveProvider(undefined, {
            dir: "rtl",
            motion: "reduce",
        });
        const inner = resolveProvider(outer, { dir: "ltr", motion: "full" });
        expect(inner.dir).toBe("ltr");
        expect(inner.motion).toBe("full");
    });

    it("keeps the nearest reduce or full when a nested provider says system, as the CSS does", () => {
        const outer = resolveProvider(undefined, { motion: "reduce" });
        expect(resolveProvider(outer, { motion: "system" }).motion).toBe(
            "reduce",
        );
    });

    it("merges defaults per component, the inner provider's defined values winning", () => {
        const outer = resolveProvider(undefined, {
            defaults: {
                button: { variant: "tonal", size: "small", tokens: { gap: 4 } },
                chip: { variant: "outlined" },
            },
        });
        const inner = resolveProvider(outer, {
            defaults: {
                button: {
                    size: "large",
                    variant: undefined,
                    tokens: { radius: 2 },
                },
            },
        });
        expect(inner.defaults).toEqual({
            button: {
                variant: "tonal",
                size: "large",
                tokens: { gap: 4, radius: 2 },
            },
            chip: { variant: "outlined" },
        });
    });

    it("merges slot props per component and slot with the binding's merge", () => {
        const outer = resolveProvider<{ class?: string; title?: string }>(
            undefined,
            {
                slotProps: {
                    button: {
                        root: { class: "a", title: "outer" },
                        label: { class: "l" },
                    },
                },
            },
        );
        const inner = resolveProvider(
            outer,
            { slotProps: { button: { root: { class: "b" } } } },
            (a, b) => ({ ...a, ...b, class: `${a.class} ${b.class}` }),
        );
        expect(inner.slotProps).toEqual({
            button: {
                root: { class: "a b", title: "outer" },
                label: { class: "l" },
            },
        });
    });

    it("shallow-merges slot props by default", () => {
        const outer = resolveProvider<{ class?: string }>(undefined, {
            slotProps: { button: { root: { class: "a" } } },
        });
        const inner = resolveProvider(outer, {
            slotProps: { button: { root: { class: "b" } } },
        });
        expect(inner.slotProps).toEqual({ button: { root: { class: "b" } } });
    });

    it("merges overrides", () => {
        const outer = resolveProvider(undefined, { overrides: { a: 1, b: 2 } });
        const inner = resolveProvider(outer, { overrides: { b: 3 } });
        expect(inner.overrides).toEqual({ a: 1, b: 3 });
    });

    it("types slot props by the binding's part props", () => {
        const state = resolveProvider<{ title?: string }>(undefined, {});
        expectTypeOf(state).toEqualTypeOf<ProviderState<{ title?: string }>>();
    });
});

describe("providerAttributes", () => {
    it("writes the direction in effect and only a reduce or full setting", () => {
        expect(providerAttributes({}, { dir: "ltr" })).toEqual({
            dir: "ltr",
            "data-pf-motion": undefined,
        });
        expect(
            providerAttributes({ motion: "system" }, { dir: "rtl" }),
        ).toEqual({ dir: "rtl", "data-pf-motion": undefined });
        expect(
            providerAttributes({ motion: "reduce" }, { dir: "ltr" }),
        ).toEqual({ dir: "ltr", "data-pf-motion": "reduce" });
        expect(providerAttributes({ motion: "full" }, { dir: "ltr" })).toEqual({
            dir: "ltr",
            "data-pf-motion": "full",
        });
    });

    it("writes its own theme's attributes from the registry", () => {
        const themed = createRegistry(
            { button: () => ({ root: { class: "button" } }) },
            { themeAttribute: "data-theme" },
        );
        expect(
            providerAttributes(
                { theme: "teal" },
                { dir: "ltr", registry: themed },
            ),
        ).toEqual({
            "data-theme": "teal",
            dir: "ltr",
            "data-pf-motion": undefined,
        });
        // Inherited themes are on an ancestor; a target without an attribute writes none.
        expect(
            providerAttributes({}, { dir: "ltr", registry: themed }),
        ).toEqual({ dir: "ltr", "data-pf-motion": undefined });
        expect(
            providerAttributes({ theme: "teal" }, { dir: "ltr", registry }),
        ).toEqual({ dir: "ltr", "data-pf-motion": undefined });
        expect(providerAttributes({ theme: "teal" }, { dir: "ltr" })).toEqual({
            dir: "ltr",
            "data-pf-motion": undefined,
        });
    });
});

describe("requireRegistry", () => {
    it("returns the registry, or names what's missing", () => {
        expect(requireRegistry({ registry })).toBe(registry);
        expect(() => requireRegistry(ROOT_PROVIDER)).toThrow(
            /PureformProvider registry/,
        );
    });
});
