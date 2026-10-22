import { pureform } from "@pureform/preset";
import { componentClasses as stylingComponentClasses } from "@pureform/styling";
import { describe, expect, expectTypeOf, it } from "vitest";

import { classesFor } from "./classes";
import { componentClasses } from "./runtime";

describe("componentClasses", () => {
    it("is the one from @pureform/styling", () => {
        expect(componentClasses).toBe(stylingComponentClasses);
    });
});

describe("classesFor", () => {
    const { button, card, badge } = classesFor(pureform(), {
        classPrefix: "pf",
    });

    it("builds every component's function from the config", () => {
        expect(button({ variant: "tonal" }).root).toContain(
            "pf-button__root--variant_tonal",
        );
        expect(card({ interactive: true }).root).toContain(
            "pf-card__root--interactive_true",
        );
    });

    it("types selections and slots from the typed specs", () => {
        // @ts-expect-error a value the variant doesn't have
        button({ size: "huge" });
        // @ts-expect-error a fill the button doesn't have
        button({ variant: "glossy" });
        // @ts-expect-error a group the component doesn't have
        button({ shade: "dark" });
        expectTypeOf(button()).toEqualTypeOf<
            Record<
                "root" | "label" | "icon" | "secondaryIcon" | "touchTarget",
                string
            >
        >();
        expectTypeOf(badge()).toEqualTypeOf<string>();
        // @ts-expect-error a value the variant doesn't have
        badge({ size: "huge" });
    });
});
