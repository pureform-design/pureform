import { typed } from "@pureform/core";
import { describe, expect, it } from "vitest";

import { providers } from "./__fixtures__/theme";
import { resolveTheme } from "./resolve";

describe("a theme's config with typed()", () => {
    const theme = resolveTheme(providers());
    const pf = typed(theme.config);

    it("offers the contract roles", () => {
        expect(pf.alias("semanticTokens", "colors", "onPrimary").path).toEqual([
            "semanticTokens",
            "colors",
            "onPrimary",
        ]);
        pf.alias("semanticTokens", "colors", "dangerContainer");
        pf.alias("semanticTokens", "colors", "elevationTintLevel2");
        pf.alias("tokens", "radii", "full");
        pf.alias("tokens", "spacing", "4");
        pf.alias("durations", "medium2");
        pf.alias("easings", "emphasized");
        pf.alias("textStyles", "labelLarge");
        pf.apply({ shadowElevation: "level3", filterElevation: "level1" });
    });

    it("rejects names the theme doesn't have", () => {
        // @ts-expect-error not a color group of this theme
        pf.alias("semanticTokens", "colors", "tertiary");
        // @ts-expect-error not a radius
        pf.alias("tokens", "radii", "huge");
        // @ts-expect-error not an elevation level
        pf.apply({ shadowElevation: "level9" });
    });

    it("still reads a provider's extra names", () => {
        expect(theme.config.semanticTokens.colors.surface).toBeDefined();
    });
});
