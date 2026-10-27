import { describe, expect, expectTypeOf, it } from "vitest";

import { kebabCase, partTestId } from "./attributes";
import {
    anatomy,
    buttonAnatomy,
    iconButtonAnatomy,
    testIds,
} from "./generated";
import type { Anatomies, AnatomyName, PartName, PartOf } from "./index";

describe("kebabCase", () => {
    it("splits camel case with hyphens", () => {
        expect(kebabCase("root")).toBe("root");
        expect(kebabCase("touchTarget")).toBe("touch-target");
        expect(kebabCase("itemTrailingText")).toBe("item-trailing-text");
    });
});

describe("partTestId", () => {
    it("defaults to pf-<component>-<part>", () => {
        expect(partTestId(buttonAnatomy, "root")).toBe("pf-button-root");
        expect(partTestId(iconButtonAnatomy, "touchTarget")).toBe(
            "pf-icon-button-touch-target",
        );
    });

    it("prefixes every part with a string", () => {
        expect(partTestId(buttonAnatomy, "root", "save")).toBe("save-root");
        expect(partTestId(iconButtonAnatomy, "touchTarget", "save")).toBe(
            "save-touch-target",
        );
    });

    it("takes ids by part, leaving the rest at their defaults", () => {
        const ids = { root: "save", label: "save-label" };
        expect(partTestId(buttonAnatomy, "root", ids)).toBe("save");
        expect(partTestId(buttonAnatomy, "label", ids)).toBe("save-label");
        expect(partTestId(buttonAnatomy, "icon", ids)).toBe("pf-button-icon");
    });

    it("throws for an unknown part", () => {
        expect(() => partTestId(buttonAnatomy, "nope" as "root")).toThrow(
            'pureform: button has no part "nope" (it has root, label, icon, secondaryIcon, touchTarget)',
        );
    });
});

describe("types", () => {
    it("keeps names and test ids literal", () => {
        expectTypeOf(testIds.button.root).toEqualTypeOf<"pf-button-root">();
        expectTypeOf<PartName<typeof buttonAnatomy>>().toEqualTypeOf<
            "root" | "label" | "icon" | "secondaryIcon" | "touchTarget"
        >();
        expectTypeOf<"hiddenSelect">().toExtend<PartOf<"select">>();
        expectTypeOf<"button">().toExtend<AnatomyName>();
        expectTypeOf<Anatomies["button"]>().toEqualTypeOf<
            typeof buttonAnatomy
        >();
        expectTypeOf(anatomy.button.parts.icon.mirror).toEqualTypeOf<true>();
    });

    it("checks part names and per-part test ids", () => {
        // @ts-expect-error: the button has no such part
        expect(() => partTestId(buttonAnatomy, "container")).toThrow();
        // @ts-expect-error: test ids by part take the component's parts only
        partTestId(buttonAnatomy, "root", { container: "x" });
    });
});
