import type {
    chipAnatomy,
    fabAnatomy,
    iconButtonAnatomy,
    radioAnatomy,
    switchControlAnatomy,
} from "@pureform/anatomy";
import { describe, expect, expectTypeOf, it } from "vitest";

import { CHIP_ROOT_PROPS, chipSelection } from "./chip";
import type { ChipPart } from "./chip";
import { hasAccessibleName, isPresent, missingNameMessage } from "./content";
import { FAB_ROOT_PROPS, fabMachineProps, fabSelection } from "./fab";
import type { FabPart } from "./fab";
import {
    ICON_BUTTON_ROOT_PROPS,
    iconButtonSelection,
    isToggle,
} from "./icon-button";
import type { IconButtonPart } from "./icon-button";
import {
    RADIO_GROUP_ROOT_PROPS,
    RADIO_PROPS,
    radioGroupMachineProps,
    radioGroupResetValue,
    radioGroupRootProps,
    radioInputProps,
    radioItemProps,
    radioSelection,
} from "./radio-group";
import type { RadioPart } from "./radio-group";
import {
    SWITCH_ROOT_PROPS,
    switchInputProps,
    switchMachineProps,
    switchNativeDefault,
    switchSelection,
} from "./switch";
import type { SwitchPart } from "./switch";

describe("parts", () => {
    it("name each anatomy's parts", () => {
        expectTypeOf<SwitchPart>().toEqualTypeOf<
            (typeof switchControlAnatomy.partNames)[number]
        >();
        expectTypeOf<RadioPart>().toEqualTypeOf<
            (typeof radioAnatomy.partNames)[number]
        >();
        expectTypeOf<ChipPart>().toEqualTypeOf<
            (typeof chipAnatomy.partNames)[number]
        >();
        expectTypeOf<IconButtonPart>().toEqualTypeOf<
            (typeof iconButtonAnatomy.partNames)[number]
        >();
        expectTypeOf<FabPart>().toEqualTypeOf<
            (typeof fabAnatomy.partNames)[number]
        >();
    });
});

describe("switch", () => {
    it("selects the color and tokens", () => {
        expect(switchSelection({ color: "secondary" })).toEqual({
            color: "secondary",
            tokens: undefined,
        });
    });

    it("maps Root's props onto Zag's, ORing in a disabled fieldset", () => {
        expect(
            switchMachineProps({ name: "wifi", ids: { input: "wifi" } }, true),
        ).toEqual({
            disabled: true,
            invalid: undefined,
            required: undefined,
            readOnly: undefined,
            name: "wifi",
            form: undefined,
            value: undefined,
            ids: { root: undefined, hiddenInput: "wifi" },
        });
        expect(switchNativeDefault(true)).toBe(true);
        expect(switchNativeDefault(undefined)).toBe(false);
    });

    it("gives the input the switch role, without Zag's hidden style and missing label", () => {
        expect(
            switchInputProps(
                {
                    type: "checkbox",
                    style: { position: "absolute" },
                    "aria-labelledby": "switch:1:label",
                },
                true,
            ),
        ).toEqual({
            type: "checkbox",
            role: "switch",
            "aria-readonly": "true",
        });
    });

    it("keeps every own prop off the element", () => {
        expect(SWITCH_ROOT_PROPS).toContain("onCheckedChange");
    });
});

describe("radio group", () => {
    it("selects a radio's variants over the group's", () => {
        expect(
            radioSelection(
                { color: "error", density: "compact" },
                { color: "primary", tokens: { dotSize: "2px" } },
            ),
        ).toEqual({
            color: "primary",
            density: "compact",
            tokens: { dotSize: "2px" },
        });
        expect(radioSelection({}, {}).tokens).toBeUndefined();
    });

    it("maps Root's props onto Zag's, ORing in a disabled fieldset", () => {
        const item = (value: string) => `size-${value}`;
        expect(
            radioGroupMachineProps(
                { name: "size", id: "size", ids: { itemHiddenInput: item } },
                true,
            ),
        ).toEqual({
            disabled: true,
            invalid: undefined,
            required: undefined,
            readOnly: undefined,
            name: "size",
            form: undefined,
            orientation: undefined,
            ids: { root: "size", item: undefined, itemHiddenInput: item },
        });
        expect(radioGroupResetValue(undefined)).toBeNull();
        expect(radioGroupResetValue("m")).toBe("m");
    });

    it("drops what names missing parts, places Zag's indicator, or changes after hydrating", () => {
        expect(
            radioGroupRootProps({
                role: "radiogroup",
                style: { position: "relative" },
                "aria-labelledby": "radio-group:1:label",
            }),
        ).toEqual({ role: "radiogroup" });
        expect(
            radioItemProps({ "data-ssr": "", "data-state": "checked" }),
        ).toEqual({ "data-state": "checked" });
        expect(
            radioInputProps({
                type: "radio",
                style: {},
                "aria-labelledby": "x",
                "data-ssr": "",
            }),
        ).toEqual({ type: "radio" });
    });

    it("keeps every own prop off the elements", () => {
        expect(RADIO_GROUP_ROOT_PROPS).toContain("onValueChange");
        expect(RADIO_PROPS).toContain("value");
    });
});

describe("chip", () => {
    it("selects the variant groups and tokens", () => {
        expect(chipSelection({ variant: "elevated" })).toEqual({
            variant: "elevated",
            corner: undefined,
            toggle: undefined,
            color: undefined,
            density: undefined,
            tokens: undefined,
        });
        expect(CHIP_ROOT_PROPS).toContain("onSelectedChange");
        expect(CHIP_ROOT_PROPS).toContain("corner");
    });

    it("is a toggle when selected is given, which morphs a filter chip's corners", () => {
        expect(chipSelection({ defaultSelected: false }).toggle).toBe(true);
        expect(chipSelection({ toggle: false, selected: true }).toggle).toBe(
            undefined,
        );
        expect(chipSelection({ corner: "round" }).corner).toBe("round");
    });
});

describe("icon button", () => {
    it("is a toggle when told, or when given selected or defaultSelected", () => {
        expect(isToggle({})).toBe(false);
        expect(isToggle({ defaultSelected: false })).toBe(true);
        expect(isToggle({ selected: true })).toBe(true);
        expect(isToggle({ selected: true, toggle: false })).toBe(false);
    });

    it("selects the toggle variant with the toggle", () => {
        expect(iconButtonSelection({ variant: "filled" })).toEqual({
            color: undefined,
            variant: "filled",
            shape: undefined,
            size: undefined,
            density: undefined,
            toggle: false,
            tokens: undefined,
        });
        expect(iconButtonSelection({ defaultSelected: true }).toggle).toBe(
            true,
        );
        expect(ICON_BUTTON_ROOT_PROPS).toContain("shape");
    });
});

describe("FAB", () => {
    it("selects the variant groups, extended included", () => {
        expect(fabSelection({ extended: true, size: "large" })).toEqual({
            color: undefined,
            variant: undefined,
            size: "large",
            extended: true,
            shape: undefined,
            tokens: undefined,
        });
        expect(FAB_ROOT_PROPS).toContain("extended");
    });

    it("never toggles", () => {
        expect(fabMachineProps({ type: "submit", id: "add" })).toEqual({
            disabled: undefined,
            type: "submit",
            name: undefined,
            value: undefined,
            form: undefined,
            toggle: false,
            ids: { root: "add", label: undefined },
        });
    });
});

describe("content", () => {
    it("renders a content prop unless it's undefined, null, or false", () => {
        expect([undefined, null, false, 0, "", "★"].map(isPresent)).toEqual([
            false,
            false,
            false,
            true,
            true,
            true,
        ]);
    });

    it("asks an icon-only component for a name", () => {
        expect(hasAccessibleName({ "aria-label": "Add" })).toBe(true);
        expect(hasAccessibleName({ "aria-labelledby": "add" })).toBe(true);
        expect(hasAccessibleName({ "aria-label": "" })).toBe(false);
        expect(missingNameMessage("Fab")).toContain("aria-label");
    });
});
