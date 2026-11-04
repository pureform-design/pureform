import type { CoreConfig } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { overridableTokens } from "./overridable";

const config = {
    tokens: { colors: { blue500: "#00f" }, spacing: { 4: "1rem" } },
    semanticTokens: {
        colors: { primary: "{colors.blue500}" },
        motion: { fast: { type: "alias", path: ["springs", "fast"] } },
    },
    springs: { fast: { type: "spring" } },
    themes: { teal: { semanticTokens: { colors: { accent: "#0aa" } } } },
} as unknown as CoreConfig;

const components = { button: ["container", "radius"] };

const refs = (options?: Parameters<typeof overridableTokens>[2]) =>
    overridableTokens(config, components, options).map((token) => token.ref);

describe("overridableTokens", () => {
    it("defaults to semantic tokens and component tokens", () => {
        expect(refs()).toEqual([
            "colors.accent",
            "colors.primary",
            "components.button.container",
            "components.button.radius",
        ]);
    });

    it("includes by glob and preset, and excludes by glob", () => {
        expect(refs({ include: ["spacing.*"] })).toEqual(["spacing.4"]);
        expect(refs({ include: ["all"], exclude: ["components.*"] })).toEqual([
            "colors.accent",
            "colors.blue500",
            "colors.primary",
            "spacing.4",
        ]);
    });

    it("leaves out spring tokens, which lower to suffixed vars", () => {
        expect(refs({ include: ["all"] })).not.toContain("springs.fast");
        expect(refs({ include: ["all"] })).not.toContain("motion.fast");
    });

    it("names each token's category", () => {
        expect(
            overridableTokens(config, components, { include: ["spacing.*"] }),
        ).toEqual([{ ref: "spacing.4", category: "spacing" }]);
    });

    it("is empty when nothing matches", () => {
        expect(refs({ include: ["nothing.*"] })).toEqual([]);
    });
});
