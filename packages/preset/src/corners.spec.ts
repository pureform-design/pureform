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
        const { timePicker, ...plain } =
            compilePreset(pureform()).theme?.slotRecipes ?? {};
        expect(JSON.stringify(plain)).not.toContain("cornerShape");
        // The time picker's dial keeps its own round corner whatever the theme's.
        expect(JSON.stringify(timePicker?.base?.root)).not.toContain(
            "cornerShape",
        );
    });

    it("rejects an unknown corner", () => {
        expect(() =>
            pureform({ shape: materialShape({}, { corner: "wavy" as never }) }),
        ).toThrow(/corner "wavy"; corners are round, squircle/);
    });
});

describe("corner shape per named theme", () => {
    const config = pureform({
        shape: materialShape({}, { corner: "squircle" }),
        themes: {
            beveled: { shape: materialShape({}, { corner: "bevel" }) },
            plain: { shape: materialShape({}, { corner: "squircle" }) },
        },
    });
    const preset = compilePreset(config);
    const recipes = preset.theme?.slotRecipes;
    const corner = (styles: unknown) =>
        (styles as { cornerShape?: string } | undefined)?.cornerShape;

    it("reads each rounded component's corner from its corner token", () => {
        expect(corner(recipes?.button?.base?.root)).toBe(
            "var(--components-button-corner, squircle)",
        );
        expect(corner(recipes?.fab?.base?.container)).toBe(
            "var(--components-fab-corner, squircle)",
        );
    });

    it("sets the token for a theme whose corner differs", () => {
        const css = preset.globalCss as Record<string, Record<string, string>>;
        expect(css["[data-panda-theme=beveled]"]).toMatchObject({
            "--components-button-corner": "bevel",
            "--components-card-corner": "bevel",
        });
    });

    it("leaves a theme with the base's corner alone", () => {
        const css = preset.globalCss as Record<string, unknown>;
        expect(css["[data-panda-theme=plain]"]).toBeUndefined();
    });

    it("gives no token to a component that rounds no corner", () => {
        expect(config.components.separator.tokens).not.toHaveProperty("corner");
    });

    it("writes the corner in place when every theme shares it", () => {
        const shared = compilePreset(
            pureform({
                shape: materialShape({}, { corner: "squircle" }),
                themes: {
                    other: { shape: materialShape({}, { corner: "squircle" }) },
                },
            }),
        ).theme?.slotRecipes;
        expect(corner(shared?.button?.base?.root)).toBe("squircle");
    });
});
