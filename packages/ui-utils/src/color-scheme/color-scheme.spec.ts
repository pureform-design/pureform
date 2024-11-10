import { describe, expect, it } from "vitest";
import { ColorScheme } from "./color-scheme";

describe("ColorScheme", () => {
    it("should be able to create a color scheme instance", () => {
        const cs = ColorScheme.create({
            source: "#6750a4",
        });

        expect(cs).toBeTruthy();
    });

    it("should be able to get a hex color", () => {
        const cs = ColorScheme.create({
            source: "#6750a4",
        });

        const light = cs.getHex("primary", "light");
        const dark = cs.getHex("primary", "dark");
        expect(light).toContain("#");
        expect(dark).toContain("#");
        expect(light).not.toEqual(dark);
    });

    it("should be able to get an argb color", () => {
        const cs = ColorScheme.create({
            source: "#6750a4",
        });

        const argb = cs.getArgb("primary", "light");

        expect(argb).toBeGreaterThan(0);
    });

    it("should be able to get a hct color", () => {
        const cs = ColorScheme.create({
            source: "#6750a4",
        });

        const hct = cs.getHct("primary", "light");

        expect(hct).toBeTruthy();
    });

    it("should be able to create a color scheme instance with custom colors", () => {
        const cs = ColorScheme.create({
            source: "#6750a4",
            customSeeds: {
                custom1: "#6750a4",
            },
        });

        expect(cs.getHex("custom1", "light")).toContain("#");
    });

    it("should be able to create a color scheme instance with override colors", () => {
        const overridePrimaryLight = "#6750a4";
        const overridePrimaryDark = "#6750a4";
        const overrideSecondary = "#6750a4";
        const cs = ColorScheme.create({
            source: "#6750a4",
            overrides: {
                primary: {
                    light: overridePrimaryLight,
                    dark: overridePrimaryDark,
                },
                secondary: overrideSecondary,
            },
        });

        expect(cs.getHex("primary", "light")).toEqual(overridePrimaryLight);
        expect(cs.getHex("primary", "dark")).toEqual(overridePrimaryDark);
        expect(cs.getHex("secondary", "light")).toEqual(overrideSecondary);
        expect(cs.getHex("secondary", "dark")).toEqual(overrideSecondary);
    });
});
