import { describe, expect, it } from "vitest";

import { componentClasses } from "./component-classes";

describe("componentClasses", () => {
    const chip = componentClasses<
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
        const tabs = componentClasses<{ variant: "primary" }, "root" | "tab">({
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
