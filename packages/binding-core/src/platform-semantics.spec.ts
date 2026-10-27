import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
    cardLayout,
    cardSelection,
    DEFAULT_ICON_STYLE,
    fabMenuPositioning,
    fieldControlState,
    fieldIds,
    fieldState,
    forInstance,
    listItemSelection,
    mergeKeyedDefaults,
    mergeShallowDefaults,
    overDefaults,
    requireRegistry,
    resolveProvider,
    ROOT_PROVIDER,
    sameIconStyle,
    selectionListDefaults,
    splitButtonPositioning,
    toasterOptions,
} from ".";
import type { ProviderOptions, ProviderState } from ".";
import { defineIndication, noIndication } from "./indication";

describe("portable provider", () => {
    it("contains no platform theme lifecycle", () => {
        expect(resolveProvider(undefined, {})).toEqual(ROOT_PROVIDER);
        expect(Object.keys(ROOT_PROVIDER)).not.toEqual(
            expect.arrayContaining(["theme", "hydrate", "overrides"]),
        );
        expectTypeOf<
            Extract<keyof ProviderOptions, "theme" | "hydrate" | "overrides">
        >().toEqualTypeOf<never>();
        expectTypeOf<
            Extract<keyof ProviderState, "theme" | "hydrate" | "overrides">
        >().toEqualTypeOf<never>();
        expect(() => requireRegistry(ROOT_PROVIDER)).toThrow("no registry");
    });

    it("inherits nearest explicit motion and focus color across system and tokenless indications", () => {
        const parent = resolveProvider(undefined, {
            motion: "reduce",
            dir: "rtl",
            indication: defineIndication({
                name: "custom",
                tokens: { focusIndicatorColor: "red" },
            }),
        });
        const child = resolveProvider(parent, {
            motion: "system",
            indication: noIndication,
        });
        expect(child.motion).toBe("reduce");
        expect(child.dir).toBe("rtl");
        expect(child.indication).toBe(noIndication);
        expect(child.focusIndicatorColor).toBe("red");
        expect(resolveProvider(child, { motion: "full" }).motion).toBe("full");
    });

    it("merges slots with an injected policy, skipping undefined and retaining untouched identities", () => {
        const untouched = { value: 5 };
        const parent = resolveProvider<{ value: number }>(undefined, {
            slotProps: { button: { root: { value: 1 }, label: untouched } },
        });
        const merge = vi.fn((a: { value: number }, b: { value: number }) => ({
            value: a.value + b.value,
        }));
        const child = resolveProvider(
            parent,
            { slotProps: { button: { root: { value: 2 }, label: undefined } } },
            merge,
        );
        expect(child.slotProps.button!.root).toEqual({ value: 3 });
        expect(child.slotProps.button!.label).toBe(untouched);
        expect(merge).toHaveBeenCalledTimes(1);
        expect(resolveProvider(parent, {}).slotProps).toBe(parent.slotProps);
    });
});

describe("neutral defaults traversal", () => {
    const policy = (key: string, base: unknown, own: unknown) =>
        key === "parts"
            ? mergeKeyedDefaults(base, own, mergeShallowDefaults)
            : own;
    it("keeps empty-side identities and delegates platform keys without knowing them", () => {
        const base = { class: "base", tokens: { a: 1, b: 2 } };
        const own = { class: "own", tokens: { a: undefined, c: 3 } };
        expect(overDefaults(undefined, own, policy)).toBe(own);
        expect(overDefaults<object>(base, { class: undefined }, policy)).toBe(
            base,
        );
        expect(overDefaults<object>(base, own, policy)).toStrictEqual({
            class: "own",
            tokens: { a: undefined, b: 2, c: 3 },
        });
    });
    it("skips undefined own keys and defers both repeated-part readers", () => {
        const base = vi.fn((i: { index: number }) => ({ a: i.index, b: 1 }));
        const own = vi.fn((i: { index: number }) => ({
            a: undefined,
            c: i.index + 2,
        }));
        const merge = vi.fn(policy);
        const result = overDefaults(
            { parts: { row: base, root: { a: 1 } }, other: 1 },
            { parts: { row: own, root: { b: 2 } }, other: undefined },
            merge,
        );
        expect(merge).toHaveBeenCalledTimes(1);
        expect(result.other).toBe(1);
        expect(base).not.toHaveBeenCalled();
        expect(own).not.toHaveBeenCalled();
        expect(
            forInstance<unknown, { index: number }>(result.parts.row, {
                index: 3,
            }),
        ).toStrictEqual({ a: undefined, b: 1, c: 5 });
        expect(result.parts.root).toEqual({ a: 1, b: 2 });
    });
});

describe("neutral presentation and component meaning", () => {
    it("does not choose an icon color or measurement unit", () => {
        expect(DEFAULT_ICON_STYLE).toEqual({
            size: undefined,
            color: undefined,
            filled: false,
        });
        expect(Object.isFrozen(DEFAULT_ICON_STYLE)).toBe(true);
        expect(
            sameIconStyle(DEFAULT_ICON_STYLE, { ...DEFAULT_ICON_STYLE }),
        ).toBe(true);
        expect(
            sameIconStyle(DEFAULT_ICON_STYLE, {
                ...DEFAULT_ICON_STYLE,
                color: "red",
            }),
        ).toBe(false);
    });
    it("resolves field states and description IDs without HTML props", () => {
        const field = fieldState(
            { disabled: true, required: true },
            fieldIds("name"),
            { description: true, error: true },
        );
        expect(
            fieldControlState(field, {
                disabled: false,
                describedBy: "custom name-error",
            }),
        ).toEqual({
            id: "name",
            disabled: false,
            required: true,
            invalid: true,
            describedBy: "custom name-error name-description",
        });
        expect(fieldControlState(undefined, {})).toEqual({
            id: undefined,
            disabled: false,
            required: false,
            invalid: false,
            describedBy: undefined,
        });
    });
    it("takes explicit interaction semantics instead of HTML elements", () => {
        expect(cardSelection({}, true).interactive).toBe(true);
        expect(cardSelection({ interactive: false }, true).interactive).toBe(
            false,
        );
        expect(cardLayout({ actions: "Buy" }, true).actionArea).toBe(true);
        expect(cardLayout({ actions: "Buy" }, false).actionArea).toBe(false);
        expect(listItemSelection({}, false).interactive).toBe(false);
    });
    it("resolves selection and menu positioning defaults without assembling machines", () => {
        expect(selectionListDefaults({})).toEqual({
            selectionMode: "single",
            deselectable: undefined,
        });
        expect(fabMenuPositioning({})).toEqual({ placement: "top-end" });
        expect(
            splitButtonPositioning({
                positioning: { placement: undefined, gutter: 12 },
            }),
        ).toEqual({ placement: "bottom-end", gutter: 12 });
        expect(
            fabMenuPositioning({
                positioning: { placement: "top", gutter: 4 },
            }),
        ).toEqual({ placement: "top", gutter: 4 });
        expect(toasterOptions({ offsets: 24 }).offsets).toBe(24);
    });
});
