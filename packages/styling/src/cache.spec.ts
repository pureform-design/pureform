import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { deepFreeze, selectionCache, selectionKey } from "./cache";
import type { SelectionOrder } from "./cache";
import type { Selection, States } from "./types";

type Button = {
    variants: { variant: "filled" | "text"; toggle: "true" | "false" };
    slots: "root";
    states: "pressed" | "disabled";
    tokens: "accent";
};

const order: SelectionOrder = {
    variants: ["variant", "toggle"],
    states: ["pressed", "disabled"],
    defaults: { variant: "filled" },
};

describe("selectionKey", () => {
    it("joins each group's value, then a bit per state, in order", () => {
        expect(
            selectionKey(order, {
                toggle: "true",
                variant: "text",
                disabled: true,
            }),
        ).toBe("text|true|01");
    });

    it("fills defaults, turns booleans into their strings, and leaves the rest empty", () => {
        expect(selectionKey(order, { toggle: false })).toBe("filled|false|00");
        expect(selectionKey(order, {})).toBe("filled||00");
    });

    it("leaves out tokens and anything else outside the order", () => {
        expect(
            selectionKey(order, {
                tokens: { accent: "red" },
                size: "large",
            }),
        ).toBe(selectionKey(order, {}));
    });
});

describe("selectionCache", () => {
    const setup = () => {
        const compute = vi.fn((s: Selection<Button> & States<Button>) => ({
            root: { style: { opacity: s.disabled ? 0.38 : 1 }, key: { ...s } },
        }));
        return { compute, cached: selectionCache(order, compute) };
    };

    it("computes each key once, on its first lookup", () => {
        const { compute, cached } = setup();
        expect(cached.size).toBe(0);
        const first = cached({ variant: "text", pressed: true });
        expect(cached({ variant: "text", pressed: true })).toBe(first);
        expect(compute).toHaveBeenCalledTimes(1);
        expect(cached.size).toBe(1);
        cached({ variant: "text" });
        expect(compute).toHaveBeenCalledTimes(2);
        expect(cached.size).toBe(2);
    });

    it("shares a key between spellings of one selection", () => {
        const { compute, cached } = setup();
        expect(cached({ toggle: true })).toBe(
            cached({ toggle: "true", variant: "filled", pressed: false }),
        );
        expect(compute).toHaveBeenCalledTimes(1);
    });

    it("computes from the selection the key stands for", () => {
        const { cached } = setup();
        expect(
            cached({ toggle: true, tokens: { accent: "red" } }).root.key,
        ).toEqual({
            variant: "filled",
            toggle: "true",
            pressed: false,
            disabled: false,
        });
    });

    it("freezes each result deeply", () => {
        const { cached } = setup();
        const result = cached({ disabled: true });
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.root)).toBe(true);
        expect(Object.isFrozen(result.root.style)).toBe(true);
        expect(result.root.style.opacity).toBe(0.38);
    });

    it("caches an undefined result too", () => {
        const compute = vi.fn(() => undefined);
        const cached = selectionCache(order, compute);
        cached({});
        cached({});
        expect(compute).toHaveBeenCalledTimes(1);
    });

    it("clears", () => {
        const { compute, cached } = setup();
        cached({});
        cached.clear();
        expect(cached.size).toBe(0);
        cached({});
        expect(compute).toHaveBeenCalledTimes(2);
    });

    it("keeps the computing function's types", () => {
        const { cached } = setup();
        expectTypeOf(cached)
            .parameter(0)
            .toEqualTypeOf<Selection<Button> & States<Button>>();
        expectTypeOf(cached({}).root.style.opacity).toEqualTypeOf<number>();
    });
});

describe("deepFreeze", () => {
    it("freezes nested objects and arrays, and passes other values through", () => {
        const value = deepFreeze({ a: [{ b: 1 }], c: "x" });
        expect(Object.isFrozen(value.a)).toBe(true);
        expect(Object.isFrozen(value.a[0])).toBe(true);
        expect(deepFreeze(3)).toBe(3);
        expect(deepFreeze(null)).toBe(null);
    });
});
