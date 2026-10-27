import { describe, expect, it, vi } from "vitest";

import {
    defineRuntimeTheme,
    isRuntimeTheme,
    preloadTheme,
    themeScope,
} from "./runtime-theme";
import type { ThemeGenerator } from "./runtime-theme";

type Seed = { seed: string; contrast?: number | undefined };

const generate: ThemeGenerator<Seed> = (input) => ({
    light: { "--colors-primary": input.seed },
});

describe("defineRuntimeTheme", () => {
    it("makes themes that share one source", () => {
        const seedTheme = defineRuntimeTheme<Seed>("seed", () => generate);
        const a = seedTheme({ seed: "#006a60" });
        const b = seedTheme({ seed: "#6750a4" });
        expect(a.input).toEqual({ seed: "#006a60" });
        expect(a.source).toBe(b.source);
        expect(a.source.name).toBe("seed");
        expect(Object.isFrozen(a)).toBe(true);
    });

    it("loads the generator once, on demand", async () => {
        const load = vi.fn<() => Promise<{ default: typeof generate }>>(() =>
            Promise.resolve({ default: generate }),
        );
        const seedTheme = defineRuntimeTheme<Seed>("seed", load);
        const theme = seedTheme({ seed: "#006a60" });
        expect(load).not.toHaveBeenCalled();
        expect(theme.source.loaded).toBeUndefined();
        const [first, second] = await Promise.all([
            theme.source.load(),
            theme.source.load(),
        ]);
        expect(first).toBe(generate);
        expect(second).toBe(generate);
        expect(theme.source.loaded).toBe(generate);
        expect(load).toHaveBeenCalledTimes(1);
    });

    it("tries a failed load again", async () => {
        let fail = true;
        const seedTheme = defineRuntimeTheme<Seed>("seed", () =>
            fail ? Promise.reject(new Error("offline")) : generate,
        );
        const theme = seedTheme({ seed: "#006a60" });
        await expect(theme.source.load()).rejects.toThrow("offline");
        await expect(preloadTheme(theme)).resolves.toBeUndefined();
        fail = false;
        await expect(theme.source.load()).resolves.toBe(generate);
    });
});

describe("isRuntimeTheme", () => {
    it("tells a runtime theme from a name", () => {
        const seedTheme = defineRuntimeTheme<Seed>("seed", () => generate);
        expect(isRuntimeTheme(seedTheme({ seed: "#000000" }))).toBe(true);
        expect(isRuntimeTheme("teal")).toBe(false);
        expect(isRuntimeTheme(undefined)).toBe(false);
    });
});

describe("themeScope", () => {
    const seedTheme = defineRuntimeTheme<Seed>("seed", () => generate);

    it("names the theme by a hash of its input", () => {
        expect(themeScope(seedTheme({ seed: "#006a60" }))).toMatch(
            /^pf-[0-9a-z]+$/,
        );
    });

    it("ignores key order and undefined keys", () => {
        expect(themeScope(seedTheme({ seed: "#006a60", contrast: 0.5 }))).toBe(
            themeScope(seedTheme({ contrast: 0.5, seed: "#006a60" })),
        );
        expect(
            themeScope(seedTheme({ seed: "#006a60", contrast: undefined })),
        ).toBe(themeScope(seedTheme({ seed: "#006a60" })));
    });

    it("tells inputs and sources apart", () => {
        const other = defineRuntimeTheme<Seed>("other", () => generate);
        const scope = themeScope(seedTheme({ seed: "#006a60" }));
        expect(themeScope(seedTheme({ seed: "#006a61" }))).not.toBe(scope);
        expect(themeScope(other({ seed: "#006a60" }))).not.toBe(scope);
    });
});
