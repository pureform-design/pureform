import { buttonAnatomy, checkboxAnatomy } from "@pureform/anatomy";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
    BUTTON_ROOT_PROPS,
    buttonMachineProps,
    buttonSelection,
} from "./button";
import type { ButtonPart } from "./button";
import {
    CHECKBOX_ROOT_PROPS,
    checkboxInputProps,
    checkboxMachineProps,
    checkboxMarkProps,
    checkboxNativeDefault,
    checkboxResetState,
    checkboxSelection,
} from "./checkbox";
import type { CheckboxPart } from "./checkbox";
import type { VariantProp } from "./variants";

describe("VariantProp", () => {
    type Shape = {
        variants: { variant: "filled" | "text"; toggle: "true" | "false" };
    };

    it("takes a registered group's values", () => {
        expectTypeOf<VariantProp<Shape, "variant">>().toEqualTypeOf<
            "filled" | "text" | undefined
        >();
        expectTypeOf<VariantProp<Shape, "toggle">>().toEqualTypeOf<
            "true" | "false" | boolean | undefined
        >();
    });

    it("takes only undefined for a group the registry doesn't declare", () => {
        expectTypeOf<VariantProp<Shape, "size">>().toEqualTypeOf<undefined>();
    });

    it("takes any value while nothing is registered", () => {
        expectTypeOf<VariantProp<"button", "variant">>().toEqualTypeOf<
            string | boolean | undefined
        >();
    });
});

describe("button", () => {
    it("names the anatomy's parts", () => {
        expectTypeOf<ButtonPart>().toEqualTypeOf<
            (typeof buttonAnatomy.partNames)[number]
        >();
    });

    it("selects the variant groups and tokens", () => {
        expect(
            buttonSelection({
                variant: "tonal",
                size: "small",
                tokens: { radius: "4px" },
            }),
        ).toEqual({
            color: undefined,
            variant: "tonal",
            size: "small",
            density: undefined,
            tokens: { radius: "4px" },
        });
    });

    it("maps Root's props onto the machine, the id to the root's", () => {
        expect(
            buttonMachineProps({
                disabled: true,
                type: "submit",
                name: "save",
                value: "1",
                form: "f",
                id: "save",
                ids: { root: "ignored", label: "save-label" },
            }),
        ).toEqual({
            disabled: true,
            type: "submit",
            name: "save",
            value: "1",
            form: "f",
            toggle: undefined,
            ids: { root: "save", label: "save-label" },
        });
    });

    it("keeps every own prop off the element", () => {
        expect(BUTTON_ROOT_PROPS).toContain("onSelectedChange");
        expect(BUTTON_ROOT_PROPS).toContain("testId");
    });
});

describe("checkbox", () => {
    it("names the anatomy's parts", () => {
        expectTypeOf<CheckboxPart>().toEqualTypeOf<
            (typeof checkboxAnatomy.partNames)[number]
        >();
    });

    it("selects the variant groups and tokens", () => {
        expect(checkboxSelection({ color: "error" })).toEqual({
            color: "error",
            density: undefined,
            tokens: undefined,
        });
    });

    it("maps Root's props onto Zag's, ORing in a disabled fieldset", () => {
        expect(
            checkboxMachineProps(
                { name: "terms", required: true, ids: { input: "terms" } },
                true,
            ),
        ).toEqual({
            disabled: true,
            invalid: undefined,
            required: true,
            readOnly: undefined,
            name: "terms",
            form: undefined,
            value: undefined,
            ids: { root: undefined, hiddenInput: "terms" },
        });
        expect(checkboxMachineProps({}, false).disabled).toBe(false);
    });

    it("resets the native input to checked only for true", () => {
        expect(checkboxNativeDefault(true)).toBe(true);
        expect(checkboxNativeDefault("indeterminate")).toBe(false);
        expect(checkboxNativeDefault(undefined)).toBe(false);
        expect(checkboxResetState(undefined)).toBe(false);
        expect(checkboxResetState("indeterminate")).toBe("indeterminate");
    });

    it("drops Zag's hidden style and missing label from the input", () => {
        const input = checkboxInputProps(
            {
                type: "checkbox",
                style: { position: "absolute" },
                "aria-labelledby": "checkbox:1:label",
                "aria-invalid": "false",
            },
            true,
        );
        expect(input).toEqual({
            type: "checkbox",
            "aria-invalid": "false",
            "aria-readonly": "true",
        });
        expect(checkboxInputProps({}, false)["aria-readonly"]).toBeUndefined();
    });

    it("shows both marks to the CSS", () => {
        expect(checkboxMarkProps({ hidden: true, "data-state": "on" })).toEqual(
            { "data-state": "on" },
        );
    });

    it("keeps every own prop off the element", () => {
        expect(CHECKBOX_ROOT_PROPS).toContain("onCheckedChange");
        expect(CHECKBOX_ROOT_PROPS).toContain("readOnly");
    });
});
