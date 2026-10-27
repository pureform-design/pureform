import { isRuntimeTheme, themeScope } from "@pureform/styling-web";
import { describe, expect, it } from "vitest";

import {
    clearSeedThemeCache,
    generateSeedTheme,
    SEED_THEME_CACHE_SIZE,
} from "./generate";
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

    it("rounds to 10 significant digits, so engines agree", () => {
        const digits = Object.values(light)
            .flatMap((value) => value.match(/\d*\.\d+/g) ?? [])
            .map((n) => n.replace(".", "").replace(/^0+/, "").length);
        expect(digits.length).toBeGreaterThan(0);
        expect(Math.max(...digits)).toBeLessThanOrEqual(10);
    });

    it("is pure", () => {
        expect(generateSeedTheme({ seed: "#006A60" }, {})).toEqual({
            light,
            dark,
        });
    });

    it("gives equal inputs the same frozen theme", () => {
        clearSeedThemeCache();
        const first = generateSeedTheme(
            { seed: "#006A60", overrides: { primary: "#112233" } },
            { tokenPrefix: "x" },
        );
        const again = generateSeedTheme(
            { overrides: { primary: "#112233" }, seed: "#006A60" },
            { tokenPrefix: "x" },
        );
        expect(again).toBe(first);
        expect(Object.isFrozen(first)).toBe(true);
        expect(Object.isFrozen(first.light)).toBe(true);
        expect(Object.isFrozen(first.dark)).toBe(true);
        expect(
            generateSeedTheme(
                { seed: "#006A60", overrides: { primary: "#112233" } },
                {},
            ),
        ).not.toBe(first);
    });

    it("keeps the themes it generated last", () => {
        clearSeedThemeCache();
        const seed = (n: number) =>
            `#0000${n.toString(16).padStart(2, "0")}` as const;
        const oldest = generateSeedTheme({ seed: seed(0) }, {});
        const used = generateSeedTheme({ seed: seed(1) }, {});
        for (let n = 2; n < SEED_THEME_CACHE_SIZE; n++) {
            generateSeedTheme({ seed: seed(n) }, {});
        }
        // Used again, so the oldest is the first to go.
        expect(generateSeedTheme({ seed: seed(1) }, {})).toBe(used);
        generateSeedTheme({ seed: seed(SEED_THEME_CACHE_SIZE) }, {});
        expect(generateSeedTheme({ seed: seed(1) }, {})).toBe(used);
        const regenerated = generateSeedTheme({ seed: seed(0) }, {});
        expect(regenerated).not.toBe(oldest);
        expect(regenerated).toEqual(oldest);
    });
});
