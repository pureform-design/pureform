// Type tests. This file augments `@pureform/styling`'s `ComponentRegistry` as generated
// declarations do; the augmentation reaches every file in the type check, so tests that depend on
// the registry stay here and the other specs describe components by shape.
import type { Selection } from "@pureform/styling";
import { describe, expectTypeOf, it } from "vitest";

import type { ClassFactory, ClassSlots, SlotClasses } from "./types";

declare module "@pureform/styling" {
    interface ComponentRegistry {
        button: {
            variants: { variant: "filled" | "text" };
            slots: "root" | "label";
            states: "pressed" | "disabled";
            tokens: "accent";
        };
    }
}

describe("the web factory", () => {
    it("takes variants and gives classes per slot", () => {
        expectTypeOf<ClassFactory<"button">>()
            .parameter(0)
            .toEqualTypeOf<Selection<"button">>();
        expectTypeOf<ReturnType<ClassFactory<"button">>>().toEqualTypeOf<
            ClassSlots<"button">
        >();
        expectTypeOf<ClassSlots<"button">>().toEqualTypeOf<{
            readonly root: SlotClasses;
            readonly label: SlotClasses;
        }>();
        const button: ClassFactory<"button"> = () => ({
            root: { class: "a", style: { "--x": "1" } },
            label: { class: "b" },
        });
        // @ts-expect-error a slot is missing
        const partial: ClassFactory<"button"> = () => ({
            root: { class: "a" },
        });
        // @ts-expect-error states aren't in a web selection
        button({ pressed: true });
        void partial;
    });

    it("types a component described by shape", () => {
        type Progress = { slots: "root" | "indicator"; tokens: "value" };
        expectTypeOf<ClassSlots<Progress>>().toEqualTypeOf<{
            readonly root: SlotClasses;
            readonly indicator: SlotClasses;
        }>();
    });
});
