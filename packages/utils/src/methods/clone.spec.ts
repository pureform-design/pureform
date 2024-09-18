import { clone } from "./clone";
import { describe, expect, it } from "vitest";

describe("clone", () => {
    it("should clone an object", () => {
        const obj = {
            a: 1,
            b: 2,
            c: 3,
        };

        const cloned = clone(obj);

        expect(cloned).toEqual(obj);
    });
});
