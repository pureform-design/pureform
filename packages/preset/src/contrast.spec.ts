import { defineComponent } from "@pureform/core";
import { oklchPalette } from "@pureform/theme";
import { describe, expect, it } from "vitest";

import { COLOR_GROUPS } from "./components/shared";
import { componentContrastFailures } from "./contrast";
import { pureform } from "./pureform";

// A palette whose surface variant content is far too light to read.
const washedOut = oklchPalette({
    groups: Object.fromEntries(
        COLOR_GROUPS.map((group, i) => [group, { hue: i * 50 }]),
    ) as Record<(typeof COLOR_GROUPS)[number], { hue: number }>,
    tones: { onSurfaceVariant: { light: 0.8, dark: 0.3 } },
});

describe("requireComponentContrast", () => {
    it("accepts the default theme", () => {
        expect(() =>
            pureform({ requireComponentContrast: true }),
        ).not.toThrow();
    });

    it("names the component, the pair, and the scheme that fall short", () => {
        expect(() =>
            pureform({ color: washedOut, requireComponentContrast: true }),
        ).toThrow(/chip content on surface \(light\)/);
    });

    it("checks named themes too", () => {
        expect(() =>
            pureform({
                requireComponentContrast: true,
                themes: { washed: { color: washedOut } },
            }),
        ).toThrow(/theme "washed"/);
    });
});

describe("componentContrastFailures", () => {
    it("skips a component replaced under the same name", () => {
        const config = pureform({
            color: washedOut,
            components: ({ defaults }) => ({
                ...defaults,
                chip: defineComponent({ name: "chip", recipe: { base: {} } }),
            }),
        });
        const sources = componentContrastFailures(
            config.theme.color,
            config.components,
        ).map((f) => f.source);
        expect(sources).not.toContain("chip");
    });
});
