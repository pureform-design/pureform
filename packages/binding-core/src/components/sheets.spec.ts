import { describe, expect, it } from "vitest";

import {
    bottomSheetPositionerLayout,
    bottomSheetSelection,
    sheetMachineProps,
    sideSheetPositionerLayout,
    sideSheetSelection,
} from "./sheet";

describe("sheets", () => {
    it("are modal unless told otherwise, and a modal side sheet isn't coplanar", () => {
        expect(bottomSheetSelection({})).toEqual({
            modal: true,
            tokens: undefined,
        });
        expect(bottomSheetSelection({ modal: false }).modal).toBe(false);
        expect(sideSheetSelection({ coplanar: true })).toEqual({
            modal: true,
            coplanar: false,
            tokens: undefined,
        });
        expect(
            sideSheetSelection({ modal: false, coplanar: true }).coplanar,
        ).toBe(true);
    });

    it("trap focus and close on a click outside only while modal", () => {
        const modal = sheetMachineProps({});
        expect(modal.modal).toBe(true);
        expect(modal.closeOnInteractOutside).toBe(true);
        expect(modal.role).toBe("dialog");
        const standard = sheetMachineProps({ modal: false });
        expect(standard.modal).toBe(false);
        expect(standard.closeOnInteractOutside).toBe(false);
        expect(
            sheetMachineProps({ modal: false, closeOnInteractOutside: true })
                .closeOnInteractOutside,
        ).toBe(true);
    });

    it("place a bottom sheet at the bottom, over the viewport only while modal", () => {
        expect(bottomSheetPositionerLayout(true, true).style).toMatchObject({
            position: "fixed",
            inset: "0",
            justifyContent: "flex-end",
        });
        expect(bottomSheetPositionerLayout(true, false).style).toMatchObject({
            position: "fixed",
            bottom: "0",
            pointerEvents: "none",
        });
        expect(bottomSheetPositionerLayout(false, true).hidden).toBe(true);
    });

    it("place a side sheet at the end edge, or in the page's layout when coplanar", () => {
        expect(
            sideSheetPositionerLayout(true, true, false).style,
        ).toMatchObject({
            position: "fixed",
            inset: "0",
            justifyContent: "flex-end",
        });
        expect(
            sideSheetPositionerLayout(true, false, false).style,
        ).toMatchObject({ position: "fixed", insetInlineEnd: "0" });
        expect(
            sideSheetPositionerLayout(true, false, true).style,
        ).not.toHaveProperty("position");
    });
});
