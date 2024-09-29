import { describe, expect, it } from "vitest";
import { keyOf } from "./keyof";

describe("keyOf", () => {
    it("should return the keys of an object", () => {
        const obj = {
            a: 1,
            b: 2,
            c: 3,
        };

        const keys = keyOf(obj);

        expect(keys).toEqual(["a", "b", "c"]);
    });
});
