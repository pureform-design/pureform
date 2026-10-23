import { describe, expect, it } from "vitest";

import {
    fieldControlProps,
    fieldIds,
    fieldLabelProps,
    fieldLabelState,
    fieldState,
} from "./field-primitives";

const ids = fieldIds("name");
const none = { description: false, error: false };

describe("the plain field", () => {
    it("derives the pieces' ids from the control's", () => {
        expect(ids).toEqual({
            control: "name",
            label: "name-label",
            description: "name-description",
            error: "name-error",
        });
    });

    it("is invalid with an error", () => {
        expect(fieldState({ error: "Required" }, ids, none).invalid).toBe(true);
        expect(fieldState({ error: "" }, ids, none).invalid).toBe(false);
        expect(fieldState({ invalid: true }, ids, none).invalid).toBe(true);
    });

    it("points the control at the description and the error it holds, after its own", () => {
        const field = fieldState({}, ids, { description: true, error: true });
        expect(
            fieldControlProps(field, { "aria-describedby": "hint" })[
                "aria-describedby"
            ],
        ).toBe("hint name-description name-error");
        expect(
            fieldControlProps(fieldState({}, ids, none), {})["aria-describedby"],
        ).toBeUndefined();
    });

    it("gives the control the field's states, its own winning", () => {
        const field = fieldState(
            { disabled: true, required: true, invalid: true },
            ids,
            none,
        );
        expect(fieldControlProps(field, { invalid: false })).toEqual({
            id: "name",
            disabled: true,
            required: true,
            "aria-invalid": undefined,
            "aria-describedby": undefined,
        });
    });

    it("works outside a field", () => {
        expect(fieldControlProps(undefined, { invalid: true })).toMatchObject({
            id: undefined,
            "aria-invalid": true,
        });
    });

    it("names the control from the label, and dims a disabled one", () => {
        const field = fieldState({ disabled: true }, ids, none);
        const state = fieldLabelState(field, {});
        expect(state).toEqual({ required: false, disabled: true });
        expect(fieldLabelProps(field, state)).toEqual({
            id: "name-label",
            for: "name",
            "aria-disabled": true,
        });
    });
});
