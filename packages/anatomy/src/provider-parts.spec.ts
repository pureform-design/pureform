import { describe, expect, expectTypeOf, it } from "vitest";

import type { ProviderPartOf } from "./components";
import {
    bottomSheetBackdropAnatomy,
    dialogBackdropAnatomy,
    datePickerBackdropAnatomy,
    sideSheetBackdropAnatomy,
} from "./composites";
import { anatomy } from "./generated";
import { renamedSlotPart } from "./provider-parts";

describe("the part names a provider addresses", () => {
    it("are the anatomy's parts, so the instance and the provider use one vocabulary", () => {
        expectTypeOf<ProviderPartOf<"button">>().toEqualTypeOf<
            "root" | "label" | "icon" | "secondaryIcon" | "touchTarget"
        >();
        // A dialog's surface is `content`; `root` is the unstyled wrapper around it.
        expectTypeOf<"content">().toExtend<ProviderPartOf<"dialog">>();
        expectTypeOf<"root">().toExtend<ProviderPartOf<"dialog">>();
        expectTypeOf<"positioner">().toExtend<ProviderPartOf<"dialog">>();
        // A sheet's `body` is the preset's `content` slot.
        expectTypeOf<"body">().toExtend<ProviderPartOf<"bottomSheet">>();
        expectTypeOf<"list">().toExtend<ProviderPartOf<"tabs">>();
        expectTypeOf<"surface">().toExtend<ProviderPartOf<"searchView">>();
    });

    it("include the owner-keyed parts another component draws", () => {
        expectTypeOf<"backdrop">().toExtend<ProviderPartOf<"dialog">>();
        expectTypeOf<"backdrop">().toExtend<ProviderPartOf<"datePicker">>();
        expectTypeOf<"cell">().toExtend<ProviderPartOf<"datePicker">>();
        expectTypeOf<"cell">().toExtend<ProviderPartOf<"dockedDatePicker">>();
        expectTypeOf<"backdrop">().not.toExtend<ProviderPartOf<"button">>();
    });

    it("link a backdrop to the component whose `backdrop` key reaches it", () => {
        for (const [backdrop, owner] of [
            [dialogBackdropAnatomy, "dialog"],
            [datePickerBackdropAnatomy, "datePicker"],
            [bottomSheetBackdropAnatomy, "bottomSheet"],
            [sideSheetBackdropAnatomy, "sideSheet"],
        ] as const) {
            expect(backdrop.name).toBe("scrim");
            expect(backdrop.owner).toEqual({
                component: owner,
                part: "backdrop",
            });
            expect(Object.keys(anatomy)).toContain(owner);
        }
    });

    it("name the part that took over a renamed slot's key", () => {
        // The preset's `root` slot draws an overlay's surface, which an instance calls `content`.
        expect(renamedSlotPart("dialog", "root")).toBe("content");
        expect(renamedSlotPart("menu", "root")).toBe("content");
        expect(renamedSlotPart("searchView", "root")).toBe("surface");
        expect(renamedSlotPart("tabs", "root")).toBe("list");
        // A sheet's `content` slot is its body.
        expect(renamedSlotPart("bottomSheet", "content")).toBe("body");
        expect(renamedSlotPart("sideSheet", "root")).toBe("content");
        // A key that was never a renamed slot, and a component with no composite, have none.
        expect(renamedSlotPart("dialog", "headline")).toBeUndefined();
        expect(renamedSlotPart("dialog", "content")).toBeUndefined();
        expect(renamedSlotPart("button", "root")).toBeUndefined();
    });
});
