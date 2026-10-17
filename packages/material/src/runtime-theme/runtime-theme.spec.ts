import { isRuntimeTheme, themeScope } from "@pureform/styling";
import { describe, expect, it } from "vitest";

import { generateSeedTheme } from "./generate";
import { seedTheme } from "./index";

describe("seedTheme", () => {
    it("is a runtime theme scoped by its seed", () => {
        const teal = seedTheme({ seed: "#006A60" });
        expect(isRuntimeTheme(teal)).toBe(true);
        expect(themeScope(teal)).toBe(
            themeScope(seedTheme({ seed: "#006A60" })),
        );
        expect(themeScope(teal)).not.toBe(
            themeScope(seedTheme({ seed: "#6750A4" })),
        );
    });

    it("loads its generator on demand", async () => {
        const theme = seedTheme({ seed: "#006A60" });
        expect(await theme.source.load()).toBe(generateSeedTheme);
        expect(theme.source.loaded).toBe(generateSeedTheme);
    });
});

describe("generateSeedTheme", () => {
    const { light, dark = {} } = generateSeedTheme({ seed: "#006A60" }, {});

    it("declares every color token and role", () => {
        expect(light["--colors-primary-light"]).toMatch(/^oklch\(/);
        expect(light["--colors-primary-dark"]).toMatch(/^oklch\(/);
        expect(light["--colors-primary"]).toBe("var(--colors-primary-light)");
        expect(light["--colors-brand"]).toBe("var(--colors-primary)");
        expect(
            Object.keys(light).every((name) => name.startsWith("--colors-")),
        ).toBe(true);
    });

    it("holds only what differs in the dark scheme", () => {
        expect(dark["--colors-primary"]).toBe("var(--colors-primary-dark)");
        expect(dark).not.toHaveProperty("--colors-primary-light");
        expect(dark).not.toHaveProperty("--colors-brand");
    });

    it("follows the seed", () => {
        const other = generateSeedTheme({ seed: "#6750A4" }, {});
        expect(other.light["--colors-primary-light"]).not.toBe(
            light["--colors-primary-light"],
        );
    });

    it("names vars with the target's token prefix", () => {
        const prefixed = generateSeedTheme(
            { seed: "#006A60" },
            { tokenPrefix: "x" },
        );
        expect(prefixed.light["--x-colors-primary"]).toBe(
            "var(--x-colors-primary-light)",
        );
    });

    it("is pure", () => {
        expect(generateSeedTheme({ seed: "#006A60" }, {})).toEqual({
            light,
            dark,
        });
    });
});
