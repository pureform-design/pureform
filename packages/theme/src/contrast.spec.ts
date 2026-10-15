import {
    alias,
    colorMix,
    hex,
    hsl,
    oklch,
    pct,
    when,
} from "@pureform/core/ast";
import { describe, expect, it } from "vitest";

import { providers } from "./__fixtures__/theme";
import { contrastRatio, resolveColor } from "./contrast";
import { colorFromTokens } from "./provider";
import { oklchPalette } from "./providers";
import { resolveTheme } from "./resolve";

describe("contrastRatio", () => {
    it("rates black on white 21:1 and a color against itself 1:1", () => {
        expect(contrastRatio(hex("#000"), hex("#fff"))).toBeCloseTo(21);
        expect(contrastRatio(hex("#777"), hex("#777"))).toBeCloseTo(1);
    });

    it("agrees across color spaces", () => {
        const fromHex = contrastRatio(hex("#000"), hex("#ff0000"));
        expect(contrastRatio(hex("#000"), hsl(0, 100, 50))).toBeCloseTo(
            fromHex!,
            2,
        );
        expect(
            contrastRatio(hex("#000"), oklch(0.62796, 0.25768, 29.234)),
        ).toBeCloseTo(fromHex!, 2);
    });

    it("cannot rate a mix", () => {
        const mix = colorMix(hex("#000"), hex("#fff"), pct(50));
        expect(
            resolveColor({ roles: { a: mix } }, mix, "light"),
        ).toBeUndefined();
    });
});

describe("resolveColor", () => {
    it("follows the scheme and aliases", () => {
        const contract = {
            roles: {
                surface: when(
                    "dark",
                    alias("tokens", "colors", "surfaceDark"),
                    hex("#fff"),
                ),
                card: alias("semanticTokens", "colors", "surface"),
            },
            primitives: { surfaceDark: hex("#111") },
        };
        expect(resolveColor(contract, contract.roles.card, "light")).toEqual(
            hex("#fff"),
        );
        expect(resolveColor(contract, contract.roles.card, "dark")).toEqual(
            hex("#111"),
        );
    });
});

describe("requireContrast", () => {
    const palette = oklchPalette({ groups: { primary: { hue: 265 } } });

    it("passes a palette that meets the ratio", () => {
        expect(() =>
            resolveTheme(
                { ...providers(), color: palette },
                { requireContrast: 4.5 },
            ),
        ).not.toThrow();
    });

    it("names each pair below the ratio", () => {
        const base = resolveTheme({ ...providers(), color: palette }).color;
        const faint = colorFromTokens({
            ...base,
            roles: { ...base.roles, onPrimary: hex("#8888ff") },
        });
        expect(() =>
            resolveTheme(
                { ...providers(), color: faint },
                { requireContrast: 4.5 },
            ),
        ).toThrow(
            /onPrimary on primary \(light\) is \d\.\d\d:1, onPrimary on primary \(dark\)/,
        );
    });
});
