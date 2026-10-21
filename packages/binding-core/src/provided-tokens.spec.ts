import { describe, expect, it } from "vitest";

import {
    mergeProvidedTokens,
    providedTokenPaths,
    providedTokensFor,
    providedTokensFromPaths,
    withProvidedTokens,
} from "./provided-tokens";

describe("provided tokens", () => {
    it("group paths by component, skipping what isn't a component token", () => {
        expect(
            providedTokensFromPaths({
                "components.iconButton.accent": "#00f",
                "components.chip.radius": 8,
                "colors.primary": "#f00",
            }),
        ).toEqual({ iconButton: { accent: "#00f" }, chip: { radius: 8 } });
        expect(providedTokensFromPaths(undefined)).toEqual({});
        expect(providedTokenPaths({ iconButton: { accent: "#00f" } })).toEqual({
            "components.iconButton.accent": "#00f",
        });
    });

    it("let the nearest provider win, per token", () => {
        const outer = { iconButton: { accent: "#00f", onAccent: "#fff" } };
        expect(
            mergeProvidedTokens(outer, { iconButton: { accent: "#0f0" } }),
        ).toEqual({ iconButton: { accent: "#0f0", onAccent: "#fff" } });
        expect(mergeProvidedTokens(outer, {})).toBe(outer);
    });

    it("go under a component's own instance tokens", () => {
        const provided = providedTokensFor(
            { iconButton: { accent: "#00f", onAccent: "#fff" } },
            "iconButton",
        );
        expect(providedTokensFor({}, "iconButton")).toBeUndefined();
        expect(
            withProvidedTokens(
                { size: "small", tokens: { accent: "#f00" } },
                provided,
            ),
        ).toEqual({
            size: "small",
            tokens: { accent: "#f00", onAccent: "#fff" },
        });
        const selection = { size: "small" };
        expect(withProvidedTokens(selection, undefined)).toBe(selection);
    });
});
