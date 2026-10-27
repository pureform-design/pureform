import { fieldIds, fieldState } from "@pureform/binding-core";
import {
    nativeSelectValue,
    nativeSelectValues,
    sameNativeSelectValue,
} from "@pureform/binding-core";
import { nativeSelectProps } from "@pureform/binding-web";
import { describe, expect, it } from "vitest";

describe("the native select", () => {
    it("takes the field's id, states and descriptions, its own props winning", () => {
        const field = fieldState(
            { disabled: true, required: true, invalid: true },
            fieldIds("size"),
            { description: true, error: false },
        );
        expect(nativeSelectProps({ invalid: false }, false, field)).toEqual({
            id: "size",
            name: undefined,
            form: undefined,
            multiple: undefined,
            disabled: true,
            required: true,
            "aria-invalid": undefined,
            "aria-describedby": "size-description",
        });
    });

    it("is disabled by a fieldset, and passes `multiple`", () => {
        expect(nativeSelectProps({ multiple: true }, true)).toMatchObject({
            multiple: true,
            disabled: true,
        });
    });

    it("reads a value as the chosen values, and reports them back", () => {
        expect(nativeSelectValues(undefined)).toEqual([]);
        expect(nativeSelectValues("")).toEqual([]);
        expect(nativeSelectValues("m")).toEqual(["m"]);
        expect(nativeSelectValues(["s", "l"])).toEqual(["s", "l"]);
        expect(nativeSelectValue(["s", "l"], true)).toEqual(["s", "l"]);
        expect(nativeSelectValue(["s", "l"], false)).toBe("s");
        expect(nativeSelectValue([], false)).toBe("");
    });

    it("compares values by the options they choose", () => {
        expect(sameNativeSelectValue(["s"], ["s"])).toBe(true);
        expect(sameNativeSelectValue(["s"], ["s", "l"])).toBe(false);
        expect(sameNativeSelectValue("s", "s")).toBe(true);
        expect(sameNativeSelectValue("s", ["s"])).toBe(false);
    });
});
