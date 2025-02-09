import { describe, expect, it } from "vitest";
import { deepMerge } from "./deep-merge";

describe("deepMerge", () => {
    const obj1 = {
        a: 1,
        b: 2,
        c: 3,
        x: {
            a: 1,
            b: 2,
        },
        arr: [1, 2, 3, 10],
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
        arr: [4, 5, 6, undefined],
    };

    const objMerged = {
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
        arr: [4, 5, 6, 10],
    };

    it("should deeply merge two objects", () => {
        const merged = deepMerge(obj1, obj2);

        expect(merged).toEqual(objMerged);
    });

    it("should 'memberwise-merge' two arrays by default", () => {
        const arr1 = [obj1];

        const arr2 = [obj2];

        const merged = deepMerge({ x: arr1 }, { x: arr2 });

        expect(merged).toEqual({ x: [objMerged] });
    });

    it("should replace arrays with mode 'replace'", () => {
        const arr1 = [obj1] as const;

        const arr2 = [obj2] as const;

        const merged = deepMerge(
            { x: arr1 },
            { x: arr2 },
            {
                arrayMergeMode: "replace",
            },
        );

        expect(merged).toEqual({ x: [obj2] });
    });

    it("should concat arrays with mode 'concat'", () => {
        const arr1 = [obj1] as const;

        const arr2 = [obj2] as const;

        const merged = deepMerge(
            { x: arr1 },
            { x: arr2 },
            {
                arrayMergeMode: "concat",
            },
        );

        expect(merged).toEqual({ x: [obj1, obj2] });
    });
});
