import { describe, expect, it } from "vitest";
import { ColorScheme } from "./color-scheme";

describe("ColorScheme", () => {
    it("should be able to create a color scheme instance", () => {
        const cs = ColorScheme.create({
            sourceColor: "#6750a4",
        });

        expect(cs).toBeTruthy();
    });

    it("should be able to get a hex color", () => {
        const cs = ColorScheme.create({
            sourceColor: "#6750a4",
        });

        expect(cs.getHex("primary", "light")).toContain("#");
        expect(cs.getHex("primary", "dark")).toContain("#");
    });

    it("should be able to get an argb color", () => {
        const cs = ColorScheme.create({
            sourceColor: "#6750a4",
        });

        const argb = cs.getArgb("primary", "light");

        expect(argb).toBeGreaterThan(0);
    });

    it("should be able to get a hct color", () => {
        const cs = ColorScheme.create({
            sourceColor: "#6750a4",
        });

        const hct = cs.getHct("primary", "light");

        expect(hct).toBeTruthy();
    });

    it("should be able to create a color scheme instance with custom colors", () => {
        const cs = ColorScheme.create({
            sourceColor: "#6750a4",
            customColorSeeds: {
                custom1: "#6750a4",
            },
        });

        expect(cs.getHex("custom1", "light")).toContain("#");
    });
});
