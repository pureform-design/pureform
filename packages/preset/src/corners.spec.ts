import { materialShape } from "@pureform/material";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { pureform } from "./pureform";

describe("corner shape", () => {
    const config = pureform({
        shape: materialShape({}, { corner: "squircle" }),
    });
    const recipes = compilePreset(config).theme?.slotRecipes;
    // Panda's style types don't list corner-shape yet.
    const corner = (styles: unknown) =>
        (styles as { cornerShape?: string } | undefined)?.cornerShape;

    it("curves every rounded corner the theme's way", () => {
        expect(corner(recipes?.button?.base?.root)).toBe("squircle");
        expect(corner(recipes?.card?.base?.root)).toBe("squircle");
        expect(corner(recipes?.fab?.base?.container)).toBe("squircle");
        expect(
            corner(recipes?.textField?.variants?.variant?.outlined?.container),
        ).toBe("squircle");
    });

    it("leaves styles with no radius alone", () => {
        expect(recipes?.button?.base?.label).not.toHaveProperty("cornerShape");
    });

    it("adds nothing for round corners", () => {
        const plain = compilePreset(pureform()).theme?.slotRecipes;
        expect(JSON.stringify(plain)).not.toContain("cornerShape");
    });

    it("rejects a named theme with another corner", () => {
        expect(() =>
            pureform({
                themes: {
                    beveled: { shape: materialShape({}, { corner: "bevel" }) },
                },
            }),
        ).toThrow(/theme "beveled" sets corner "bevel"/);
    });

    it("rejects an unknown corner", () => {
        expect(() =>
            pureform({ shape: materialShape({}, { corner: "wavy" as never }) }),
        ).toThrow(/corner "wavy"; corners are round, squircle/);
    });
});
