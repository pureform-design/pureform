import { buttonSelection } from "@pureform/binding-core";
import {
    buttonGroupPosition,
    buttonGroupSelection,
    groupedButtonVariants,
} from "@pureform/binding-core";
import { iconButtonSelection } from "@pureform/binding-core";
import {
    buttonGroupItemProps,
    buttonGroupMachineProps,
} from "@pureform/binding-web";
import { describe, expect, it } from "vitest";

describe("button group", () => {
    it("places every button single in a standard group, and by the run in a connected one", () => {
        expect([0, 1, 2].map((i) => buttonGroupPosition(i, 3, false))).toEqual([
            "single",
            "single",
            "single",
        ]);
        expect([0, 1, 2].map((i) => buttonGroupPosition(i, 3, true))).toEqual([
            "first",
            "middle",
            "last",
        ]);
        expect(buttonGroupPosition(0, 1, true)).toBe("single");
    });

    it("selects connected only when on", () => {
        expect(buttonGroupSelection({ size: "medium" })).toEqual({
            size: "medium",
            connected: undefined,
            tokens: undefined,
        });
        expect(buttonGroupSelection({ connected: true }).connected).toBe(true);
    });

    it("maps the selection mode onto Zag's toggle group", () => {
        expect(buttonGroupMachineProps({ selectable: "single" })).toEqual({
            multiple: false,
            deselectable: true,
            disabled: undefined,
            orientation: "horizontal",
        });
        expect(
            buttonGroupMachineProps({
                selectable: "multiple",
                deselectable: false,
            }),
        ).toMatchObject({ multiple: true, deselectable: false });
    });

    it("leaves the button its own id, disabled state and type", () => {
        expect(
            buttonGroupItemProps({
                id: "a",
                disabled: true,
                type: "button",
                "aria-pressed": true,
            }),
        ).toEqual({ "aria-pressed": true });
    });

    it("gives a button the group's variants under its own, and its position", () => {
        expect(
            groupedButtonVariants(
                { size: "large", variant: "tonal", color: "secondary" },
                { variant: "outlined" },
                "first",
            ),
        ).toEqual({
            color: "secondary",
            variant: "outlined",
            corner: undefined,
            density: undefined,
            size: "large",
            position: "first",
        });
    });

    it("passes a button's and an icon button's position to the registry", () => {
        expect(buttonSelection({ position: "middle" }).position).toBe("middle");
        expect(iconButtonSelection({ position: "last" }).position).toBe("last");
    });
});
