import { pureform } from "@pureform/preset";
import { describe, expect, expectTypeOf, it } from "vitest";

import { recipes } from "./recipes";
import { recipe } from "./runtime";

describe("recipe", () => {
    const chip = recipe<
        { size: "small" | "large"; selected: "true" | "false" },
        never
    >({
        className: "chip",
        variants: { size: ["small", "large"], selected: ["true", "false"] },
        defaultVariants: { size: "small" },
    });

    it("gives the base class and a class per chosen variant", () => {
        expect(chip({ size: "large", selected: true })).toBe(
            "chip chip--size_large chip--selected_true",
        );
    });

    it("fills a left-out group from its default, and skips one with none", () => {
        expect(chip()).toBe("chip chip--size_small");
    });

    it("gives each slot its classes", () => {
        const tabs = recipe<{ variant: "primary" }, "root" | "tab">({
            className: "pf-tabs",
            slots: ["root", "tab"],
            variants: { variant: ["primary"] },
            defaultVariants: { variant: "primary" },
        });
        expect(tabs()).toEqual({
            root: "pf-tabs__root pf-tabs__root--variant_primary",
            tab: "pf-tabs__tab pf-tabs__tab--variant_primary",
        });
    });

    it("splits variant props from the rest", () => {
        expect(chip.splitVariantProps({ size: "large", id: "a" })).toEqual([
            { size: "large" },
            { id: "a" },
        ]);
        expect(chip.variantKeys).toEqual(["size", "selected"]);
    });
});

describe("recipes", () => {
    const { button, card, avatar } = recipes(pureform(), { classPrefix: "pf" });

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
        // @ts-expect-error a group the component doesn't have
        button({ shade: "dark" });
        expectTypeOf(button()).toEqualTypeOf<
            Record<"root" | "label" | "icon" | "touchTarget", string>
        >();
        expectTypeOf(avatar()).toEqualTypeOf<string>();
        // @ts-expect-error a value the variant doesn't have
        avatar({ size: "huge" });
    });
});
