import type {
    selectAnatomy,
    selectMenuAnatomy,
    textAreaAnatomy,
    textFieldAnatomy,
} from "@pureform/anatomy";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
    fromZagValue,
    SELECT_ROOT_PROPS,
    selectHiddenSelectProps,
    selectInputProps,
    selectMachineProps,
    selectMenuSelection,
    selectPositionerProps,
    selectSelection,
    selectSupportingTextId,
    selectValueProps,
    toZagValue,
} from "./select";
import type { SelectMenuPart, SelectPart } from "./select";
import {
    TEXT_AREA_ROOT_PROPS,
    TEXT_FIELD_ROOT_PROPS,
    textAreaSelection,
    textFieldMachineProps,
    textFieldNativeDefault,
    textFieldSelection,
} from "./text-field";
import type { TextAreaPart, TextFieldPart } from "./text-field";

describe("parts", () => {
    it("name each anatomy's parts", () => {
        expectTypeOf<TextFieldPart>().toEqualTypeOf<
            (typeof textFieldAnatomy.partNames)[number]
        >();
        expectTypeOf<TextAreaPart>().toEqualTypeOf<
            (typeof textAreaAnatomy.partNames)[number]
        >();
        expectTypeOf<SelectPart>().toEqualTypeOf<
            (typeof selectAnatomy.partNames)[number]
        >();
        expectTypeOf<SelectMenuPart>().toEqualTypeOf<
            (typeof selectMenuAnatomy.partNames)[number]
        >();
    });
});

describe("text field and text area", () => {
    it("select their variants, the icons' room, and tokens", () => {
        expect(
            textFieldSelection({ variant: "outlined", leadingIcon: true }),
        ).toEqual({
            variant: "outlined",
            color: undefined,
            density: undefined,
            leadingIcon: true,
            trailingIcon: undefined,
            tokens: undefined,
        });
        expect(textAreaSelection({ autoGrow: true })).toMatchObject({
            autoGrow: true,
        });
    });

    it("map Root's props onto the machine's", () => {
        expect(
            textFieldMachineProps({
                id: "email",
                error: "Taken",
                ids: { input: "email-input" },
            }),
        ).toEqual({
            disabled: undefined,
            invalid: undefined,
            error: "Taken",
            validate: undefined,
            required: undefined,
            readOnly: undefined,
            placeholder: undefined,
            name: undefined,
            form: undefined,
            ids: {
                root: "email",
                input: "email-input",
                label: undefined,
                supportingText: undefined,
            },
        });
        expect(textFieldNativeDefault(undefined)).toBe("");
        expect(textFieldNativeDefault("Ada")).toBe("Ada");
    });

    it("keep every own prop off the element", () => {
        expect(TEXT_FIELD_ROOT_PROPS).toContain("onValueChange");
        expect(TEXT_AREA_ROOT_PROPS).toContain("autoGrow");
    });
});

describe("select", () => {
    it("always makes room for the arrow, and draws the list as a menu in its color", () => {
        expect(selectSelection({ color: "secondary" })).toMatchObject({
            color: "secondary",
            trailingIcon: true,
        });
        expect(selectMenuSelection({ color: "secondary" })).toEqual({
            color: "secondary",
            density: undefined,
        });
    });

    it("maps one value onto Zag's list and back", () => {
        expect(toZagValue(undefined)).toBeUndefined();
        expect(toZagValue(null)).toEqual([]);
        expect(toZagValue("m")).toEqual(["m"]);
        expect(fromZagValue([])).toBeNull();
        expect(fromZagValue(["m"])).toBe("m");
        const onValueChange = vi.fn();
        const props = selectValueProps({
            value: undefined,
            defaultValue: "s",
            onValueChange,
        });
        expect(props.defaultValue).toEqual(["s"]);
        props.onValueChange({ value: ["l"] });
        expect(onValueChange).toHaveBeenCalledWith({ value: "l" });
    });

    it("maps Root's props onto Zag's, ORing in a disabled fieldset and an error", () => {
        expect(
            selectMachineProps(
                { error: "Pick one", positioning: { gutter: 2 } },
                true,
            ),
        ).toMatchObject({
            disabled: true,
            invalid: true,
            positioning: {
                placement: "bottom-start",
                sameWidth: true,
                gutter: 2,
            },
        });
        expect(selectSupportingTextId({}, "1")).toBe(
            "select:1:supporting-text",
        );
    });

    it("adjusts Zag's part props to the preset's markup", () => {
        expect(
            selectInputProps({ type: "button", role: "combobox" }, "Medium"),
        ).toEqual({
            role: "combobox",
            readOnly: true,
            value: "Medium",
            placeholder: " ",
            autoComplete: "off",
        });
        expect(selectPositionerProps({ id: "p" }, false)).toEqual({
            id: "p",
            hidden: true,
        });
        expect(
            selectHiddenSelectProps({ name: "size", "aria-labelledby": "x" }),
        ).toEqual({ name: "size" });
    });

    it("keeps every own prop off the element", () => {
        expect(SELECT_ROOT_PROPS).toContain("onOpenChange");
    });
});
