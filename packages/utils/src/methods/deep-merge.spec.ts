import { describe, expect, it } from "vitest";
import { deepMerge } from "./deep-merge";

describe("deepMerge", () => {
    it("should deeply merge two objects", () => {
        const obj1 = {
            a: 1,
            b: 2,
            c: 3,
            x: {
                a: 1,
                b: 2,
            },
        };

        const obj2 = {
            a: 4,
            b: 5,
            d: 6,
            x: {
                f: 7,
                v: undefined,
            },
            y: {
                a: 4,
                b: 5,
            },
        };

        const merged = deepMerge(obj1, obj2);

        expect(merged).toEqual({
            a: 4,
            b: 5,
            c: 3,
            d: 6,
            x: {
                a: 1,
                b: 2,
                f: 7,
                v: undefined,
            },
            y: {
                a: 4,
                b: 5,
            },
        });
    });
});
