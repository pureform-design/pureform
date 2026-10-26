import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { createSlotReader } from "./slot-reader";

describe("createSlotReader", () => {
    it("reads only the requested part and does not build an unused instance", () => {
        const instance = vi.fn<() => never>(() => {
            throw new Error("unused");
        });
        const other = vi.fn<() => string>(() => "other");
        const read = createSlotReader("cell", instance);
        expect(read(undefined)).toBeUndefined();
        const keyed = { cell: "plain", other };
        expect(read(keyed)).toBe("plain");
        expect(instance).not.toHaveBeenCalled();
        expect(other).not.toHaveBeenCalled();
    });

    it("shares one lazy instance across channels but resolves every function on demand", () => {
        const instance = vi.fn<() => { index: number }>(() => ({ index: 2 }));
        const props = vi.fn<(copy: { index: number }) => { title: string }>(
            (copy) => ({ title: String(copy.index) }),
        );
        const read = createSlotReader("cell", instance);
        const value = read({ cell: props });
        expect(value).toEqual({ title: "2" });
        expectTypeOf(value).toEqualTypeOf<{ title: string } | undefined>();
        expect(read({ cell: (copy) => copy.index })).toBe(2);
        read({ cell: props });
        expect(instance).toHaveBeenCalledTimes(1);
        expect(props).toHaveBeenCalledTimes(2);
    });

    it("reads an undefined instance only once and supports missing entries and function results", () => {
        const instance = vi.fn<() => undefined>(() => undefined);
        const resolve = vi.fn<(copy: undefined) => undefined>(() => undefined);
        const read = createSlotReader("cell", instance);
        expect(read({ cell: resolve })).toBeUndefined();
        expect(read({ cell: resolve })).toBeUndefined();
        expect(read({})).toBeUndefined();
        expect(instance).toHaveBeenCalledTimes(1);
        expect(resolve).toHaveBeenCalledTimes(2);
        expect(resolve).toHaveBeenLastCalledWith(undefined);
        expect(createSlotReader("cell")({ cell: resolve })).toBeUndefined();
    });

    it("keeps instance data local to each resolution", () => {
        let index = 1;
        const input = { cell: (copy: { index: number }) => copy.index };
        expect(createSlotReader("cell", () => ({ index }))(input)).toBe(1);
        index = 2;
        expect(createSlotReader("cell", () => ({ index }))(input)).toBe(2);
    });
});
